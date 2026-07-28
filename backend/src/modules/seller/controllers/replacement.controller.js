const Replacement = require("../../../models/Replacement");
const Product = require("../../../models/Product");
const Order = require("../../../models/Order");
const { success, error } = require("../../../utils/apiResponse");

const SELLER_ACTIONABLE_STATUSES = ["Pending"];
const SELLER_ALLOWED_STATUSES = ["Approved", "Rejected"];

const buildSellerReplacementScope = async (sellerId) => {
  const products = await Product.find({ sellerId }).select("_id");
  return products.map((product) => product._id);
};

const filterReplacementsToOwnedItemsOnly = (replacements = [], sellerProductIds = []) => {
  const owned = new Set((sellerProductIds || []).map((id) => String(id)));
  return (replacements || []).filter((rep) => {
    const items = Array.isArray(rep?.originalItems) ? rep.originalItems : [];
    if (items.length === 0) return false;
    return items.every((it) => owned.has(String(it.productId)));
  });
};

exports.getReplacements = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const sellerProductIds = await buildSellerReplacementScope(sellerId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const { status, search } = req.query;

    const query = sellerProductIds.length ? { "originalItems.productId": { $in: sellerProductIds } } : { _id: null };
    if (status) {
      query.status = String(status);
    }
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { replacementId: { $regex: escaped, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [replacementsRaw, totalRaw] = sellerProductIds.length
      ? await Promise.all([
          Replacement.find(query)
            .populate("userId", "name email")
            .populate("orderId", "orderId total paymentStatus")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          Replacement.countDocuments(query)
        ])
      : [[], 0];

    const replacements = filterReplacementsToOwnedItemsOnly(replacementsRaw, sellerProductIds);
    const totalPages = Math.max(1, Math.ceil(totalRaw / limit));

    return success(res, {
      replacements,
      pagination: {
        page,
        limit,
        totalItems: totalRaw,
        totalPages
      }
    });
  } catch (err) { return error(res, err.message); }
};

exports.getReplacementDetail = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const sellerProductIds = await buildSellerReplacementScope(sellerId);
    const replacementReq = sellerProductIds.length
      ? await Replacement.findOne({ _id: req.params.id, "originalItems.productId": { $in: sellerProductIds } })
          .populate("userId", "name email")
          .populate("orderId", "orderId total paymentStatus shippingAddress")
      : null;

    if (!replacementReq) return error(res, "Replacement request not found", 404);

    const ownedOnly = filterReplacementsToOwnedItemsOnly([replacementReq], sellerProductIds)[0] || null;
    if (!ownedOnly) return error(res, "Replacement request not found", 404);

    return success(res, { replacementReq });
  } catch (err) { return error(res, err.message); }
};

exports.processReplacement = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { status, remarks } = req.body;
    const sellerProductIds = await buildSellerReplacementScope(sellerId);

    if (!SELLER_ALLOWED_STATUSES.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${SELLER_ALLOWED_STATUSES.join(", ")}`, 400);
    }

    const replacementReq = sellerProductIds.length
      ? await Replacement.findOne({ _id: req.params.id, "originalItems.productId": { $in: sellerProductIds } })
      : null;
    if (!replacementReq) return error(res, "Replacement request not found", 404);

    const ownedOnly = filterReplacementsToOwnedItemsOnly([replacementReq], sellerProductIds)[0] || null;
    if (!ownedOnly) return error(res, "Replacement request not found", 404);

    if (!SELLER_ACTIONABLE_STATUSES.includes(replacementReq.status)) {
      return error(res, `Seller can only process replacements in: ${SELLER_ACTIONABLE_STATUSES.join(", ")}`, 400);
    }

    replacementReq.status = status;
    if (remarks) {
      replacementReq.adminComment = remarks;
    }
    replacementReq.timeline = Array.isArray(replacementReq.timeline) ? replacementReq.timeline : [];
    replacementReq.timeline.push({
      status,
      note: remarks || `Seller marked replacement as ${status}`,
      date: new Date()
    });
    await replacementReq.save();

    if (replacementReq.orderId) {
      let nextOrderStatus = status === "Rejected" ? "Delivered" : "Return Requested";
      if (nextOrderStatus === "Delivered") {
        const { hasOtherActiveClaims } = require("../../../utils/activeClaimsHelper");
        const otherActive = await hasOtherActiveClaims(replacementReq.orderId, replacementReq._id);
        if (otherActive) {
          nextOrderStatus = "Return Requested";
        } else {
          const ReturnModel = require("../../../models/Return");
          const completedReturns = await ReturnModel.find({ orderId: replacementReq.orderId, status: "Refunded" });
          if (completedReturns.length > 0) {
            nextOrderStatus = "Partially Returned";
          }
        }
      }
      await Order.updateOne(
        { _id: replacementReq.orderId },
        {
          $set: { status: nextOrderStatus },
          $push: {
            timeline: {
              status: nextOrderStatus,
              note: remarks || `Seller marked replacement as ${status}`,
              date: new Date()
            }
          }
        }
      );
    }

    const refreshed = await Replacement.findById(replacementReq._id)
      .populate("userId", "name email")
      .populate("orderId", "orderId total paymentStatus shippingAddress");

    return success(res, { replacementReq: refreshed }, "Replacement request processed successfully");
  } catch (err) { return error(res, err.message); }
};
