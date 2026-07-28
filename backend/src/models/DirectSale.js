const mongoose = require("mongoose");

const directSaleSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", default: null, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    serialCode: { type: String, required: true, unique: true, index: true },

    productName: { type: String, default: "" },
    variantName: { type: String, default: "" },
    productImage: { type: String, default: "" },
    material: { type: String, default: "" },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "other"],
      default: "cash"
    },

    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    note: { type: String, default: "" },

    status: {
      type: String,
      enum: ["completed", "voided"],
      default: "completed",
      index: true
    },

    voidReason: { type: String, default: "" },
    voidedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DirectSale", directSaleSchema);

