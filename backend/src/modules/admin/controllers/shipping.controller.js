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
const { calculateOrderCodAllocations, getOrderVendorGroups } = require("../../../services/shipping/codAllocation");

// ── Helper ────────────────────────────────────────────────────────────────────

const updateOrderShippingStatus = async (orderId) => {
  const shipments = await Shipment.find({ orderId });
  const order = await Order.findById(orderId);
  if (!order) return;

  const hasAdminItems = (order.items || []).some((item) => !item.sellerId);
  const sellerIdsInOrder = [...new Set(
    (order.items || []).map((item) => String(item.sellerId || "")).filter(Boolean)
  )];

  const activeShipments = shipments.filter((s) => s.status !== "CANCELLED");

  // Admin items fulfillment check
  const adminShipment = activeShipments.find((s) => s.isAdminShipment || !s.sellerId);
  const adminDelivered = !hasAdminItems || (adminShipment && adminShipment.status === "DELIVERED");
  const adminShipped = !hasAdminItems || (adminShipment && ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(adminShipment.status));

  // Seller items fulfillment check
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

  if (allDelivered) {
    order.status = "Delivered";
  } else if (allShipped) {
    order.status = "Shipped";
  } else if (anyShipped) {
    order.status = "Processing";
  } else if (activeShipments.length === 0 && order.status === "Shipped") {
    // If all active shipments were cancelled and order was marked Shipped, revert to Packed so it can be re-dispatched
    order.status = "Packed";
  }

  order.sellerShipments = shipments.map((s) => ({
    sellerId: s.sellerId,
    shipmentId: s._id,
    courier: s.courier,
    awbNumber: s.awbNumber,
    status: s.status,
  }));
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
    if (!provider) {
      return error(res, `Courier provider '${shipment.courier}' not found`, 400);
    }

    const cancelResult = await provider.cancelShipment({
      awbNumber: shipment.awbNumber,
      waybill: shipment.waybill,
      shiprocketOrderId: shipment.shiprocketOrderId,
    });

    if (cancelResult && cancelResult.cancelled === false) {
      return error(res, `Failed to cancel shipment with ${shipment.courier}: ${cancelResult.message || "Courier rejected cancellation"}`, 400);
    }

    shipment.status = "CANCELLED";
    shipment.timeline.push({
      status: "CANCELLED",
      message: `Shipment cancelled by admin. ${cancelResult?.message || ""}`.trim(),
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
      return success(res, { locations: [] });
    }
    const result = await provider.listPickupLocations();
    const locations = (result?.locations && Array.isArray(result.locations))
      ? result.locations
      : [];
    return success(res, { locations });
  } catch (err) {
    console.error("[Admin Shipping] getPickupLocations error:", err.message);
    return error(res, `Failed to load pickup locations: ${err.message}`, 500);
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
  let courierResult = null;
  let provider = null;
  let createdShipment = null;
  try {
    const { orderId } = req.params;
    const { courier = "shiprocket", packageInfo, pickupLocationName, preferredCourierId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }

    const order = await Order.findById(orderId).populate("items.productId", "name images sku");
    if (!order) return error(res, "Order not found", 404);

    if (["Cancelled", "Delivered", "Returned"].includes(order.status)) {
      return error(res, `Cannot create shipment for an order with status '${order.status}'`, 400);
    }

    // Check for existing active shipment for ADMIN products in this order
    const existingAdminShipment = await Shipment.findOne({
      orderId,
      $or: [{ isAdminShipment: true }, { sellerId: null }],
      status: { $ne: "CANCELLED" }
    });
    if (existingAdminShipment) {
      return error(res, `An admin shipment already exists for this order (AWB: ${existingAdminShipment.awbNumber || existingAdminShipment._id})`, 409);
    }

    // Filter admin-fulfilled items (items where sellerId is null or empty)
    const adminItems = (order.items || []).filter((item) => !item.sellerId);
    const sellerItems = (order.items || []).filter((item) => Boolean(item.sellerId));

    if (adminItems.length === 0) {
      return error(
        res,
        "This order contains only seller-fulfilled products. Shipments for seller items must be created by their respective seller via the Seller Portal.",
        400
      );
    }

    const shippingAddr = order.shippingAddress || {};
    const customerPincode = String(shippingAddr.pincode || "").trim();
    if (!customerPincode) return error(res, "Customer delivery pincode is missing", 400);

    const customerPhone = String(shippingAddr.phone || order.customerPhone || "").trim();
    if (!customerPhone) return error(res, "Customer phone is missing", 400);

    const customerName = [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(" ") ||
      shippingAddr.name ||
      order.customerName ||
      "Customer";

    const customerAddress = [
      shippingAddr.flatNo,
      shippingAddr.area,
      shippingAddr.address,
      shippingAddr.addressLine1,
      shippingAddr.district,
    ].filter(Boolean).join(", ") || shippingAddr.street || "";

    if (!customerAddress) return error(res, "Customer address is missing", 400);

    const deliveryAddress = {
      name: customerName,
      phone: customerPhone,
      email: shippingAddr.email || order.customerEmail || "",
      address: customerAddress,
      city: shippingAddr.city || "",
      state: shippingAddr.state || "",
      pincode: customerPincode,
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
    if (req.body.paymentMode && req.body.paymentMode !== mode) {
      return error(
        res,
        `Payment mode cannot be changed. Order ${order.orderNumber || order._id} is ${isCod ? "Cash on Delivery (COD)" : "Prepaid"}.`,
        400
      );
    }

    let codAmount = 0;
    if (isCod) {
      const allocations = calculateOrderCodAllocations(order);
      const allocatedCod = allocations["admin"] || 0;

      // Check existing active shipments for seller groups in this order
      const otherActiveShipments = await Shipment.find({
        orderId: order._id,
        $or: [{ isAdminShipment: false }, { sellerId: { $ne: null } }],
        status: { $ne: "CANCELLED" },
      });

      const vendorGroups = getOrderVendorGroups(order);
      const shippedOtherGroups = new Set(
        otherActiveShipments.map((s) => String(s.sellerId))
      );
      const isLastRemainingGroup = vendorGroups.length > 1 && shippedOtherGroups.size === vendorGroups.length - 1;

      if (isLastRemainingGroup && otherActiveShipments.length > 0) {
        const sumOtherCod = otherActiveShipments.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
        codAmount = Math.max(0, Math.round(((Number(order.total) || 0) - sumOtherCod) * 100) / 100);
      } else {
        codAmount = allocatedCod;
      }

      if (req.body.codAmount !== undefined && req.body.codAmount !== null && String(req.body.codAmount).trim() !== "") {
        const inputCod = Number(req.body.codAmount);
        if (!isNaN(inputCod) && Math.abs(inputCod - codAmount) > 0.05) {
          return error(
            res,
            `Invalid COD amount. The allocated COD share for admin items is ₹${codAmount.toFixed(2)}, but received ₹${inputCod.toFixed(2)}.`,
            400
          );
        }
      }

      if (codAmount <= 0) {
        return error(res, "COD amount is required for COD orders", 400);
      }
    }

    const shipmentItems = adminItems.map((item) => ({
      productId: item.productId?._id || item.productId,
      variantId: item.variantId,
      name: item.name || item.productId?.name || "Jewellery",
      sku: item.sku || item.productId?.sku || `SKU_${item.productId || Date.now()}`,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));

    if (shipmentItems.length === 0) {
      return error(res, "No admin items available to ship for this order", 400);
    }

    provider = getCourierProvider(courier);
    if (!provider) {
      return error(res, `Courier provider '${courier}' is not available`, 400);
    }

    // Resolve pickup location dynamically from Shiprocket
    let chosenPickupName = String(pickupLocationName || "").trim();
    let pickupAddress = {
      name: "Sands Jewels",
      phone: process.env.ADMIN_PHONE || "9303235166",
      address: "Sands Jewels Warehouse",
      city: "Ranchi",
      state: "Jharkhand",
      pincode: "834001",
      country: "India",
    };

    if (courier === "shiprocket" && typeof provider.listPickupLocations === "function") {
      const locResult = await provider.listPickupLocations();
      const registeredLocations = locResult?.locations || [];

      if (registeredLocations.length > 0) {
        let matched = null;
        if (chosenPickupName) {
          matched = registeredLocations.find(
            (loc) => loc.warehouseName?.toLowerCase() === chosenPickupName.toLowerCase()
          );
        }
        if (!matched) {
          matched = registeredLocations[0];
        }
        chosenPickupName = matched.warehouseName;
        pickupAddress = {
          name: matched.contactPerson || "Sands Jewels",
          phone: matched.phone || process.env.ADMIN_PHONE || "9303235166",
          address: matched.address || "Sands Jewels Warehouse",
          city: matched.city || "Ranchi",
          state: matched.state || "Jharkhand",
          pincode: String(matched.pincode || "834001"),
          country: "India",
        };
      } else if (!chosenPickupName) {
        return error(
          res,
          "No pickup locations configured in your Shiprocket account. Please configure a pickup location in Shiprocket Settings.",
          400
        );
      }
    }

    courierResult = await provider.createShipment({
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

    createdShipment = await Shipment.create({
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

    // Update order status: only mark order Shipped if all items in the order belong to admin
    if (sellerItems.length === 0) {
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
    } else {
      // For mixed orders, note admin fulfillment in timeline without overriding pending seller shipments
      order.timeline.push({
        status: order.status || "Processing",
        note: `Admin items shipped via Shiprocket${courierResult.awbNumber ? ` (AWB: ${courierResult.awbNumber})` : ""}`,
        date: new Date(),
      });
    }

    const allShipments = await Shipment.find({ orderId: order._id });
    order.sellerShipments = allShipments.map((s) => ({
      sellerId: s.sellerId,
      shipmentId: s._id,
      courier: s.courier,
      awbNumber: s.awbNumber,
      status: s.status,
    }));

    await order.save();

    return success(res, { shipment: createdShipment, order }, "Shipment created successfully with Shiprocket", 201);
  } catch (err) {
    console.error("[Admin Shipping] Create shipment error:", err);

    let remoteCancelled = true;

    // Rollback Step 1: Attempt to cancel remote Shiprocket order FIRST
    if (courierResult?.shiprocketOrderId && provider && typeof provider.cancelShipment === "function") {
      try {
        const rollbackRes = await provider.cancelShipment({
          shiprocketOrderId: courierResult.shiprocketOrderId,
          awbNumber: courierResult.awbNumber,
        });
        if (rollbackRes?.cancelled === false) {
          remoteCancelled = false;
          console.warn("[Admin Shipping] Remote rollback rejected by Shiprocket:", rollbackRes.message);
        } else {
          console.log(`[Admin Shipping] Rolled back remote Shiprocket order ${courierResult.shiprocketOrderId} after local failure.`);
        }
      } catch (rollbackErr) {
        remoteCancelled = false;
        console.error("[Admin Shipping] Failed to rollback remote order:", rollbackErr.message);
      }
    }

    // Rollback Step 2: Handle local DB shipment document
    if (createdShipment?._id) {
      if (remoteCancelled || !courierResult?.shiprocketOrderId) {
        // Safe to delete local shipment because remote order was cleanly cancelled or never created
        try {
          await Shipment.findByIdAndDelete(createdShipment._id);
          console.log(`[Admin Shipping] Purged orphaned local shipment ${createdShipment._id} after failure.`);
        } catch (dbErr) {
          console.error(`[Admin Shipping] Failed to delete orphaned local shipment ${createdShipment._id}:`, dbErr.message);
        }
      } else {
        // Remote order could NOT be cancelled in Shiprocket:
        // Keep the local shipment record so the active AWB and tracking are NOT lost or untracked
        try {
          createdShipment.status = "FAILED_ORDER_SAVE";
          createdShipment.timeline.push({
            status: "FAILED_ORDER_SAVE",
            message: `Shipment created in Shiprocket (AWB: ${courierResult?.awbNumber || "Pending"}), but local order status failed to save: ${err.message}. Remote cancellation was not accepted.`,
            date: new Date(),
          });
          await createdShipment.save();
        } catch (statusSaveErr) {
          console.error(`[Admin Shipping] Failed to save FAILED_ORDER_SAVE status on shipment ${createdShipment._id}:`, statusSaveErr.message);
        }
      }
    }

    return error(res, err.response?.data?.message || err.message || "Failed to create shipment", 400);
  }
};
