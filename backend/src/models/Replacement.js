const mongoose = require("mongoose");

const replacementSchema = new mongoose.Schema({
  replacementId: { type: String, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, default: "Same Product" },
  originalItems: [{
    productId: mongoose.Schema.Types.ObjectId, variantId: mongoose.Schema.Types.ObjectId,
    name: String, sku: String, qty: Number, price: Number, reason: String
  }],
  replacementItems: [{
    productId: mongoose.Schema.Types.ObjectId, variantId: mongoose.Schema.Types.ObjectId,
    name: String, sku: String, qty: Number
  }],
  evidence: { reason: String, comment: String, images: [String], video: String },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Pickup Scheduled", "Pickup Completed", "Replacement Shipped", "Delivered", "Closed"],
    default: "Pending"
  },
  replacementMode: { type: String, enum: ["after_pickup", "immediate"], default: "after_pickup" },
  itemCondition: { type: String, enum: ["Good", "Damaged"], default: null },
  stockAction: { type: String, enum: ["Restock", "Discard"], default: null },
  pickup: { partner: String, awb: String, scheduledDate: Date, status: String },
  shipment: { partner: String, awb: String, status: String, trackingLink: String },
  inventory: {
    processedAt: Date,
    processedByStatus: String,
    actionApplied: String,
    shippedProcessedAt: Date,
    shippedProcessedStatus: String
  },
  adminComment: String,
  timeline: [{ status: String, date: { type: Date, default: Date.now }, note: String }],
}, { timestamps: true });

module.exports = mongoose.model("Replacement", replacementSchema);
