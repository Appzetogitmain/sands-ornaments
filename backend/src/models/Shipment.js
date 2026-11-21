const mongoose = require("mongoose");

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String, default: "" },
  message: { type: String, default: "" },
  date: { type: Date, default: Date.now },
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", default: null, index: true },
  isAdminShipment: { type: Boolean, default: false, index: true },

  courier: {
    type: String,
    enum: ["delhivery", "bluedart", "shiprocket"],
    required: true,
    index: true,
  },

  awbNumber: { type: String, default: "", index: true },
  waybill: { type: String, default: "" },
  labelUrl: { type: String, default: "" },
  invoiceUrl: { type: String, default: "" },   // Shiprocket invoice PDF
  manifestUrl: { type: String, default: "" },  // Shiprocket manifest PDF
  trackingUrl: { type: String, default: "" },

  // Shiprocket-specific identifiers (null for Delhivery/BlueDart)
  shiprocketOrderId: { type: String, default: null },
  shiprocketShipmentId: { type: String, default: null },
  shiprocketPickupName: { type: String, default: null }, // Pickup warehouse name in Shiprocket

  status: {
    type: String,
    enum: [
      "CREATED",
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "FAILED",
      "RTO_INITIATED",
      "RTO_DELIVERED",
      "CANCELLED",
    ],
    default: "CREATED",
    index: true,
  },

  pickupAddress: {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },

  deliveryAddress: {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },

  package: {
    weight: { type: Number, default: 0 },
    length: { type: Number, default: 0 },
    breadth: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },

  paymentMode: {
    type: String,
    enum: ["prepaid", "cod"],
    default: "prepaid",
  },
  codAmount: { type: Number, default: 0 },

  // Items belonging to this seller in the order
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variantId: mongoose.Schema.Types.ObjectId,
    name: String,
    sku: String,
    quantity: Number,
    price: Number,
  }],

  // Raw response from courier API for debugging
  courierResponse: { type: mongoose.Schema.Types.Mixed, default: null },

  timeline: [timelineEntrySchema],

}, { timestamps: true });

// Compound indexes for common queries
shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ orderId: 1, sellerId: 1 });
shipmentSchema.index({ awbNumber: 1, courier: 1 });

module.exports = mongoose.model("Shipment", shipmentSchema);
