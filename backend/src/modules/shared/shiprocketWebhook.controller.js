/**
 * 📦 Shiprocket Webhook Controller
 *    Handles incoming Shiprocket status update webhooks.
 *
 *    Endpoint: POST /api/webhooks/shiprocket
 *    No auth middleware (public) – verified by shared secret or signature.
 */

const Shipment = require("../../models/Shipment");
const Order = require("../../models/Order");
const { mapStatus } = require("../../services/shipping/shippingStatusMapper");
const { confirmCommissionsForOrder, reverseCommissionsForOrder } = require("../../services/commissionService");

// ── Duplicate prevention: in-memory dedup for last N events ──────────────────
const SEEN_EVENTS = new Set();
const MAX_SEEN = 5000;

const isEventSeen = (key) => {
  if (SEEN_EVENTS.has(key)) return true;
  SEEN_EVENTS.add(key);
  if (SEEN_EVENTS.size > MAX_SEEN) {
    const first = SEEN_EVENTS.values().next().value;
    SEEN_EVENTS.delete(first);
  }
  return false;
};

// ── Update order status based on all its shipments ───────────────────────────
const _updateOrderFromShipments = async (orderId) => {
  const shipments = await Shipment.find({ orderId });
  const order = await Order.findById(orderId);
  if (!order) return;

  const previousStatus = order.status;

  const sellerShipments = shipments.map((s) => ({
    sellerId: s.sellerId,
    shipmentId: s._id,
    courier: s.courier,
    awbNumber: s.awbNumber,
    status: s.status,
  }));

  const activeShipments = shipments.filter((s) => s.status !== "CANCELLED");
  const allDelivered = activeShipments.length > 0 &&
    activeShipments.every((s) => s.status === "DELIVERED");
  const allCancelled = shipments.length > 0 &&
    shipments.every((s) => s.status === "CANCELLED");
  const anyShipped = shipments.some((s) =>
    ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(s.status)
  );

  if (allDelivered) {
    order.status = "Delivered";
  } else if (allCancelled) {
    order.status = "Cancelled";
  } else if (anyShipped) {
    order.status = "Shipped";
  }

  order.sellerShipments = sellerShipments;
  await order.save();

  // ── Platform commission lifecycle ───────────────────────────────────────────
  if (previousStatus !== "Delivered" && order.status === "Delivered") {
    try {
      await confirmCommissionsForOrder(order._id, { safe: true });
    } catch (e) {
      console.error("[Commission] Shiprocket-webhook delivery-confirm error:", e.message);
    }
  } else if (previousStatus !== "Cancelled" && order.status === "Cancelled") {
    try {
      await reverseCommissionsForOrder(order._id, {
        triggeredBy: "shipment_cancelled",
        reasonNote: "All shipments cancelled via courier webhook",
        safe: true,
      });
    } catch (e) {
      console.error("[Commission] Shiprocket-webhook cancel-reverse error:", e.message);
    }
  }
};

// ── Main webhook handler ──────────────────────────────────────────────────────

exports.handleShiprocketWebhook = async (req, res) => {
  try {
    // Optional: verify shared secret header
    const secret = process.env.SHIPROCKET_WEBHOOK_SECRET || process.env.SHIPPING_WEBHOOK_SECRET;
    if (secret) {
      const incoming = req.headers["x-shiprocket-secret"] || req.headers["authorization"];
      if (incoming !== secret && incoming !== `Bearer ${secret}`) {
        console.warn("[ShiprocketWebhook] Invalid secret. Rejecting.");
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const body = req.body;

    // Shiprocket webhook payload shape:
    // { awb: "...", current_status: "...", shipment_id: "...", order_id: "...", ... }
    const awb = body?.awb || body?.awb_code || "";
    const rawStatus = body?.current_status || body?.status || "";
    const shiprocketOrderId = String(body?.order_id || body?.sr_order_id || "");
    const shiprocketShipmentId = String(body?.shipment_id || "");
    const location = body?.city || body?.location || "";
    const message = rawStatus;
    const eventDate = body?.updated_at
      ? new Date(body.updated_at)
      : new Date();

    // Dedup
    const eventKey = `${awb}_${rawStatus}_${eventDate.getTime()}`;
    if (isEventSeen(eventKey)) {
      console.log(`[ShiprocketWebhook] Duplicate event skipped: ${eventKey}`);
      return res.status(200).json({ success: true, message: "Duplicate, skipped" });
    }

    console.log(`[ShiprocketWebhook] AWB=${awb} status=${rawStatus}`);

    if (!awb && !shiprocketOrderId) {
      return res.status(400).json({ success: false, message: "Missing AWB or order_id" });
    }

    // Map to internal status
    const internalStatus = mapStatus("shiprocket", rawStatus);
    if (!internalStatus) {
      console.warn(`[ShiprocketWebhook] Unmapped status: "${rawStatus}"`);
      return res.status(200).json({ success: true, message: `Unmapped status "${rawStatus}", acknowledged` });
    }

    // Find shipment
    let shipment = null;
    if (awb) {
      shipment = await Shipment.findOne({ awbNumber: awb, courier: "shiprocket" });
    }
    if (!shipment && shiprocketOrderId) {
      shipment = await Shipment.findOne({ shiprocketOrderId, courier: "shiprocket" });
    }
    if (!shipment && shiprocketShipmentId) {
      shipment = await Shipment.findOne({ shiprocketShipmentId, courier: "shiprocket" });
    }

    if (!shipment) {
      console.warn(`[ShiprocketWebhook] No shipment found for AWB=${awb}, SR_ORDER=${shiprocketOrderId}`);
      return res.status(200).json({ success: true, message: "Shipment not found in DB, acknowledged" });
    }

    // Check for duplicate timeline entry
    const timelineKey = `${internalStatus}_${eventDate.getTime()}`;
    const alreadyInTimeline = shipment.timeline.some(
      (t) => `${t.status}_${new Date(t.date).getTime()}` === timelineKey
    );

    if (!alreadyInTimeline) {
      shipment.timeline.push({ status: internalStatus, location, message, date: eventDate });
    }

    // Update status only if it's a progression (prevent backwards updates)
    const STATUS_ORDER = [
      "CREATED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT",
      "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RTO_INITIATED", "RTO_DELIVERED", "CANCELLED",
    ];
    const currentIdx = STATUS_ORDER.indexOf(shipment.status);
    const newIdx = STATUS_ORDER.indexOf(internalStatus);

    // Allow any terminal status to override
    const isTerminal = ["DELIVERED", "CANCELLED", "RTO_DELIVERED", "FAILED"].includes(internalStatus);
    if (isTerminal || newIdx > currentIdx) {
      shipment.status = internalStatus;
    }

    await shipment.save();

    // Cascade to order
    await _updateOrderFromShipments(shipment.orderId);

    console.log(`[ShiprocketWebhook] Updated shipment ${shipment._id}: ${internalStatus}`);
    return res.status(200).json({ success: true, message: "Webhook processed" });

  } catch (err) {
    console.error("[ShiprocketWebhook] Error:", err.message);
    // Always return 200 to prevent Shiprocket from retrying
    return res.status(200).json({ success: false, message: "Internal error, acknowledged" });
  }
};
