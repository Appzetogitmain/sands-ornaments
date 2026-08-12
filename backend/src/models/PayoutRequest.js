/**
 * PayoutRequest — Sands Jewels Wallet System
 *
 * Tracks seller withdrawal requests and their lifecycle.
 *
 * Status flow:
 *   PENDING → PROCESSING → APPROVED
 *                        ↘ REJECTED
 *
 * Design:
 *  - At most ONE active (PENDING or PROCESSING) request per seller at a time.
 *    Enforced by a partial unique index.
 *  - Wallet balance is debited at the moment the request is CREATED (not approved).
 *    If rejected, balance is refunded via a WalletTransaction credit entry.
 *  - balanceBefore / balanceAfter are snapshots for audit purposes.
 */
"use strict";

const mongoose = require("mongoose");
const crypto = require("crypto");

const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const genPayoutId = () => {
  const seg = Array.from(crypto.randomBytes(8))
    .map((b) => SAFE_CHARS[b % SAFE_CHARS.length])
    .join("");
  return `PAY-${seg}-${Date.now()}`;
};

const payoutRequestSchema = new mongoose.Schema(
  {
    // Human-readable, URL-safe ID (e.g. PAY-AB3DEFGH-1718501234567)
    payoutId: {
      type: String,
      required: true,
      unique: true,
      default: genPayoutId,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },

    // ── Amounts ─────────────────────────────────────────────────────────
    amount: { type: Number, required: true, min: 500 }, // min ₹500
    balanceBefore: { type: Number, required: true }, // snapshot before deduction
    balanceAfter: { type: Number, required: true }, // snapshot after deduction

    // ── Bank details snapshot at time of request ─────────────────────────
    bankDetails: {
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
    },

    sellerNote: { type: String, default: "" },

    // ── Status ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    // ── Admin action ─────────────────────────────────────────────────────
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      // Administrators are stored in the User collection with role: "admin".
      ref: "User",
      default: null,
    },
    processedAt: { type: Date, default: null },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────
payoutRequestSchema.index({ sellerId: 1, createdAt: -1 });
payoutRequestSchema.index({ status: 1, createdAt: -1 });

/**
 * Idempotency guard: prevent a seller from creating a second payout request
 * while one is still open (PENDING or PROCESSING).
 * Once the request is APPROVED or REJECTED it leaves the partial index,
 * allowing future requests.
 */
payoutRequestSchema.index(
  { sellerId: 1 },
  {
    name: "unique_active_payout_per_seller",
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING", "PROCESSING"] },
    },
  },
);

module.exports = mongoose.model("PayoutRequest", payoutRequestSchema);
