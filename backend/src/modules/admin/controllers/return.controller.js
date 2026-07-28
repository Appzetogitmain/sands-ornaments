const Return = require("../../../models/Return");
const Order = require("../../../models/Order");
const Product = require("../../../models/Product");
const StockLog = require("../../../models/StockLog");
const User = require("../../../models/User");
const { success, error } = require("../../../utils/apiResponse");
const { enqueueEmail } = require("../../../services/emailService");
const emailTemplates = require("../../../services/emailTemplates");
const {
  isSerializedVariant,
  restockSerializedUnits,
} = require("../../../utils/inventorySync");
const {
  reverseCommissionsForOrder,
  adjustCommissionsForReturn,
} = require("../../../services/commissionService");
const { createNotification } = require("../../../services/notificationService");

const VALID_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Pickup Scheduled",
  "Pickup Completed",
  "Refund Initiated",
  "Refunded",
  "Closed",
];

const ALLOWED_TRANSITIONS = {
  Pending: ["Approved", "Rejected"],
  Approved: ["Pickup Scheduled", "Refund Initiated", "Refunded", "Closed"],
  Rejected: [],
  "Pickup Scheduled": ["Pickup Completed"],
  "Pickup Completed": ["Refund Initiated", "Refunded", "Closed"],
  "Refund Initiated": ["Refunded", "Closed"],
  Refunded: ["Closed"],
  Closed: [],
};

const STATUSES_THAT_KEEP_ORDER_IN_RETURN_FLOW = [
  "Pending",
  "Approved",
  "Pickup Scheduled",
  "Pickup Completed",
  "Refund Initiated",
];
const VOID_TAG_REQUIRED_STATUSES = new Set(["Approved", "Rejected"]);

const shouldMarkOrderAsReturned = (currentStatus, nextStatus) => {
  if (nextStatus === "Refunded") return true;
  if (nextStatus !== "Closed") return false;

  return [
    "Approved",
    "Pickup Scheduled",
    "Pickup Completed",
    "Refund Initiated",
    "Refunded",
    "Closed",
  ].includes(currentStatus);
};

const buildOrderStatusFromReturnStatus = (currentStatus, nextStatus) => {
  if (STATUSES_THAT_KEEP_ORDER_IN_RETURN_FLOW.includes(nextStatus)) {
    return "Return Requested";
  }

  if (nextStatus === "Rejected") {
    return "Delivered";
  }

  if (shouldMarkOrderAsReturned(currentStatus, nextStatus)) {
    return "Returned";
  }

  return null;
};

const returnRequiresVoidTagVerification = (returnReq) =>
  (returnReq?.items || []).some((item) => String(item?.voidTagId || "").trim());

const validateVoidTagDecision = ({ returnReq, nextStatus, voidTagStatus }) => {
  if (
    !VOID_TAG_REQUIRED_STATUSES.has(nextStatus) ||
    !returnRequiresVoidTagVerification(returnReq)
  ) {
    return null;
  }

  if (!["Intact", "Tampered", "Missing"].includes(voidTagStatus)) {
    return "Seal verification is required before processing this return";
  }

  if (nextStatus === "Approved" && voidTagStatus !== "Intact") {
    return "A return with a tampered or missing security seal cannot be approved";
  }

  return null;
};

