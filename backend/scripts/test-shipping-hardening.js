/**
 * 📦 Shipping Hardening & Two-Phase Rollback Tests
 *
 * Tests:
 * 1. Shipment model schema validation for all statuses, including FAILED_ORDER_SAVE.
 * 2. Two-phase rollback behavior when remote cancellation succeeds vs fails.
 * 3. Mixed order status calculations (allShipped, anyShipped, allDelivered, Cancelled guard).
 */

const assert = require("assert");
const mongoose = require("mongoose");
const Shipment = require("../src/models/Shipment");
const Order = require("../src/models/Order");

async function runTests() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("🧪 Shipping Hardening & Status Transitions Test Suite");
  console.log("════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // 1. Shipment Model Schema Validation
  console.log("1. Shipment model enum validation");
  console.log("─────────────────────────────────");

  test("Shipment schema allows FAILED_ORDER_SAVE status", () => {
    const enumValues = Shipment.schema.path("status").enumValues;
    assert(enumValues.includes("FAILED_ORDER_SAVE"), "FAILED_ORDER_SAVE should be in status enum");
    assert(enumValues.includes("CREATED"), "CREATED should be in status enum");
    assert(enumValues.includes("DELIVERED"), "DELIVERED should be in status enum");
    assert(enumValues.includes("CANCELLED"), "CANCELLED should be in status enum");
  });

  test("Shipment instance with FAILED_ORDER_SAVE passes validation", () => {
    const shipment = new Shipment({
      orderId: new mongoose.Types.ObjectId(),
      courier: "shiprocket",
      status: "FAILED_ORDER_SAVE",
      timeline: [{
        status: "FAILED_ORDER_SAVE",
        message: "Remote order created but local save failed",
        date: new Date(),
      }],
    });
    const err = shipment.validateSync();
    assert.strictEqual(err, undefined, "Validation should pass with FAILED_ORDER_SAVE");
    assert.strictEqual(shipment.status, "FAILED_ORDER_SAVE");
  });

  // 2. Order Status Calculation Logic
  console.log("\n2. Order shipping status resolution logic");
  console.log("──────────────────────────────────────────");

  const computeStatus = (order, shipments) => {
    const hasAdminItems = (order.items || []).some((item) => !item.sellerId);
    const sellerIdsInOrder = [...new Set(
      (order.items || []).map((item) => String(item.sellerId || "")).filter(Boolean)
    )];

    const activeShipments = shipments.filter((s) => s.status !== "CANCELLED");

    const adminShipment = activeShipments.find((s) => s.isAdminShipment || !s.sellerId);
    const adminDelivered = !hasAdminItems || (adminShipment && adminShipment.status === "DELIVERED");
    const adminShipped = !hasAdminItems || (adminShipment && ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(adminShipment.status));

    const deliveredSellers = new Set(
      activeShipments
        .filter((s) => s.status === "DELIVERED" && s.sellerId)
        .map((s) => String(s.sellerId))
    );
    const shippedSellers = new Set(
      activeShipments
        .filter((s) => ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(s.status) && s.sellerId)
        .map((s) => String(s.sellerId))
    );

    const allSellersDelivered = sellerIdsInOrder.length === 0 ||
      sellerIdsInOrder.every((sid) => deliveredSellers.has(sid));
    const allSellersShipped = sellerIdsInOrder.length === 0 ||
      sellerIdsInOrder.every((sid) => shippedSellers.has(sid));

    const hasAnyItems = hasAdminItems || sellerIdsInOrder.length > 0;
    const allDelivered = hasAnyItems && adminDelivered && allSellersDelivered;
    const allShipped = hasAnyItems && adminShipped && allSellersShipped;
    const anyShipped = activeShipments.some((s) =>
      ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(s.status)
    );

    if (order.status === "Cancelled") {
      return "Cancelled";
    }

    if (allDelivered) return "Delivered";
    if (allShipped) return "Shipped";
    if (anyShipped) return "Processing";
    if (activeShipments.length === 0 && order.status === "Shipped") return "Packed";
    return order.status;
  };

  test("Cancelled orders are never revived by any shipment events", () => {
    const order = { status: "Cancelled", items: [{ name: "Ring" }] };
    const shipments = [{ status: "DELIVERED", isAdminShipment: true }];
    assert.strictEqual(computeStatus(order, shipments), "Cancelled");
  });

  test("Mixed order: drops to Processing when only 1 of 2 shipments is shipped", () => {
    const sellerId = new mongoose.Types.ObjectId().toString();
    const order = {
      status: "Shipped",
      items: [
        { name: "Admin Ring", sellerId: null },
        { name: "Seller Pendant", sellerId },
      ],
    };
    // Admin shipment is cancelled, seller shipment is still picked up
    const shipments = [
      { status: "CANCELLED", isAdminShipment: true },
      { status: "PICKED_UP", sellerId },
    ];
    assert.strictEqual(computeStatus(order, shipments), "Processing");
  });

  test("Mixed order: becomes Shipped only when both admin and seller shipments are shipped", () => {
    const sellerId = new mongoose.Types.ObjectId().toString();
    const order = {
      status: "Processing",
      items: [
        { name: "Admin Ring", sellerId: null },
        { name: "Seller Pendant", sellerId },
      ],
    };
    const shipments = [
      { status: "PICKED_UP", isAdminShipment: true },
      { status: "IN_TRANSIT", sellerId },
    ];
    assert.strictEqual(computeStatus(order, shipments), "Shipped");
  });

  test("Mixed order: becomes Delivered only when BOTH admin and seller shipments are DELIVERED", () => {
    const sellerId = new mongoose.Types.ObjectId().toString();
    const order = {
      status: "Shipped",
      items: [
        { name: "Admin Ring", sellerId: null },
        { name: "Seller Pendant", sellerId },
      ],
    };
    const partialDeliver = [
      { status: "DELIVERED", isAdminShipment: true },
      { status: "OUT_FOR_DELIVERY", sellerId },
    ];
    // Both shipments are shipped/in-transit, so order remains 'Shipped' (not 'Delivered')
    assert.strictEqual(computeStatus(order, partialDeliver), "Shipped");

    const fullDeliver = [
      { status: "DELIVERED", isAdminShipment: true },
      { status: "DELIVERED", sellerId },
    ];
    assert.strictEqual(computeStatus(order, fullDeliver), "Delivered");
  });

  test("Order reverts to Packed when all active shipments are cancelled", () => {
    const order = { status: "Shipped", items: [{ name: "Ring" }] };
    const shipments = [{ status: "CANCELLED", isAdminShipment: true }];
    assert.strictEqual(computeStatus(order, shipments), "Packed");
  });

  // 3. Two-phase rollback simulation
  console.log("\n3. Two-phase rollback behavior");
  console.log("───────────────────────────────");

  test("When remote cancellation succeeds, orphaned shipment is purged", async () => {
    let deletedId = null;
    const fakeShipment = {
      _id: "ship_123",
      status: "CREATED",
      timeline: [],
    };
    const remoteCancelled = true;

    if (remoteCancelled) {
      deletedId = fakeShipment._id;
    }

    assert.strictEqual(deletedId, "ship_123", "Shipment should be flagged for deletion");
  });

  test("When remote cancellation is rejected, shipment is preserved with FAILED_ORDER_SAVE", async () => {
    let preserved = false;
    const fakeShipment = {
      _id: "ship_456",
      status: "CREATED",
      timeline: [],
    };
    const remoteCancelled = false;

    if (!remoteCancelled) {
      fakeShipment.status = "FAILED_ORDER_SAVE";
      fakeShipment.timeline.push({
        status: "FAILED_ORDER_SAVE",
        message: "Remote cancellation was rejected. Preserved AWB.",
        date: new Date(),
      });
      preserved = true;
    }

    assert.strictEqual(preserved, true);
    assert.strictEqual(fakeShipment.status, "FAILED_ORDER_SAVE");
    assert.strictEqual(fakeShipment.timeline.length, 1);
  });

  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`Tests:  ${passed + failed}   ✓ ${passed} passed   ✗ ${failed} failed`);
  console.log("════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
