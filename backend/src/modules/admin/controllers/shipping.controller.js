/**
 * 📦 Admin Shipping Controller
 *    Admin monitors, filters, overrides, and reports on all shipments.
 */

const mongoose = require("mongoose");
const Shipment = require("../../../models/Shipment");
const Order = require("../../../models/Order");
const { success, error, paginated } = require("../../../utils/apiResponse");
const { getCourierProvider } = require("../../../services/shipping/courierFactory");
const { isValidInternalStatus, getInternalStatuses } = require("../../../services/shipping/shippingStatusMapper");

// ── Helper ────────────────────────────────────────────────────────────────────

const updateOrderShippingStatus = async (orderId) => {
  const shipments = await Shipment.find({ orderId });
  const order = await Order.findById(orderId);
  if (!order) return;

  const sellerIdsInOrder = [...new Set(
    (order.items || []).map((item) => String(item.sellerId || "")).filter(Boolean)
  )];

  const sellerShipments = shipments.map((s) => ({
    sellerId: s.sellerId,
    shipmentId: s._id,
    courier: s.courier,
    awbNumber: s.awbNumber,
    status: s.status,
  }));

  const shippedSellers = new Set(
    shipments
      .filter((s) => !["CANCELLED"].includes(s.status))
      .map((s) => String(s.sellerId))
  );

  const activeShipments = shipments.filter((s) => s.status !== "CANCELLED");
  const allDelivered = activeShipments.length > 0 &&
    activeShipments.every((s) => s.status === "DELIVERED");
  const allCancelled = shipments.length > 0 &&
    shipments.every((s) => s.status === "CANCELLED");
  const allShipped = sellerIdsInOrder.length > 0 &&
    sellerIdsInOrder.every((sid) => shippedSellers.has(sid));

  if (allDelivered) {
    order.status = "Delivered";
  } else if (allCancelled) {
    order.status = "Cancelled";
  } else if (allShipped) {
    order.status = "Shipped";
  }

  order.sellerShipments = sellerShipments;
  await order.save();
};

// ── Controller Methods ────────────────────────────────────────────────────────

/**
 * GET /api/admin/shipping
 * List all shipments with filters.
 */
