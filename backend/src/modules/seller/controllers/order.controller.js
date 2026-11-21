const Order = require("../../../models/Order");
const Commission = require("../../../models/Commission");
const { success, error } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");
const { emitOrderStatusUpdate } = require("../../../services/socketEmitter");
const {
  confirmCommissionsForOrder,
  reverseCommissionsForOrder
} = require("../../../services/commissionService");
const { calculateOrderCodAllocations } = require("../../../services/shipping/codAllocation");

/**
 * Aggregate per-seller, per-order net commission totals for a list of order IDs.
 *
 * Returns Map<orderIdString, { net, confirmed, pending, reversed, status }>.
 *
 * Used to enrich seller order list / detail with the seller's own slice of
 * commission without exposing other sellers' commission on shared orders.
 */
const fetchSellerCommissionMap = async (orderIds, sellerId) => {
  const ids = (orderIds || []).filter(Boolean).map((id) => new mongoose.Types.ObjectId(id));
  if (ids.length === 0) return new Map();

  const rows = await Commission.aggregate([
    { $match: { orderId: { $in: ids }, sellerId: new mongoose.Types.ObjectId(sellerId) } },
    {
      $group: {
        _id: { orderId: "$orderId", type: "$type", status: "$status" },
        commissionAmount: { $sum: "$commissionAmount" },
        discountShare: { $sum: "$sellerDiscountShare" }
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const key = String(row._id.orderId);
    if (!map.has(key)) {
      map.set(key, { confirmed: 0, pending: 0, reversed: 0, net: 0, discountShare: 0, status: "none" });
    }
    const e = map.get(key);
    const a = Number(row.commissionAmount) || 0;
    const ds = Number(row.discountShare) || 0;

    if (row._id.type === "reversal") {
      if (row._id.status === "confirmed") e.reversed += a;
      e.discountShare -= ds;
    } else {
      if (row._id.status === "confirmed") e.confirmed += a;
      else if (row._id.status === "pending")   e.pending   += a;
      e.discountShare += ds;
    }
  }
  for (const entry of map.values()) {
    entry.net = entry.confirmed - entry.reversed;
    if (entry.reversed > 0 && (entry.confirmed > 0 || entry.pending > 0)) entry.status = "partial";
    else if (entry.reversed > 0) entry.status = "reversed";
    else if (entry.confirmed > 0) entry.status = "confirmed";
    else if (entry.pending > 0)   entry.status = "pending";
  }
  return map;
};

const normalizeOrderStatus = (value = "") => String(value || "").trim();

const allowedTransitions = {
  Pending: [],
  Processing: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed"],
  Packed: ["Shipped"],
  "Partially Shipped": ["Shipped"],
  Shipped: ["Delivered"],
};

const filterSellerItems = (items = [], sellerId) =>
  (items || []).filter((item) => String(item?.sellerId || "") === String(sellerId));

const getPrimaryItemImage = (item = {}) =>
  item.image ||
  item.productId?.images?.[0] ||
  item.productId?.image ||
  "";

const buildSellerOrderSummary = (order, sellerId, commissionEntry = null) => {
  const sellerItems = filterSellerItems(order.items, sellerId);
  const sellerSubtotal = sellerItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  const allItemsOwnedBySeller = sellerItems.length > 0 && sellerItems.length === (order.items || []).length;

  const user = order.userId || {};
  const address = order.shippingAddress || {};
  const fallbackCustomerName =
    order.customerName ||
    user.fullName ||
    user.name ||
    [address.firstName, address.lastName].filter(Boolean).join(" ") ||
    "Customer";
  const fallbackCustomerEmail = order.customerEmail || user.email || address.email || "";
  const fallbackCustomerPhone = order.customerPhone || user.mobileNumber || address.phone || "";

  const sellerCommission = commissionEntry || { confirmed: 0, pending: 0, reversed: 0, net: 0, discountShare: 0, status: "none" };
  const sellerNetEarning = Math.max(0, Number(sellerSubtotal) - Number(sellerCommission.net || 0) - Number(sellerCommission.discountShare || 0));
  const codAllocations = calculateOrderCodAllocations(order);
  const sellerCodAmount = codAllocations[String(sellerId)] || 0;

  return {
    _id: order._id,
    orderId: order.orderId,
    customerName: fallbackCustomerName,
    customerEmail: fallbackCustomerEmail,
    customerPhone: fallbackCustomerPhone,
    userId: order.userId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shippingAddress: order.shippingAddress,
    shippingInfo: order.shippingInfo,
    timeline: order.timeline,
    sellerItems,
    sellerItemCount: sellerItems.length,
    sellerSubtotal,
    allItemsOwnedBySeller,
    canManageStatus: allItemsOwnedBySeller,
    allowedNextStatuses: allItemsOwnedBySeller ? (allowedTransitions[order.status] || []) : [],
    sellerCommission,
    sellerNetEarning,
    sellerCodAmount,
    commissionSummary: order.commissionSummary || null,
  };
};

exports.getMyOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const { status, paymentStatus, search } = req.query;

    const query = { "items.sellerId": sellerObjectId };
    if (status) {
      query.status = String(status);
    }
    if (paymentStatus) {
      query.paymentStatus = String(paymentStatus);
    }
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { orderId: { $regex: escaped, $options: "i" } },
        { customerName: { $regex: escaped, $options: "i" } },
        { customerEmail: { $regex: escaped, $options: "i" } },
        { customerPhone: { $regex: escaped, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("userId", "fullName email mobileNumber")
        .populate("items.productId", "name images image variants")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    const commissionMap = await fetchSellerCommissionMap(orders.map((o) => o._id), sellerId);

    const sellerOrders = orders
      .map((order) => buildSellerOrderSummary(order, sellerId, commissionMap.get(String(order._id))))
      .filter((order) => order.sellerItemCount > 0);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return success(res, {
      orders: sellerOrders,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages
      }
    }, "Seller orders retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.getMyOrderDetail = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return error(res, "Invalid order id", 400);
    }
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    const order = await Order.findOne({ _id: req.params.id, "items.sellerId": sellerObjectId })
      .populate("userId", "fullName email mobileNumber")
      .lean();

    if (!order) return error(res, "Order not found", 404);

    const hasValidProducts = order.items && order.items.some(
      item => item.productId && mongoose.Types.ObjectId.isValid(item.productId)
    );
    if (hasValidProducts) {
      await Order.populate(order, {
        path: "items.productId",
        select: "name images image variants",
        model: "Product"
      });
    }

    const commissionMap = await fetchSellerCommissionMap([order._id], sellerId);
    const sellerOrder = buildSellerOrderSummary(order, sellerId, commissionMap.get(String(order._id)));
    return success(res, { order: sellerOrder }, "Seller order retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note, shippingInfo, itemVoidTags } = req.body;
    const sellerId = req.user.userId;
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    const nextStatus = normalizeOrderStatus(status);
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order id", 400);
    }

    if (!nextStatus) return error(res, "Status is required", 400);

    const order = await Order.findOne({ _id: orderId, "items.sellerId": sellerObjectId })
      .populate("userId", "fullName email mobileNumber");

    if (!order) return error(res, "Order not found", 404);

    const hasValidProducts = order.items && order.items.some(
      item => item.productId && mongoose.Types.ObjectId.isValid(item.productId)
    );
    if (hasValidProducts) {
      await Order.populate(order, {
        path: "items.productId",
        select: "name images image variants",
        model: "Product"
      });
    }

    const sellerItems = filterSellerItems(order.items, sellerId);
    if (sellerItems.length !== (order.items || []).length) {
      return error(res, "This order contains items from multiple owners and must be managed by admin", 400);
    }

    const normalizedShippingInfo = shippingInfo && typeof shippingInfo === "object"
      ? {
          carrier: String(shippingInfo.carrier || "").trim(),
          trackingId: String(shippingInfo.trackingId || "").trim(),
          trackingUrl: String(shippingInfo.trackingUrl || "").trim(),
          estimatedDelivery: shippingInfo.estimatedDelivery || undefined
        }
      : null;

    const allowedStatuses = allowedTransitions[order.status] || [];
    const isSameStatusUpdate = nextStatus === order.status;
    if (!isSameStatusUpdate && !allowedStatuses.includes(nextStatus)) {
      return error(res, `Seller cannot move order from ${order.status} to ${nextStatus}`, 400);
    }

    if (Array.isArray(itemVoidTags)) {
      itemVoidTags.forEach(({ itemId, voidTagId }) => {
        const item = order.items.id(itemId);
        if (item) {
          item.voidTagId = String(voidTagId || "").trim();
        }
      });
    }

    if (["Shipped", "Delivered"].includes(nextStatus)) {
      const mergedShippingInfo = {
        ...(order.shippingInfo || {}),
        ...(normalizedShippingInfo || {})
      };

      if (!String(mergedShippingInfo.carrier || "").trim()) {
        return error(res, "Carrier is required before marking this order for shipment", 400);
      }

      order.shippingInfo = mergedShippingInfo;
    } else if (normalizedShippingInfo) {
      order.shippingInfo = {
        ...(order.shippingInfo || {}),
        ...normalizedShippingInfo
      };
    }

    if (!isSameStatusUpdate) {
      order.status = nextStatus;
    }

    if (nextStatus === "Shipped") {
      order.shippingInfo = {
        ...order.shippingInfo,
        carrier: order.shippingInfo?.carrier || "Manual Dispatch",
      };
    }

    order.timeline.push({
      status: isSameStatusUpdate ? order.status : nextStatus,
      note: note || (isSameStatusUpdate ? "Seller updated shipping info" : `Seller updated order status to ${nextStatus}`),
      date: new Date()
    });

    await order.save();

    const refreshed = await Order.findById(order._id)
      .populate("userId", "fullName email mobileNumber")
      .lean();

    const hasValidProductsRefreshed = refreshed.items && refreshed.items.some(
      item => item.productId && mongoose.Types.ObjectId.isValid(item.productId)
    );
    if (hasValidProductsRefreshed) {
      await Order.populate(refreshed, {
        path: "items.productId",
        select: "name images image variants",
        model: "Product"
      });
    }

    // ── Realtime: notify the customer of their order status change (best-effort) ──
    if (!isSameStatusUpdate) {
      try { emitOrderStatusUpdate(order); } catch (e) { /* non-blocking */ }
    }

    // ── Platform commission lifecycle (seller-initiated transitions) ───────────
    // Delivered → flip pending accruals to confirmed
    // Cancelled → fully reverse the ledger (decision F)
    if (!isSameStatusUpdate) {
      try {
        if (nextStatus === "Delivered") {
          await confirmCommissionsForOrder(order._id, { safe: true });
        } else if (nextStatus === "Cancelled") {
          await reverseCommissionsForOrder(order._id, {
            triggeredBy: "order_cancelled",
            reasonNote:  "Cancelled by seller",
            safe:        true,
          });
        }
      } catch (e) {
        console.error("[Commission] Seller status-transition hook error:", e.message);
      }
    }

    return success(
      res,
      { order: buildSellerOrderSummary(refreshed, sellerId) },
      `Order status updated to ${nextStatus}`
    );
  } catch (err) { return error(res, err.message); }
};

exports.getOrderCardData = { buildSellerOrderSummary, getPrimaryItemImage };
