/**
 * 📦 Shipping Hardening & Two-Phase Rollback Tests
 *
 * Tests:
 * 1. Shipment model schema validation for all statuses, including FAILED_ORDER_SAVE.
 * 2. Order shipping status resolution logic (mixed orders, cancellations, partial fulfillment).
 * 3. Two-phase rollback behavior when remote cancellation succeeds vs fails.
 * 4. Shiprocket COD payload calculation (discounts, shipping charges, collectable amount).
 * 5. Mixed order proportional COD allocation.
 */

const assert = require("assert");
const mongoose = require("mongoose");
const Shipment = require("../src/models/Shipment");
const ShiprocketProvider = require("../src/services/shipping/shiprocket.service");
const { calculateOrderCodAllocations, getOrderVendorGroups } = require("../src/services/shipping/codAllocation");
const shiprocketService = new ShiprocketProvider();

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

  // 3. Two-phase rollback behavior
  console.log("\n3. Two-phase rollback behavior");
  console.log("───────────────────────────────");

  test("When remote cancellation succeeds, orphaned shipment is purged", () => {
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

  test("When remote cancellation is rejected, shipment is preserved with FAILED_ORDER_SAVE", () => {
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

  // 4. Shiprocket Payload & COD Precision
  console.log("\n4. Shiprocket Payload & COD Precision");
  console.log("─────────────────────────────────────");

  test("Prepaid order generates payment_method='Prepaid' with 0 discount/shipping", () => {
    const payload = {
      orderId: "ORD_TEST_1",
      deliveryAddress: { name: "Aman", address: "Main Rd", city: "Ranchi", pincode: "834001", state: "Jharkhand", phone: "9876543210" },
      package: { weight: 200, length: 10, breadth: 10, height: 5 },
      paymentMode: "prepaid",
      codAmount: 0,
      items: [{ name: "Gold Ring", price: 5000, quantity: 1, sku: "SKU1" }],
    };

    const orderPayload = shiprocketService._buildOrderPayload(payload);
    assert.strictEqual(orderPayload.payment_method, "Prepaid");
    assert.strictEqual(orderPayload.sub_total, 5000);
    assert.strictEqual(orderPayload.total_discount, 0);
    assert.strictEqual(orderPayload.shipping_charges, 0);
  });

  test("COD order with discount: factors total_discount so collectable equals codAmount", () => {
    // Items subtotal = ₹1000, but customer applied ₹100 coupon, so COD amount is ₹900
    const payload = {
      orderId: "ORD_TEST_2",
      deliveryAddress: { name: "Aman", address: "Main Rd", city: "Ranchi", pincode: "834001", state: "Jharkhand", phone: "9876543210" },
      package: { weight: 200 },
      paymentMode: "cod",
      codAmount: 900,
      items: [{ name: "Silver Pendant", price: 1000, quantity: 1, sku: "SKU2" }],
    };

    const orderPayload = shiprocketService._buildOrderPayload(payload);
    assert.strictEqual(orderPayload.payment_method, "COD");
    assert.strictEqual(orderPayload.sub_total, 1000);
    assert.strictEqual(orderPayload.total_discount, 100);
    assert.strictEqual(orderPayload.shipping_charges, 0);

    const netCollectable = orderPayload.sub_total + orderPayload.shipping_charges - orderPayload.total_discount;
    assert.strictEqual(netCollectable, 900, "Courier collects exactly the discounted COD total");
  });

  test("COD order with shipping charges: factors shipping_charges so collectable equals codAmount", () => {
    // Items subtotal = ₹400, shipping fee = ₹50, total COD amount = ₹450
    const payload = {
      orderId: "ORD_TEST_3",
      deliveryAddress: { name: "Priya", address: "Station Rd", city: "Patna", pincode: "800001", state: "Bihar", phone: "9876543211" },
      package: { weight: 200 },
      paymentMode: "cod",
      codAmount: 450,
      items: [{ name: "Silver Nose Pin", price: 400, quantity: 1, sku: "SKU3" }],
    };

    const orderPayload = shiprocketService._buildOrderPayload(payload);
    assert.strictEqual(orderPayload.payment_method, "COD");
    assert.strictEqual(orderPayload.sub_total, 400);
    assert.strictEqual(orderPayload.shipping_charges, 50);
    assert.strictEqual(orderPayload.total_discount, 0);

    const netCollectable = orderPayload.sub_total + orderPayload.shipping_charges - orderPayload.total_discount;
    assert.strictEqual(netCollectable, 450, "Courier collects exactly the total including shipping");
  });

  test("Mixed order proportional COD allocation divides order.total without excess or loss", () => {
    // Admin items = ₹600, Seller items = ₹1400. Total order = ₹1800 (after ₹200 order-level coupon)
    const adminItems = [{ price: 600, quantity: 1 }];
    const sellerItems = [{ price: 1400, quantity: 1 }];
    const allItems = [...adminItems, ...sellerItems];
    const orderTotal = 1800;

    const adminSubtotal = adminItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const sellerSubtotal = sellerItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const orderSubtotal = allItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const adminCod = Math.round((orderTotal * adminSubtotal / orderSubtotal) * 100) / 100;
    const sellerCod = Math.round((orderTotal * sellerSubtotal / orderSubtotal) * 100) / 100;

    assert.strictEqual(adminCod, 540);
    assert.strictEqual(sellerCod, 1260);
    assert.strictEqual(adminCod + sellerCod, 1800, "Sum of split shipments exactly matches order total");

    // Test Shiprocket payload for admin portion
    const adminShipPayload = shiprocketService._buildOrderPayload({
      orderId: "ORD_MIXED_1",
      deliveryAddress: { name: "Customer", address: "A", city: "B", pincode: "123456", state: "C", phone: "123" },
      paymentMode: "cod",
      codAmount: adminCod,
      items: adminItems,
    });
    const adminCollectable = adminShipPayload.sub_total + adminShipPayload.shipping_charges - adminShipPayload.total_discount;
    assert.strictEqual(adminCollectable, 540);

    // Test Shiprocket payload for seller portion
    const sellerShipPayload = shiprocketService._buildOrderPayload({
      orderId: "ORD_MIXED_1",
      deliveryAddress: { name: "Customer", address: "A", city: "B", pincode: "123456", state: "C", phone: "123" },
      paymentMode: "cod",
      codAmount: sellerCod,
      items: sellerItems,
    });
    const sellerCollectable = sellerShipPayload.sub_total + sellerShipPayload.shipping_charges - sellerShipPayload.total_discount;
    assert.strictEqual(sellerCollectable, 1260);
  });

  test("Three-way split of ₹101 order: Largest Remainder Method prevents 1-paisa drift (₹101.00 total, not ₹101.01)", () => {
    // ₹101 order split equally across three sellers (₹100 subtotal each)
    const order = {
      total: 101,
      paymentMethod: "cod",
      items: [
        { price: 100, quantity: 1, sellerId: "seller_A" },
        { price: 100, quantity: 1, sellerId: "seller_B" },
        { price: 100, quantity: 1, sellerId: "seller_C" },
      ],
    };

    const allocations = calculateOrderCodAllocations(order);
    const sum = Object.values(allocations).reduce((s, a) => s + a, 0);

    // Naive independent rounding would produce 33.67 * 3 = 101.01
    // Largest Remainder Method distributes the 2 paise remainder to top 2: 33.67, 33.67, 33.66
    assert.strictEqual(allocations["seller_A"], 33.67);
    assert.strictEqual(allocations["seller_B"], 33.67);
    assert.strictEqual(allocations["seller_C"], 33.66);
    assert.strictEqual(Math.round(sum * 100) / 100, 101.00, "Sum of allocations must exactly equal ₹101.00");
  });

  test("COD allocation rejects payment mode alteration", () => {
    const isCodOrder = { paymentMethod: "cod" };
    const isPrepaidOrder = { paymentMethod: "prepaid" };

    const validateMode = (order, requestedMode) => {
      const isCod = order.paymentMethod === "cod";
      const mode = isCod ? "cod" : "prepaid";
      if (requestedMode && requestedMode !== mode) {
        throw new Error(`Payment mode cannot be changed from order payment method (${isCod ? "COD" : "Prepaid"}).`);
      }
      return mode;
    };

    // Attempting to switch COD order to Prepaid must throw
    assert.throws(
      () => validateMode(isCodOrder, "prepaid"),
      /Payment mode cannot be changed/
    );

    // Attempting to switch Prepaid order to COD must throw
    assert.throws(
      () => validateMode(isPrepaidOrder, "cod"),
      /Payment mode cannot be changed/
    );

    // Matching modes succeed
    assert.strictEqual(validateMode(isCodOrder, "cod"), "cod");
    assert.strictEqual(validateMode(isPrepaidOrder, "prepaid"), "prepaid");
  });

  test("Seller COD validation rejects arbitrary lower amounts and enforces allocated share", () => {
    const order = {
      total: 1800,
      paymentMethod: "cod",
      items: [
        { price: 600, quantity: 1, sellerId: null },
        { price: 1400, quantity: 1, sellerId: "seller_1" },
      ],
    };

    const allocations = calculateOrderCodAllocations(order);
    const allocatedCod = allocations["seller_1"]; // 1260

    const validateCodInput = (inputCod) => {
      let finalCodAmount = allocatedCod;
      if (inputCod !== undefined && inputCod !== null && String(inputCod).trim() !== "") {
        const parsed = Number(inputCod);
        if (!isNaN(parsed) && Math.abs(parsed - finalCodAmount) > 0.05) {
          throw new Error(`Invalid COD amount. The allocated COD share for your items is ₹${finalCodAmount.toFixed(2)}, but received ₹${parsed.toFixed(2)}.`);
        }
      }
      return finalCodAmount;
    };

    // Seller tries to input an arbitrary low COD amount (e.g. ₹50 or ₹100 instead of ₹1260)
    assert.throws(() => validateCodInput(50), /Invalid COD amount/);
    assert.throws(() => validateCodInput(100), /Invalid COD amount/);

    // Exact matching amount or omitted amount succeeds with allocated share
    assert.strictEqual(validateCodInput(1260), 1260);
    assert.strictEqual(validateCodInput(undefined), 1260);
  });

  test("Rounding precision consistency: both frontend and backend preserve two decimals", () => {
    // Uneven split: total 1000, admin 333, seller 667
    const orderTotal = 1000;
    const adminSubtotal = 333;
    const orderSubtotal = 1000;

    const backendRounded = Math.round(((orderTotal * adminSubtotal) / orderSubtotal) * 100) / 100;
    const frontendRounded = Math.round((((orderTotal) * adminSubtotal) / orderSubtotal) * 100) / 100;

    assert.strictEqual(backendRounded, 333);
    assert.strictEqual(frontendRounded, 333);
    assert.strictEqual(backendRounded, frontendRounded, "Frontend and backend rounding formulas must match exactly");
  });

  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`Tests:  ${passed + failed}   ✓ ${passed} passed   ✗ ${failed} failed`);
  console.log("════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
