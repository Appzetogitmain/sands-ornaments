const mongoose = require("mongoose");

const homepageItemSchema = new mongoose.Schema({
  itemId: { type: String },
  type: { type: String, default: "manual" }, // manual | product
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  limit: { type: Number },
  name: String,
  label: String,
  subtitle: String,
  description: String,
  image: String,
  mobileImage: String,
  hoverImage: String,
  relationKey: String,
  recipient: String,
  bondKey: String,
  celebrateKey: String,
  iconKey: String,
  path: String,
  tag: String,
  location: String,
  rating: { type: Number },
  price: String,
  ctaLabel: String,
  priceMax: { type: Number },
  extraImages: [String],
  sortOrder: { type: Number, default: 0 }
}, { _id: false });

const homepageSectionSchema = new mongoose.Schema({
  sectionId: { type: String, required: true, unique: true, index: true },
  pageKey: {
    type: String,
    enum: ["home", "shop-men", "shop-women", "shop-family", "gold-collection"],
    default: "home",
    index: true
  },
  sectionKey: { type: String, index: true },
  sectionType: {
    type: String,
    enum: ["banner", "category-grid", "product-collection", "product-carousel", "promo-grid", "faq", "testimonial", "nav-links", "rich-content"],
    default: "rich-content"
  },
  label: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  items: [homepageItemSchema],
  settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

homepageSectionSchema.index({ pageKey: 1, sectionKey: 1 }, { unique: true, sparse: true });

homepageSectionSchema.pre("validate", function(next) {
  if (!this.pageKey) {
    this.pageKey = "home";
  }

  if (!this.sectionKey) {
    if (this.sectionId && String(this.sectionId).includes(":")) {
      this.sectionKey = String(this.sectionId).split(":").slice(1).join(":");
    } else {
      this.sectionKey = this.sectionId;
    }
  }

  if (!this.sectionId && this.sectionKey) {
    this.sectionId = this.pageKey === "home"
      ? this.sectionKey
      : `${this.pageKey}:${this.sectionKey}`;
  }

  next();
});

module.exports = mongoose.model("HomepageSection", homepageSectionSchema);
