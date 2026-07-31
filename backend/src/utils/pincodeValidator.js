/**
 * 📍 Indian Pincode Validator & Zone Distance Estimator
 * Handles format checks, fake pincode detection, state/zone mapping, and regional ETA estimation.
 */

// Known fake / test pincode blacklists
const BLACKLISTED_PINCODES = new Set([
  "000000", "111111", "222222", "333333", "444444", "555555",
  "666666", "777777", "888888", "999999", "123456", "654321",
  "123123", "987654", "012345"
]);

// 1st digit Postal Circle / Region Mapping
const POSTAL_CIRCLES = {
  "1": { region: "North Zone", states: ["Delhi", "Haryana", "Punjab", "Himachal Pradesh", "Jammu & Kashmir", "Chandigarh"] },
  "2": { region: "North Zone", states: ["Uttar Pradesh", "Uttarakhand"] },
  "3": { region: "West Zone", states: ["Rajasthan", "Gujarat", "Daman & Diu", "Dadra & Nagar Haveli"] },
  "4": { region: "West/Central Zone", states: ["Maharashtra", "Goa", "Madhya Pradesh", "Chhattisgarh"] },
  "5": { region: "South Zone", states: ["Andhra Pradesh", "Telangana", "Karnataka"] },
  "6": { region: "South Zone", states: ["Tamil Nadu", "Kerala", "Puducherry", "Lakshadweep"] },
  "7": { region: "East/North-East Zone", states: ["West Bengal", "Odisha", "Assam", "Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Sikkim", "Andaman & Nicobar"] },
  "8": { region: "East Zone", states: ["Bihar", "Jharkhand"] },
  "9": { region: "Army Postal Service", states: ["Field Post Office"] }
};

// Known Metro / Major Hub 2-digit prefixes
const METRO_PREFIXES = new Set([
  "11", // Delhi NCR
  "40", "41", "42", // Mumbai / Pune
  "56", "57", // Bengaluru
  "60", "61", // Chennai
  "70", "71", // Kolkata
  "50", // Hyderabad
  "38"  // Ahmedabad
]);

// Special / Remote prefix ranges (may need extra shipping days)
const REMOTE_PREFIXES = new Set([
  "19", // J&K / Ladakh
  "78", "79", // Assam / NE States
  "737", // Sikkim
  "744" // Andaman & Nicobar
]);

/**
 * Validate format and check if pincode is a real Indian postal code structure.
 */
function validatePincodeFormat(pincode) {
  const pinStr = String(pincode || "").trim();

  // Basic 6-digit regex
  if (!/^[1-9][0-9]{5}$/.test(pinStr)) {
    return { valid: false, reason: "Pincode must be a valid 6-digit number starting with 1-9" };
  }

  // Blacklist check (e.g. 123456)
  if (BLACKLISTED_PINCODES.has(pinStr)) {
    return { valid: false, reason: "The entered pincode is invalid or non-existent" };
  }

  // Check if 1st digit maps to a valid postal circle
  const firstDigit = pinStr[0];
  const circle = POSTAL_CIRCLES[firstDigit];
  if (!circle) {
    return { valid: false, reason: "Invalid Indian postal circle" };
  }

  return { valid: true, circle, pinStr };
}

/**
 * Estimate transit time between pickup and delivery pincodes.
 */
function calculateEstimatedDays(pickupPin = "110001", deliveryPin) {
  const pickupStr = String(pickupPin || "110001").trim();
  const delivStr = String(deliveryPin || "").trim();

  const pickupFirst2 = pickupStr.slice(0, 2);
  const delivFirst2 = delivStr.slice(0, 2);

  const pickupFirst3 = pickupStr.slice(0, 3);
  const delivFirst3 = delivStr.slice(0, 3);

  const isRemote = Array.from(REMOTE_PREFIXES).some(prefix => delivStr.startsWith(prefix));

  // Remote / Island / Special Zones
  if (isRemote) {
    return 7;
  }

  // Same City / Hub (First 3 digits match)
  if (pickupFirst3 === delivFirst3) {
    return 2;
  }

  // Same State / Sub-region (First 2 digits match)
  if (pickupFirst2 === delivFirst2) {
    return 3;
  }

  // Same Postal Circle (First digit matches)
  if (pickupStr[0] === delivStr[0]) {
    return 4;
  }

  // Metro to Metro route
  if (METRO_PREFIXES.has(pickupFirst2) && METRO_PREFIXES.has(delivFirst2)) {
    return 3;
  }

  // Standard Interstate / Rest of India
  return 5;
}

/**
 * Full Pincode Serviceability Check (Offline Mode)
 */
function checkOfflineServiceability(deliveryPin, pickupPin = "110001") {
  const formatCheck = validatePincodeFormat(deliveryPin);
  if (!formatCheck.valid) {
    return {
      serviceable: false,
      reason: formatCheck.reason,
      pincode: deliveryPin
    };
  }

  const { circle, pinStr } = formatCheck;
  const estimatedDays = calculateEstimatedDays(pickupPin, pinStr);

  const primaryState = circle.states[0] || "India";

  return {
    serviceable: true,
    pincode: pinStr,
    region: circle.region,
    state: primaryState,
    estimatedDays,
    courier: "standard-logistics"
  };
}

module.exports = {
  validatePincodeFormat,
  calculateEstimatedDays,
  checkOfflineServiceability,
  BLACKLISTED_PINCODES
};
