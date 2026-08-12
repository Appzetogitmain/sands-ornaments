const mongoose = require("mongoose");

// A seller invoice is a snapshot, not a live view of the order. This prevents
// later profile or catalogue edits from changing a document that was issued.
const sellerInvoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    currency: { type: String, default: "INR", immutable: true },
    issuedAt: { type: Date, default: Date.now, immutable: true },
    documentType: {
      type: String,
      enum: ["COMMERCIAL_INVOICE"],
      default: "COMMERCIAL_INVOICE",
      immutable: true,
    },
    order: {
      orderNumber: { type: String, required: true, immutable: true },
      placedAt: { type: Date, immutable: true },
      statusAtIssue: { type: String, immutable: true },
      paymentMethod: { type: String, immutable: true },
      paymentStatus: { type: String, immutable: true },
    },
    seller: {
      shopName: { type: String, immutable: true },
      contactName: { type: String, immutable: true },
      email: { type: String, immutable: true },
      phone: { type: String, immutable: true },
      gstNumber: { type: String, immutable: true },
      panNumber: { type: String, immutable: true },
      address: {
        address: { type: String, immutable: true },
        city: { type: String, immutable: true },
        state: { type: String, immutable: true },
        pincode: { type: String, immutable: true },
      },
    },
    customer: {
      name: { type: String, immutable: true },
      email: { type: String, immutable: true },
      phone: { type: String, immutable: true },
      address: {
        flatNo: { type: String, immutable: true },
        area: { type: String, immutable: true },
        city: { type: String, immutable: true },
        district: { type: String, immutable: true },
        state: { type: String, immutable: true },
        pincode: { type: String, immutable: true },
      },
    },
    items: [
      {
        name: { type: String, immutable: true },
        sku: { type: String, immutable: true },
        quantity: { type: Number, immutable: true },
        unitPrice: { type: Number, immutable: true },
        lineTotal: { type: Number, immutable: true },
        giftWrap: { type: Boolean, default: false, immutable: true },
      },
    ],
    totals: {
      itemSubtotal: { type: Number, required: true, immutable: true },
      giftWrapCharge: { type: Number, default: 0, immutable: true },
      couponDiscount: { type: Number, default: 0, immutable: true },
      invoiceTotal: { type: Number, required: true, immutable: true },
    },
    allocation: {
      method: {
        type: String,
        enum: ["exact_order_snapshot", "pro_rata_historical"],
        required: true,
        immutable: true,
      },
      note: { type: String, immutable: true },
    },
    taxDisclosure: {
      type: String,
      default: "Tax is not separately calculated by the platform for this commercial invoice.",
      immutable: true,
    },
  },
  { timestamps: true },
);

sellerInvoiceSchema.index({ orderId: 1, sellerId: 1 }, { unique: true });

module.exports = mongoose.model("SellerInvoice", sellerInvoiceSchema);
