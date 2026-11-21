/**
 * 📦 Seller Shipping Controller
 *    Sellers create and manage shipments for their own order items.
 */

const mongoose = require("mongoose");
const Shipment = require("../../../models/Shipment");
const Order = require("../../../models/Order");
const Seller = require("../../../models/Seller");
const PickupLocation = require("../../../models/PickupLocation");
const { success, error, paginated } = require("../../../utils/apiResponse");
const { getCourierProvider, getAvailableCouriers } = require("../../../services/shipping/courierFactory");
const { calculateOrderCodAllocations, getOrderVendorGroups } = require("../../../services/shipping/codAllocation");

// ── Helpers ───────────────────────────────────────────────────────────────────

const filterSellerItems = (items = [], sellerId) =>
  (items || []).filter((item) => String(item?.sellerId || "") === String(sellerId));

const buildPickupAddress = (source) => ({
  name: source.contactPerson || source.fullName || source.shopName || "Seller",
  phone: source.phone || source.mobileNumber || "",
  address: source.addressLine1
    ? [source.addressLine1, source.addressLine2].filter(Boolean).join(", ")
    : source.shopAddress || "",
  city: source.city || "",
  state: source.state || "",
  pincode: source.pincode || "",
  country: source.country || "India",
});

const buildDeliveryAddress = (shippingAddr) => ({
  name: [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(" ") || "Customer",
  phone: shippingAddr.phone || "",
  address: [shippingAddr.flatNo, shippingAddr.area].filter(Boolean).join(", ") || "",
  city: shippingAddr.city || "",
  state: shippingAddr.state || "",
  pincode: shippingAddr.pincode || "",
  country: "India",
});

const updateOrderShippingStatus = async (orderId) => {
  const shipments = await Shipment.find({ orderId });
  const order = await Order.findById(orderId);
  if (!order) return;

  const hasAdminItems = (order.items || []).some((item) => !item.sellerId);
  const sellerIdsInOrder = [...new Set(
    (order.items || [])
      .map((item) => String(item.sellerId || ""))
      .filter(Boolean)
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

  // Store sellerShipments on order for reference
  order.sellerShipments = sellerShipments;

  // Update shippingInfo with latest overall info
  if (shipments.length === 1) {
    order.shippingInfo = {
      carrier: shipments[0].courier,
      trackingId: shipments[0].awbNumber,
      trackingUrl: shipments[0].trackingUrl,
    };
  }

  await order.save();
};

// ── Controller Methods ────────────────────────────────────────────────────────

/**
 * POST /api/seller/shipping/serviceability
 * Check if a courier can service the route.
 */
exports.checkServiceability = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { courier, pickupPincode, deliveryPincode, paymentMode, weight, pickupLocationId } = req.body;

    if (!courier) return error(res, "Courier is required", 400);
    if (!deliveryPincode) return error(res, "Delivery pincode is required", 400);

    // Resolve pickup pincode: explicit value → chosen pickup location → default location → seller profile
    let resolvedPickupPincode = pickupPincode || "";

    if (!resolvedPickupPincode && pickupLocationId) {
      if (!mongoose.Types.ObjectId.isValid(pickupLocationId)) {
        return error(res, "Invalid pickupLocationId", 400);
      }
      const pickupLoc = await PickupLocation.findOne({ _id: pickupLocationId, sellerId, isActive: true });
      if (!pickupLoc) return error(res, "Pickup location not found or not yours", 404);
      resolvedPickupPincode = pickupLoc.pincode || "";
    }

    if (!resolvedPickupPincode) {
      const defaultLoc = await PickupLocation.findOne({ sellerId, isDefault: true, isActive: true });
      resolvedPickupPincode = defaultLoc?.pincode || "";
    }

    if (!resolvedPickupPincode) {
      const seller = await Seller.findById(sellerId).select("pincode");
      resolvedPickupPincode = seller?.pincode || "";
    }

    if (!resolvedPickupPincode) {
      return error(res, "Pickup pincode not found. Add a pickup location or set the pincode in your profile.", 400);
    }

    const provider = getCourierProvider(courier);
    const result = await provider.checkServiceability({
      pickupPincode: resolvedPickupPincode,
      deliveryPincode,
      paymentMode,
      weight,
    });

    return success(
      res,
      { ...result, pickupPincode: resolvedPickupPincode, deliveryPincode },
      "Serviceability checked"
    );
  } catch (err) {
    return error(res, err.message, 400);
  }
};

/**
 * POST /api/seller/shipping/orders/:orderId/create
 * Create shipment for seller's items in an order.
 */
exports.createShipment = async (req, res) => {
  let provider = null;
  let courierResult = null;
  let shipment = null;
  try {
    const sellerId = req.user.userId;
    const { orderId } = req.params;
    const { courier, packageInfo, paymentMode, codAmount, pickupLocationId } = req.body;

    // Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }

    // Check courier
    if (!courier || !getAvailableCouriers().includes(courier)) {
      return error(res, `Invalid courier. Supported: ${getAvailableCouriers().join(", ")}`, 400);
    }

    // Fetch order
    const order = await Order.findById(orderId).populate("items.productId", "name images");
    if (!order) return error(res, "Order not found", 404);

    if (["Cancelled", "Delivered", "Returned"].includes(order.status)) {
      return error(res, `Cannot create shipment for an order with status '${order.status}'`, 400);
    }

    // Verify seller has items in this order
    const sellerItems = filterSellerItems(order.items, sellerId);
    if (sellerItems.length === 0) {
      return error(res, "You have no items in this order", 403);
    }

    // Check duplicate shipment
    const existingShipment = await Shipment.findOne({ orderId, sellerId, status: { $ne: "CANCELLED" } });
    if (existingShipment) {
      return error(res, "A shipment already exists for your items in this order", 409);
    }

    // Fetch seller info for pickup address
    const seller = await Seller.findById(sellerId);
    if (!seller) return error(res, "Seller not found", 404);

    // Validate seller pickup address
    if (!seller.pincode) return error(res, "Seller pickup pincode is missing. Update your profile.", 400);
    if (!seller.mobileNumber) return error(res, "Seller phone is missing. Update your profile.", 400);
    if (!seller.shopAddress) return error(res, "Seller shop address is missing. Update your profile.", 400);

    // Validate customer delivery address
    const shippingAddr = order.shippingAddress || {};
    if (!shippingAddr.pincode) return error(res, "Customer delivery pincode is missing", 400);
    if (!shippingAddr.phone) return error(res, "Customer phone is missing", 400);
    const customerName = [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(" ");
    if (!customerName) return error(res, "Customer name is missing", 400);
    const customerAddress = [shippingAddr.flatNo, shippingAddr.area].filter(Boolean).join(", ");
    if (!customerAddress) return error(res, "Customer address is missing", 400);

    // Validate package dimensions
    const pkg = packageInfo || {};
    if (!pkg.weight || pkg.weight <= 0) return error(res, "Package weight is required", 400);
    if (!pkg.length || !pkg.breadth || !pkg.height) return error(res, "Package dimensions (length, breadth, height) are required", 400);

    // Validate payment mode: strictly bound to order payment method
    const isCod = order.paymentMethod === "cod";
    const mode = isCod ? "cod" : "prepaid";
    if (paymentMode && paymentMode !== mode) {
      return error(
        res,
        `Payment mode cannot be changed. Order ${order.orderNumber || order._id} is ${isCod ? "Cash on Delivery (COD)" : "Prepaid"}.`,
        400
      );
    }

    let finalCodAmount = 0;
    if (mode === "cod") {
      const allocations = calculateOrderCodAllocations(order);
      const allocatedCod = allocations[String(sellerId)] || 0;

      // Check existing active shipments for other vendor groups in this order
      const otherActiveShipments = await Shipment.find({
        orderId: order._id,
        sellerId: { $ne: sellerId },
        status: { $ne: "CANCELLED" },
      });

      const vendorGroups = getOrderVendorGroups(order);
      const shippedOtherGroups = new Set(
        otherActiveShipments.map((s) => (s.isAdminShipment ? "admin" : String(s.sellerId)))
      );
      const isLastRemainingGroup = vendorGroups.length > 1 && shippedOtherGroups.size === vendorGroups.length - 1;

      if (isLastRemainingGroup && otherActiveShipments.length > 0) {
        const sumOtherCod = otherActiveShipments.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
        finalCodAmount = Math.max(0, Math.round(((Number(order.total) || 0) - sumOtherCod) * 100) / 100);
      } else {
        finalCodAmount = allocatedCod;
      }

      // If client supplied codAmount, verify it matches the authoritative allocated share
      if (codAmount !== undefined && codAmount !== null && String(codAmount).trim() !== "") {
        const inputCod = Number(codAmount);
        if (!isNaN(inputCod) && Math.abs(inputCod - finalCodAmount) > 0.05) {
          return error(
            res,
            `Invalid COD amount. The allocated COD share for your items is ₹${finalCodAmount.toFixed(2)}, but received ₹${inputCod.toFixed(2)}.`,
            400
          );
        }
      }

      if (finalCodAmount <= 0) {
        return error(res, "COD amount is required for COD orders", 400);
      }
    }

    // ── Pickup address: prefer pickupLocationId, fallback to seller profile ──────
    let pickupAddress;
    let shiprocketPickupName = null;

    if (pickupLocationId) {
      // Seller specified a specific pickup location
      if (!mongoose.Types.ObjectId.isValid(pickupLocationId)) {
        return error(res, "Invalid pickupLocationId", 400);
      }
      const pickupLoc = await PickupLocation.findOne({
        _id: pickupLocationId, sellerId, isActive: true,
      });
      if (!pickupLoc) return error(res, "Pickup location not found or not yours", 404);

      pickupAddress = buildPickupAddress(pickupLoc);
      shiprocketPickupName = pickupLoc.shiprocket?.pickupName || pickupLoc.warehouseName;
    } else if (courier === "shiprocket") {
      // Shiprocket: try the seller's default pickup location
      const defaultLoc = await PickupLocation.findOne({
        sellerId, isDefault: true, isActive: true,
      });

      if (!defaultLoc) {
        return error(res, "No default pickup location found. Add a pickup location first.", 400);
      }

      pickupAddress = buildPickupAddress(defaultLoc);
      shiprocketPickupName = defaultLoc.shiprocket?.pickupName || defaultLoc.warehouseName;
    } else {
      // Delhivery / BlueDart: use seller's shop address
      if (!seller.pincode) return error(res, "Seller pickup pincode is missing. Update your profile.", 400);
      if (!seller.mobileNumber) return error(res, "Seller phone is missing. Update your profile.", 400);
      if (!seller.shopAddress) return error(res, "Seller shop address is missing. Update your profile.", 400);

      pickupAddress = buildPickupAddress(seller);
    }

    // Validate seller pickup address only for non-Shiprocket couriers (Shiprocket handled above)
    if (courier !== "shiprocket") {
      if (!pickupAddress.pincode) return error(res, "Seller pickup pincode is missing. Update your profile.", 400);
    }

    const deliveryAddress = buildDeliveryAddress(shippingAddr);

    // Check serviceability first
    provider = getCourierProvider(courier);
    const serviceResult = await provider.checkServiceability({
      pickupPincode: pickupAddress.pincode,
      deliveryPincode: deliveryAddress.pincode,
      paymentMode: mode,
      weight: pkg.weight,
    });

    if (!serviceResult.serviceable) {
      return error(res, `Courier not serviceable: ${serviceResult.message}`, 400);
    }

    if (mode === "cod" && serviceResult.codAvailable === false) {
      return error(res, "COD not available for this route with selected courier", 400);
    }

    // Map seller items for shipment
    const shipmentItems = sellerItems.map((item) => ({
      productId: item.productId?._id || item.productId,
      variantId: item.variantId,
      name: item.name || item.productId?.name || "Product",
      sku: item.sku || "",
      quantity: item.quantity || 1,
      price: item.price || 0,
    }));

    // Create shipment with courier
    courierResult = await provider.createShipment({
      orderId: order.orderId || order._id.toString(),
      pickupAddress,
      deliveryAddress,
      package: pkg,
      paymentMode: mode,
      codAmount: mode === "cod" ? finalCodAmount : 0,
      items: shipmentItems,
      sellerName: seller.shopName || seller.fullName,
      // Shiprocket-specific:
      shiprocketPickupName,
      preferredCourierId: seller.shiprocketConfig?.preferredCourierId || null,
    });

    // Generate label (Shiprocket returns label inline; Delhivery/BlueDart may need separate call)
    let labelUrl = courierResult.labelUrl || "";
    if (!labelUrl && courierResult.awbNumber && courier !== "shiprocket") {
      try {
        const labelResult = await provider.generateLabel({ awbNumber: courierResult.awbNumber });
        labelUrl = labelResult.labelUrl || "";
      } catch (labelErr) {
        console.warn("[Shipping] Label generation failed:", labelErr.message);
      }
    }

    // Save shipment to DB
    shipment = await Shipment.create({
      orderId: order._id,
      sellerId,
      courier,
      awbNumber: courierResult.awbNumber,
      waybill: courierResult.waybill || courierResult.awbNumber,
      labelUrl,
      invoiceUrl: courierResult.invoiceUrl || "",
      manifestUrl: "",
      trackingUrl: courierResult.trackingUrl || "",
      shiprocketOrderId: courierResult.shiprocketOrderId || null,
      shiprocketShipmentId: courierResult.shiprocketShipmentId || null,
      shiprocketPickupName: shiprocketPickupName || null,
      status: "CREATED",
      pickupAddress,
      deliveryAddress,
      package: pkg,
      paymentMode: mode,
      codAmount: mode === "cod" ? finalCodAmount : 0,
      items: shipmentItems,
      courierResponse: courierResult.courierResponse,
      timeline: [{
        status: "CREATED",
        message: `Shipment created with ${courier}. AWB: ${courierResult.awbNumber}`,
        date: new Date(),
      }],
    });

    // Update order shipping status
    await updateOrderShippingStatus(order._id);

    // Add timeline entry to order
    order.timeline.push({
      status: order.status,
      note: `Seller ${seller.shopName || seller.fullName} created shipment via ${courier} (AWB: ${courierResult.awbNumber})`,
      date: new Date(),
    });
    await order.save();

    return success(res, { shipment }, "Shipment created successfully", 201);
  } catch (err) {
    console.error("[Seller Shipping] Create shipment error:", err.message);

    let remoteCancelled = true;

    // Rollback Step 1: Attempt to cancel remote Shiprocket order FIRST if created
    if (courierResult?.shiprocketOrderId && provider && typeof provider.cancelShipment === "function") {
      try {
        const rollbackRes = await provider.cancelShipment({
          shiprocketOrderId: courierResult.shiprocketOrderId,
          awbNumber: courierResult.awbNumber,
        });
        if (rollbackRes?.cancelled === false) {
          remoteCancelled = false;
          console.warn("[Seller Shipping] Remote rollback rejected by Shiprocket:", rollbackRes.message);
        } else {
          console.log(`[Seller Shipping] Rolled back remote Shiprocket order ${courierResult.shiprocketOrderId} after local failure.`);
        }
      } catch (rollbackErr) {
        remoteCancelled = false;
        console.error("[Seller Shipping] Failed to rollback remote order:", rollbackErr.message);
      }
    }

    // Rollback Step 2: Handle local DB shipment document
    if (shipment?._id) {
      if (remoteCancelled || !courierResult?.shiprocketOrderId) {
        try {
          await Shipment.findByIdAndDelete(shipment._id);
          console.log(`[Seller Shipping] Purged orphaned local shipment ${shipment._id} after failure.`);
        } catch (dbErr) {
          console.error(`[Seller Shipping] Failed to delete orphaned local shipment ${shipment._id}:`, dbErr.message);
        }
      } else {
        try {
          shipment.status = "FAILED_ORDER_SAVE";
          shipment.timeline.push({
            status: "FAILED_ORDER_SAVE",
            message: `Shipment created in Shiprocket (AWB: ${courierResult?.awbNumber || "Pending"}), but local order status failed to save: ${err.message}. Remote cancellation was not accepted.`,
            date: new Date(),
          });
          await shipment.save();
        } catch (statusSaveErr) {
          console.error(`[Seller Shipping] Failed to save FAILED_ORDER_SAVE status on shipment ${shipment._id}:`, statusSaveErr.message);
        }
      }
    }

    return error(res, err.message, 500);
  }
};

/**
 * GET /api/seller/shipping/orders/:orderId
 * Get shipment details for a specific order.
 */
exports.getOrderShipment = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }

    const shipments = await Shipment.find({ orderId, sellerId })
      .populate("orderId", "orderId status")
      .sort({ createdAt: -1 });

    return success(res, { shipments }, "Shipments retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/seller/shipping/orders/:orderId/track
 * Sync tracking from courier for seller's shipment.
 */
exports.trackOrderShipment = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }

    const shipment = await Shipment.findOne({ orderId, sellerId, status: { $ne: "CANCELLED" } });
    if (!shipment) return error(res, "Shipment not found", 404);

    const provider = getCourierProvider(shipment.courier);
    const trackResult = await provider.trackShipment({
      awbNumber: shipment.awbNumber,
      waybill: shipment.waybill,
    });

    // Merge new timeline entries (deduplicate by date+status)
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

    // Update status if changed
    if (trackResult.status && trackResult.status !== shipment.status) {
      shipment.status = trackResult.status;
    }

    shipment.courierResponse = trackResult.courierResponse || shipment.courierResponse;
    await shipment.save();

    // Update order shipping status
    await updateOrderShippingStatus(shipment.orderId);

    return success(res, { shipment }, "Tracking synced");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/seller/shipping/orders/:orderId/cancel
 * Cancel seller's shipment (only before pickup).
 */
exports.cancelOrderShipment = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return error(res, "Invalid order ID", 400);
    }

    const shipment = await Shipment.findOne({ orderId, sellerId, status: { $ne: "CANCELLED" } });
    if (!shipment) return error(res, "Shipment not found", 404);

    // Block cancellation after pickup
    if (["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RTO_INITIATED", "RTO_DELIVERED"].includes(shipment.status)) {
      return error(res, "Cannot cancel shipment after pickup. Contact support.", 400);
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
      message: `Shipment cancelled by seller. ${cancelResult?.message || ""}`.trim(),
      date: new Date(),
    });
    await shipment.save();

    // Update order shipping status
    await updateOrderShippingStatus(shipment.orderId);

    return success(res, { shipment }, "Shipment cancelled");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * GET /api/seller/shipping
 * List all shipments for the authenticated seller.
 */
exports.getMyShipments = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const { status, courier, search } = req.query;

    const query = { sellerId };
    if (status) query.status = status;
    if (courier) query.courier = courier;
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { awbNumber: { $regex: escaped, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .populate("orderId", "orderId status customerName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shipment.countDocuments(query),
    ]);

    return paginated(res, { shipments }, {
      page, limit, totalItems: total, totalPages: Math.ceil(total / limit),
    }, "Shipments retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};
