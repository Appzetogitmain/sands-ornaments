const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  items: [{
    productId: { type: mongoose.Schema.Types.Mixed, ref: "Product" },
    variantId: mongoose.Schema.Types.Mixed,
    name: String,
    sku: String,
    image: String,
    price: Number,
    mrp: Number,
    quantity: Number,
    sellerId: { type: mongoose.Schema.Types.Mixed, ref: "Seller", default: null },
    voidTagId: String,
    isGiftCard: { type: Boolean, default: false },
    personalization: { type: mongoose.Schema.Types.Mixed },
    giftWrap: { type: Boolean, default: false },
    giftMessage: { type: String, default: "" }
  }],
  shippingAddress: {
    firstName: String, lastName: String, email: String, phone: String,
    flatNo: String, area: String, city: String, district: String,
    state: String, pincode: String
  },
  paymentMethod: { type: String, enum: ["razorpay", "cod"] },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded", "cod", "partially_refunded"], default: "pending" },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  couponCode: String,
  subtotal: Number,
  discount: Number,
  shipping: Number,
  giftWrapCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  // Gift card redemption — persisted for order history & admin audit
  giftCardDiscount: { type: Number, default: 0 },
  appliedGiftCards: [{
    cardId:     { type: mongoose.Schema.Types.Mixed, default: null },
    code:       { type: String, default: "" },
    amountUsed: { type: Number, default: 0 },
    _id:        false
  }],
  status: {
    type: String,
    enum: ["Pending", "Processing", "Confirmed", "Packed", "Partially Shipped", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned", "Partially Returned"],
    default: "Processing"
  },
  shippingInfo: { carrier: String, trackingId: String, trackingUrl: String, estimatedDelivery: Date },
  sellerShipments: [{
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment" },
    courier: String,
    awbNumber: String,
    status: String,
  }],
  timeline: [{ status: String, date: { type: Date, default: Date.now }, note: String }],
  notes: String,

  // ── Razorpay Refund ──────────────────────────────────────────────────────────
  refundId:     { type: String, default: null },
  refundStatus: {
    type: String,
    enum: ["none", "pending", "processed", "failed"],
    default: "none"
  },
  refundAmount:  { type: Number, default: 0 },
  refundedAt:    { type: Date,   default: null },

  // ── Platform commission cache (source of truth lives in Commission ledger) ──
  // This is denormalized for fast reads; recompute from the ledger when in doubt.
  commissionSummary: {
    totalCommission: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "reversed", "partial", "none"],
      default: "none"
    },
    computedAt: { type: Date, default: null }
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