exports.getAllShipments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { status, courier, sellerId, search, dateFrom, dateTo } = req.query;

    const query = {};
    if (status) query.status = status;
    if (courier) query.courier = courier;
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      query.sellerId = sellerId;
    }
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { awbNumber: { $regex: escaped, $options: "i" } },
      ];
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;
    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .populate("orderId", "orderId status customerName total")
        .populate("sellerId", "fullName shopName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shipment.countDocuments(query),
    ]);

    return paginated(res, { shipments }, {
      page, limit, totalItems: total, totalPages: Math.ceil(total / limit),
    }, "All shipments retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * GET /api/admin/shipping/:shipmentId
 * Get single shipment detail.
 */
exports.getShipmentDetail = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return error(res, "Invalid shipment ID", 400);
    }

    const shipment = await Shipment.findById(shipmentId)
      .populate("orderId", "orderId status customerName customerEmail customerPhone shippingAddress total paymentMethod items timeline")
      .populate("sellerId", "fullName shopName email mobileNumber shopAddress city state pincode");

    if (!shipment) return error(res, "Shipment not found", 404);

    return success(res, { shipment }, "Shipment detail retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/admin/shipping/:shipmentId/track
 * Admin-triggered tracking sync from courier.
 */
exports.trackShipment = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return error(res, "Invalid shipment ID", 400);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return error(res, "Shipment not found", 404);

    const provider = getCourierProvider(shipment.courier);
    const trackResult = await provider.trackShipment({
      awbNumber: shipment.awbNumber,
      waybill: shipment.waybill,
    });

    // Deduplicate timeline entries
    const existingKeys = new Set(
      shipment.timeline.map((t) => `${t.status}_${new Date(t.date).getTime()}`)
    );
    const newEntries = (trackResult.timeline || []).filter((entry) => {
      const key = `${entry.status}_${new Date(entry.date).getTime()}`;
      return !existingKeys.has(key);
    });
    if (newEntries.length > 0) {
      shipment.timeline.push(...newEntries);
    }

    if (trackResult.status && trackResult.status !== shipment.status) {
      shipment.status = trackResult.status;
    }

    shipment.courierResponse = trackResult.courierResponse || shipment.courierResponse;
    await shipment.save();

    await updateOrderShippingStatus(shipment.orderId);

    return success(res, { shipment }, "Tracking synced by admin");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/admin/shipping/:shipmentId/cancel
 * Admin-triggered cancellation.
 */
exports.cancelShipment = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return error(res, "Invalid shipment ID", 400);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return error(res, "Shipment not found", 404);

    if (shipment.status === "CANCELLED") {
      return error(res, "Shipment is already cancelled", 400);
    }

    if (["DELIVERED", "RTO_DELIVERED"].includes(shipment.status)) {
      return error(res, "Cannot cancel a delivered shipment", 400);
    }

    const provider = getCourierProvider(shipment.courier);
    const cancelResult = await provider.cancelShipment({
      awbNumber: shipment.awbNumber,
      waybill: shipment.waybill,
    });

    shipment.status = "CANCELLED";
    shipment.timeline.push({
      status: "CANCELLED",
      message: `Shipment cancelled by admin. ${cancelResult.message || ""}`.trim(),
      date: new Date(),
    });
    await shipment.save();

    await updateOrderShippingStatus(shipment.orderId);

    return success(res, { shipment }, "Shipment cancelled by admin");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * PATCH /api/admin/shipping/:shipmentId/override-status
 * Admin manually overrides shipment status.
 */
exports.overrideStatus = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { status, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return error(res, "Invalid shipment ID", 400);
    }

    if (!status || !isValidInternalStatus(status)) {
      return error(res, `Invalid status. Valid statuses: ${getInternalStatuses().join(", ")}`, 400);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return error(res, "Shipment not found", 404);

    const prevStatus = shipment.status;
    shipment.status = status;
    shipment.timeline.push({
      status,
      message: message || `Status overridden by admin from ${prevStatus} to ${status}`,
      date: new Date(),
    });
    await shipment.save();

    await updateOrderShippingStatus(shipment.orderId);

    return success(res, { shipment }, `Shipment status overridden to ${status}`);
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * GET /api/admin/shipping/reports
 * Courier-wise aggregate reports.
 */
exports.getReports = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const matchStage = {};
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    const [courierStats, statusStats, failedDeliveries, rtoList] = await Promise.all([
      // Courier-wise counts
      Shipment.aggregate([
        { $match: matchStage },
        { $group: { _id: "$courier", count: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] } } } },
      ]),
      // Status-wise counts
      Shipment.aggregate([
        { $match: matchStage },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Failed deliveries
      Shipment.find({ status: "FAILED", ...matchStage })
        .populate("orderId", "orderId")
        .populate("sellerId", "shopName")
        .select("awbNumber courier orderId sellerId createdAt")
        .sort({ createdAt: -1 })
        .limit(50),
      // RTO list
      Shipment.find({ status: { $in: ["RTO_INITIATED", "RTO_DELIVERED"] }, ...matchStage })
        .populate("orderId", "orderId")
        .populate("sellerId", "shopName")
        .select("awbNumber courier status orderId sellerId createdAt")
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    return success(res, {
      courierStats,
      statusStats,
      failedDeliveries,
      rtoList,
    }, "Shipping reports generated");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/admin/shipping/:shipmentId/manifest
 * Generate Shiprocket manifest for a shipment.
 */
exports.generateManifest = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return error(res, "Invalid shipment ID", 400);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return error(res, "Shipment not found", 404);
    if (shipment.courier !== "shiprocket") {
      return error(res, "Manifest generation is only supported for Shiprocket shipments", 400);
    }

    const provider = getCourierProvider("shiprocket");
    const result = await provider.generateManifest({
      awbNumbers: [shipment.awbNumber],
      shiprocketShipmentIds: shipment.shiprocketShipmentId ? [shipment.shiprocketShipmentId] : [],
    });

    if (result.manifestUrl) {
      shipment.manifestUrl = result.manifestUrl;
      await shipment.save();
    }

    return success(res, { manifestUrl: result.manifestUrl, shipment }, "Manifest generated");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/admin/shipping/:shipmentId/generate-label
 * Re-generate label for a shipment (Shiprocket).
 */
exports.regenerateLabel = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return error(res, "Invalid shipment ID", 400);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return error(res, "Shipment not found", 404);

    const provider = getCourierProvider(shipment.courier);
    const result = await provider.generateLabel({
      awbNumber: shipment.awbNumber,
      shiprocketShipmentId: shipment.shiprocketShipmentId,
    });

    if (result.labelUrl) {
      shipment.labelUrl = result.labelUrl;
      await shipment.save();
    }

    return success(res, { labelUrl: result.labelUrl, shipment }, "Label regenerated");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * GET /api/admin/shipping/pickup-locations
 * List pickup locations registered with Shiprocket.
 */
exports.getPickupLocations = async (req, res) => {
  try {
    const provider = getCourierProvider("shiprocket");
    if (!provider || typeof provider.listPickupLocations !== "function") {
      return success(res, { locations: [{ warehouseName: "Primary" }] });
    }
    const result = await provider.listPickupLocations();
    const locations = (result?.locations && result.locations.length > 0)
      ? result.locations
      : [{ warehouseName: "Primary" }];
    return success(res, { locations });
  } catch (err) {
    return success(res, { locations: [{ warehouseName: "Primary" }] });
  }
};

/**
 * GET /api/admin/shipping/orders/:orderId
 * Get all shipments associated with an order.
 */
exports.getOrderShipments = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }
    const shipments = await Shipment.find({ orderId }).sort({ createdAt: -1 });
    return success(res, { shipments });
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/admin/shipping/orders/:orderId/create
 * Create a shipment for an order directly via Shiprocket (for admin products or direct platform orders).
 */
exports.createShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courier = "shiprocket", packageInfo, pickupLocationName, preferredCourierId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }

    const order = await Order.findById(orderId).populate("items.productId", "name images sku");
    if (!order) return error(res, "Order not found", 404);

    // Check for existing active shipment
    const existingShipment = await Shipment.findOne({
      orderId,
      status: { $ne: "CANCELLED" }
    });
    if (existingShipment) {
      return error(res, `A shipment already exists for this order (AWB: ${existingShipment.awbNumber || existingShipment._id})`, 409);
    }

    const shippingAddr = order.shippingAddress || {};
    if (!shippingAddr.pincode) return error(res, "Customer delivery pincode is missing", 400);
    if (!shippingAddr.phone) return error(res, "Customer phone is missing", 400);
    const customerName = [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(" ");
    if (!customerName) return error(res, "Customer name is missing", 400);
    const customerAddress = [shippingAddr.flatNo, shippingAddr.area].filter(Boolean).join(", ");
    if (!customerAddress) return error(res, "Customer address is missing", 400);

    const deliveryAddress = {
      name: customerName,
      phone: String(shippingAddr.phone || "").trim(),
      address: customerAddress,
      city: shippingAddr.city || "",
      state: shippingAddr.state || "",
      pincode: String(shippingAddr.pincode || "").trim(),
      country: shippingAddr.country || "India",
    };

    const pkg = {
      weight: Number(packageInfo?.weight) > 0 ? Number(packageInfo.weight) : 200,
      length: Number(packageInfo?.length) > 0 ? Number(packageInfo.length) : 10,
      breadth: Number(packageInfo?.breadth) > 0 ? Number(packageInfo.breadth) : 10,
      height: Number(packageInfo?.height) > 0 ? Number(packageInfo.height) : 5,
    };

    const isCod = order.paymentMethod === "cod";
    const mode = isCod ? "cod" : "prepaid";
    const codAmount = isCod ? (Number(req.body.codAmount) || Number(order.total) || 0) : 0;

    const shipmentItems = (order.items || []).map((item) => ({
      productId: item.productId?._id || item.productId,
      variantId: item.variantId,
      name: item.name || item.productId?.name || "Jewellery",
      sku: item.sku || item.productId?.sku || `SKU_${item.productId || Date.now()}`,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));

    if (shipmentItems.length === 0) {
      return error(res, "Order has no items to ship", 400);
    }

    const chosenPickupName = String(pickupLocationName || "").trim() || "Primary";

    const pickupAddress = {
      name: "Sands Jewels",
      phone: process.env.ADMIN_PHONE || "9303235166",
      address: "Sands Jewels Warehouse",
      city: "Ranchi",
      state: "Jharkhand",
      pincode: "834001",
      country: "India",
    };

    const provider = getCourierProvider(courier);
    if (!provider) {
      return error(res, `Courier provider '${courier}' is not available`, 400);
    }

    const courierResult = await provider.createShipment({
      orderId: order.orderId || order._id.toString(),
      pickupAddress,
      deliveryAddress,
      package: pkg,
      paymentMode: mode,
      codAmount,
      items: shipmentItems,
      sellerName: "Sands Jewels",
      shiprocketPickupName: chosenPickupName,
      preferredCourierId: preferredCourierId || null,
    });

    let labelUrl = courierResult.labelUrl || "";
    if (!labelUrl && courierResult.awbNumber && courier !== "shiprocket") {
      try {
        const labelResult = await provider.generateLabel({ awbNumber: courierResult.awbNumber });
        labelUrl = labelResult.labelUrl || "";
      } catch (labelErr) {
        console.warn("[Admin Shipping] Label generation failed:", labelErr.message);
      }
    }

    const trackingUrl = courierResult.trackingUrl ||
      (courierResult.awbNumber ? `https://shiprocket.co/tracking/${courierResult.awbNumber}` : "");

    const shipment = await Shipment.create({
      orderId: order._id,
      sellerId: null,
      isAdminShipment: true,
      courier,
      awbNumber: courierResult.awbNumber || "",
      waybill: courierResult.waybill || courierResult.awbNumber || "",
      labelUrl,
      invoiceUrl: courierResult.invoiceUrl || "",
      manifestUrl: "",
      trackingUrl,
      shiprocketOrderId: courierResult.shiprocketOrderId || null,
      shiprocketShipmentId: courierResult.shiprocketShipmentId || null,
      shiprocketPickupName: chosenPickupName,
      status: "CREATED",
      pickupAddress,
      deliveryAddress,
      package: pkg,
      paymentMode: mode,
      codAmount,
      items: shipmentItems,
      courierResponse: courierResult.courierResponse,
      timeline: [{
        status: "CREATED",
        message: `Shipment created with ${courier}. AWB: ${courierResult.awbNumber || "Pending"}`,
        date: new Date(),
      }],
    });

    // Update order status to Shipped and store shipping details
    order.status = "Shipped";
    order.shippingInfo = {
      carrier: courierResult.courierName || "Shiprocket",
      trackingId: courierResult.awbNumber || "",
      trackingUrl,
    };
    order.timeline.push({
      status: "Shipped",
      note: `Shipment created via Shiprocket${courierResult.awbNumber ? ` (AWB: ${courierResult.awbNumber})` : ""}`,
      date: new Date(),
    });
    await order.save();

    return success(res, { shipment, order }, "Shipment created successfully with Shiprocket", 201);
  } catch (err) {
    console.error("[Admin Shipping] Create shipment error:", err);
    return error(res, err.response?.data?.message || err.message || "Failed to create shipment", 400);
  }
};
