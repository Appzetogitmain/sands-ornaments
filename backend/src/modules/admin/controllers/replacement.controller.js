const Replacement = require("../../../models/Replacement");
const Order = require("../../../models/Order");
const Product = require("../../../models/Product");
const StockLog = require("../../../models/StockLog");
const User = require("../../../models/User");
const { success, error } = require("../../../utils/apiResponse");
const { isSerializedVariant, restockSerializedUnits, consumeSerializedStock, normalizeSerialCodes } = require("../../../utils/inventorySync");
const { enqueueEmail } = require("../../../services/emailService");
const emailTemplates = require("../../../services/emailTemplates");
const { createNotification } = require("../../../services/notificationService");

const VALID_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Pickup Scheduled",
  "Pickup Completed",
  "Replacement Shipped",
  "Delivered",
  "Closed"
];

const ALLOWED_TRANSITIONS_AFTER_PICKUP = {
  Pending: ["Approved", "Rejected"],
  Approved: ["Pickup Scheduled", "Pickup Completed", "Closed"],
  Rejected: [],
  "Pickup Scheduled": ["Pickup Completed"],
  "Pickup Completed": ["Replacement Shipped", "Closed"],
  "Replacement Shipped": ["Delivered", "Closed"],
  Delivered: ["Closed"],
  Closed: []
};

const ALLOWED_TRANSITIONS_IMMEDIATE = {
  Pending: ["Approved", "Rejected"],
  Approved: ["Replacement Shipped", "Closed"],
  Rejected: [],
  "Replacement Shipped": ["Pickup Scheduled", "Pickup Completed", "Delivered", "Closed"],
  "Pickup Scheduled": ["Pickup Completed"],
  "Pickup Completed": ["Delivered", "Closed"],
  Delivered: ["Closed"],
  Closed: []
};

const ACTIVE_REPLACEMENT_ORDER_STATUSES = [
  "Pending",
  "Approved",
  "Pickup Scheduled",
  "Pickup Completed",
  "Replacement Shipped"
];

const buildOrderStatusFromReplacementStatus = (currentStatus, nextStatus) => {
  if (ACTIVE_REPLACEMENT_ORDER_STATUSES.includes(nextStatus)) {
    return "Return Requested";
  }

  if (nextStatus === "Rejected") {
    return "Delivered";
  }

  if (nextStatus === "Delivered" || nextStatus === "Closed") {
    return "Delivered";
  }

  return null;
};

