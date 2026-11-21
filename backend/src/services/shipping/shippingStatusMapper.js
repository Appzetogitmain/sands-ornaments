/**
 * 📦 Shipping Status Mapper
 *    Normalizes courier-specific statuses to internal Shipment statuses.
 */

const INTERNAL_STATUSES = [
  "CREATED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "FAILED_ORDER_SAVE",
  "RTO_INITIATED",
  "RTO_DELIVERED",
  "CANCELLED",
];

// ── Delhivery status map ──────────────────────────────────────────────────────
const delhiveryStatusMap = {
  "manifested":          "CREATED",
  "manifest":            "CREATED",
  "pending":             "CREATED",
  "pickup scheduled":    "PICKUP_SCHEDULED",
  "pickup generated":    "PICKUP_SCHEDULED",
  "pickup pending":      "PICKUP_SCHEDULED",
  "picked up":           "PICKED_UP",
  "in transit":          "IN_TRANSIT",
  "reached at destination hub": "IN_TRANSIT",
  "dispatched":          "OUT_FOR_DELIVERY",
  "out for delivery":    "OUT_FOR_DELIVERY",
  "delivered":           "DELIVERED",
  "undelivered":         "FAILED",
  "not delivered":       "FAILED",
  "rto initiated":       "RTO_INITIATED",
  "rto":                 "RTO_INITIATED",
  "rto in transit":      "RTO_INITIATED",
  "rto delivered":       "RTO_DELIVERED",
  "cancelled":           "CANCELLED",
};

// ── Blue Dart status map ──────────────────────────────────────────────────────
const bluedartStatusMap = {
  "shipment booked":           "CREATED",
  "booked":                    "CREATED",
  "manifested":                "CREATED",
  "pickup scheduled":          "PICKUP_SCHEDULED",
  "soft data upload":          "PICKUP_SCHEDULED",
  "shipment picked up":        "PICKED_UP",
  "picked up":                 "PICKED_UP",
  "in transit":                "IN_TRANSIT",
  "arrived at hub":            "IN_TRANSIT",
  "received at origin":        "IN_TRANSIT",
  "connection allocated":      "IN_TRANSIT",
  "out for delivery":          "OUT_FOR_DELIVERY",
  "delivered":                 "DELIVERED",
  "not delivered":             "FAILED",
  "delivery failed":           "FAILED",
  "misrouted":                 "FAILED",
  "rto initiated":             "RTO_INITIATED",
  "returned to origin":        "RTO_INITIATED",
  "rto delivered":             "RTO_DELIVERED",
  "cancelled":                 "CANCELLED",
};

// ── Shiprocket status map ─────────────────────────────────────────────────────
const shiprocketStatusMap = {
  "new":                         "CREATED",
  "pickup queued":               "PICKUP_SCHEDULED",
  "pickup scheduled":            "PICKUP_SCHEDULED",
  "pickup error":                "PICKUP_SCHEDULED",
  "pickup rescheduled":          "PICKUP_SCHEDULED",
  "picked up":                   "PICKED_UP",
  "in transit":                  "IN_TRANSIT",
  "reached at destination hub":  "IN_TRANSIT",
  "arrived at destination hub":  "IN_TRANSIT",
  "dispatched":                  "IN_TRANSIT",
  "out for delivery":            "OUT_FOR_DELIVERY",
  "delivered":                   "DELIVERED",
  "undelivered":                 "FAILED",
  "not delivered":               "FAILED",
  "delivery failed":             "FAILED",
  "rto initiated":               "RTO_INITIATED",
  "rto":                         "RTO_INITIATED",
  "rto in transit":              "RTO_INITIATED",
  "rto delivered":               "RTO_DELIVERED",
  "cancelled":                   "CANCELLED",
  "shipment cancelled":          "CANCELLED",
};

/**
 * Maps a courier's raw status string to an internal shipment status.
 * @param {string} courier  - "delhivery" | "bluedart" | "shiprocket"
 * @param {string} rawStatus - Status string from the courier API/webhook
 * @returns {string|null}    - Internal status or null if unmapped
 */
const mapStatus = (courier, rawStatus) => {
  if (!rawStatus || typeof rawStatus !== "string") return null;
  const normalized = rawStatus.trim().toLowerCase();

  const map = courier === "delhivery"  ? delhiveryStatusMap
            : courier === "bluedart"   ? bluedartStatusMap
            : courier === "shiprocket" ? shiprocketStatusMap
            : null;

  if (!map) return null;
  return map[normalized] || null;
};

/**
 * Checks whether a status string is a valid internal shipment status.
 */
const isValidInternalStatus = (status) => INTERNAL_STATUSES.includes(status);

/**
 * Returns the valid internal statuses list.
 */
const getInternalStatuses = () => [...INTERNAL_STATUSES];

module.exports = { mapStatus, isValidInternalStatus, getInternalStatuses };
