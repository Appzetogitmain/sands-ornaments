/**
 * Commission Service — orchestrates Commission ledger writes.
 *
 * Public API:
 *   • getActiveTiers()                                       → { tiers, enabled, source }
 *   • accrueCommissionsForOrder(order, { triggeredBy, session })
 *   • confirmCommissionsForOrder(orderId, { session })
 *   • reverseCommissionsForOrder(orderId, { triggeredBy, reasonNote, session })
 *   • recomputeOrderSummary(orderId, { session })            (internal-ish)
 *
 * Design:
 *   • All writes are best-effort wrapped so a ledger failure never silently
 *     corrupts the broader order flow — callers receive the result and
 *     decide how to react. By default we re-throw inside transactional
 *     callers and only swallow when the caller passes { safe: true }.
 *   • Idempotency: the Commission collection has a partial unique index
 *     on (orderId, sellerId) for open accruals, so duplicate calls
 *     for the same order produce a duplicate-key error that we treat
 *     as a no-op (the existing entry is already correct).
 *   • Ledger is the source of truth. Order.commissionSummary is a cache
 *     recomputed by recomputeOrderSummary after every write.
 */
"use strict";

const mongoose = require("mongoose");
const Commission = require("../models/Commission");
const Order      = require("../models/Order");
const Setting    = require("../models/Setting");
const Seller     = require("../models/Seller");
const WalletTransaction = require("../models/WalletTransaction");
const { DEFAULT_COMMISSION_TIERS } = require("../constants/commissionTiers");
const {
  computeOrderCommissions,
  validateTiers,
} = require("../utils/commission");

// ─────────────────────────────────────────────────────────────────────────
// Tier resolution
// ─────────────────────────────────────────────────────────────────────────

/**
 * Read the active tier configuration from Setting, with a hardcoded fallback.
 * Returns the same shape regardless of source so callers can rely on it.
 *
 * source = "db" | "fallback" | "invalid-db-fallback"
 *   • db                 → Setting.commissionTiers was present and valid
 *   • fallback           → Setting empty / missing; using DEFAULT_COMMISSION_TIERS
 *   • invalid-db-fallback→ Setting had tiers but they were malformed; using defaults
 */
const getActiveTiers = async () => {
  const setting = await Setting.findOne().lean();
  const enabled = setting ? setting.commissionEnabled !== false : true;

  if (setting && Array.isArray(setting.commissionTiers) && setting.commissionTiers.length > 0) {
    const tiers = setting.commissionTiers.map((t) => ({
      minAmount:  Number(t.minAmount),
      maxAmount:  t.maxAmount === null || t.maxAmount === undefined ? null : Number(t.maxAmount),
      commission: Number(t.commission),
    }));
    const v = validateTiers(tiers);
    if (v.valid) return { tiers, enabled, source: "db" };
    console.warn("[Commission] DB tier config is invalid, falling back to defaults:", v.error);
    return { tiers: [...DEFAULT_COMMISSION_TIERS], enabled, source: "invalid-db-fallback" };
  }

  return { tiers: [...DEFAULT_COMMISSION_TIERS], enabled, source: "fallback" };
};

// ─────────────────────────────────────────────────────────────────────────
// Order summary recompute (denormalized cache)
// ─────────────────────────────────────────────────────────────────────────

const _toObjectIdOrNull = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try { return new mongoose.Types.ObjectId(String(id)); } catch (_) { return null; }
};

/**
 * Recompute Order.commissionSummary from the ledger.
 * Aggregates net commission (accruals + backfills − reversals) and picks
 * an overall status:
 *   • "none"      → no entries
 *   • "pending"   → all open entries are pending
 *   • "confirmed" → all open entries are confirmed
 *   • "partial"   → mix of pending and confirmed
 *   • "reversed"  → every entry was reversed (net = 0)
 */