exports.getAllReplacements = async (req, res) => {
  try {
    const {
      status,
      search = "",
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const trimmedSearch = String(search || "").trim();

    const query = {};
    if (status) {
      query.status = status;
    }

    const allowedSortFields = new Set(["createdAt", "updatedAt", "status", "replacementId"]);
    const safeSortBy = allowedSortFields.has(String(sortBy)) ? String(sortBy) : "createdAt";
    const safeSortOrder = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");

      const [matchedUsers, matchedOrders] = await Promise.all([
        User.find({
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
          ]
        }).select("_id").lean(),
        Order.find({ orderId: searchRegex }).select("_id").lean()
      ]);

      const matchedUserIds = matchedUsers.map((user) => user._id);
      const matchedOrderIds = matchedOrders.map((order) => order._id);

      query.$or = [
        { replacementId: searchRegex },
        { "evidence.reason": searchRegex },
        { "originalItems.name": searchRegex },
        { "originalItems.sku": searchRegex }
      ];

      if (matchedUserIds.length > 0) {
        query.$or.push({ userId: { $in: matchedUserIds } });
      }
      if (matchedOrderIds.length > 0) {
        query.$or.push({ orderId: { $in: matchedOrderIds } });
      }
    }

    const total = await Replacement.countDocuments(query);
    const replacements = await Replacement.find(query)
      .populate("userId", "name email phone")
      .populate("orderId", "orderId paymentStatus total shippingAddress")
      .sort({ [safeSortBy]: safeSortOrder })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    return success(res, {
      replacements,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.max(1, Math.ceil(total / safeLimit))
      },
      filters: {
        status: status || null,
        search: trimmedSearch,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder === 1 ? "asc" : "desc"
      }
    }, "Replacements retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.getReplacementDetail = async (req, res) => {
  try {
    const repl = await Replacement.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("orderId", "orderId paymentStatus total shippingAddress");

    if (!repl) return error(res, "Replacement not found", 404);

    return success(res, { repl }, "Replacement detail retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateReplacementStatus = async (req, res) => {
  try {
    const {
      status,
      note,
      replacementMode,
      itemCondition,
      stockAction,
      pickupPartner,
      pickupAwb,
      pickupScheduledDate,
      shipmentPartner,
      shipmentAwb,
      shipmentStatus,
      shipmentTrackingLink
    } = req.body;
    const repl = await Replacement.findById(req.params.id);
    if (!repl) return error(res, "Replacement not found", 404);

    if (!VALID_STATUSES.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const currentStatus = String(repl.status || "").trim();
    const nextStatus = String(status || "").trim();
    
    const effectiveReplacementMode = String(replacementMode || repl.replacementMode || "after_pickup").trim();
    const transitions = effectiveReplacementMode === "immediate" ? ALLOWED_TRANSITIONS_IMMEDIATE : ALLOWED_TRANSITIONS_AFTER_PICKUP;
    const allowed = transitions[currentStatus] || [];
    
    if (currentStatus !== nextStatus && !allowed.includes(nextStatus)) {
      return error(res, `Invalid status transition from ${currentStatus} to ${nextStatus}`, 400);
    }
    
    if (nextStatus === "Replacement Shipped" && effectiveReplacementMode === "after_pickup" && currentStatus !== "Pickup Completed") {
      return error(res, "After-pickup replacements can only be shipped after pickup is completed", 400);
    }
    if (nextStatus === "Pickup Completed") {
      const effectiveItemCondition = String(itemCondition || repl.itemCondition || "").trim();
      const effectiveStockAction = String(stockAction || repl.stockAction || "").trim();
      if (!effectiveItemCondition) {
        return error(res, "Item condition is required before completing pickup", 400);
      }
      if (!effectiveStockAction) {
        return error(res, "Stock action is required before completing pickup", 400);
      }
    }
    if (nextStatus === "Replacement Shipped") {
      const effectiveShipmentPartner = String(shipmentPartner || repl.shipment?.partner || "").trim();
      if (!effectiveShipmentPartner) {
        return error(res, "Shipment partner is required before marking replacement shipped", 400);
      }
    }

    if (nextStatus === "Replacement Shipped" && !repl.inventory?.shippedProcessedAt) {
      for (const item of repl.originalItems || []) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return error(res, `Product ${item.name} not found for replacement`, 404);
        }
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          return error(res, `Variant not found for product ${product.name}`, 404);
        }

        const quantity = Number(item.qty ?? item.quantity ?? 0);
        if (quantity <= 0) continue;

        if (isSerializedVariant(product, variant)) {
          const normalized = normalizeSerialCodes(variant.serialCodes || []);
          const available = normalized.filter((code) => (code.status || "AVAILABLE") === "AVAILABLE");
          if (available.length < quantity) {
            return error(res, `Insufficient serialized stock for replacement item: ${product.name} (${variant.name}). Available: ${available.length}, Required: ${quantity}`, 400);
          }
        } else {
          const currentStock = Number(variant.stock) || 0;
          if (currentStock < quantity) {
            return error(res, `Insufficient stock for replacement item: ${product.name} (${variant.name}). Available: ${currentStock}, Required: ${quantity}`, 400);
          }
        }
      }
    }

    repl.status = nextStatus;
    if (typeof note === "string" && note.trim()) {
      repl.adminComment = note.trim();
    }
    if (typeof replacementMode === "string" && replacementMode.trim()) {
      repl.replacementMode = replacementMode.trim();
    }
    if (typeof itemCondition === "string" && itemCondition.trim()) {
      repl.itemCondition = itemCondition.trim();
    }
    if (typeof stockAction === "string" && stockAction.trim()) {
      repl.stockAction = stockAction.trim();
    }

    if (["Pickup Scheduled", "Pickup Completed"].includes(nextStatus)) {
      repl.pickup = {
        ...(repl.pickup || {}),
        partner: typeof pickupPartner === "string" && pickupPartner.trim() ? pickupPartner.trim() : repl.pickup?.partner,
        awb: typeof pickupAwb === "string" && pickupAwb.trim() ? pickupAwb.trim() : repl.pickup?.awb,
        scheduledDate: pickupScheduledDate || repl.pickup?.scheduledDate || new Date(),
        status: nextStatus === "Pickup Completed" ? "Completed" : "Scheduled"
      };
    }

    if (["Replacement Shipped", "Delivered"].includes(nextStatus)) {
      repl.shipment = {
        ...(repl.shipment || {}),
        partner: typeof shipmentPartner === "string" && shipmentPartner.trim() ? shipmentPartner.trim() : repl.shipment?.partner,
        awb: typeof shipmentAwb === "string" && shipmentAwb.trim() ? shipmentAwb.trim() : repl.shipment?.awb,
        status: typeof shipmentStatus === "string" && shipmentStatus.trim()
          ? shipmentStatus.trim()
          : (nextStatus === "Delivered" ? "Delivered" : "Shipped"),
        trackingLink: typeof shipmentTrackingLink === "string" && shipmentTrackingLink.trim()
          ? shipmentTrackingLink.trim()
          : repl.shipment?.trackingLink
      };
    }

    repl.timeline.push({ status: nextStatus, note: note || `Replacement status updated to ${nextStatus}`, date: new Date() });
    await repl.save();

    const shouldProcessInventory =
      nextStatus === "Pickup Completed" &&
      !repl.inventory?.processedAt &&
      ["Restock", "Discard"].includes(String(repl.stockAction || "").trim());

    if (shouldProcessInventory) {
      if (String(repl.stockAction).trim() === "Restock") {
        for (const item of repl.originalItems || []) {
          const quantity = Number(item.qty ?? item.quantity ?? 0);
          if (item.productId && item.variantId && quantity > 0) {
            const product = await Product.findById(item.productId);
            if (!product) continue;

            const variant = product.variants.id(item.variantId);
            if (!variant) continue;

            const previousStock = Number(variant.stock) || 0;
            const variantIndex = product.variants.findIndex(v => String(v._id) === String(item.variantId));

            if (isSerializedVariant(product, variant)) {
              restockSerializedUnits({
                product,
                variant,
                quantity,
                variantIndex
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
              reason: `Replacement pickup completed for ${repl.replacementId || repl._id}`,
              adminId: req.user.userId
            });
          }
        }
      }

      repl.inventory = {
        ...(repl.inventory || {}),
        processedAt: new Date(),
        processedByStatus: nextStatus,
        actionApplied: repl.stockAction
      };
      await repl.save();
    }

    // Deduct stock for new replacement item being shipped
    const shouldDeductShippingStock =
      nextStatus === "Replacement Shipped" &&
      !repl.inventory?.shippedProcessedAt;

    if (shouldDeductShippingStock) {
      for (const item of repl.originalItems || []) {
        const quantity = Number(item.qty ?? item.quantity ?? 0);
        if (item.productId && item.variantId && quantity > 0) {
          const product = await Product.findById(item.productId);
          if (!product) continue;

          const variant = product.variants.id(item.variantId);
          if (!variant) continue;

          const previousStock = Number(variant.stock) || 0;
          const variantIndex = product.variants.findIndex(v => String(v._id) === String(item.variantId));

          if (isSerializedVariant(product, variant)) {
            consumeSerializedStock({
              product,
              variant,
              quantity,
              variantIndex,
              saleStatus: "SOLD_ONLINE"
            });
          } else {
            variant.stock = previousStock - quantity;
          }

          variant.sold = (Number(variant.sold) || 0) + quantity;
          await product.save();

          await StockLog.create({
            productId: product._id,
            variantId: variant._id,
            changeType: "sale",
            previousStock,
            newStock: variant.stock,
            change: variant.stock - previousStock,
            reason: `Replacement item shipped for ${repl.replacementId || repl._id}`,
            adminId: req.user.userId
          });
        }
      }

      repl.inventory = {
        ...(repl.inventory || {}),
        shippedProcessedAt: new Date(),
        shippedProcessedStatus: nextStatus
      };
      await repl.save();
    }

    if (repl.orderId) {
      let nextOrderStatus = buildOrderStatusFromReplacementStatus(currentStatus, nextStatus);
      if (nextOrderStatus) {
        if (nextOrderStatus === "Delivered") {
          const { hasOtherActiveClaims } = require("../../../utils/activeClaimsHelper");
          const otherActive = await hasOtherActiveClaims(repl.orderId, repl._id);
          if (otherActive) {
            nextOrderStatus = "Return Requested";
          } else {
            const ReturnModel = require("../../../models/Return");
            const completedReturns = await ReturnModel.find({ orderId: repl.orderId, status: "Refunded" });
            if (completedReturns.length > 0) {
              nextOrderStatus = "Partially Returned";
            }
          }
        }
        await Order.updateOne(
          { _id: repl.orderId },
          {
            $set: { status: nextOrderStatus },
            $push: {
              timeline: {
                status: nextOrderStatus,
                note: note || `Replacement updated to ${nextStatus}`,
                date: new Date()
              }
            }
          }
        );
      }
    }

    const refreshed = await Replacement.findById(repl._id)
      .populate("userId", "name email phone")
      .populate("orderId", "orderId paymentStatus total shippingAddress");

    // Trigger notifications/emails
    const replUser = refreshed.userId;
    const replOrder = refreshed.orderId;
    if (replUser && replUser.email) {
      try {
        await createNotification({
          userId: replUser._id,
          title: `Replacement Status: ${nextStatus}`,
          message: `Your replacement request for order #${replOrder?.orderId || replOrder?._id} has been updated to "${nextStatus}".`,
          type: "REPLACEMENT",
          link: "/profile/orders"
        });
      } catch (notifErr) {
        console.error("Failed to create in-app notification:", notifErr);
      }

      enqueueEmail({
        to: replUser.email,
        subject: `Replacement Update - ${refreshed.replacementId} | Sands Jewels`,
        html: emailTemplates.replacementStatusUpdate({
          replacementReq: refreshed,
          userName: replUser.name,
          newStatus: nextStatus,
          note: note || "",
          order: replOrder
        }),
        type: "replacement_status_update"
      });
    }

    return success(res, { repl: refreshed }, `Replacement ${nextStatus} successfully`);
  } catch (err) { return error(res, err.message); }
};
