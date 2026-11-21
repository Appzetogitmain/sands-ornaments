const router = require("express").Router();
const shippingController = require("../controllers/shipping.controller");

// All routes are already behind authenticate + requireRole("admin") from the parent router.

// Reports must be before /:shipmentId to avoid route conflict
router.get("/reports", shippingController.getReports);

// Pickup locations from Shiprocket
router.get("/pickup-locations", shippingController.getPickupLocations);

// Create shipment for an order (Shiprocket)
router.post("/orders/:orderId/create", shippingController.createShipment);

// Get shipments for an order
router.get("/orders/:orderId", shippingController.getOrderShipments);

// List all shipments
router.get("/", shippingController.getAllShipments);

// Get single shipment
router.get("/:shipmentId", shippingController.getShipmentDetail);

// Track shipment
router.post("/:shipmentId/track", shippingController.trackShipment);

// Cancel shipment
router.post("/:shipmentId/cancel", shippingController.cancelShipment);

// Override status
router.patch("/:shipmentId/override-status", shippingController.overrideStatus);

// Generate Shiprocket manifest
router.post("/:shipmentId/manifest", shippingController.generateManifest);

// Re-generate shipping label
router.post("/:shipmentId/generate-label", shippingController.regenerateLabel);

module.exports = router;
