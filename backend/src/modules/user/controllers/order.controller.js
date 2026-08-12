const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const Product = require("../../../models/Product");
const Coupon = require("../../../models/Coupon");
const StockLog = require("../../../models/StockLog");
const Seller = require("../../../models/Seller");
const GiftCard = require("../../../models/GiftCard");
const User = require("../../../models/User");
const { generateOrderId } = require("../../../utils/generateId");
const { success, error } = require("../../../utils/apiResponse");
const razorpay = require("../../../config/razorpay");
const Notification = require("../../../models/Notification");
const {
  notifySellerLowStock,
  DEFAULT_LOW_STOCK_THRESHOLD,
} = require("../../../services/sellerNotificationService");
const { enqueueEmail } = require("../../../services/emailService");
const emailTemplates = require("../../../services/emailTemplates");
const { emitNewOrder } = require("../../../services/socketEmitter");
const {
  accrueCommissionsForOrder,
  reverseCommissionsForOrder,
} = require("../../../services/commissionService");
const {
  isSerializedVariant,
  consumeSerializedStock,
  restockSerializedUnits,
} = require("../../../utils/inventorySync");

const toIdSet = (values = []) =>
  new Set((Array.isArray(values) ? values : []).map((value) => String(value)));

const roundCurrency = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const isCouponItem = (coupon, item) => {
  if (!coupon || coupon.applicabilityType === "all") return Boolean(coupon);

  const categoryIdSet = toIdSet(coupon.applicableCategories);
  const productIdSet = toIdSet(coupon.applicableProducts);
  const itemCategoryId = String(item?.categoryId || "");
  const itemProductId = String(item?.productId || item?.id || "");

  if (coupon.applicabilityType === "category") return categoryIdSet.has(itemCategoryId);
  if (coupon.applicabilityType === "product") return productIdSet.has(itemProductId);
  return false;
};

/**
 * Persist the seller-owned portion of a new order while checkout facts are
 * still available. This is used later to issue an immutable seller invoice.
 * Shipping is a platform charge and gift-card redemption is a payment tender,
 * so neither is represented as seller revenue on the seller document.
 */
const buildSellerInvoiceAllocations = (items, coupon, discount) => {
  const sellerRows = new Map();
  const applicableTotal = coupon
    ? items
        .filter((item) => isCouponItem(coupon, item))
        .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
    : 0;

  for (const item of items) {
    if (!item?.sellerId || item.isGiftCard) continue;

    const key = String(item.sellerId);
    const row = sellerRows.get(key) || {
      sellerId: item.sellerId,
      itemSubtotal: 0,
      giftWrapCharge: 0,
      applicableSubtotal: 0,
    };

    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
    row.itemSubtotal += lineTotal;
    if (item.giftWrap) row.giftWrapCharge += 50;
    if (coupon && isCouponItem(coupon, item)) row.applicableSubtotal += lineTotal;
    sellerRows.set(key, row);
  }

  return Array.from(sellerRows.values()).map((row) => ({
    sellerId: row.sellerId,
    itemSubtotal: roundCurrency(row.itemSubtotal),
    giftWrapCharge: roundCurrency(row.giftWrapCharge),
    couponDiscount:
      applicableTotal > 0
        ? roundCurrency((Number(discount || 0) * row.applicableSubtotal) / applicableTotal)
        : 0,
  }));
};

const ensureProductOrderable = async (product) => {
  if (!product || product.status !== "Active" || product.active === false) {
    throw new Error(`Product ${product?._id || ""} is currently unavailable`);
  }

  if (product.sellerId) {
    const seller = await Seller.findById(product.sellerId)
      .select("status")
      .lean();
    if (!seller || seller.status !== "APPROVED") {
      throw new Error(`${product.name} is currently unavailable`);
    }
  }
};

/**
 * Shared helper: validate + compute coupon discount.
 * Returns { discount, coupon } or throws an error string.
 * BUG-12 FIX: centralised coupon validation re-used at order time.
 */
