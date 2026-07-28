const Return = require("../../../models/Return");
const Product = require("../../../models/Product");
const Order = require("../../../models/Order");
const { success, error } = require("../../../utils/apiResponse");

const SELLER_ACTIONABLE_STATUSES = ["Pending"];
const SELLER_ALLOWED_STATUSES = ["Approved", "Rejected"];
const VOID_TAG_REQUIRED_STATUSES = new Set(["Approved", "Rejected"]);

const buildSellerReturnScope = async (sellerId) => {
  const products = await Product.find({ sellerId }).select("_id");
  return products.map((product) => product._id);
};

const filterReturnsToOwnedItemsOnly = (returns = [], sellerProductIds = []) => {
  const owned = new Set((sellerProductIds || []).map((id) => String(id)));
  return (returns || []).filter((ret) => {
    const items = Array.isArray(ret?.items) ? ret.items : [];
    if (items.length === 0) return false;
    return items.every((it) => owned.has(String(it.productId)));
  });
};

const returnRequiresVoidTagVerification = (returnReq) =>
  (returnReq?.items || []).some((item) => String(item?.voidTagId || "").trim());

const validateVoidTagDecision = ({ returnReq, nextStatus, voidTagStatus }) => {
  if (!VOID_TAG_REQUIRED_STATUSES.has(nextStatus) || !returnRequiresVoidTagVerification(returnReq)) {
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

exports.getReturns = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const sellerProductIds = await buildSellerReturnScope(sellerId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const { status, search } = req.query;

    const query = sellerProductIds.length ? { "items.productId": { $in: sellerProductIds } } : { _id: null };
    if (status) {
      query.status = String(status);
    }
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { returnId: { $regex: escaped, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [returnsRaw, totalRaw] = sellerProductIds.length
      ? await Promise.all([
          Return.find(query)
            .populate("userId", "name email")
            .populate("orderId", "orderId total paymentStatus")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          Return.countDocuments(query)
        ])
      : [[], 0];

    // Privacy/correctness: only include returns where all items belong to this seller.
    const returns = filterReturnsToOwnedItemsOnly(returnsRaw, sellerProductIds);
    const totalPages = Math.max(1, Math.ceil(totalRaw / limit));

    return success(res, {
      returns,
      pagination: {
        page,
        limit,
        totalItems: totalRaw,
        totalPages
      }
    });
  } catch (err) { return error(res, err.message); }
};

exports.getReturnDetail = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const sellerProductIds = await buildSellerReturnScope(sellerId);
    const returnReq = sellerProductIds.length
      ? await Return.findOne({ _id: req.params.id, "items.productId": { $in: sellerProductIds } })
          .populate("userId", "name email")
          .populate("orderId", "orderId total paymentStatus shippingAddress")
      : null;
    if (!returnReq) return error(res, "Return request not found", 404);

    // Ensure every item belongs to this seller.
    const ownedOnly = filterReturnsToOwnedItemsOnly([returnReq], sellerProductIds)[0] || null;
    if (!ownedOnly) return error(res, "Return request not found", 404);

    return success(res, { returnReq });
  } catch (err) { return error(res, err.message); }
};

exports.processReturn = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { status, remarks, voidTagStatus, voidTagNotes } = req.body;
    const sellerProductIds = await buildSellerReturnScope(sellerId);

    if (!SELLER_ALLOWED_STATUSES.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${SELLER_ALLOWED_STATUSES.join(", ")}`, 400);
    }

    const returnReq = sellerProductIds.length
      ? await Return.findOne({ _id: req.params.id, "items.productId": { $in: sellerProductIds } })
      : null;
    if (!returnReq) return error(res, "Return request not found", 404);

    const ownedOnly = filterReturnsToOwnedItemsOnly([returnReq], sellerProductIds)[0] || null;
    if (!ownedOnly) return error(res, "Return request not found", 404);

    if (!SELLER_ACTIONABLE_STATUSES.includes(returnReq.status)) {
      return error(res, `Seller can only process returns in: ${SELLER_ACTIONABLE_STATUSES.join(", ")}`, 400);
    }

    const voidTagValidationError = validateVoidTagDecision({ returnReq, nextStatus: status, voidTagStatus });
    if (voidTagValidationError) {
      return error(res, voidTagValidationError, 400);
    }

    returnReq.status = status;
    if (remarks) {
      returnReq.adminComment = remarks;
    }
    
    if (voidTagStatus) {
      returnReq.voidTagVerification = {
        status: voidTagStatus,
        notes: voidTagNotes || ""
      };
    }
    returnReq.timeline.push({
      status,
      note: remarks || `Seller marked return as ${status}`
    });
    returnReq.logs = Array.isArray(returnReq.logs) ? returnReq.logs : [];
    returnReq.logs.push({
      action: "SELLER_STATUS_UPDATE",
      comment: remarks || `Seller marked return as ${status}`,
      by: "seller",
      date: new Date()
    });
    await returnReq.save();

    if (returnReq.orderId) {
      let nextOrderStatus = status === "Rejected" ? "Delivered" : "Return Requested";
      if (nextOrderStatus === "Delivered") {
        const { hasOtherActiveClaims } = require("../../../utils/activeClaimsHelper");
        const otherActive = await hasOtherActiveClaims(returnReq.orderId, returnReq._id);
        if (otherActive) {
          nextOrderStatus = "Return Requested";
        } else {
          const completedReturns = await Return.find({ orderId: returnReq.orderId, status: "Refunded" });
          if (completedReturns.length > 0) {
            nextOrderStatus = "Partially Returned";
          }
        }
      }
      await Order.updateOne(
        { _id: returnReq.orderId },
        {
          $set: { status: nextOrderStatus },
          $push: {
            timeline: {
              status: nextOrderStatus,
              note: remarks || `Seller marked return as ${status}`,
              date: new Date()
            }
          }
        }
      );
    }

    const refreshed = await Return.findById(returnReq._id)
      .populate("userId", "name email")
      .populate("orderId", "orderId total paymentStatus shippingAddress");

    return success(res, { returnReq: refreshed }, "Return request processed successfully");
  } catch (err) { return error(res, err.message); }
};
