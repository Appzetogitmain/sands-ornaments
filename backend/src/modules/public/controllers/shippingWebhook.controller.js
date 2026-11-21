/**
 * 📦 Shipping Webhook Controller
 *    Receives status updates from Delhivery and Blue Dart.
 */

const Shipment = require("../../../models/Shipment");
const Order = require("../../../models/Order");
const { mapStatus } = require("../../../services/shipping/shippingStatusMapper");
const { confirmCommissionsForOrder } = require("../../../services/commissionService");

// ── Helper ────────────────────────────────────────────────────────────────────

const updateOrderShippingStatus = async (orderId) => {
  const shipments = await Shipment.find({ orderId });
  const order = await Order.findById(orderId);
  if (!order) return;

  const previousStatus = order.status;

  if (order.status === "Cancelled") {
    order.sellerShipments = shipments.map((s) => ({
      sellerId: s.sellerId,
      shipmentId: s._id,
      courier: s.courier,
      awbNumber: s.awbNumber,
      status: s.status,
    }));
    await order.save();
    return;
  }

  const sellerIdsInOrder = [...new Set(
    (order.items || []).map((item) => String(item.sellerId || "")).filter(Boolean)
  )];

  const shippedSellers = new Set(
    shipments.filter((s) => !["CANCELLED"].includes(s.status)).map((s) => String(s.sellerId))
  );

  const allDelivered = shipments.length > 0 &&
    shipments.every((s) => s.status === "DELIVERED" || s.status === "CANCELLED");
  const allShipped = sellerIdsInOrder.length > 0 &&
    sellerIdsInOrder.every((sid) => shippedSellers.has(sid));

  if (allDelivered) order.status = "Delivered";
  else if (allShipped) order.status = "Shipped";

  order.sellerShipments = shipments.map((s) => ({
    sellerId: s.sellerId,
    shipmentId: s._id,
    courier: s.courier,
    awbNumber: s.awbNumber,
    status: s.status,
  }));

  await order.save();

  // ── Platform commission: confirm pending accruals on the Delivered transition ──
  if (previousStatus !== "Delivered" && order.status === "Delivered") {
    try {
      await confirmCommissionsForOrder(order._id, { safe: true });
    } catch (e) {
      console.error("[Commission] Webhook delivery-confirm error:", e.message);
    }
  }
};

// ── Webhook Handlers ──────────────────────────────────────────────────────────

/**
 * POST /api/public/shipping/webhook/delhivery
 * Receives Delhivery push notifications.
 */
exports.delhiveryWebhook = async (req, res) => {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.SHIPPING_WEBHOOK_SECRET;
    if (webhookSecret) {
      const token = req.headers["x-webhook-token"] || req.query.token;
      if (token !== webhookSecret) {
        console.warn("[Webhook] Delhivery: Invalid webhook token");
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const payload = req.body;
    const awb = payload?.Awb || payload?.waybill || payload?.ShipmentData?.Shipment?.AWB || "";
    const rawStatus = payload?.Status?.Status || payload?.status || payload?.ShipmentData?.Shipment?.Status?.Status || "";
    const location = payload?.Status?.StatusLocation || payload?.location || "";
    const statusDate = payload?.Status?.StatusDateTime || payload?.timestamp || new Date().toISOString();
    const instructions = payload?.Status?.Instructions || payload?.message || rawStatus;

    if (!awb) {
      console.warn("[Webhook] Delhivery: No AWB in payload");
      return res.status(200).json({ success: true, message: "No AWB found, skipped" });
    }

    const shipment = await Shipment.findOne({ awbNumber: awb, courier: "delhivery" });
    if (!shipment) {
      console.warn(`[Webhook] Delhivery: Shipment not found for AWB ${awb}`);
      return res.status(200).json({ success: true, message: "Shipment not found, skipped" });
    }

    const internalStatus = mapStatus("delhivery", rawStatus);

    // Prevent duplicate timeline entries
    const entryKey = `${internalStatus || rawStatus}_${new Date(statusDate).getTime()}`;
    const isDuplicate = shipment.timeline.some(
      (t) => `${t.status}_${new Date(t.date).getTime()}` === entryKey
    );

    if (!isDuplicate) {
      shipment.timeline.push({
        status: internalStatus || rawStatus,
        location: location,
        message: instructions,
        date: new Date(statusDate),
      });
    }

    // Update status
    if (internalStatus && internalStatus !== shipment.status) {
      shipment.status = internalStatus;
    }

    await shipment.save();
    await updateOrderShippingStatus(shipment.orderId);

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("[Webhook] Delhivery error:", err.message);
    return res.status(200).json({ success: true, message: "Error logged" });
  }
};

/**
 * POST /api/public/shipping/webhook/bluedart
 * Receives Blue Dart push notifications.
 */
exports.bluedartWebhook = async (req, res) => {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.SHIPPING_WEBHOOK_SECRET;
    if (webhookSecret) {
      const token = req.headers["x-webhook-token"] || req.query.token;
      if (token !== webhookSecret) {
        console.warn("[Webhook] BlueDart: Invalid webhook token");
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const payload = req.body;
    const awb = payload?.AWBNo || payload?.waybillNo || payload?.awb || "";
    const rawStatus = payload?.Status || payload?.StatusDescription || payload?.status || "";
    const location = payload?.Location || payload?.ScannedLocation || "";
    const statusDate = payload?.StatusDate || payload?.ScanDate || payload?.timestamp || new Date().toISOString();
    const instructions = payload?.StatusDescription || payload?.Instructions || rawStatus;

    if (!awb) {
      console.warn("[Webhook] BlueDart: No AWB in payload");
      return res.status(200).json({ success: true, message: "No AWB found, skipped" });
    }

    const shipment = await Shipment.findOne({ awbNumber: awb, courier: "bluedart" });
    if (!shipment) {
      console.warn(`[Webhook] BlueDart: Shipment not found for AWB ${awb}`);
      return res.status(200).json({ success: true, message: "Shipment not found, skipped" });
    }

    const internalStatus = mapStatus("bluedart", rawStatus);

    // Prevent duplicate timeline entries
    const entryKey = `${internalStatus || rawStatus}_${new Date(statusDate).getTime()}`;
    const isDuplicate = shipment.timeline.some(
      (t) => `${t.status}_${new Date(t.date).getTime()}` === entryKey
    );

    if (!isDuplicate) {
      shipment.timeline.push({
        status: internalStatus || rawStatus,
        location: location,
        message: instructions,
        date: new Date(statusDate),
      });
    }

    if (internalStatus && internalStatus !== shipment.status) {
      shipment.status = internalStatus;
    }

    await shipment.save();
    await updateOrderShippingStatus(shipment.orderId);

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("[Webhook] BlueDart error:", err.message);
    return res.status(200).json({ success: true, message: "Error logged" });
  }
};
