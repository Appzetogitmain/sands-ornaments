/**
 * COD Allocation Utility
 *
 * Implements deterministic Cash on Delivery (COD) allocation across shipments
 * in multi-vendor / mixed orders using the Largest Remainder Method (Hare-Niemeyer).
 *
 * Guarantees:
 * 1. Proportional split according to each vendor's item subtotal.
 * 2. Exact two-decimal currency precision (in paise).
 * 3. Sum of all allocated amounts EXACTLY equals order.total without 1-paisa drift.
 * 4. Deterministic: always produces identical allocations regardless of which shipment is created first.
 */

function getOrderVendorGroups(order) {
  const items = order?.items || [];
  const groups = new Set();
  for (const item of items) {
    if (!item.sellerId) {
      groups.add("admin");
    } else {
      groups.add(String(item.sellerId));
    }
  }
  return Array.from(groups).sort();
}

function calculateOrderCodAllocations(order) {
  if (!order || order.paymentMethod !== "cod") {
    return {};
  }

  const orderTotal = Math.round((Number(order.total) || 0) * 100) / 100;
  if (orderTotal <= 0) {
    return {};
  }

  const items = order.items || [];
  if (items.length === 0) {
    return {};
  }

  const groupSubtotals = {};
  let totalSubtotal = 0;

  for (const item of items) {
    const groupKey = item.sellerId ? String(item.sellerId) : "admin";
    const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
    groupSubtotals[groupKey] = (groupSubtotals[groupKey] || 0) + lineTotal;
    totalSubtotal += lineTotal;
  }

  const groupKeys = Object.keys(groupSubtotals).sort();

  if (groupKeys.length === 0) {
    return {};
  }

  if (groupKeys.length === 1) {
    return {
      [groupKeys[0]]: orderTotal,
    };
  }

  const totalPaise = Math.round(orderTotal * 100);

  if (totalSubtotal <= 0) {
    const baseShare = Math.floor(totalPaise / groupKeys.length);
    let rem = totalPaise % groupKeys.length;
    const result = {};
    for (const key of groupKeys) {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem--;
      result[key] = (baseShare + extra) / 100;
    }
    return result;
  }

  const parts = groupKeys.map((key) => {
    const subtotal = groupSubtotals[key];
    const exactPaise = (totalPaise * subtotal) / totalSubtotal;
    const floorPaise = Math.floor(exactPaise);
    const remainder = exactPaise - floorPaise;
    return {
      key,
      floorPaise,
      remainder,
    };
  });

  const sumFloor = parts.reduce((sum, p) => sum + p.floorPaise, 0);
  let paiseRemaining = totalPaise - sumFloor;

  // Sort descending by remainder; use group key as deterministic tie-breaker
  parts.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    return a.key.localeCompare(b.key);
  });

  for (let i = 0; i < parts.length && paiseRemaining > 0; i++) {
    parts[i].floorPaise += 1;
    paiseRemaining -= 1;
  }

  const allocations = {};
  for (const part of parts) {
    allocations[part.key] = Math.round(part.floorPaise) / 100;
  }

  return allocations;
}

module.exports = {
  getOrderVendorGroups,
  calculateOrderCodAllocations,
};
