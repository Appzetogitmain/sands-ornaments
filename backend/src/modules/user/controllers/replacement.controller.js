const Replacement = require("../../../models/Replacement");
const Return = require("../../../models/Return");
const Order = require("../../../models/Order");
const { generateReplacementId } = require("../../../utils/generateId");
const { success, error } = require("../../../utils/apiResponse");
const { createSellerNotification } = require("../../../services/sellerNotificationService");
const { enqueueEmail } = require("../../../services/emailService");
const emailTemplates = require("../../../services/emailTemplates");

exports.requestReplacement = async (req, res) => {
  try {
    const { orderId, itemId, reason, description } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return error(res, "Order not found", 404);

    if (order.status !== "Delivered") {
      return error(res, "Replacements can only be requested for delivered orders", 400);
    }

    const item = order.items.id(itemId);
    if (!item) return error(res, "Item not found in order", 404);

    const existing = await Replacement.findOne({ orderId, "originalItems.variantId": item.variantId });
    if (existing) return error(res, "Replacement already requested", 409);

    // Prevent parallel replacement + return for the same variant
    const returnExists = await Return.findOne({ orderId, "items.variantId": item.variantId });
    if (returnExists) return error(res, "Return already requested for this item. Please complete that flow first.", 409);

    const images = req.files ? req.files.map(f => f.path) : [];

    const replacement = await Replacement.create({
      replacementId: generateReplacementId(),
      userId,
      orderId,
      originalItems: [{
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.sku,
        qty: item.quantity,
        price: item.price,
        reason
      }],
      evidence: { reason, comment: description, images },
      status: "Pending",
      timeline: [{ status: "Requested", note: "Replacement request submitted" }]
    });

    order.status = "Return Requested";
    order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
    order.timeline.push({
      status: "Return Requested",
      note: `Replacement requested for ${item.name || "order item"}`,
      date: new Date()
    });
    await order.save();

    // Notify seller (if this item belongs to a seller listing).
    if (item?.sellerId) {
      await createSellerNotification({
        sellerId: item.sellerId,
        title: "Replacement requested",
        message: `Replacement requested for order ${order.orderId || order._id}. Item: ${item.name || "Order item"}.`,
        type: "REPLACEMENT",
        priority: "High",
        link: `/seller/replacement-details/${replacement._id}`
      });

      const Seller = require("../../../models/Seller");
      const seller = await Seller.findById(item.sellerId);
      if (seller && seller.email) {
        enqueueEmail({
          to: seller.email,
          subject: `Replacement Request - Order ${order.orderId || order._id} | Sands Jewels`,
          html: emailTemplates.sellerReplacementNotif({
            order,
            sellerName: seller.name,
            item,
            replacementId: replacement.replacementId
          }),
          type: "seller_replacement_notification"
        });
      }
    }

    // Email customer
    const reqUser = await require("../../../models/User").findById(userId).select("email name");
    if (reqUser && reqUser.email) {
      enqueueEmail({
        to: reqUser.email,
        subject: `Replacement Request Received - ${replacement.replacementId} | Sands Jewels`,
        html: emailTemplates.replacementRequested({
          replacementReq: replacement,
          userName: reqUser.name,
          order
        }),
        type: "replacement_requested"
      });
    }

    return success(res, { replacement }, "Replacement requested successfully", 201);
  } catch (err) { return error(res, err.message); }
};

exports.getMyReplacements = async (req, res) => {
  try {
    const replacements = await Replacement.find({ userId: req.user.userId }).populate("orderId", "orderId");
    return success(res, { replacements }, "Replacements retrieved");
  } catch (err) { return error(res, err.message); }
};
