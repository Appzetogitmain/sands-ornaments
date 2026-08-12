const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const Seller = require("../../../models/Seller");
const SellerInvoice = require("../../../models/SellerInvoice");
const { success, error } = require("../../../utils/apiResponse");

const INVOICE_ELIGIBLE_STATUSES = new Set([
  "Confirmed",
  "Packed",
  "Partially Shipped",
  "Shipped",
  "Out for Delivery",
  "Delivered",
]);

const roundCurrency = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const sellerItemsForOrder = (order, sellerId) =>
  (order.items || []).filter((item) => String(item?.sellerId || "") === String(sellerId));

const getSellerOrder = async (orderId, sellerId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
  return Order.findOne({
    _id: orderId,
    "items.sellerId": new mongoose.Types.ObjectId(sellerId),
  }).lean();
};

const getAllocation = (order, sellerId, sellerItems) => {
  const saved = (order.sellerInvoiceAllocations || []).find(
    (entry) => String(entry?.sellerId || "") === String(sellerId),
  );

  if (saved) {
    return {
      itemSubtotal: roundCurrency(saved.itemSubtotal),
      giftWrapCharge: roundCurrency(saved.giftWrapCharge),
      couponDiscount: roundCurrency(saved.couponDiscount),
      method: "exact_order_snapshot",
      note: "Seller totals were captured at checkout.",
    };
  }

  // Historical orders predate sellerInvoiceAllocations. Do not infer current
  // catalogue/coupon rules; allocate only the recorded order-level discount.
  const itemSubtotal = sellerItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const giftWrapCharge = sellerItems.reduce(
    (sum, item) => sum + (item.giftWrap ? 50 : 0),
    0,
  );
  const orderSubtotal = Number(order.subtotal || 0);
  const couponDiscount =
    orderSubtotal > 0
      ? (Number(order.discount || 0) * itemSubtotal) / orderSubtotal
      : 0;

  return {
    itemSubtotal: roundCurrency(itemSubtotal),
    giftWrapCharge: roundCurrency(giftWrapCharge),
    couponDiscount: roundCurrency(couponDiscount),
    method: "pro_rata_historical",
    note: "This historical order predates seller allocation snapshots; the recorded order discount is pro-rated by item value.",
  };
};

const buildInvoiceNumber = (order, sellerId) => {
  const year = new Date(order.createdAt || Date.now()).getFullYear();
  const sellerSuffix = String(sellerId).slice(-6).toUpperCase();
  return `SINV-${year}-${String(order.orderId || order._id).toUpperCase()}-S${sellerSuffix}`;
};

const buildInvoicePayload = (order, seller, sellerId) => {
  const sellerItems = sellerItemsForOrder(order, sellerId);
  const allocation = getAllocation(order, sellerId, sellerItems);
  const customerAddress = order.shippingAddress || {};

  return {
    orderId: order._id,
    sellerId,
    invoiceNumber: buildInvoiceNumber(order, sellerId),
    order: {
      orderNumber: order.orderId || String(order._id),
      placedAt: order.createdAt,
      statusAtIssue: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    },
    seller: {
      shopName: seller.shopName || seller.fullName || "Seller",
      contactName: seller.fullName || "",
      email: seller.email || "",
      phone: seller.mobileNumber || "",
      gstNumber: seller.gstNumber || "",
      panNumber: seller.panNumber || "",
      address: {
        address: seller.shopAddress || "",
        city: seller.city || "",
        state: seller.state || "",
        pincode: seller.pincode || "",
      },
    },
    customer: {
      name: order.customerName || [customerAddress.firstName, customerAddress.lastName].filter(Boolean).join(" "),
      email: order.customerEmail || customerAddress.email || "",
      phone: order.customerPhone || customerAddress.phone || "",
      address: {
        flatNo: customerAddress.flatNo || "",
        area: customerAddress.area || "",
        city: customerAddress.city || "",
        district: customerAddress.district || "",
        state: customerAddress.state || "",
        pincode: customerAddress.pincode || "",
      },
    },
    items: sellerItems.map((item) => ({
      name: item.name || "Product",
      sku: item.sku || "",
      quantity: Number(item.quantity || 0),
      unitPrice: roundCurrency(item.price),
      lineTotal: roundCurrency(Number(item.price || 0) * Number(item.quantity || 0)),
      giftWrap: Boolean(item.giftWrap),
    })),
    totals: {
      itemSubtotal: allocation.itemSubtotal,
      giftWrapCharge: allocation.giftWrapCharge,
      couponDiscount: allocation.couponDiscount,
      invoiceTotal: roundCurrency(
        allocation.itemSubtotal + allocation.giftWrapCharge - allocation.couponDiscount,
      ),
    },
    allocation: { method: allocation.method, note: allocation.note },
  };
};

exports.issueInvoice = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const order = await getSellerOrder(req.params.id, sellerId);
    if (!order) return error(res, "Order not found", 404);

    const existing = await SellerInvoice.findOne({ orderId: order._id, sellerId }).lean();
    if (existing) return success(res, { invoice: existing }, "Seller invoice retrieved");

    if (!INVOICE_ELIGIBLE_STATUSES.has(order.status)) {
      return error(res, "An invoice can be issued after the order is confirmed and before it is cancelled or returned.", 400);
    }

    const seller = await Seller.findById(sellerId).lean();
    if (!seller) return error(res, "Seller profile not found", 404);

    try {
      const invoice = await SellerInvoice.create(buildInvoicePayload(order, seller, sellerId));
      return success(res, { invoice }, "Seller invoice issued", 201);
    } catch (createError) {
      if (createError?.code === 11000) {
        const invoice = await SellerInvoice.findOne({ orderId: order._id, sellerId }).lean();
        if (invoice) return success(res, { invoice }, "Seller invoice retrieved");
      }
      throw createError;
    }
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const order = await getSellerOrder(req.params.id, sellerId);
    if (!order) return error(res, "Order not found", 404);

    const invoice = await SellerInvoice.findOne({ orderId: order._id, sellerId }).lean();
    if (!invoice) return error(res, "Seller invoice has not been issued yet", 404);

    return success(res, { invoice }, "Seller invoice retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};
