/**
 * Admin Commission Controller
 *
 * Endpoints:
 *   GET    /admin/commission/tiers
 *   PUT    /admin/commission/tiers
 *   PATCH  /admin/commission/toggle
 *   POST   /admin/commission/tiers/restore-defaults
 *   GET    /admin/commission/summary
 *   GET    /admin/commission/ledger
 *   GET    /admin/commission/orders/:id          (per-order breakdown)
 *   GET    /admin/commission/sellers/:id         (per-seller summary)
 */
"use strict";

const mongoose = require("mongoose");
const Commission = require("../../../models/Commission");
const Setting = require("../../../models/Setting");
const Seller = require("../../../models/Seller");
const Order = require("../../../models/Order");
const { success, error } = require("../../../utils/apiResponse");
const { validateTiers } = require("../../../utils/commission");
const { DEFAULT_COMMISSION_TIERS } = require("../../../constants/commissionTiers");

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const getOrCreateSettings = async () => {
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({});
  return settings;
};

const normalizeTierPayload = (rawTiers) => {
  if (!Array.isArray(rawTiers)) return null;
  return rawTiers.map((t) => ({
    minAmount:  Number(t?.minAmount),
    maxAmount:  t?.maxAmount === null || t?.maxAmount === undefined || t?.maxAmount === "" ? null : Number(t.maxAmount),
    commission: Number(t?.commission),
  }));
};

const parsePage = (value, fallback = 1) => Math.max(1, Number.parseInt(value, 10) || fallback);
const parseLimit = (value, fallback = 25, max = 200) =>
  Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));

// ─────────────────────────────────────────────────────────────────────────
// Tier configuration
// ─────────────────────────────────────────────────────────────────────────

exports.getTiers = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const tiers =
      Array.isArray(settings.commissionTiers) && settings.commissionTiers.length > 0
        ? settings.commissionTiers
        : DEFAULT_COMMISSION_TIERS.map((t) => ({ ...t }));
    return success(res, {
      tiers,
      enabled:         true,
      updatedAt:       settings.commissionUpdatedAt || null,
      backfilledAt:    settings.commissionBackfilledAt || null,
      usingDefaults:   !(Array.isArray(settings.commissionTiers) && settings.commissionTiers.length > 0),
    }, "Commission tiers retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateTiers = async (req, res) => {
  try {
    const tiers = normalizeTierPayload(req.body?.tiers);
    if (!tiers) return error(res, "tiers must be an array", 400);

    const v = validateTiers(tiers);
    if (!v.valid) return error(res, v.error, 400);

    const settings = await getOrCreateSettings();
    settings.commissionTiers     = tiers;
    settings.commissionUpdatedAt = new Date();
    await settings.save();

    return success(res, {
      tiers:     settings.commissionTiers,
      enabled:   true,
      updatedAt: settings.commissionUpdatedAt,
    }, "Commission tiers updated");
  } catch (err) { return error(res, err.message); }
};

exports.toggleEnabled = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    settings.commissionEnabled   = true;
    settings.commissionUpdatedAt = new Date();
    await settings.save();
    return success(res, { enabled: true }, "Commission is permanently enabled");
  } catch (err) { return error(res, err.message); }
};

