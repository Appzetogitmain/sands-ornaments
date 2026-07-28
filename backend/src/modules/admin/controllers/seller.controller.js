const mongoose = require("mongoose");
const Seller = require("../../../models/Seller");
const Product = require("../../../models/Product");
const Order = require("../../../models/Order");
const { success, error } = require("../../../utils/apiResponse");
const { sendEmail } = require("../../../services/emailService");
const auditLogger = require("../../../utils/auditLogger");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const buildSellerMetrics = async (sellerIds = []) => {
  const normalizedIds = sellerIds
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  if (!normalizedIds.length) {
    return new Map();
  }

  const [productMetrics, orderMetrics] = await Promise.all([
    Product.aggregate([
      {
        $match: {
          sellerId: { $in: normalizedIds }
        }
      },
      {
        $project: {
          sellerId: 1,
          variantCount: { $size: { $ifNull: ["$variants", []] } },
          stockUnits: {
            $sum: {
              $map: {
                input: { $ifNull: ["$variants", []] },
                as: "variant",
                in: { $ifNull: ["$$variant.stock", 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$sellerId",
          productCount: { $sum: 1 },
          variantCount: { $sum: "$variantCount" },
          stockUnits: { $sum: "$stockUnits" }
        }
      }
    ]),
    Order.aggregate([
      {
        $match: {
          "items.sellerId": { $in: normalizedIds },
          status: { $ne: "Cancelled" }
        }
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.sellerId": { $in: normalizedIds }
        }
      },
      {
        $group: {
          _id: "$items.sellerId",
          orderIds: { $addToSet: "$_id" },
          totalRevenue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.price", 0] },
                { $ifNull: ["$items.quantity", 0] }
              ]
            }
          },
          unitsSold: { $sum: { $ifNull: ["$items.quantity", 0] } }
        }
      }
    ])
  ]);

  const metricsMap = new Map();

  productMetrics.forEach((item) => {
    metricsMap.set(String(item._id), {
      productCount: item.productCount || 0,
      variantCount: item.variantCount || 0,
      stockUnits: item.stockUnits || 0,
      orderCount: 0,
      unitsSold: 0,
      totalRevenue: 0
    });
  });

  orderMetrics.forEach((item) => {
    const existing = metricsMap.get(String(item._id)) || {
      productCount: 0,
      variantCount: 0,
      stockUnits: 0,
      orderCount: 0,
      unitsSold: 0,
      totalRevenue: 0
    };

    existing.orderCount = item.orderIds?.length || 0;
    existing.unitsSold = item.unitsSold || 0;
    existing.totalRevenue = Math.round(item.totalRevenue || 0);

    metricsMap.set(String(item._id), existing);
  });

  return metricsMap;
};

exports.getSellers = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      query.status = status;
    }

    if (search) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { shopName: { $regex: escaped, $options: "i" } },
        { fullName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { mobileNumber: { $regex: escaped, $options: "i" } }
      ];
    }

    const sellers = await Seller.find(query).select("-password").sort({ createdAt: -1 }).lean();
    const metricsMap = await buildSellerMetrics(sellers.map((seller) => seller._id));
    const allSellers = await Seller.find({}).select("_id fullName shopName email gstNumber panNumber bankAccount").lean();

    const enrichedSellers = sellers.map((seller) => {
      const duplicates = [];
      const gst = String(seller.gstNumber || "").trim().toUpperCase();
      const pan = String(seller.panNumber || "").trim().toUpperCase();
      const bankAcc = String(seller.bankAccount?.accountNumber || "").trim();

      for (const other of allSellers) {
        if (String(other._id) === String(seller._id)) continue;

        const otherGst = String(other.gstNumber || "").trim().toUpperCase();
        const otherPan = String(other.panNumber || "").trim().toUpperCase();
        const otherBankAcc = String(other.bankAccount?.accountNumber || "").trim();

        const matchReasons = [];
        if (gst && gst === otherGst) {
          matchReasons.push("GST");
        }
        if (pan && pan === otherPan) {
          matchReasons.push("PAN");
        }
        if (bankAcc && bankAcc === otherBankAcc) {
          matchReasons.push("Bank Account");
        }

        if (matchReasons.length > 0) {
          duplicates.push({
            sellerId: other._id,
            fullName: other.fullName,
            shopName: other.shopName,
            email: other.email,
            reasons: matchReasons
          });
        }
      }

      return {
        ...seller,
        isDuplicate: duplicates.length > 0,
        duplicateMatches: duplicates,
        metrics: metricsMap.get(String(seller._id)) || {
          productCount: 0,
          variantCount: 0,
          stockUnits: 0,
          orderCount: 0,
          unitsSold: 0,
          totalRevenue: 0
        }
      };
    });

    return success(res, { sellers: enrichedSellers }, "Sellers retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getSellerDetail = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return error(res, "Invalid seller id", 400);
    }

    const seller = await Seller.findById(req.params.id).select("-password").lean();
    if (!seller) return error(res, "Seller not found", 404);

    const gst = String(seller.gstNumber || "").trim().toUpperCase();
    const pan = String(seller.panNumber || "").trim().toUpperCase();
    const bankAcc = String(seller.bankAccount?.accountNumber || "").trim();

    const duplicateQuery = [];
    if (gst) duplicateQuery.push({ gstNumber: { $regex: new RegExp(`^${escapeRegex(gst)}$`, "i") } });
    if (pan) duplicateQuery.push({ panNumber: { $regex: new RegExp(`^${escapeRegex(pan)}$`, "i") } });
    if (bankAcc) duplicateQuery.push({ "bankAccount.accountNumber": bankAcc });

    let duplicateMatches = [];
    if (duplicateQuery.length > 0) {
      const matchRecords = await Seller.find({
        _id: { $ne: seller._id },
        $or: duplicateQuery
      }).select("fullName shopName email gstNumber panNumber bankAccount").lean();

      duplicateMatches = matchRecords.map(other => {
        const matchReasons = [];
        if (gst && gst === String(other.gstNumber || "").trim().toUpperCase()) matchReasons.push("GST");
        if (pan && pan === String(other.panNumber || "").trim().toUpperCase()) matchReasons.push("PAN");
        if (bankAcc && bankAcc === String(other.bankAccount?.accountNumber || "").trim()) matchReasons.push("Bank Account");
        return {
          sellerId: other._id,
          fullName: other.fullName,
          shopName: other.shopName,
          email: other.email,
          reasons: matchReasons
        };
      });
    }

    seller.duplicateMatches = duplicateMatches;

    const metricsMap = await buildSellerMetrics([seller._id]);
    const recentProducts = await Product.find({ sellerId: seller._id })
      .select("name images categories variants status createdAt")
      .populate("categories", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return success(
      res,
      {
        seller,
        metrics: metricsMap.get(String(seller._id)) || {
          productCount: 0,
          variantCount: 0,
          stockUnits: 0,
          orderCount: 0,
          unitsSold: 0,
          totalRevenue: 0
        },
        recentProducts
      },
      "Seller details retrieved"
    );
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateSellerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!isValidObjectId(id)) {
      return error(res, "Invalid seller id", 400);
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return error(res, "Invalid status", 400);
    }

    const seller = await Seller.findById(id);
    if (!seller) return error(res, "Seller not found", 404);

    const trimmedReason = String(rejectionReason || "").trim();

    if (status === "REJECTED" && !trimmedReason) {
      return error(res, "Rejection reason is required", 400);
    }

    const isSameStatus =
      seller.status === status &&
      (status !== "REJECTED" || (seller.rejectionReason || "") === trimmedReason);

    if (!isSameStatus) {
      const previousStatus = seller.status;
      const previousRejectionReason = seller.rejectionReason || null;
      seller.status = status;
      seller.rejectionReason = status === "REJECTED" ? trimmedReason : null;
      await seller.save();

      // Audit log — non-blocking
      auditLogger.log(req, {
        action:      status === "APPROVED" ? "APPROVE" : "REJECT",
        entity:      "Seller",
        entityId:    String(seller._id),
        entityLabel: seller.shopName || seller.fullName || seller.email || "",
        before:      { status: previousStatus, rejectionReason: previousRejectionReason },
        after:       { status, rejectionReason: seller.rejectionReason || null }
      });
    }

    if (seller.email) {
      try {
        await sendEmail({
          to: seller.email,
          subject: status === "APPROVED" ? "Seller account approved" : "Seller account application update",
          html:
            status === "APPROVED"
              ? `Hi ${seller.fullName}, your seller account for ${seller.shopName} is approved. You can now log in to the seller panel.`
              : `Hi ${seller.fullName}, your seller account application for ${seller.shopName} was rejected. Reason: ${trimmedReason}.`
        });
      } catch (mailErr) {
        console.error("Seller status email failed:", mailErr.message);
      }
    }

    return success(
      res,
      { seller: seller.toObject({ versionKey: false, transform: (_, ret) => { delete ret.password; return ret; } }) },
      isSameStatus ? "Seller status already up to date" : `Seller ${status.toLowerCase()} successfully`
    );
  } catch (err) {
    return error(res, err.message);
  }
};