const recomputeOrderSummary = async (orderId, { session } = {}) => {
  const oid = _toObjectIdOrNull(orderId);
  if (!oid) return null;

  const query = Commission.find({ orderId: oid });
  if (session) query.session(session);
  const entries = await query.lean();

  if (entries.length === 0) {
    const summary = { totalCommission: 0, status: "none", computedAt: new Date() };
    await Order.updateOne({ _id: oid }, { $set: { commissionSummary: summary } }, session ? { session } : {});
    return summary;
  }

  let total = 0;
  let pendingCount   = 0;
  let confirmedCount = 0;
  let reversedCount  = 0;
  let activeCount    = 0;

  for (const e of entries) {
    if (e.type === "reversal") {
      if (e.status !== "reversed") total -= Number(e.commissionAmount || 0);
      continue;
    }
    if (e.status === "pending")    { total += Number(e.commissionAmount || 0); pendingCount++;   activeCount++; }
    if (e.status === "confirmed")  { total += Number(e.commissionAmount || 0); confirmedCount++; activeCount++; }
    if (e.status === "reversed")   { reversedCount++; }
  }

  let status = "none";
  if (activeCount === 0 && reversedCount > 0) status = "reversed";
  else if (pendingCount > 0 && confirmedCount === 0) status = "pending";
  else if (confirmedCount > 0 && pendingCount === 0) status = "confirmed";
  else if (pendingCount > 0 && confirmedCount > 0)   status = "partial";

  const summary = {
    totalCommission: Math.max(0, Math.round(total)),
    status,
    computedAt: new Date(),
  };
  await Order.updateOne({ _id: oid }, { $set: { commissionSummary: summary } }, session ? { session } : {});
  return summary;
};

// ─────────────────────────────────────────────────────────────────────────
// Wallet helpers (internal)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Atomically adjust a seller's walletBalance and write a WalletTransaction entry.
 *
 * @param {ObjectId} sellerOid  - seller's ObjectId
 * @param {number}   delta      - positive = credit, negative = debit
 * @param {Object}   txnFields  - extra fields merged into the WalletTransaction doc
 * @param {Object}   opts       - { session }
 */