exports.restoreDefaults = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    settings.commissionTiers     = DEFAULT_COMMISSION_TIERS.map((t) => ({ ...t }));
    settings.commissionUpdatedAt = new Date();
    await settings.save();
    return success(res, {
      tiers:     settings.commissionTiers,
      updatedAt: settings.commissionUpdatedAt,
    }, "Default tiers restored");
  } catch (err) { return error(res, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────
// KPIs & summary
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/commission/summary
 *
 * Query params (all optional): from=ISODate, to=ISODate
 *
 * Returns:
 *   {
 *     totals: { confirmed, pending, reversed, gross, net },
 *     period: { from, to },
 *     topSellers: [{ sellerId, name, confirmed, pending, reversed }],
 *     monthlyTrend: [{ month: "YYYY-MM", confirmed, reversed, net }]
 *   }
 */
exports.getSummary = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const dateMatch = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) dateMatch.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) dateMatch.$lte = d;
    }

    const baseMatch = Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {};

    // 1. Totals — confirmed / pending / reversed
    const totalsAgg = await Commission.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          amount: { $sum: "$commissionAmount" },
          rows:   { $sum: 1 },
        },
      },
    ]);

    let confirmed = 0;
    let pending   = 0;
    let reversed  = 0;
    let gross     = 0;
    for (const row of totalsAgg) {
      const a = Number(row.amount) || 0;
      gross += row._id?.type === "reversal" ? 0 : a;
      if (row._id?.type === "reversal" && row._id?.status === "confirmed") reversed += a;
      else if (row._id?.status === "confirmed") confirmed += a;
      else if (row._id?.status === "pending")   pending   += a;
    }
    const net = confirmed - reversed;

    // 2. Top sellers by confirmed commission
    const topSellersAgg = await Commission.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$sellerId",
          confirmed: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "confirmed"] }, { $ne: ["$type", "reversal"] }] },
                "$commissionAmount",
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$commissionAmount", 0],
            },
          },
          reversed: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "confirmed"] }, { $eq: ["$type", "reversal"] }] },
                "$commissionAmount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { confirmed: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: Seller.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      {
        $project: {
          sellerId: "$_id",
          name: {
            $ifNull: [
              { $arrayElemAt: ["$seller.shopName", 0] },
              { $ifNull: [{ $arrayElemAt: ["$seller.fullName", 0] }, "Unknown Seller"] },
            ],
          },
          confirmed: 1,
          pending: 1,
          reversed: 1,
        },
      },
    ]);

    // 3. Monthly trend (last 12 months) — independent of from/to filter for the chart
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const trendAgg = await Commission.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            type: "$type",
            status: "$status",
          },
          amount: { $sum: "$commissionAmount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    const trendMap = new Map();
    for (const row of trendAgg) {
      const m = row._id.month;
      if (!trendMap.has(m)) trendMap.set(m, { month: m, confirmed: 0, reversed: 0 });
      const t = trendMap.get(m);
      const a = Number(row.amount) || 0;
      if (row._id.type === "reversal" && row._id.status === "confirmed") t.reversed += a;
      else if (row._id.status === "confirmed") t.confirmed += a;
    }
    const monthlyTrend = Array.from(trendMap.values()).map((t) => ({
      ...t,
      net: t.confirmed - t.reversed,
    }));

    return success(res, {
      totals: { confirmed, pending, reversed, gross, net },
      period: { from: from || null, to: to || null },
      topSellers: topSellersAgg.map((r) => ({
        sellerId: r.sellerId,
        name:     r.name,
        confirmed: Number(r.confirmed) || 0,
        pending:   Number(r.pending) || 0,
        reversed:  Number(r.reversed) || 0,
      })),
      monthlyTrend,
    }, "Commission summary retrieved");
  } catch (err) { return error(res, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────
// Ledger listing
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/commission/ledger
 *
 * Query: page, limit, sellerId, orderId, orderNumber, type, status, from, to
 */
exports.getLedger = async (req, res) => {
  try {
    const page  = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit, 25);

    const query = {};

    if (req.query.sellerId && mongoose.Types.ObjectId.isValid(req.query.sellerId)) {
      query.sellerId = req.query.sellerId;
    }
    if (req.query.orderId && mongoose.Types.ObjectId.isValid(req.query.orderId)) {
      query.orderId = req.query.orderId;
    }
    if (req.query.orderNumber) {
      const escaped = String(req.query.orderNumber).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.orderNumber = { $regex: escaped, $options: "i" };
    }
    if (req.query.type && ["accrual", "reversal", "backfill"].includes(req.query.type)) {
      query.type = req.query.type;
    }
    if (req.query.status && ["pending", "confirmed", "reversed"].includes(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) {
        const d = new Date(req.query.from);
        if (!Number.isNaN(d.getTime())) query.createdAt.$gte = d;
      }
      if (req.query.to) {
        const d = new Date(req.query.to);
        if (!Number.isNaN(d.getTime())) query.createdAt.$lte = d;
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    const [rows, total] = await Promise.all([
      Commission.find(query)
        .populate("sellerId", "shopName fullName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Commission.countDocuments(query),
    ]);

    return success(res, {
      rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        sellerId:    query.sellerId    || null,
        orderId:     query.orderId     || null,
        orderNumber: req.query.orderNumber || null,
        type:        query.type        || null,
        status:      query.status      || null,
        from:        req.query.from    || null,
        to:          req.query.to      || null,
      },
    }, "Commission ledger retrieved");
  } catch (err) { return error(res, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────
// Per-order breakdown (used on admin OrderDetail card)
// ─────────────────────────────────────────────────────────────────────────

exports.getForOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return error(res, "Invalid order id", 400);

    const [order, rows] = await Promise.all([
      Order.findById(id).select("orderId commissionSummary status").lean(),
      Commission.find({ orderId: id })
        .populate("sellerId", "shopName fullName email")
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    if (!order) return error(res, "Order not found", 404);

    return success(res, {
      order: {
        _id: order._id,
        orderId: order.orderId,
        status:  order.status,
        commissionSummary: order.commissionSummary || { totalCommission: 0, status: "none" },
      },
      rows,
    }, "Order commission detail retrieved");
  } catch (err) { return error(res, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────
// Per-seller summary (used on admin SellerDetail page)
// ─────────────────────────────────────────────────────────────────────────

exports.getForSeller = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return error(res, "Invalid seller id", 400);

    const page  = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit, 20, 100);

    const totalsAgg = await Commission.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          amount: { $sum: "$commissionAmount" },
          rows:   { $sum: 1 },
        },
      },
    ]);

    let confirmed = 0, pending = 0, reversed = 0;
    for (const r of totalsAgg) {
      const a = Number(r.amount) || 0;
      if (r._id.type === "reversal" && r._id.status === "confirmed") reversed += a;
      else if (r._id.status === "confirmed") confirmed += a;
      else if (r._id.status === "pending")   pending   += a;
    }

    const [rows, total] = await Promise.all([
      Commission.find({ sellerId: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Commission.countDocuments({ sellerId: id }),
    ]);

    return success(res, {
      sellerId: id,
      totals: { confirmed, pending, reversed, net: confirmed - reversed },
      rows,
      pagination: {
        page, limit, total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }, "Seller commission detail retrieved");
  } catch (err) { return error(res, err.message); }
};