const applyCoupon = async (couponCode, subtotal, userId, items = []) => {
  const normalizedCode = String(couponCode || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode) return { discount: 0, coupon: null };

  const coupon = await Coupon.findOne({ code: normalizedCode, active: true });
  if (!coupon) return { discount: 0, coupon: null };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom)
    return { discount: 0, coupon: null };
  if (coupon.validUntil && now > coupon.validUntil)
    return { discount: 0, coupon: null };
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    return { discount: 0, coupon: null };

  const userUsage = coupon.usedBy.filter(
    (u) => u.userId.toString() === userId.toString(),
  ).length;
  if (coupon.perUserLimit && userUsage >= coupon.perUserLimit)
    return { discount: 0, coupon: null };

  // New User Eligibility
  if (coupon.userEligibility === "new") {
    const priorOrders = await Order.countDocuments({
      userId,
      paymentStatus: "paid",
    });
    if (priorOrders > 0) return { discount: 0, coupon: null };
  }

  // Applicability Checks
  let applicableTotal = subtotal;
  if (coupon.applicabilityType !== "all") {
    const categoryIdSet = toIdSet(coupon.applicableCategories);
    const productIdSet = toIdSet(coupon.applicableProducts);

    const applicableItems = items.filter((item) => {
      const itemCategoryId = String(item?.categoryId || "");
      const itemProductId = String(item?.productId || item?.id || "");
      if (coupon.applicabilityType === "category")
        return categoryIdSet.has(itemCategoryId);
      if (coupon.applicabilityType === "product")
        return productIdSet.has(itemProductId);
      return false;
    });

    if (applicableItems.length === 0) return { discount: 0, coupon: null };
    applicableTotal = applicableItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
  }

  if (applicableTotal < coupon.minOrderValue)
    return { discount: 0, coupon: null };

  let discount = 0;
  if (coupon.type === "flat") {
    discount = coupon.value;
  } else if (coupon.type === "percentage") {
    discount = Math.round((applicableTotal * coupon.value) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount)
      discount = coupon.maxDiscount;
  } else if (coupon.type === "free_shipping") {
    discount = 0; // Handled by setting shipping to 0 in placeOrder
  }

  discount = Math.min(discount, applicableTotal);

  return {
    discount,
    coupon,
    isFreeShipping: coupon.type === "free_shipping",
  };
};

/**
 * Shared helper: deduct stock and create stock logs for an order.
 * BUG-02 FIX: extracted so it can be called AFTER payment verification.
 */
