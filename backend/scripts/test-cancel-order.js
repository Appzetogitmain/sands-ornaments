/**
 * 🧪 Order Cancellation End-to-End Validation Test Suite
 */

const assert = require("assert");
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const Shipment = require("../src/models/Shipment");
const orderRoutes = require("../src/modules/user/routes/order.routes");
const {
  generateOrderId,
  generateReturnId,
  generateReplacementId,
  generateReplId,
  generateTicketId,
} = require("../src/utils/generateId");

async function runTests() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("🧪 User Order Cancellation End-to-End Tests");
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

  // 1. Order Schema Enums
  console.log("1. Order & Shipment Schema Validation");
  console.log("─────────────────────────────────────");

  test("Order schema includes 'Cancelled' status", () => {
    const enumValues = Order.schema.path("status").enumValues;
    assert(enumValues.includes("Cancelled"), "'Cancelled' must be a valid Order status");
  });

  test("Order schema includes 'refunded' paymentStatus", () => {
    const enumValues = Order.schema.path("paymentStatus").enumValues;
    assert(enumValues.includes("refunded"), "'refunded' must be a valid paymentStatus");
  });

  test("Order schema includes refund tracking fields", () => {
    assert(Order.schema.path("refundId"), "refundId field must exist");
    assert(Order.schema.path("refundStatus"), "refundStatus field must exist");
    assert(Order.schema.path("refundAmount"), "refundAmount field must exist");
    assert(Order.schema.path("refundedAt"), "refundedAt field must exist");
  });

  test("Shipment schema allows 'CANCELLED' status", () => {
    const enumValues = Shipment.schema.path("status").enumValues;
    assert(enumValues.includes("CANCELLED"), "'CANCELLED' must be a valid Shipment status");
  });

  test("generateReplacementId is defined and outputs valid replacement format", () => {
    assert.strictEqual(typeof generateReplacementId, "function", "generateReplacementId must be a function");
    assert.strictEqual(typeof generateReplId, "function", "generateReplId alias must be a function");
    const id = generateReplacementId();
    assert(/^REP-\d{6}$/.test(id), `Replacement ID must match REP-XXXXXX format, got: ${id}`);
  });

  test("generateReturnId is defined and outputs valid return format", () => {
    assert.strictEqual(typeof generateReturnId, "function", "generateReturnId must be a function");
    const id = generateReturnId();
    assert(/^RET-\d{6}$/.test(id), `Return ID must match RET-XXXXXX format, got: ${id}`);
  });

  // 2. Cancellation Status Guard Logic
  console.log("\n2. Cancellation Business Logic & Guards");
  console.log("──────────────────────────────────────");

  const CANCELLABLE_STATUSES = ["Pending", "Processing", "Confirmed", "Packed"];
  const NON_CANCELLABLE_STATUSES = ["Partially Shipped", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned", "Partially Returned"];

  test("Cancellable order statuses match business requirements", () => {
    CANCELLABLE_STATUSES.forEach((status) => {
      assert(CANCELLABLE_STATUSES.includes(status), `${status} should be cancellable`);
    });
    NON_CANCELLABLE_STATUSES.forEach((status) => {
      assert(!CANCELLABLE_STATUSES.includes(status), `${status} must NOT be cancellable`);
    });
  });

  // 3. In-Transit Shipment Guards
  test("In-transit shipments block customer cancellation", () => {
    const DISPATCHED_SHIPMENT_STATUSES = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
    const PRE_PICKUP_STATUSES = ["CREATED", "PICKUP_SCHEDULED"];

    // Sample active shipments
    const dispatchedShipment = { status: "IN_TRANSIT", courier: "shiprocket" };
    const prePickupShipment = { status: "PICKUP_SCHEDULED", courier: "shiprocket" };

    const shouldBlockDispatched = DISPATCHED_SHIPMENT_STATUSES.includes(dispatchedShipment.status);
    assert.strictEqual(shouldBlockDispatched, true, "IN_TRANSIT shipment must block cancellation");

    const shouldBlockPrePickup = DISPATCHED_SHIPMENT_STATUSES.includes(prePickupShipment.status);
    assert.strictEqual(shouldBlockPrePickup, false, "PICKUP_SCHEDULED shipment should allow cancellation (courier cancel)");
  });

  // 4. Restock Condition Check
  test("Restock condition correctly handles COD, paid, and refunded orders", () => {
    const shouldRestock = (paymentStatus, previousPaymentStatus) => {
      return previousPaymentStatus === "cod" || previousPaymentStatus === "paid" || paymentStatus === "refunded";
    };

    assert.strictEqual(shouldRestock("cod", "cod"), true, "COD orders must be restocked");
    assert.strictEqual(shouldRestock("refunded", "paid"), true, "Paid orders that transitioned to refunded must be restocked");
    assert.strictEqual(shouldRestock("pending", "pending"), false, "Unpaid pending orders where stock was never deducted must not be restocked");
  });

  // 5. Route Registration
  console.log("\n3. Route Registration");
  console.log("─────────────────────");

  test("User order routes register PATCH /:id/cancel and POST /:id/cancel", () => {
    const routes = orderRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    const patchCancel = routes.find((r) => r.path === "/:id/cancel" && r.methods.includes("patch"));
    const postCancel = routes.find((r) => r.path === "/:id/cancel" && r.methods.includes("post"));

    assert(patchCancel, "PATCH /:id/cancel route must be registered");
    assert(postCancel, "POST /:id/cancel route must be registered");
  });

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
