const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../src/modules/user/controllers/order.controller.js"), "utf8");

function setup({ courierResult = { cancelled: true }, failAt, paymentMethod = "cod", withShipment = true } = {}) {
  const calls = [];
  const session = {
    withTransaction: async (callback) => { calls.push("transaction:start"); await callback(); calls.push("transaction:commit"); },
    endSession: async () => { calls.push("session:end"); },
  };
  const variant = { _id: "variant-1", stock: 0, sold: 1 };
  const product = {
    name: "Test ring",
    variants: { id: () => variant, findIndex: () => 0 },
    save: async ({ session: writeSession }) => {
      assert.equal(writeSession, session);
      calls.push("product:save");
      if (failAt === "stock") throw new Error("stock write failed");
    },
  };
  const order = {
    _id: "order-1", orderId: "ORD-TEST", userId: "user-1", status: "Packed",
    paymentMethod, paymentStatus: paymentMethod === "cod" ? "cod" : "paid",
    razorpayPaymentId: "pay-test", refundStatus: "none", total: 500,
    items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }],
    appliedGiftCards: [{ cardId: "card-1", code: "CARD", amountUsed: 100 }],
    timeline: [],
    save: async ({ session: writeSession }) => {
      assert.equal(writeSession, session);
      calls.push("order:save");
    },
  };
  const shipment = {
    _id: "shipment-1", courier: "shiprocket", status: "CREATED",
    timeline: [], save: async () => { calls.push("shipment:save"); },
  };
  const mocks = {
    "mongoose": { Types: { ObjectId: { isValid: () => true } }, startSession: async () => session },
    "../../../models/Order": {
      findOne: () => ({ then: (resolve) => resolve(order), session: (readSession) => { assert.equal(readSession, session); return order; } }),
      updateOne: async () => { calls.push("refund:save"); },
    },
    "../../../models/Shipment": { find: async () => withShipment ? [shipment] : [] },
    "../../../models/Product": { findById: () => ({ session: (readSession) => { assert.equal(readSession, session); return product; } }) },
    "../../../models/GiftCard": {
      findOneAndUpdate: async (_filter, _update, options) => {
        assert.equal(options.session, session);
        calls.push("giftcard:restore");
        if (failAt === "giftcard") throw new Error("gift card write failed");
        if (failAt === "missingGiftCard") return null;
        return { balance: 100, value: 100 };
      },
      updateOne: async (_filter, _update, options) => { assert.equal(options.session, session); },
    },
    "../../../models/StockLog": { create: async (_rows, options) => {
      assert.equal(options.session, session);
      calls.push("stocklog:create");
      if (failAt === "stocklog") throw new Error("stock log write failed");
    } },
    "../../../services/shipping/courierFactory": { getCourierProvider: () => ({ cancelShipment: async () => {
      calls.push("courier:cancel");
      if (failAt === "courier") throw new Error("courier unavailable");
      return courierResult;
    } }) },
    "../../../services/razorpayService": { processRefund: async () => {
      calls.push("refund:create");
      if (failAt === "refund") throw new Error("refund unavailable");
      return { id: "rfnd-test" };
    } },
    "../../../services/commissionService": { reverseCommissionsForOrder: async () => { calls.push("commission:reverse"); } },
    "../../../utils/inventorySync": { isSerializedVariant: () => false, restockSerializedUnits: () => {} },
    "../../../utils/apiResponse": {
      success: (res, data, message) => res.status(200).json({ success: true, data, message }),
      error: (res, message, statusCode = 500) => res.status(statusCode).json({ success: false, message }),
    },
    "../../../services/socketEmitter": { emitOrderStatusUpdate: () => {} },
    "../../../services/notificationService": { createNotification: async () => {} },
    "../../../services/emailService": { enqueueEmail: () => {} },
    "../../../services/emailTemplates": { orderCancelled: () => "" },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, require: (id) => mocks[id] || {},
    console: { log: () => {}, error: () => {} }, Date,
  }, { filename: "order.controller.js" });
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return body; } };
  const req = { params: { id: "order-1" }, user: { userId: "user-1" }, body: { reason: "Changed mind" } };
  return { cancel: () => module.exports.cancelOrder(req, res), calls, order, shipment, res };
}

test("courier rejection leaves shipment and order active", async () => {
  const flow = setup({ courierResult: { cancelled: false, message: "rejected" } });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 502);
  assert.equal(flow.order.status, "Packed");
  assert.equal(flow.shipment.status, "CREATED");
  assert.deepEqual(flow.calls, ["courier:cancel"]);
});

test("courier exception leaves shipment and order active", async () => {
  const flow = setup({ failAt: "courier" });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 502);
  assert.equal(flow.order.status, "Packed");
  assert.equal(flow.shipment.status, "CREATED");
  assert.ok(!flow.calls.includes("transaction:start"));
});

test("gift-card failure prevents order commit and stock writes", async () => {
  const flow = setup({ failAt: "giftcard" });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 500);
  assert.ok(!flow.calls.includes("order:save"));
  assert.ok(!flow.calls.includes("product:save"));
  assert.ok(!flow.calls.includes("refund:create"));
  assert.ok(flow.calls.includes("session:end"));
});

test("missing redeemed gift card cannot silently cancel a paid order", async () => {
  const flow = setup({ failAt: "missingGiftCard", withShipment: false });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 500);
  assert.ok(!flow.calls.includes("order:save"));
});

test("stock failure prevents order commit and refund", async () => {
  const flow = setup({ failAt: "stock", paymentMethod: "razorpay", withShipment: false });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 500);
  assert.ok(!flow.calls.includes("order:save"));
  assert.ok(!flow.calls.includes("refund:create"));
});

test("stock-log failure prevents order commit", async () => {
  const flow = setup({ failAt: "stocklog", withShipment: false });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 500);
  assert.ok(flow.calls.includes("product:save"));
  assert.ok(!flow.calls.includes("order:save"));
  assert.ok(!flow.calls.includes("transaction:commit"));
});

test("successful paid cancellation commits inventory before refund", async () => {
  const flow = setup({ paymentMethod: "razorpay" });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 200);
  assert.equal(flow.order.status, "Cancelled");
  assert.equal(flow.shipment.status, "CANCELLED");
  assert.ok(flow.calls.indexOf("giftcard:restore") < flow.calls.indexOf("order:save"));
  assert.ok(flow.calls.indexOf("stocklog:create") < flow.calls.indexOf("order:save"));
  assert.ok(flow.calls.indexOf("transaction:commit") < flow.calls.indexOf("refund:create"));
  assert.ok(flow.calls.indexOf("refund:create") < flow.calls.indexOf("refund:save"));
});

test("refund API failure records a failed refund without undoing cancellation", async () => {
  const flow = setup({ failAt: "refund", paymentMethod: "razorpay", withShipment: false });
  await flow.cancel();
  assert.equal(flow.res.statusCode, 200);
  assert.equal(flow.order.status, "Cancelled");
  assert.equal(flow.order.refundStatus, "failed");
  assert.ok(flow.calls.indexOf("transaction:commit") < flow.calls.indexOf("refund:create"));
  assert.ok(flow.calls.includes("refund:save"));
});
