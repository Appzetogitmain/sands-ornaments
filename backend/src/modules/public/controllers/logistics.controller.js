const { success, error } = require("../../../utils/apiResponse");
const { checkOfflineServiceability, validatePincodeFormat } = require("../../../utils/pincodeValidator");
const { getCourierProvider } = require("../../../services/shipping/courierFactory");

/**
 * 🚚 Check Pincode Serviceability & Delivery ETA (Public Storefront API)
 * GET/POST /api/public/logistics/check-pincode
 */
exports.checkPincodeServiceability = async (req, res) => {
  try {
    const query = req.query || {};
    const body = req.body || {};
    const pincode = query.pincode || body.pincode;
    const pickupPincode = query.pickupPincode || body.pickupPincode || process.env.STORE_DEFAULT_PICKUP_PINCODE || "110001";


    if (!pincode) {
      return error(res, "Pincode parameter is required", 400);
    }

    // Step 1: Format & Fake Pincode Validation
    const formatCheck = validatePincodeFormat(pincode);
    if (!formatCheck.valid) {
      return success(
        res,
        {
          pincode: String(pincode).trim(),
          serviceable: false,
          reason: formatCheck.reason,
          estimatedDays: null,
          formattedDeliveryDate: null,
        },
        "Pincode non-serviceable"
      );
    }

    // Step 2: Attempt Live Courier Check (if configured)
    let liveResult = null;
    const defaultCourier = process.env.DEFAULT_COURIER_PROVIDER || "shiprocket";

    try {
      if (process.env.SHIPROCKET_EMAIL || process.env.DELHIVERY_API_TOKEN) {
        const provider = getCourierProvider(defaultCourier);
        if (provider) {
          liveResult = await provider.checkServiceability({
            pickupPincode,
            deliveryPincode: formatCheck.pinStr,
            paymentMode: "prepaid",
            weight: 500,
          });
        }
      }
    } catch (err) {
      console.warn("[Logistics] Live courier check fallback to zone matrix:", err.message);
    }

    // Step 3: Use live result if successful and serviceable, otherwise use offline zone matrix
    let serviceable = false;
    let estimatedDays = 3;
    let courierName = "zone-logistics";
    let state = formatCheck.location?.state || "India";
    let region = formatCheck.location?.region || "India";
    let city = formatCheck.location?.city || "";

    if (liveResult && liveResult.serviceable) {
      serviceable = true;
      estimatedDays = liveResult.estimatedDays || 4;
      courierName = defaultCourier;
    } else {
      // Offline fallback check
      const offlineResult = checkOfflineServiceability(formatCheck.pinStr, pickupPincode);
      serviceable = offlineResult.serviceable;
      estimatedDays = offlineResult.estimatedDays;
      state = offlineResult.state;
      region = offlineResult.region;
      city = offlineResult.city || "";
    }


    if (!serviceable) {
      return success(
        res,
        {
          pincode: formatCheck.pinStr,
          serviceable: false,
          reason: "Pincode is currently not serviceable for delivery",
          estimatedDays: null,
          formattedDeliveryDate: null,
        },
        "Pincode non-serviceable"
      );
    }

    // Calculate delivery date dynamically
    const now = new Date();
    // Add estimated shipping days + 1 day buffer for packaging/dispatch
    const totalDays = Math.max(2, estimatedDays + 1);
    const targetDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

    const formattedDeliveryDate = targetDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    return success(
      res,
      {
        pincode: formatCheck.pinStr,
        serviceable: true,
        region,
        state,
        city,
        estimatedDays: totalDays,
        formattedDeliveryDate,
        isoDeliveryDate: targetDate.toISOString(),
        courier: courierName,
      },

      "Pincode serviceable"
    );
  } catch (err) {
    console.error("[Logistics] Controller Error:", err);
    return error(res, "Failed to verify pincode serviceability", 500);
  }
};