const deductStockForOrder = async (orderItems, orderId, userId) => {
  for (const item of orderItems) {
    if (
      item.isGiftCard ||
      String(item.productId || "").startsWith("GIFT_CARD_")
    )
      continue;

    const product = await Product.findById(item.productId);
    const variant = product?.variants.id(item.variantId);
    if (!product || !variant) continue;

    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) continue;

    const previousStock = Number(variant.stock) || 0;
    const variantIndex = product.variants.findIndex(
      (v) => String(v._id) === String(item.variantId),
    );

    if (isSerializedVariant(product, variant)) {
      consumeSerializedStock({
        product,
        variant,
        quantity,
        variantIndex,
        saleStatus: "SOLD_ONLINE",
      });
    } else {
      if (previousStock < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name} (${variant.name})`,
        );
      }
      variant.stock = previousStock - quantity;
    }

    variant.sold = (Number(variant.sold) || 0) + quantity;
    await product.save();

    // Low stock notification (best-effort, de-duped).
    if (item?.sellerId) {
      await notifySellerLowStock({
        sellerId: item.sellerId,
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        variantName: variant.name,
        currentStock: Number(variant.stock) || 0,
        threshold: DEFAULT_LOW_STOCK_THRESHOLD,
      });
    }

    await StockLog.create({
      productId: item.productId,
      variantId: item.variantId,
      changeType: "sale",
      previousStock,
      newStock: variant.stock,
      change: -quantity,
      reason: `Order ${orderId}`,
      userId,
    });
  }
};

/**
 * Internal helper to calculate order data without saving to DB.
 * Used by both placeOrder (for COD) and initiatePayment (for Razorpay).
 */
const _calculateOrderData = async (
  userId,
  userEmail,
  items,
  shippingAddress,
  paymentMethod,
  couponCode,
  giftCardCodes = [],
) => {
  if (!items || !items.length)
    throw new Error("Order must contain at least one item.");
  if (!shippingAddress) throw new Error("Shipping address is required.");

  let subtotal = 0;
  const orderItems = [];

  // 1. Validate Items & Stock & Price
  for (const item of items) {
    const isGift =
      item.isGiftCard || String(item.productId || "").startsWith("GIFT_CARD_");
    if (isGift) {
      if (paymentMethod === "cod") {
        throw new Error(
          "Gift cards cannot be purchased using Cash on Delivery. Please select an online payment method.",
        );
      }
      const cardValue = Number(item.price || 500);
      if (cardValue < 500) throw new Error("Gift card minimum value is ₹500");

      const itemTotal = cardValue * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        variantId: "GIFT_CARD_VAR",
        name: item.name || `Sands E-Gift Card (₹${cardValue})`,
        sku: `GIFT-CARD-${cardValue}`,
        image: "",
        price: cardValue,
        mrp: cardValue,
        quantity: item.quantity,
        isGiftCard: true,
        personalization: item.personalization || undefined,
      });
      continue;
    }

    const product = await Product.findById(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    await ensureProductOrderable(product);

    const variant = product.variants.id(item.variantId);
    if (!variant) throw new Error(`Variant ${item.variantId} not found`);

    if (variant.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name} (${variant.name})`,
      );
    }

    const itemTotal = variant.price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: product._id,
      variantId: variant._id,
      name: product.name,
      sku: variant.sku || `${product.slug}-${variant.name}`,
      image:
        product.images[0] ||
        (variant.variantImages && variant.variantImages[0]) ||
        "",
      price: variant.price,
      mrp: variant.mrp,
      quantity: item.quantity,
      sellerId: product.sellerId,
      categoryId: product.categories?.[0] || undefined,
      giftWrap: Boolean(item.giftWrap),
      giftMessage:
        item.giftWrap && item.giftMessage
          ? String(item.giftMessage).slice(0, 200)
          : "",
    });
  }

  // Calculate gift wrap charges (₹50 per wrapped unique item line)
  const giftWrapCharge = orderItems.reduce(
    (sum, item) => sum + (item.giftWrap ? 50 : 0),
    0,
  );

  // 2. Handle Coupon
  let discount = 0;
  let appliedCoupon = null;
  let isFreeShipping = false;

  if (couponCode) {
    const result = await applyCoupon(couponCode, subtotal, userId, orderItems);
    discount = result.discount;
    appliedCoupon = result.coupon;
    isFreeShipping = result.isFreeShipping;
  }

  // Unified Shipping Logic (Free shipping above ₹499, else ₹50)
  let shipping = subtotal - discount + giftWrapCharge > 499 ? 0 : 50;
  if (isFreeShipping) shipping = 0;

  // 3. Apply Gift Cards (partial use supported, multiple cards allowed)
  let giftCardDiscount = 0;
  const appliedGiftCards = [];
  const validGiftCardCodes = Array.isArray(giftCardCodes) ? giftCardCodes : [];

  if (validGiftCardCodes.length > 0) {
    let remainingToPay = Math.max(
      0,
      subtotal - discount + giftWrapCharge + shipping,
    );
    for (const rawCode of validGiftCardCodes) {
      if (remainingToPay <= 0) break;
      const code = String(rawCode || "")
        .toUpperCase()
        .trim();
      if (!code) continue;
      const card = await GiftCard.findOne({
        code,
        status: { $in: ["active", "partially_used"] },
      });
      if (!card || card.balance <= 0) continue;
      if (card.expiresAt && card.expiresAt < new Date()) continue;
      const usable = Math.min(card.balance, remainingToPay);
      giftCardDiscount += usable;
      remainingToPay -= usable;
      appliedGiftCards.push({
        cardId: card._id,
        code: card.code,
        amountUsed: usable,
      });
    }
  }

  const total = Math.max(
    0,
    subtotal - discount + giftWrapCharge + shipping - giftCardDiscount,
  );
  const sellerInvoiceAllocations = buildSellerInvoiceAllocations(
    orderItems,
    appliedCoupon,
    discount,
  );

  return {
    orderId: generateOrderId(),
    userId,
    customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
    customerEmail: shippingAddress.email || userEmail,
    customerPhone: shippingAddress.phone,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    couponCode: appliedCoupon ? couponCode.toUpperCase() : undefined,
    giftCardDiscount,
    appliedGiftCards,
    subtotal,
    discount,
    shipping,
    giftWrapCharge,
    sellerInvoiceAllocations,
    total,
    status: paymentMethod === "cod" ? "Processing" : "Pending",
    paymentStatus: paymentMethod === "cod" ? "cod" : "pending",
    timeline: [{ status: "Ordered", note: "Order placed successfully" }],
  };
};