exports.getAllReturns = async (req, res) => {
  try {
    const {
      status,
      search = "",
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return error(
        res,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
      );
    }

    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 20),
    );
    const trimmedSearch = String(search || "").trim();

    const query = {};
    if (status) {
      query.status = status;
    }

    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "requestDate",
      "status",
      "returnId",
    ]);
    const safeSortBy = allowedSortFields.has(String(sortBy))
      ? String(sortBy)
      : "createdAt";
    const safeSortOrder = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const searchRegex = new RegExp(escapedSearch, "i");

      const [matchedUsers, matchedOrders] = await Promise.all([
        User.find({
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ],
        })
          .select("_id")
          .lean(),
        Order.find({ orderId: searchRegex }).select("_id").lean(),
      ]);

      const matchedUserIds = matchedUsers.map((user) => user._id);
      const matchedOrderIds = matchedOrders.map((order) => order._id);

      query.$or = [
        { returnId: searchRegex },
        { "evidence.reason": searchRegex },
        { "items.name": searchRegex },
        { "items.sku": searchRegex },
      ];

      if (matchedUserIds.length > 0) {
        query.$or.push({ userId: { $in: matchedUserIds } });
      }
      if (matchedOrderIds.length > 0) {
        query.$or.push({ orderId: { $in: matchedOrderIds } });
      }
    }

    const total = await Return.countDocuments(query);
    const returns = await Return.find(query)
      .populate("userId", "name email phone")
      .populate("orderId", "orderId paymentStatus total")
      .sort({ [safeSortBy]: safeSortOrder })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    return success(
      res,
      {
        returns,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          pages: Math.max(1, Math.ceil(total / safeLimit)),
        },
        filters: {
          status: status || null,
          search: trimmedSearch,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder === 1 ? "asc" : "desc",
        },
      },
      "Returns retrieved",
    );
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getReturnDetail = async (req, res) => {
  try {
    const returnReq = await Return.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("orderId", "orderId paymentStatus total shippingAddress");
    if (!returnReq) return error(res, "Return request not found", 404);
    return success(res, { returnReq }, "Return detail retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateReturnStatus = async (req, res) => {
  try {
    const {
      status,
      note,
      refundAmount,
      refundMethod,
      refundTransactionId,
      pickupPartner,
      pickupAwb,
      pickupScheduledDate,
      voidTagStatus,
      voidTagNotes,
    } = req.body;
    const returnReq = await Return.findById(req.params.id).populate(
      "orderId",
      "orderId paymentStatus total shippingAddress",
    );
    if (!returnReq) return error(res, "Return request not found", 404);
    if (!VALID_STATUSES.includes(status)) {
      return error(
        res,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
      );
    }

    const currentStatus = String(returnReq.status || "").trim();
    const nextStatus = String(status || "").trim();
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (currentStatus !== nextStatus && !allowed.includes(nextStatus)) {
      return error(
        res,
        `Invalid status transition from ${currentStatus} to ${nextStatus}`,
        400,
      );
    }

    const voidTagValidationError = validateVoidTagDecision({
      returnReq,
      nextStatus,
      voidTagStatus,
    });
    if (voidTagValidationError) {
      return error(res, voidTagValidationError, 400);
    }

    returnReq.status = nextStatus;
    if (typeof note === "string" && note.trim()) {
      returnReq.adminComment = note.trim();
    }
    if (
      refundAmount !== undefined &&
      refundAmount !== null &&
      refundAmount !== ""
    ) {
      returnReq.refund = {
        ...(returnReq.refund || {}),
        amount: Number(refundAmount) || 0,
        initiatedAt: ["Refund Initiated", "Refunded"].includes(nextStatus)
          ? returnReq.refund?.initiatedAt || new Date()
          : returnReq.refund?.initiatedAt,
      };
    }
    if (typeof refundMethod === "string" && refundMethod.trim()) {
      returnReq.refund = {
        ...(returnReq.refund || {}),
        method: refundMethod.trim(),
      };
    }
    if (typeof refundTransactionId === "string" && refundTransactionId.trim()) {
      returnReq.refund = {
        ...(returnReq.refund || {}),
        transactionId: refundTransactionId.trim(),
      };
    }
    if (
      nextStatus === "Pickup Scheduled" ||
      nextStatus === "Pickup Completed"
    ) {
      returnReq.pickup = {
        ...(returnReq.pickup || {}),
        partner:
          typeof pickupPartner === "string" && pickupPartner.trim()
            ? pickupPartner.trim()
            : returnReq.pickup?.partner,
        awb:
          typeof pickupAwb === "string" && pickupAwb.trim()
            ? pickupAwb.trim()
            : returnReq.pickup?.awb,
        scheduledDate:
          pickupScheduledDate || returnReq.pickup?.scheduledDate || new Date(),
        status: nextStatus === "Pickup Completed" ? "Completed" : "Scheduled",
      };
    }

    if (voidTagStatus) {
      returnReq.voidTagVerification = {
        status: voidTagStatus,
        notes: voidTagNotes || "",
      };
    }
    returnReq.timeline.push({
      status: nextStatus,
      note: note || `Return status updated to ${nextStatus}`,
      date: new Date(),
    });
    returnReq.logs.push({
      action: "STATUS_UPDATE",
      comment: note || `Return status updated to ${nextStatus}`,
      by: "admin",
      date: new Date(),
    });
    await returnReq.save();

    const order = returnReq.orderId;

    const needsRestock =
      nextStatus === "Refunded" && !returnReq.inventory?.restockedAt;
    if (needsRestock) {
      // Restock each returned item only once when the refund is actually completed
      if (order) {
        for (const item of returnReq.items) {
          const quantity = Number(item.qty ?? item.quantity ?? 0);
          if (item.productId && item.variantId && quantity > 0) {
            const product = await Product.findById(item.productId);
            if (!product) continue;

            const variant = product.variants.id(item.variantId);
            if (!variant) continue;

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
              productId: product._id,
              variantId: variant._id,
              changeType: "return",
              previousStock,
              newStock: variant.stock,
              change: variant.stock - previousStock,
              reason: `Return ${nextStatus} for order ${order.orderId || order._id}`,
              adminId: req.user.userId,
            });
          }
        }

        returnReq.inventory = {
          ...(returnReq.inventory || {}),
          restockedAt: new Date(),
          restockedByStatus: nextStatus,
        };
        await returnReq.save();
      }
    }

    if (order) {
      const fullOrder = await Order.findById(order._id);
      const totalOrderQty = (fullOrder?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      
      const completedReturns = await Return.find({ orderId: order._id, status: "Refunded" });
      const currentRefundTransitioning = (nextStatus === "Refunded" && returnReq.status !== "Refunded");
      const returnedQty = completedReturns.reduce((sum, r) => sum + r.items.reduce((s, it) => s + (Number(it.qty) || 0), 0), 0) +
                          (currentRefundTransitioning
                            ? returnReq.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
                            : 0);

      const nextOrderStatus = buildOrderStatusFromReturnStatus(
        currentStatus,
        nextStatus,
      );
      const orderUpdate = {};

      if (nextStatus === "Refunded") {
        orderUpdate.paymentStatus = returnedQty < totalOrderQty ? "partially_refunded" : "refunded";
      }

      if (nextOrderStatus) {
        let finalOrderStatus = nextOrderStatus;
        
        if (finalOrderStatus === "Delivered") {
          const { hasOtherActiveClaims } = require("../../../utils/activeClaimsHelper");
          const otherActive = await hasOtherActiveClaims(order._id, returnReq._id);
          if (otherActive) {
            finalOrderStatus = "Return Requested";
          }
        }

        if (returnedQty > 0) {
          if (returnedQty < totalOrderQty) {
            finalOrderStatus = "Partially Returned";
          } else {
            finalOrderStatus = "Returned";
          }
        }
        orderUpdate.status = finalOrderStatus;
      }

      if (Object.keys(orderUpdate).length > 0) {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: orderUpdate,
            $push: {
              timeline: {
                status: orderUpdate.status || order.status,
                note: note || `Return updated to ${nextStatus}`,
                date: new Date(),
              },
            },
          },
        );
      }

      // ── Platform commission adjustment ──
      // Fire only when the refund actually completes.
      if (nextStatus === "Refunded") {
        try {
          await adjustCommissionsForReturn(order._id, returnReq, {
            session: null,
            safe: true,
          });
        } catch (e) {
          console.error(
            "[Commission] Return-refund adjustment error:",
            e.message,
          );
        }
      }
    }

    const refreshed = await Return.findById(returnReq._id)
      .populate("userId", "name email phone")
      .populate("orderId", "orderId paymentStatus total shippingAddress");

    // -- Email: return status update to customer --
    const returnUser = refreshed.userId;
    const returnOrder = refreshed.orderId;
    const userEmail = returnUser && returnUser.email;
    if (userEmail) {
      enqueueEmail({
        to: userEmail,
        subject:
          "Return Update: " +
          nextStatus +
          " - " +
          (refreshed.returnId || "") +
          " | Sands Jewels",
        html: emailTemplates.returnStatusUpdate({
          returnReq: refreshed,
          userName: returnUser.name,
          newStatus: nextStatus,
          note: note || "",
          order: returnOrder,
        }),
        type: "return_status_update",
      });
    }

    if (nextStatus === "Refunded" && returnUser?._id) {
      try {
        await createNotification({
          userId: returnUser._id,
          title: "Refund Processed",
          message: `A refund of ₹${refreshed.refund?.amount || 0} has been processed for your return request on order #${returnOrder?.orderId || returnOrder?._id}.`,
          type: "RETURN",
          link: "/profile/orders",
        });
      } catch (err) {
        console.error(
          "[Notification] Failed to create return refund notification:",
          err.message,
        );
      }
    }

    return success(
      res,
      { returnReq: refreshed },
      `Return ${nextStatus} successfully`,
    );
  } catch (err) {
    return error(res, err.message);
  }
};
