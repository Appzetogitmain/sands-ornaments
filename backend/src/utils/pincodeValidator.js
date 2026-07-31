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

// Precise 2-digit and 3-digit Pincode Prefix Map for Indian States & Major Cities
const STATE_PREFIX_MAP = {
  // Northern Region
  "11": { state: "Delhi", region: "North Zone", city: "Delhi NCR" },
  "12": { state: "Haryana", region: "North Zone", city: "Faridabad / Gurugram" },
  "13": { state: "Haryana", region: "North Zone", city: "Ambala / Panipat" },
  "14": { state: "Punjab", region: "North Zone", city: "Ludhiana / Jalandhar" },
  "15": { state: "Punjab", region: "North Zone", city: "Bhatinda / Patiala" },
  "16": { state: "Chandigarh", region: "North Zone", city: "Chandigarh" },
  "17": { state: "Himachal Pradesh", region: "North Zone", city: "Shimla / Dharamshala" },
  "18": { state: "Jammu & Kashmir", region: "North Zone", city: "Jammu" },
  "19": { state: "Jammu & Kashmir", region: "North Zone", city: "Srinagar / Ladakh" },

  // Uttar Pradesh & Uttarakhand
  "20": { state: "Uttar Pradesh", region: "North Zone", city: "Noida / Ghaziabad / Aligarh" },
  "21": { state: "Uttar Pradesh", region: "North Zone", city: "Kanpur / Prayagraj" },
  "22": { state: "Uttar Pradesh", region: "North Zone", city: "Lucknow / Varanasi" },
  "23": { state: "Uttar Pradesh", region: "North Zone", city: "Mirzapur" },
  "24": { state: "Uttar Pradesh", region: "North Zone", city: "Bareilly / Moradabad" },
  "248": { state: "Uttarakhand", region: "North Zone", city: "Dehradun" },
  "249": { state: "Uttarakhand", region: "North Zone", city: "Haridwar / Rishikesh" },
  "25": { state: "Uttar Pradesh", region: "North Zone", city: "Meerut" },
  "26": { state: "Uttar Pradesh", region: "North Zone", city: "Pilibhit / Lakhimpur" },
  "27": { state: "Uttar Pradesh", region: "North Zone", city: "Gorakhpur" },
  "28": { state: "Uttar Pradesh", region: "North Zone", city: "Agra / Jhansi" },

  // Rajasthan & Gujarat
  "30": { state: "Rajasthan", region: "West Zone", city: "Jaipur" },
  "31": { state: "Rajasthan", region: "West Zone", city: "Udaipur / Kota" },
  "32": { state: "Rajasthan", region: "West Zone", city: "Sawai Madhopur" },
  "33": { state: "Rajasthan", region: "West Zone", city: "Bikaner / Churu" },
  "34": { state: "Rajasthan", region: "West Zone", city: "Jodhpur / Barmer" },
  "36": { state: "Gujarat", region: "West Zone", city: "Rajkot" },
  "37": { state: "Gujarat", region: "West Zone", city: "Kutch / Gandhidham" },
  "38": { state: "Gujarat", region: "West Zone", city: "Ahmedabad / Gandhinagar" },
  "39": { state: "Gujarat", region: "West Zone", city: "Surat / Vadodara" },

  // Maharashtra & Goa
  "40": { state: "Maharashtra", region: "West Zone", city: "Mumbai" },
  "403": { state: "Goa", region: "West Zone", city: "Goa" },
  "41": { state: "Maharashtra", region: "West Zone", city: "Pune / Solapur" },
  "42": { state: "Maharashtra", region: "West Zone", city: "Nashik / Thane" },
  "43": { state: "Maharashtra", region: "West Zone", city: "Chhatrapati Sambhajinagar" },
  "44": { state: "Maharashtra", region: "West Zone", city: "Nagpur / Amravati" },

  // Madhya Pradesh & Chhattisgarh
  "45": { state: "Madhya Pradesh", region: "Central Zone", city: "Indore / Ujjain" },
  "46": { state: "Madhya Pradesh", region: "Central Zone", city: "Bhopal / Gwalior" },
  "47": { state: "Madhya Pradesh", region: "Central Zone", city: "Gwalior / Morena" },
  "48": { state: "Madhya Pradesh", region: "Central Zone", city: "Jabalpur / Rewa" },
  "49": { state: "Chhattisgarh", region: "Central Zone", city: "Raipur / Bhilai" },

  // Southern Region
  "50": { state: "Telangana", region: "South Zone", city: "Hyderabad" },
  "51": { state: "Andhra Pradesh", region: "South Zone", city: "Tirupati / Chittoor" },
  "52": { state: "Andhra Pradesh", region: "South Zone", city: "Vijayawada" },
  "53": { state: "Andhra Pradesh", region: "South Zone", city: "Visakhapatnam" },
  "56": { state: "Karnataka", region: "South Zone", city: "Bengaluru" },
  "57": { state: "Karnataka", region: "South Zone", city: "Mangaluru / Mysuru" },
  "58": { state: "Karnataka", region: "South Zone", city: "Hubballi / Belagavi" },
  "59": { state: "Karnataka", region: "South Zone", city: "Belagavi" },

  // Tamil Nadu & Kerala
  "60": { state: "Tamil Nadu", region: "South Zone", city: "Chennai" },
  "61": { state: "Tamil Nadu", region: "South Zone", city: "Thanjavur / Trichy" },
  "62": { state: "Tamil Nadu", region: "South Zone", city: "Madurai" },
  "63": { state: "Tamil Nadu", region: "South Zone", city: "Vellore / Salem" },
  "64": { state: "Tamil Nadu", region: "South Zone", city: "Coimbatore" },
  "67": { state: "Kerala", region: "South Zone", city: "Kozhikode" },
  "68": { state: "Kerala", region: "South Zone", city: "Kochi / Ernakulam" },
  "69": { state: "Kerala", region: "South Zone", city: "Thiruvananthapuram" },

  // Eastern & North-Eastern Region
  "70": { state: "West Bengal", region: "East Zone", city: "Kolkata" },
  "71": { state: "West Bengal", region: "East Zone", city: "Howrah / Hooghly" },
  "72": { state: "West Bengal", region: "East Zone", city: "Midnapore" },
  "73": { state: "West Bengal", region: "East Zone", city: "Siliguri / Darjeeling" },
  "737": { state: "Sikkim", region: "North-East Zone", city: "Gangtok" },
  "74": { state: "West Bengal", region: "East Zone", city: "24 Parganas" },
  "744": { state: "Andaman & Nicobar", region: "East Zone", city: "Port Blair" },
  "75": { state: "Odisha", region: "East Zone", city: "Bhubaneswar" },
  "76": { state: "Odisha", region: "East Zone", city: "Cuttack / Sambalpur" },
  "77": { state: "Odisha", region: "East Zone", city: "Rourkela" },
  "78": { state: "Assam", region: "North-East Zone", city: "Guwahati" },
  "79": { state: "North-East Region", region: "North-East Zone", city: "Shillong / Imphal / Aizawl" },

  // Bihar & Jharkhand
  "80": { state: "Bihar", region: "East Zone", city: "Patna" },
  "81": { state: "Bihar", region: "East Zone", city: "Bhagalpur" },
  "82": { state: "Bihar", region: "East Zone", city: "Gaya" },
  "83": { state: "Jharkhand", region: "East Zone", city: "Ranchi" },
  "84": { state: "Bihar", region: "East Zone", city: "Muzaffarpur" },
  "85": { state: "Bihar", region: "East Zone", city: "Purnea" }
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

// Special / Remote prefix ranges
const REMOTE_PREFIXES = new Set([
  "19", // J&K / Ladakh
  "78", "79", // Assam / NE States
  "737", // Sikkim
  "744" // Andaman & Nicobar
]);

/**
 * Find exact state and city location info from pincode.
 */
function getLocationFromPincode(pinStr) {
  const pin = String(pinStr || "").trim();

  // Try 3-digit prefix match first (e.g. 248, 403, 737, 744)
  const first3 = pin.slice(0, 3);
  if (STATE_PREFIX_MAP[first3]) {
    return STATE_PREFIX_MAP[first3];
  }

  // Try 2-digit prefix match
  const first2 = pin.slice(0, 2);
  if (STATE_PREFIX_MAP[first2]) {
    return STATE_PREFIX_MAP[first2];
  }

  return { state: "India", region: "India", city: "" };
}

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

  const location = getLocationFromPincode(pinStr);

  return { valid: true, location, pinStr };
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

  const { location, pinStr } = formatCheck;
  const estimatedDays = calculateEstimatedDays(pickupPin, pinStr);

  return {
    serviceable: true,
    pincode: pinStr,
    region: location.region,
    state: location.state,
    city: location.city,
    estimatedDays,
    courier: "standard-logistics"
  };
}

module.exports = {
  validatePincodeFormat,
  calculateEstimatedDays,
  checkOfflineServiceability,
  getLocationFromPincode,
  BLACKLISTED_PINCODES
};