// ─────────────────────────────────────────────────────────────────
// POST /api/user/orders  — Place an Order
// ─────────────────────────────────────────────────────────────────
exports.placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode, giftCardCodes } =
      req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Use shared helper to prepare order data
    const orderData = await _calculateOrderData(
      userId,
      userEmail,
      items,
      shippingAddress,
      paymentMethod,
      couponCode,
      giftCardCodes,
    );

    // 4. Create Razorpay order (no stock deduction yet for online payments)
    if (paymentMethod === "razorpay") {
      if (orderData.total === 0) {
        throw new Error(
          "Zero-total prepaid orders must be processed via the checkout verification flow.",
        );
      }
      try {
        const rpOrder = await razorpay.orders.create({
          amount: Math.round(orderData.total * 100),
          currency: "INR",
          receipt: orderData.orderId,
        });
        orderData.razorpayOrderId = rpOrder.id;
      } catch (err) {
        console.error("Razorpay Order Creation Failed:", err.message);
        return error(
          res,
          "Payment gateway initialization failed. Please try again later.",
          502,
          "PAYMENT_GATEWAY_ERROR",
        );
      }
    }

    const order = await Order.create(orderData);

    // Enrich guest profile
    await enrichUserProfileFromOrder(userId, shippingAddress);

    // Notify sellers
    const sellerCounts = new Map();
    for (const item of orderData.items) {
      const sid = item?.sellerId ? String(item.sellerId) : "";
      if (!sid) continue;
      sellerCounts.set(
        sid,
        (sellerCounts.get(sid) || 0) + (Number(item.quantity) || 0),
      );
    }
    if (sellerCounts.size > 0) {
      const sellerOrderLink = `/seller/order-details/${order._id}`;
      const docs = Array.from(sellerCounts.entries()).map(([sid, qty]) => ({
        sellerId: sid,
        title: "New order received",
        message: `Order ${order.orderId} placed (${qty} item${qty === 1 ? "" : "s"}).`,
        type: "ORDER",
        priority: "Medium",
        link: sellerOrderLink,
        isBroadcast: false,
        isRead: false,
      }));
      try {
        await Notification.insertMany(docs);
      } catch (e) {
        /* ignore */
      }
    }

    // ── Realtime: emit new_order to admin + sellers (best-effort) ─────────────
    try {
      emitNewOrder(order);
    } catch (e) {
      /* non-blocking */
    }

    // 5. Deduct Stock immediately ONLY for COD
    if (paymentMethod === "cod") {
      await deductStockForOrder(orderData.items, order.orderId, userId);

      // Platform commission accrual (per-seller ledger entries, status="pending").
      // Wrapped in `safe: true` so a ledger failure never blocks the order itself.
      try {
        await accrueCommissionsForOrder(order, {
          triggeredBy: "place_order",
          safe: true,
        });
      } catch (e) {
        console.error("[Commission] COD accrual hook error:", e.message);
      }

      if (order.couponCode) {
        await Coupon.updateOne(
          { code: order.couponCode, active: true },
          {
            $inc: { usageCount: 1 },
            $push: { usedBy: { userId, usedAt: new Date() } },
          },
        );
      }

      // Atomically redeem gift cards for COD order
      if (
        Array.isArray(order.appliedGiftCards) &&
        order.appliedGiftCards.length > 0
      ) {
        for (const gc of order.appliedGiftCards) {
          if (!gc.cardId || !gc.amountUsed) continue;
          const updatedCard = await GiftCard.findOneAndUpdate(
            {
              _id: gc.cardId,
              status: { $in: ["active", "partially_used"] },
              balance: { $gte: gc.amountUsed },
            },
            {
              $inc: { balance: -gc.amountUsed },
              $push: {
                redemptions: {
                  orderId: order.orderId,
                  amountUsed: gc.amountUsed,
                  redeemedAt: new Date(),
                  redeemedByUserId: order.userId,
                },
              },
            },
            { new: true },
          );
          if (updatedCard) {
            const newStatus =
              updatedCard.balance <= 0
                ? "used"
                : updatedCard.balance < updatedCard.value
                  ? "partially_used"
                  : "active";
            await GiftCard.updateOne({ _id: gc.cardId }, { status: newStatus });
          }
        }
      }

      // Fulfill any purchased gift cards in this order
      try {
        const { fulfillGiftCardsInOrder } = require("./giftCard.controller");
        await fulfillGiftCardsInOrder(order);
      } catch (e) {
        console.error("[GiftCard] Order fulfillment hook error:", e);
      }

      // -- Email: order confirmation (COD) --
      const recipientEmail =
        order.customerEmail ||
        (order.shippingAddress && order.shippingAddress.email);
      if (recipientEmail) {
        enqueueEmail({
          to: recipientEmail,
          subject: "Order Confirmed - " + order.orderId + " | Sands Jewels",
          html: emailTemplates.orderConfirmation({
            order,
            userName: order.customerName,
          }),
          type: "order_confirmation",
        });
      }

      // -- Email: seller notification for each seller --
      const sellerItemMap = new Map();
      for (const item of order.items || []) {
        if (!item.sellerId) continue;
        const key = String(item.sellerId);
        if (!sellerItemMap.has(key)) sellerItemMap.set(key, []);
        sellerItemMap.get(key).push(item);
      }
      if (sellerItemMap.size > 0) {
        const sellerIds = Array.from(sellerItemMap.keys());
        const sellers = await Seller.find({ _id: { $in: sellerIds } }).select(
          "email shopName fullName",
        );
        for (const seller of sellers) {
          if (!seller.email) continue;
          enqueueEmail({
            to: seller.email,
            subject: "New Order - " + order.orderId + " | Sands Jewels",
            html: emailTemplates.sellerNewOrder({
              order,
              sellerName: seller.shopName || seller.fullName,
              sellerItems: sellerItemMap.get(String(seller._id)),
            }),
            type: "seller_new_order",
          });
        }
      }
    }

    return success(res, { order }, "Order placed successfully", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const enrichUserProfileFromOrder = async (userId, shippingAddress) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      let updated = false;
      if (
        (!user.name || user.name === "Guest User") &&
        shippingAddress.firstName
      ) {
        user.name =
          `${shippingAddress.firstName} ${shippingAddress.lastName || ""}`.trim();
        updated = true;
      }
      if (!user.email && shippingAddress.email) {
        user.email = String(shippingAddress.email).trim().toLowerCase();
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }
  } catch (err) {
    console.error("Failed to enrich user profile from order:", err.message);
  }
};

