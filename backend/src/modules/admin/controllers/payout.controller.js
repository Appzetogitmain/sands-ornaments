/**
 * Admin Payout Controller — Sands Jewels
 *
 * Endpoints:
 *   GET   /admin/payout/requests           → all payout requests (paginated, filterable)
 *   GET   /admin/payout/requests/:id       → single payout request detail
 *   PATCH /admin/payout/requests/:id/process → update status (PROCESSING)
 *   PATCH /admin/payout/requests/:id/approve → approve (APPROVED)
 *   PATCH /admin/payout/requests/:id/reject  → reject + refund (REJECTED)
 *   GET   /admin/payout/earnings            → admin commission earnings overview
 */
"use strict";

const mongoose = require("mongoose");
const PayoutRequest = require("../../../models/PayoutRequest");
const WalletTransaction = require("../../../models/WalletTransaction");
const Seller = require("../../../models/Seller");
const Commission = require("../../../models/Commission");
const { success, error } = require("../../../utils/apiResponse");

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/payout/requests
// ─────────────────────────────────────────────────────────────────────────────
exports.getRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "20", 10)),
    );
    const skip = (page - 1) * limit;
    const status = req.query.status?.toUpperCase();

    const filter = {};
    if (
      status &&
      ["PENDING", "PROCESSING", "APPROVED", "REJECTED"].includes(status)
    ) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      PayoutRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "sellerId",
          select: "shopName fullName email mobileNumber bankAccount",
        })
        .lean(),
      PayoutRequest.countDocuments(filter),
    ]);

    // Counts by status for badges
    const [pending, processing] = await Promise.all([
      PayoutRequest.countDocuments({ status: "PENDING" }),
      PayoutRequest.countDocuments({ status: "PROCESSING" }),
    ]);

    return success(
      res,
      {
        requests,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        actionRequired: pending + processing,
        statusCounts: { pending, processing },
      },
      "Payout requests fetched",
    );
  } catch (err) {
    console.error("[Admin Payout] getRequests:", err.message);
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/payout/requests/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getRequest = async (req, res) => {
  try {
    const payout = await PayoutRequest.findById(req.params.id)
      .populate({
        path: "sellerId",
        select:
          "shopName fullName email mobileNumber bankAccount walletBalance",
      })
      .populate({ path: "processedBy", select: "name email" })
      .lean();

    if (!payout) return error(res, "Payout request not found", 404);

    // Fetch related wallet transactions for this payout
    const transactions = await WalletTransaction.find({
      payoutRequestId: payout._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    return success(res, { payout, transactions }, "Payout request fetched");
  } catch (err) {
    console.error("[Admin Payout] getRequest:", err.message);
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/payout/requests/:id/process
// Mark as PROCESSING (admin acknowledged, payment being initiated)
// ─────────────────────────────────────────────────────────────────────────────
exports.processRequest = async (req, res) => {
  try {
    const adminId = req.user.userId || req.user._id || req.user.id;

    // Atomic: only transition from PENDING → PROCESSING
    const payout = await PayoutRequest.findOneAndUpdate(
      { _id: req.params.id, status: "PENDING" },
      {
        $set: {
          status: "PROCESSING",
          processedBy: adminId,
          processedAt: new Date(),
          adminNote: req.body.adminNote || "",
        },
      },
      { new: true },
    ).populate({ path: "sellerId", select: "shopName fullName email" });

    if (!payout)
      return error(res, "Payout request not found or already processed", 404);

    return success(res, { payout }, "Payout marked as PROCESSING");
  } catch (err) {
    console.error("[Admin Payout] processRequest:", err.message);
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/payout/requests/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
exports.approveRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adminId = req.user.userId || req.user._id || req.user.id;

    // Atomic idempotency: only PENDING or PROCESSING can be approved
    const payout = await PayoutRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["PENDING", "PROCESSING"] } },
      {
        $set: {
          status: "APPROVED",
          processedBy: adminId,
          processedAt: new Date(),
          adminNote: req.body.adminNote || "",
        },
      },
      { new: true, session },
    );

    if (!payout) {
      await session.abortTransaction();
      session.endSession();
      return error(res, "Payout request not found or already finalised", 404);
    }

    // Track lifetime paidOut on the seller record
    const updatedSeller = await Seller.findByIdAndUpdate(
      payout.sellerId,
      { $inc: { totalPaidOut: payout.amount } },
      { new: true, session, select: "walletBalance totalPaidOut" },
    );

    // Write informational wallet transaction (balance unchanged — debited at request time)
    const crypto = require("crypto");
    const SAFE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const seg = Array.from(crypto.randomBytes(8))
      .map((b) => SAFE[b % SAFE.length])
      .join("");
    await WalletTransaction.create(
      [
        {
          transactionId: `TXN-${seg}-${Date.now()}`,
          sellerId: payout.sellerId,
          type: "DEBIT", // informational — balance was already debited at request time
          reason: "payout_approved",
          amount: payout.amount,
          balanceBefore: Math.round(updatedSeller?.walletBalance || 0),
          balanceAfter: Math.round(updatedSeller?.walletBalance || 0),
          payoutRequestId: payout._id,
          description: `Payout ${payout.payoutId} approved by admin`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return success(res, { payout }, "Payout approved");
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[Admin Payout] approveRequest:", err.message);
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/payout/requests/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adminId = req.user.userId || req.user._id || req.user.id;

    // Atomic: only PENDING or PROCESSING can be rejected
    const payout = await PayoutRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["PENDING", "PROCESSING"] } },
      {
        $set: {
          status: "REJECTED",
          processedBy: adminId,
          processedAt: new Date(),
          adminNote: req.body.adminNote || "",
        },
      },
      { new: true, session },
    );

    if (!payout) {
      await session.abortTransaction();
      session.endSession();
      return error(res, "Payout request not found or already finalised", 404);
    }

    // Refund the wallet
    const updatedSeller = await Seller.findByIdAndUpdate(
      payout.sellerId,
      { $inc: { walletBalance: payout.amount } },
      { new: true, session, select: "walletBalance" },
    );

    const balanceAfter = Math.round(updatedSeller.walletBalance);
    const balanceBefore = balanceAfter - payout.amount;

    // Refund wallet transaction
    const crypto = require("crypto");
    const SAFE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const seg = Array.from(crypto.randomBytes(8))
      .map((b) => SAFE[b % SAFE.length])
      .join("");
    await WalletTransaction.create(
      [
        {
          transactionId: `TXN-${seg}-${Date.now()}`,
          sellerId: payout.sellerId,
          type: "CREDIT",
          reason: "payout_rejected",
          amount: payout.amount,
          balanceBefore,
          balanceAfter,
          payoutRequestId: payout._id,
          description: `Payout ${payout.payoutId} rejected — ₹${payout.amount} refunded`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return success(
      res,
      { payout, newBalance: balanceAfter },
      "Payout rejected and amount refunded to wallet",
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[Admin Payout] rejectRequest:", err.message);
    return error(res, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/payout/earnings
// Admin commission revenue overview
// ─────────────────────────────────────────────────────────────────────────────
exports.getAdminEarnings = async (req, res) => {
  try {
    // Total confirmed commissions = admin earnings
    const [commissionData] = await Commission.aggregate([
      {
        $match: {
          type: { $in: ["accrual", "backfill"] },
          status: "confirmed",
        },
      },
      {
        $group: {
          _id: null,
          totalCommissions: { $sum: "$commissionAmount" },
          totalTaxableBase: { $sum: "$taxableAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Total paid out to sellers
    const [payoutData] = await PayoutRequest.aggregate([
      { $match: { status: "APPROVED" } },
      {
        $group: {
          _id: null,
          totalPaidOut: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Pending payouts
    const [pendingData] = await PayoutRequest.aggregate([
      { $match: { status: { $in: ["PENDING", "PROCESSING"] } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly breakdown (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyCommissions = await Commission.aggregate([
      {
        $match: {
          type: { $in: ["accrual", "backfill"] },
          status: "confirmed",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalCommissions: { $sum: "$commissionAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return success(
      res,
      {
        totalCommissionsEarned: Math.round(
          commissionData?.totalCommissions || 0,
        ),
        totalTaxableBase: Math.round(commissionData?.totalTaxableBase || 0),
        confirmedOrdersCount: commissionData?.count || 0,
        totalPaidOutToSellers: Math.round(payoutData?.totalPaidOut || 0),
        approvedPayoutsCount: payoutData?.count || 0,
        pendingPayoutAmount: Math.round(pendingData?.total || 0),
        pendingPayoutsCount: pendingData?.count || 0,
        monthlyBreakdown: monthlyCommissions,
      },
      "Admin earnings fetched",
    );
  } catch (err) {
    console.error("[Admin Payout] getAdminEarnings:", err.message);
    return error(res, err.message);
  }
};