const _adjustWallet = async (sellerOid, delta, txnFields, opts = {}) => {
  const crypto = require("crypto");
  const SAFE   = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg    = Array.from(crypto.randomBytes(8)).map((b) => SAFE[b % SAFE.length]).join("");
  const transactionId = `TXN-${seg}-${Date.now()}`;

  // Atomically read current balance and apply delta
  const updated = await Seller.findByIdAndUpdate(
    sellerOid,
    { $inc: { walletBalance: delta } },
    { new: true, session: opts.session, select: "walletBalance" }
  );
  if (!updated) return; // seller not found — skip silently

  const balanceAfter  = updated.walletBalance;
  const balanceBefore = balanceAfter - delta;

  await WalletTransaction.create(
    [{
      transactionId,
      sellerId:      sellerOid,
      type:          delta >= 0 ? "CREDIT" : "DEBIT",
      amount:        Math.abs(delta),
      balanceBefore: Math.round(balanceBefore),
      balanceAfter:  Math.round(balanceAfter),
      ...txnFields,
    }],
    opts.session ? { session: opts.session } : {}
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Accrual
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create one accrual row per seller for the given order.
 *
 * @param {Object} order  - Mongoose doc OR plain object with .items, ._id, .orderId, .discount, .giftCardDiscount
 * @param {Object} opts
 *   - triggeredBy: required, one of "place_order" | "payment_verified"
 *   - session:     optional Mongo session (for transactions)
 *   - safe:        when true, swallow errors and return { ok: false }
 *
 * Returns { ok, entries: [...], skipped: false } or { ok: false, error }.
 *
 * Idempotency: duplicate accrual attempts for the same (orderId, sellerId)
 * are silently ignored — Mongo's partial unique index rejects them and we
 * treat the existing row as authoritative.
 */
const accrueCommissionsForOrder = async (order, { triggeredBy, session, safe = false } = {}) => {
  if (!order) return _maybeThrow(safe, new Error("accrue: order is required"));
  if (!triggeredBy) return _maybeThrow(safe, new Error("accrue: triggeredBy is required"));

  try {
    const { tiers, enabled } = await getActiveTiers();
    if (!enabled) return { ok: true, skipped: true, reason: "commission_disabled", entries: [] };

    const orderId     = order._id;
    const orderNumber = order.orderId || String(order._id);
    const oid         = _toObjectIdOrNull(orderId);
    if (!oid) return _maybeThrow(safe, new Error("accrue: invalid order id"));

    const breakdown = computeOrderCommissions(
      {
        items:            order.items,
        discount:         order.discount,
        giftCardDiscount: order.giftCardDiscount,
      },
      tiers
    );

    if (breakdown.length === 0) {
      await recomputeOrderSummary(oid, { session });
      return { ok: true, skipped: true, reason: "no_eligible_items", entries: [] };
    }

    const created = [];
    for (const row of breakdown) {
      const sellerOid = _toObjectIdOrNull(row.sellerId);
      if (!sellerOid) continue;
      if (row.commissionAmount <= 0) continue;

      // Explicit idempotency check — defense in depth. The partial unique
      // index also guards against this, but indexes may not be live yet on
      // a freshly-created collection. Belt-and-braces approach: check first,
      // then rely on the index as a backstop via the duplicate-key catch.
      const existsQuery = Commission.findOne({
        orderId: oid,
        sellerId: sellerOid,
        type:   { $in: ["accrual", "backfill"] },
        status: { $in: ["pending", "confirmed"] },
      }).select("_id");
      if (session) existsQuery.session(session);
      const already = await existsQuery.lean();
      if (already) continue;

      const doc = {
        orderId:             oid,
        orderNumber,
        sellerId:            sellerOid,
        sellerSubtotal:      row.sellerSubtotal,
        sellerDiscountShare: row.sellerDiscountShare,
        sellerGiftCardShare: row.sellerGiftCardShare,
        taxableAmount:       row.taxableAmount,
        commissionAmount:    row.commissionAmount,
        tierLabel:           row.tierLabel,
        tierSnapshot:        row.tierSnapshot,
        type:                "accrual",
        status:              "pending",
        triggeredBy,
      };

      try {
        const opts = session ? { session } : {};
        const [inserted] = await Commission.create([doc], opts);
        created.push(inserted);
      } catch (err) {
        // Duplicate-key on the partial unique index → already accrued, ignore.
        if (err && (err.code === 11000 || err.code === 11001)) continue;
        throw err;
      }
    }

    await recomputeOrderSummary(oid, { session });
    return { ok: true, skipped: false, entries: created };
  } catch (err) {
    console.error("[Commission] accrue failed:", err.message);
    return _maybeThrow(safe, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Backfill (one-time migration for orders placed before commission existed)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create one backfill row per seller for a historical order. Behaves like
 * accrueCommissionsForOrder but stamps the entries with type="backfill",
 * triggeredBy="backfill", and picks the status from the caller (typically
 * "confirmed" for Delivered orders, "pending" for in-flight ones).
 *
 * NEVER overwrites or mutates existing entries — if there is already an
 * open ledger row for (orderId, sellerId), the seller is silently skipped.
 *
 * @param {Object} order        - Order doc / plain object (must include items, _id, orderId, discount, giftCardDiscount)
 * @param {Object} opts
 *   - statusForEntries: "pending" | "confirmed" (default: "pending")
 *   - tiers:            optional override; defaults to getActiveTiers() result
 *   - dryRun:           when true, compute but write nothing
 *   - session:          optional Mongo session
 *   - safe:             when true, swallow errors and return { ok: false }
 */
const backfillCommissionsForOrder = async (
  order,
  {
    statusForEntries = "pending",
    tiers: tiersOverride = null,
    dryRun = false,
    session,
    safe = false,
  } = {}
) => {
  if (!order) return _maybeThrow(safe, new Error("backfill: order is required"));
  if (!["pending", "confirmed"].includes(statusForEntries)) {
    return _maybeThrow(safe, new Error("backfill: invalid statusForEntries"));
  }

  try {
    let tiers;
    let enabled = true;
    if (Array.isArray(tiersOverride) && tiersOverride.length > 0) {
      const v = validateTiers(tiersOverride);
      if (!v.valid) return _maybeThrow(safe, new Error(`backfill: invalid tiers override: ${v.error}`));
      tiers = tiersOverride;
    } else {
      const active = await getActiveTiers();
      tiers   = active.tiers;
      enabled = active.enabled;
    }

    if (!enabled && !tiersOverride) {
      return { ok: true, skipped: true, reason: "commission_disabled", entries: [], plan: [] };
    }

    const orderId     = order._id;
    const orderNumber = order.orderId || String(order._id);
    const oid         = _toObjectIdOrNull(orderId);
    if (!oid) return _maybeThrow(safe, new Error("backfill: invalid order id"));

    const breakdown = computeOrderCommissions(
      {
        items:            order.items,
        discount:         order.discount,
        giftCardDiscount: order.giftCardDiscount,
      },
      tiers
    );

    if (breakdown.length === 0) {
      if (!dryRun) await recomputeOrderSummary(oid, { session });
      return { ok: true, skipped: true, reason: "no_eligible_items", entries: [], plan: [] };
    }

    const plan    = [];
    const created = [];

    for (const row of breakdown) {
      const sellerOid = _toObjectIdOrNull(row.sellerId);
      if (!sellerOid) continue;
      if (row.commissionAmount <= 0) continue;

      const existsQuery = Commission.findOne({
        orderId: oid,
        sellerId: sellerOid,
        type:   { $in: ["accrual", "backfill"] },
        status: { $in: ["pending", "confirmed"] },
      }).select("_id");
      if (session) existsQuery.session(session);
      const already = await existsQuery.lean();
      if (already) {
        plan.push({ sellerId: row.sellerId, commissionAmount: row.commissionAmount, skipped: true, reason: "exists" });
        continue;
      }

      const doc = {
        orderId:             oid,
        orderNumber,
        sellerId:            sellerOid,
        sellerSubtotal:      row.sellerSubtotal,
        sellerDiscountShare: row.sellerDiscountShare,
        sellerGiftCardShare: row.sellerGiftCardShare,
        taxableAmount:       row.taxableAmount,
        commissionAmount:    row.commissionAmount,
        tierLabel:           row.tierLabel,
        tierSnapshot:        row.tierSnapshot,
        type:                "backfill",
        status:              statusForEntries,
        triggeredBy:         "backfill",
      };

      plan.push({ sellerId: row.sellerId, commissionAmount: row.commissionAmount, skipped: false, doc });

      if (dryRun) continue;

      try {
        const opts = session ? { session } : {};
        const [inserted] = await Commission.create([doc], opts);
        created.push(inserted);
      } catch (err) {
        if (err && (err.code === 11000 || err.code === 11001)) continue; // duplicate-key — skip
        throw err;
      }
    }

    if (!dryRun) await recomputeOrderSummary(oid, { session });
    return { ok: true, skipped: false, entries: created, plan };
  } catch (err) {
    console.error("[Commission] backfill failed:", err.message);
    return _maybeThrow(safe, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Confirm (on Delivered)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Flip all open pending accruals for an order to "confirmed".
 * Safe to call repeatedly — confirmed rows are left alone.
 */
const confirmCommissionsForOrder = async (orderId, { session, safe = false } = {}) => {
  const oid = _toObjectIdOrNull(orderId);
  if (!oid) return _maybeThrow(safe, new Error("confirm: invalid order id"));

  try {
    const opts = session ? { session } : {};

    // Fetch the pending entries so we can credit each seller's wallet.
    const pendingQuery = Commission.find({
      orderId: oid,
      type:    { $in: ["accrual", "backfill"] },
      status:  "pending",
    });
    if (session) pendingQuery.session(session);
    const pendingEntries = await pendingQuery.lean();

    // Flip status to confirmed.
    const filter = {
      orderId: oid,
      type:    { $in: ["accrual", "backfill"] },
      status:  "pending",
    };
    const result = await Commission.updateMany(filter, { $set: { status: "confirmed" } }, opts);

    // Credit each seller's wallet — the amount they earn = taxableAmount - commissionAmount.
    // This is their net payout from the platform for this order.
    for (const entry of pendingEntries) {
      const sellerEarning = Math.round(entry.taxableAmount - entry.commissionAmount);
      if (sellerEarning <= 0) continue;
      try {
        await _adjustWallet(
          entry.sellerId,
          sellerEarning,
          {
            reason:       "commission_confirmed",
            orderId:      entry.orderId,
            commissionId: entry._id,
            description:  `Order ${entry.orderNumber} delivered — ₹${sellerEarning} credited`,
          },
          { session }
        );
        // Also track lifetime earned.
        await Seller.findByIdAndUpdate(
          entry.sellerId,
          { $inc: { totalCommissionsEarned: sellerEarning } },
          opts
        );
      } catch (walletErr) {
        console.error("[Commission] wallet credit failed for seller", entry.sellerId, walletErr.message);
        // Non-fatal — log and continue; the commission row is confirmed regardless.
      }
    }

    await recomputeOrderSummary(oid, { session });
    return { ok: true, matched: result.matchedCount || 0, modified: result.modifiedCount || 0 };
  } catch (err) {
    console.error("[Commission] confirm failed:", err.message);
    return _maybeThrow(safe, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Reverse (on cancel / return / refund)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Insert reversal rows for every still-open accrual on the order and
 * flip the original rows' status to "reversed". Net effect on platform
 * revenue = 0. Already-reversed rows are skipped (idempotent).
 *
 * @param {Object} opts
 *   - triggeredBy: required, e.g. "order_cancelled" | "return_refunded" | "replacement"
 *   - reasonNote:  optional free-text
 *   - session:     optional Mongo session
 *   - safe:        when true, swallow errors and return { ok: false }
 */
const reverseCommissionsForOrder = async (
  orderId,
  { triggeredBy, reasonNote = "", session, safe = false } = {}
) => {
  if (!triggeredBy) return _maybeThrow(safe, new Error("reverse: triggeredBy is required"));
  const oid = _toObjectIdOrNull(orderId);
  if (!oid) return _maybeThrow(safe, new Error("reverse: invalid order id"));

  try {
    const opts = session ? { session } : {};

    // Only reverse rows that haven't been reversed yet.
    const cursor = Commission.find({
      orderId: oid,
      type:    { $in: ["accrual", "backfill"] },
      status:  { $in: ["pending", "confirmed"] },
    });
    if (session) cursor.session(session);
    const openEntries = await cursor;

    const reversals = [];
    for (const original of openEntries) {
      const reversalDoc = {
        orderId:             original.orderId,
        orderNumber:         original.orderNumber,
        sellerId:            original.sellerId,
        sellerSubtotal:      original.sellerSubtotal,
        sellerDiscountShare: original.sellerDiscountShare,
        sellerGiftCardShare: original.sellerGiftCardShare,
        taxableAmount:       original.taxableAmount,
        commissionAmount:    original.commissionAmount,
        tierLabel:           original.tierLabel,
        tierSnapshot:        original.tierSnapshot,
        type:                "reversal",
        status:              "confirmed",
        triggeredBy,
        reversesEntryId:     original._id,
        reasonNote,
      };

      const [inserted] = await Commission.create([reversalDoc], opts);
      reversals.push(inserted);

      // Capture status BEFORE mutation so we know if wallet was previously credited.
      const wasConfirmed = original.status === "confirmed";
      original.status = "reversed";
      await original.save(opts);

      // Debit the seller's wallet only if the commission was already confirmed
      // (meaning the wallet was previously credited for this order).
      // Pending commissions were never credited, so no debit needed.
      if (wasConfirmed) {
        const previousEarning = Math.round(original.taxableAmount - original.commissionAmount);
        if (previousEarning > 0) {
          try {
            await _adjustWallet(
              original.sellerId,
              -previousEarning,
              {
                reason:       "commission_reversed",
                orderId:      original.orderId,
                commissionId: original._id,
                description:  `Order ${original.orderNumber} reversed — ₹${previousEarning} debited`,
              },
              { session }
            );
          } catch (walletErr) {
            console.error("[Commission] wallet debit failed for seller", original.sellerId, walletErr.message);
          }
        }
      }
    }

    await recomputeOrderSummary(oid, { session });
    return { ok: true, reversed: reversals.length, entries: reversals };
  } catch (err) {
    console.error("[Commission] reverse failed:", err.message);
    return _maybeThrow(safe, err);
  }
};

/**
 * Adjust commission ledger entries and adjust seller wallet balances for partial returns.
 * If all items are returned, triggers full reversal.
 */
const adjustCommissionsForReturn = async (
  orderId,
  returnReq,
  { session, safe = false } = {}
) => {
  const oid = _toObjectIdOrNull(orderId);
  if (!oid) return _maybeThrow(safe, new Error("adjustCommissions: invalid order id"));

  try {
    const ReturnModel = require("../models/Return");
    const order = await Order.findById(oid);
    if (!order) return _maybeThrow(safe, new Error("adjustCommissions: order not found"));

    // 1. Find all completed returns for this order (status "Refunded")
    const completedReturns = await ReturnModel.find({ orderId: oid, status: "Refunded" });
    
    // Ensure we include the current returnReq's items if it is currently transitioning to Refunded
    const allReturnedItems = [];
    for (const ret of completedReturns) {
      allReturnedItems.push(...(ret.items || []));
    }
    if (returnReq && !completedReturns.some(r => String(r._id) === String(returnReq._id))) {
      allReturnedItems.push(...(returnReq.items || []));
    }

    // 2. Compute remaining active items in the order
    const remainingItems = [];
    const returnedVariantQtyMap = new Map();
    for (const retItem of allReturnedItems) {
      const key = String(retItem.variantId);
      returnedVariantQtyMap.set(key, (returnedVariantQtyMap.get(key) || 0) + Number(retItem.qty || 0));
    }

    for (const item of order.items || []) {
      const key = String(item.variantId);
      const returnedQty = returnedVariantQtyMap.get(key) || 0;
      const remainingQty = Math.max(0, Number(item.quantity || 0) - returnedQty);
      if (remainingQty > 0) {
        remainingItems.push({
          ...item.toObject(),
          quantity: remainingQty
        });
      }
    }

    // 3. If there are no remaining items (full return), do a full reversal!
    if (remainingItems.length === 0) {
      return reverseCommissionsForOrder(orderId, {
        triggeredBy: "return_refunded",
        reasonNote: `Full return refunded: Return ${returnReq?.returnId || returnReq?._id}`,
        session,
        safe
      });
    }

    // 4. If there are remaining items (partial return):
    const opts = session ? { session } : {};
    
    // a) Reverse the current open commission accruals (this debits the wallet for original earnings)
    const openEntries = await Commission.find({
      orderId: oid,
      type: { $in: ["accrual", "backfill"] },
      status: { $in: ["pending", "confirmed"] }
    });

    for (const original of openEntries) {
      const reversalDoc = {
        orderId: original.orderId,
        orderNumber: original.orderNumber,
        sellerId: original.sellerId,
        sellerSubtotal: original.sellerSubtotal,
        sellerDiscountShare: original.sellerDiscountShare,
        sellerGiftCardShare: original.sellerGiftCardShare,
        taxableAmount: original.taxableAmount,
        commissionAmount: original.commissionAmount,
        tierLabel: original.tierLabel,
        tierSnapshot: original.tierSnapshot,
        type: "reversal",
        status: "confirmed",
        triggeredBy: "return_refunded",
        reversesEntryId: original._id,
        reasonNote: `Partial return adjustment: Return ${returnReq?.returnId || returnReq?._id}`
      };

      const [insertedReversal] = await Commission.create([reversalDoc], opts);
      
      const wasConfirmed = original.status === "confirmed";
      original.status = "reversed";
      await original.save(opts);

      if (wasConfirmed) {
        const previousEarning = Math.round(original.taxableAmount - original.commissionAmount);
        if (previousEarning > 0) {
          try {
            await _adjustWallet(
              original.sellerId,
              -previousEarning,
              {
                reason: "commission_reversed",
                orderId: original.orderId,
                commissionId: original._id,
                description: `Partial return adjustment order ${original.orderNumber} — ₹${previousEarning} debited`
              },
              { session }
            );
          } catch (walletErr) {
            console.error("[Commission] wallet debit failed for seller", original.sellerId, walletErr.message);
          }
        }
      }
    }

    // b) Accrue the new remaining commission breakdown for remaining items!
    const { tiers, enabled } = await getActiveTiers();
    if (enabled) {
      const breakdown = computeOrderCommissions(
        {
          items: remainingItems,
          discount: order.discount,
          giftCardDiscount: order.giftCardDiscount
        },
        tiers
      );

      for (const row of breakdown) {
        const sellerOid = _toObjectIdOrNull(row.sellerId);
        if (!sellerOid || row.commissionAmount <= 0) continue;

        const doc = {
          orderId: oid,
          orderNumber: order.orderId || String(order._id),
          sellerId: sellerOid,
          sellerSubtotal: row.sellerSubtotal,
          sellerDiscountShare: row.sellerDiscountShare,
          sellerGiftCardShare: row.sellerGiftCardShare,
          taxableAmount: row.taxableAmount,
          commissionAmount: row.commissionAmount,
          tierLabel: row.tierLabel,
          tierSnapshot: row.tierSnapshot,
          type: "accrual",
          status: "confirmed", // Mark directly confirmed as order is already delivered!
          triggeredBy: "return_refunded"
        };

        const [insertedAccrual] = await Commission.create([doc], opts);

        // Credit the seller's wallet immediately for the new net earnings
        const sellerEarning = Math.round(row.taxableAmount - row.commissionAmount);
        if (sellerEarning > 0) {
          try {
            await _adjustWallet(
              sellerOid,
              sellerEarning,
              {
                reason: "commission_confirmed",
                orderId: oid,
                commissionId: insertedAccrual._id,
                description: `Partial return adjustment order ${doc.orderNumber} — ₹${sellerEarning} credited`
              },
              { session }
            );
          } catch (walletErr) {
            console.error("[Commission] wallet credit failed for seller", sellerOid, walletErr.message);
          }
        }
      }
    }

    await recomputeOrderSummary(oid, { session });
    return { ok: true, partial: true };
  } catch (err) {
    console.error("[Commission] adjustCommissionsForReturn failed:", err.message);
    return _maybeThrow(safe, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const _maybeThrow = (safe, err) => {
  if (safe) return { ok: false, error: err.message };
  throw err;
};

module.exports = {
  getActiveTiers,
  accrueCommissionsForOrder,
  backfillCommissionsForOrder,
  confirmCommissionsForOrder,
  reverseCommissionsForOrder,
  adjustCommissionsForReturn,
  recomputeOrderSummary,
};