// Export the helpers so payment controller can use them
exports._deductStockForOrder = deductStockForOrder;
exports._applyCoupon = applyCoupon;
exports._calculateOrderData = _calculateOrderData;
exports.enrichUserProfileFromOrder = enrichUserProfileFromOrder;

// ─────────────────────────────────────────────────────────────────
// GET /api/user/orders
// ─────────────────────────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });
    return success(res, { orders }, "Order history retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/user/orders/:id
// ─────────────────────────────────────────────────────────────────
exports.getOrderDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return error(res, "Invalid order id", 400);
    }
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!order) return error(res, "Order not found", 404);
    return success(res, { order }, "Order details retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/user/orders/:id/cancel
// ─────────────────────────────────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return error(res, "Invalid order id", 400);
    }
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!order) return error(res, "Order not found", 404);

    if (["Shipped", "Delivered", "Cancelled"].includes(order.status)) {
      return error(res, `Cannot cancel order in ${order.status} status`, 400);
    }

    order.status = "Cancelled";
    order.timeline.push({ status: "Cancelled", note: "Cancelled by user" });
    await order.save();

    // Refund any applied gift cards (restoring balance and updating status)
    if (
      Array.isArray(order.appliedGiftCards) &&
      order.appliedGiftCards.length > 0
    ) {
      for (const gc of order.appliedGiftCards) {
        if (!gc.cardId || !gc.amountUsed) continue;
        const updatedCard = await GiftCard.findOneAndUpdate(
          { _id: gc.cardId },
          {
            $inc: { balance: gc.amountUsed },
            $pull: { redemptions: { orderId: order.orderId } },
          },
          { new: true },
        );
        if (updatedCard) {
          const newStatus =
            updatedCard.balance <= 0
              ? "used"
              : updatedCard.balance < updatedCard.value
                ? "partially_used"
                : "active";
          await GiftCard.updateOne({ _id: gc.cardId }, { status: newStatus });
          console.log(
            `[GiftCard] Refunded ₹${gc.amountUsed} back to card ${gc.code} (new balance: ₹${updatedCard.balance}) for cancelled order ${order.orderId}`,
          );
        }
      }
    }

    // Reverse platform commission ledger entries (decision F: full reversal).
    // Safe: never let a ledger error block the cancellation itself.
    try {
      await reverseCommissionsForOrder(order._id, {
        triggeredBy: "order_cancelled",
        reasonNote: "Cancelled by user",
        safe: true,
      });
    } catch (e) {
      console.error("[Commission] User-cancel reversal error:", e.message);
    }

    // Restock only if stock was already deducted (COD or paid Razorpay orders)
    if (order.paymentStatus === "cod" || order.paymentStatus === "paid") {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        const variant = product?.variants.id(item.variantId);
        if (!product || !variant) continue;

        const quantity = Number(item.quantity) || 0;
        if (quantity <= 0) continue;

        const previousStock = Number(variant.stock) || 0;
        const variantIndex = product.variants.findIndex(
          (v) => String(v._id) === String(item.variantId),
        );

        if (isSerializedVariant(product, variant)) {
          restockSerializedUnits({
            product,
            variant,
            quantity,
            variantIndex,
          });
        } else {
          variant.stock = previousStock + quantity;
        }

        variant.sold = Math.max(0, (Number(variant.sold) || 0) - quantity);
        await product.save();

        await StockLog.create({
          productId: item.productId,
          variantId: item.variantId,
          changeType: "return",
          previousStock,
          newStock: variant.stock,
          change: variant.stock - previousStock,
          reason: `Order ${order.orderId} cancelled by user`,
          userId: req.user.userId,
        });
      }
    }

    return success(res, { order }, "Order cancelled successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
