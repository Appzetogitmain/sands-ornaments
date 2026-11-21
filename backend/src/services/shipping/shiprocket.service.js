/**
 * 📦 Shiprocket Shipping Provider
 *    Implements ShippingProvider for Shiprocket APIs.
 *
 *    Env: SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_BASE_URL
 *
 *    Auth: JWT-based (token valid for 24h). This service manages its own
 *    token lifecycle with in-memory caching and auto-refresh.
 */

const axios = require("axios");
const ShippingProvider = require("./ShippingProvider");
const { mapStatus } = require("./shippingStatusMapper");

// ── Token Cache (in-memory, per-process) ─────────────────────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0; // Unix ms timestamp

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

const _getAuthToken = async () => {
  const now = Date.now();

  // Return cached token if still valid
  if (_cachedToken && now < _tokenExpiresAt - TOKEN_BUFFER_MS) {
    return _cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const baseURL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external";

  if (!email || !password) {
    throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set in environment variables.");
  }

  try {
    const response = await axios.post(`${baseURL}/auth/login`, { email, password }, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const token = response.data?.token;
    if (!token) throw new Error("Shiprocket login did not return a token");

    _cachedToken = token;
    // Shiprocket tokens are valid for 24 hours
    _tokenExpiresAt = now + 24 * 60 * 60 * 1000;

    console.log("[Shiprocket] Auth token refreshed.");
    return _cachedToken;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error("[Shiprocket] Token fetch failed:", msg);
    throw new Error(`Shiprocket authentication failed: ${msg}`);
  }
};

// ── Shiprocket Provider ───────────────────────────────────────────────────────

class ShiprocketProvider extends ShippingProvider {
  constructor() {
    super("shiprocket");
    this.baseURL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external";
  }

  /**
   * Build an authenticated axios instance with a fresh token.
   */
  async _getClient() {
    const token = await _getAuthToken();
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Check if a pincode pair is serviceable.
   */
  async checkServiceability({ pickupPincode, deliveryPincode, paymentMode = "prepaid", weight = 0.5 }) {
    try {
      const client = await this._getClient();
      const codFlag = paymentMode === "cod" ? 1 : 0;
      const weightKg = weight > 100 ? weight / 1000 : weight; // accept grams or kg

      const response = await client.get("/courier/serviceability/", {
        params: {
          pickup_postcode: pickupPincode,
          delivery_postcode: deliveryPincode,
          cod: codFlag,
          weight: weightKg,
        },
      });

      const data = response.data;
      const availableCouriers = data?.data?.available_courier_companies || [];
      const etd = availableCouriers[0]?.etd || null;
      const codAvail = availableCouriers.some((c) => c.cod === 1);

      return {
        serviceable: availableCouriers.length > 0,
        estimatedDays: etd ? null : null, // ETD is a date string
        estimatedDelivery: etd || null,
        codAvailable: codAvail,
        availableCouriers: availableCouriers.map((c) => ({
          id: c.courier_company_id,
          name: c.courier_name,
          rating: c.rating,
          etd: c.etd,
          rate: c.rate,
          cod: c.cod === 1,
        })),
        message: availableCouriers.length > 0 ? "Serviceable" : "No courier available for this route",
        rawResponse: data,
      };
    } catch (err) {
      console.error("[Shiprocket] Serviceability check failed:", err.message);
      return { serviceable: false, message: err.message };
    }
  }

  /**
   * Get available couriers with rates for a given route.
   * Used by the courier selection / rate engine.
   */
  async getRates({ pickupPincode, deliveryPincode, weight, paymentMode = "prepaid" }) {
    return this.checkServiceability({ pickupPincode, deliveryPincode, paymentMode, weight });
  }

  /**
   * Create an order + shipment in Shiprocket.
   * Returns shiprocketOrderId, shiprocketShipmentId, awbNumber, labelUrl, etc.
   */
  async createShipment(payload) {
    try {
      const {
        orderId,
        pickupAddress,
        deliveryAddress,
        package: pkg,
        paymentMode,
        codAmount,
        items,
        sellerName,
        shiprocketPickupName, // Shiprocket pickup location name (warehouse name)
        preferredCourierId,   // Optional: force a specific courier
      } = payload;

      const client = await this._getClient();

      // ── Step 1: Create Shiprocket Order ────────────────────────────────────
      const orderPayload = {
        order_id: `SR_${orderId}_${Date.now()}`,
        order_date: new Date().toISOString().split("T")[0],
        pickup_location: shiprocketPickupName || "Primary",
        billing_customer_name: deliveryAddress.name,
        billing_last_name: "",
        billing_address: deliveryAddress.address,
        billing_city: deliveryAddress.city,
        billing_pincode: deliveryAddress.pincode,
        billing_state: deliveryAddress.state,
        billing_country: deliveryAddress.country || "India",
        billing_email: deliveryAddress.email || "",
        billing_phone: deliveryAddress.phone,
        shipping_is_billing: true,
        order_items: items.map((item) => ({
          name: item.name || "Product",
          sku: item.sku || `SKU_${item.productId || Date.now()}`,
          units: item.quantity || 1,
          selling_price: item.price || 0,
          discount: 0,
          tax: 0,
          hsn: "",
        })),
        payment_method: paymentMode === "cod" ? "COD" : "Prepaid",
        sub_total: items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0),
        length: pkg.length || 10,
        breadth: pkg.breadth || 10,
        height: pkg.height || 10,
        weight: pkg.weight > 100 ? pkg.weight / 1000 : pkg.weight || 0.5, // grams to kg
      };

      const orderResponse = await client.post("/orders/create/adhoc", orderPayload);
      const orderData = orderResponse.data;

      if (!orderData?.order_id) {
        throw new Error(`Shiprocket order creation failed: ${JSON.stringify(orderData)}`);
      }

      const shiprocketOrderId = orderData.order_id;
      const shiprocketShipmentId = orderData.shipment_id;

      // ── Step 2: Assign AWB / Courier ────────────────────────────────────────
      const awbPayload = {
        shipment_id: shiprocketShipmentId,
        ...(preferredCourierId ? { courier_id: preferredCourierId } : {}),
      };

      let awbResponse;
      try {
        awbResponse = await client.post("/courier/assign/awb", awbPayload);
      } catch (awbErr) {
        // Automatically cancel the created adhoc order in Shiprocket so no orphaned order lingers
        try {
          await client.post("/orders/cancel", { ids: [Number(shiprocketOrderId)] });
          console.log(`[Shiprocket] Cleaned up orphaned order ${shiprocketOrderId} after AWB failure.`);
        } catch (cleanupErr) {
          console.warn("[Shiprocket] Failed to cancel orphaned order:", cleanupErr.message);
        }
        const errMsg = awbErr.response?.data?.message || awbErr.message || "Failed to assign AWB";
        throw new Error(`Shiprocket AWB assignment failed: ${errMsg}`);
      }

      const awbData = awbResponse.data;
      const awbNumber = awbData?.response?.data?.awb_code || awbData?.awb_code || "";
      const courierName = awbData?.response?.data?.courier_name || "";

      if (!awbNumber) {
        const assignErr = awbData?.response?.data?.awb_assign_error ||
          awbData?.response?.data?.message ||
          awbData?.message ||
          "Failed to assign AWB from courier. Check Shiprocket recharge balance or courier availability.";
        try {
          await client.post("/orders/cancel", { ids: [Number(shiprocketOrderId)] });
          console.log(`[Shiprocket] Cleaned up orphaned order ${shiprocketOrderId} after missing AWB.`);
        } catch (cleanupErr) {
          console.warn("[Shiprocket] Failed to cancel orphaned order:", cleanupErr.message);
        }
        throw new Error(`Shiprocket AWB assignment failed: ${assignErr}`);
      }

      // ── Step 3: Generate Label ───────────────────────────────────────────────
      let labelUrl = "";
      try {
        const labelResponse = await client.post("/courier/generate/label", {
          shipment_id: [shiprocketShipmentId],
        });
        labelUrl = labelResponse.data?.label_url || "";
      } catch (labelErr) {
        console.warn("[Shiprocket] Label generation failed (non-critical):", labelErr.message);
      }

      // ── Step 4: Generate Invoice ─────────────────────────────────────────────
      let invoiceUrl = "";
      try {
        const invoiceResponse = await client.post("/orders/print/invoice", {
          ids: [shiprocketOrderId],
        });
        invoiceUrl = invoiceResponse.data?.invoice_url || "";
      } catch (invoiceErr) {
        console.warn("[Shiprocket] Invoice generation failed (non-critical):", invoiceErr.message);
      }

      return {
        awbNumber,
        waybill: awbNumber,
        labelUrl,
        invoiceUrl,
        trackingUrl: awbNumber
          ? `https://shiprocket.co/tracking/${awbNumber}`
          : "",
        courierName,
        shiprocketOrderId: String(shiprocketOrderId),
        shiprocketShipmentId: String(shiprocketShipmentId),
        courierResponse: { order: orderData, awb: awbData },
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error("[Shiprocket] Create shipment failed:", msg);
      throw new Error(`Shiprocket shipment creation failed: ${msg}`);
    }
  }

  /**
   * Request pickup for an existing Shiprocket shipment.
   */
  async schedulePickup({ awbNumber, shiprocketOrderId, pickupDate }) {
    try {
      const client = await this._getClient();

      const date = pickupDate
        ? new Date(pickupDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const response = await client.post("/courier/generate/pickup", {
        shipment_id: [awbNumber], // Shiprocket accepts AWB or shipment ID here
        pickup_date: [date],
      });

      return {
        pickupId: response.data?.pickup_token_number || "",
        scheduledDate: date,
        message: "Pickup scheduled successfully",
        courierResponse: response.data,
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error("[Shiprocket] Schedule pickup failed:", msg);
      return { pickupId: "", message: msg };
    }
  }

  /**
   * Cancel a Shiprocket order.
   */
  async cancelShipment({ awbNumber, shiprocketOrderId }) {
    try {
      const client = await this._getClient();

      if (!shiprocketOrderId) {
        throw new Error("shiprocketOrderId is required to cancel a Shiprocket shipment");
      }

      const response = await client.post("/orders/cancel", {
        ids: [Number(shiprocketOrderId)],
      });

      return {
        cancelled: true,
        message: "Shipment cancelled successfully",
        courierResponse: response.data,
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error("[Shiprocket] Cancel shipment failed:", msg);
      return { cancelled: false, message: msg };
    }
  }

  /**
   * Track a shipment by AWB number.
   */
  async trackShipment({ awbNumber }) {
    try {
      const client = await this._getClient();

      const response = await client.get(`/courier/track/awb/${awbNumber}`);
      const data = response.data;

      const trackData = data?.tracking_data || {};
      const shipmentTrack = trackData?.shipment_track?.[0] || {};
      const trackActivities = trackData?.shipment_track_activities || [];

      const timeline = trackActivities.map((activity) => ({
        status: mapStatus("shiprocket", activity.activity || "") || activity.activity || "IN_TRANSIT",
        location: activity.location || "",
        message: activity.activity || "",
        date: activity.date ? new Date(activity.date).toISOString() : new Date().toISOString(),
      }));

      const rawStatus = shipmentTrack?.current_status || "";
      const currentStatus = mapStatus("shiprocket", rawStatus) || "IN_TRANSIT";

      return {
        status: currentStatus,
        timeline,
        estimatedDelivery: shipmentTrack?.edd || null,
        courierName: shipmentTrack?.courier_name || "",
        courierResponse: data,
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error("[Shiprocket] Track shipment failed:", msg);
      throw new Error(`Shiprocket tracking failed: ${msg}`);
    }
  }

  /**
   * Generate / re-fetch label URL for a shipment.
   */
  async generateLabel({ awbNumber, shiprocketShipmentId }) {
    try {
      const client = await this._getClient();

      const id = shiprocketShipmentId || awbNumber;
      const response = await client.post("/courier/generate/label", {
        shipment_id: [id],
      });

      return { labelUrl: response.data?.label_url || "" };
    } catch (err) {
      console.error("[Shiprocket] Generate label failed:", err.message);
      return { labelUrl: "" };
    }
  }

  /**
   * Generate manifest for a list of AWB numbers.
   */
  async generateManifest({ awbNumbers = [], shiprocketShipmentIds = [] }) {
    try {
      const client = await this._getClient();

      const response = await client.post("/manifests/generate", {
        shipment_id: shiprocketShipmentIds.length > 0 ? shiprocketShipmentIds : awbNumbers,
      });

      return {
        manifestUrl: response.data?.manifest_url || "",
        courierResponse: response.data,
      };
    } catch (err) {
      console.error("[Shiprocket] Generate manifest failed:", err.message);
      return { manifestUrl: "" };
    }
  }

  /**
   * Create or sync a pickup location (warehouse) with Shiprocket.
   * Returns the Shiprocket pickup location name for use in order creation.
   */
  async createPickupLocation(locationData) {
    try {
      const client = await this._getClient();

      const payload = {
        pickup_location: locationData.warehouseName,
        name: locationData.contactPerson || locationData.warehouseName,
        email: locationData.email || "",
        phone: locationData.phone,
        address: locationData.addressLine1,
        address_2: locationData.addressLine2 || "",
        city: locationData.city,
        state: locationData.state,
        country: locationData.country || "India",
        pin_code: locationData.pincode,
      };

      const response = await client.post("/settings/company/addpickup", payload);
      const data = response.data;

      return {
        success: true,
        shiprocketPickupName: locationData.warehouseName,
        shiprocketPickupId: data?.data?.pickup_id || null,
        courierResponse: data,
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error("[Shiprocket] Create pickup location failed:", msg);
      throw new Error(`Shiprocket pickup location creation failed: ${msg}`);
    }
  }

  /**
   * List all pickup locations registered with Shiprocket.
   */
  async listPickupLocations() {
    try {
      const client = await this._getClient();
      const response = await client.get("/settings/company/pickup");
      const locations = response.data?.data?.shipping_address || [];

      return {
        locations: locations.map((loc) => ({
          shiprocketPickupId: loc.id,
          warehouseName: loc.pickup_location,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          pincode: loc.pin_code,
          phone: loc.phone,
          contactPerson: loc.name,
        })),
      };
    } catch (err) {
      console.error("[Shiprocket] List pickup locations failed:", err.message);
      return { locations: [] };
    }
  }
}

module.exports = ShiprocketProvider;
