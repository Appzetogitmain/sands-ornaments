const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "Sands Jewels" },
    contactEmail: String,
    contactPhone: String,
    address: String,
    email: String,
    phone: String,
    website: { type: String, default: "www.sandsjewels.com" },
    socialLinks: {
      facebook: { type: String, default: "#" },
      instagram: { type: String, default: "#" },
      twitter: { type: String, default: "#" },
      youtube: { type: String, default: "#" },
    },

    // Product Page policies
    productHeader: { type: String, default: "ESTIMATED DELIVERY DATE" },
    returnPolicy: { type: String, default: "2 Days Return" },
    exchangePolicy: { type: String, default: "10 Days Exchange" },
    codPolicy: { type: String, default: "Cash On Delivery" },
    warrantyText: { type: String, default: "Lifetime Warranty" },
    safetyText: { type: String, default: "Skin Safe Jewellery" },
    platingText: { type: String, default: "18k Gold Tone Plated" },
    purityText: { type: String, default: "925 Fine Silver" },

    sandsPromise: {
      type: [
        {
          title: String,
          desc: String,
          icon: String,
        },
      ],
      default: [
        {
          title: "Authentic 925 Silver",
          desc: "Certified 925 Sterling Silver with official hallmarking on every single piece.",
          icon: "ShieldCheck",
        },
        {
          title: "Skin Safe Luxury",
          desc: "Hypoallergenic, Nickel and Lead-free materials designed for sensitive skin.",
          icon: "Smile",
        },
        {
          title: "Signature Packaging",
          desc: "Arrives in our signature velvet-lined box, perfect for gifting and safekeeping.",
          icon: "Gift",
        },
      ],
    },
    careGuide: {
      type: [
        {
          title: String,
          desc: String,
          icon: String,
        },
      ],
      default: [
        {
          title: "Stay Dry",
          desc: "Remove before bathing or swimming to prevent tarnishing.",
          icon: "Droplets",
        },
        {
          title: "Last Step",
          desc: "Avoid contact with perfumes, makeup, and hairsprays.",
          icon: "Sparkles",
        },
        {
          title: "Safe Haven",
          desc: "Store in individual airtight bags to minimize oxidation.",
          icon: "ShieldCheck",
        },
        {
          title: "Gentle Clean",
          desc: "Regularly wipe with a soft cloth to restore its natural glow.",
          icon: "Smile",
        },
      ],
    },
    careGuideIntro: {
      type: String,
      default: "Our jewelry is crafted with pure 925 sterling silver and premium plating. Follow these simple steps to ensure your pieces remain as stunning as the day you first wore them.",
    },

    // Announcement items
    announcementItems: {
      type: [
        {
          id: Number,
          icon: String,
          text: String,
          type: { type: String },
          image: String,
        },
      ],
      default: [
        { id: 1, icon: "Truck", text: "Free Shipping" },
        { id: 2, icon: "Shield", text: "Secure Payments" },
        { id: 3, icon: "RefreshCw", text: "Easy Returns & Refunds" },
        { id: 4, icon: "Headset", text: "Dedicated Support Team" },
      ],
    },

    // Fraud alerts
    fraudWarning: {
      type: String,
      default:
        "BEWARE OF FRAUD: Sands Jewels never asks for confidential banking details over phone or email.",
    },

    // Footer Taglines and Texts
    footerTagline: { type: String, default: "Timeless Elegance," },
    footerSubTagline: { type: String, default: "Handcrafted for You." },
    footerDescription: {
      type: String,
      default:
        "Every piece at Sands tell a story of heritage and modern Grace. Join our community of silver lovers and celebrate life's most precious moments.",
    },

    footerColumn1Title: { type: String, default: "Experience" },
    footerColumn2Title: { type: String, default: "Policies" },
    footerColumn3Title: { type: String, default: "Our World" },

    footerExperienceLinks: {
      type: [
        {
          id: Number,
          name: String,
          path: String,
        },
      ],
      default: [
        { id: 1, name: "Easy Returns", path: "/return-policy" },
        { id: 2, name: "Contact Us", path: "/help" },
        { id: 3, name: "FAQs", path: "/help" },
        { id: 4, name: "Blogs", path: "/blogs" },
      ],
    },
    footerPoliciesLinks: {
      type: [
        {
          id: Number,
          name: String,
          path: String,
        },
      ],
      default: [
        { id: 1, name: "Shipping Policy", path: "/shipping-policy" },
        { id: 2, name: "Privacy Policy", path: "/privacy" },
        { id: 3, name: "Cancellation Policy", path: "/cancellation-policy" },
        { id: 4, name: "Terms & Conditions", path: "/terms" },
      ],
    },
    footerWorldLinks: {
      type: [
        {
          id: Number,
          name: String,
          path: String,
        },
      ],
      default: [
        { id: 1, name: "About Us", path: "/about" },
        { id: 2, name: "Jewellery Care Guide", path: "/care-guide" },
        { id: 3, name: "Our Craft", path: "/craft" },
      ],
    },
    footerDeliveryText: {
      type: String,
      default: "Safe & Insured Express Worldwide Delivery",
    },
    footerCopyrightText: {
      type: String,
      default: "Sands Jewels Pvt Ltd. All Rights Reserved.",
    },
    logo: String,
    favicon: String,
    maintenanceMode: { type: Boolean, default: false },
    shippingCharges: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    metalPricingUpdatedAt: { type: Date, default: null },
    taxSettingsUpdatedAt: { type: Date, default: null },
    metalRates: {
      goldPerGram: { type: Number, default: 0 },
      goldPerMilligram: { type: Number, default: 0 },
      silverPerGram: { type: Number, default: 0 },
      silverPerMilligram: { type: Number, default: 0 },
      gold10g: {
        k14: { type: Number, default: 0 },
        k18: { type: Number, default: 0 },
        k22: { type: Number, default: 0 },
        k24: { type: Number, default: 0 },
      },
      silver10g: {
        sterling925: { type: Number, default: 0 },
        silverOther: { type: Number, default: 0 },
      },
    },

    // ── Platform commission configuration ────────────────────────────────
    // Tiers are evaluated upper-inclusive: an amount A matches a tier when
    // (A >= minAmount && (maxAmount === null || A <= maxAmount)).
    //
    // commissionEnabled is a PERMANENT operational kill-switch — not a rollout
    // flag. It exists so Ops can suspend new accruals during an emergency
    // (e.g. tier misconfiguration, billing freeze). When false:
    //   • New accruals are skipped silently (placeOrder / verifyPayment).
    //   • In-flight confirmations and reversals still run, so historical
    //     ledger entries continue to settle correctly.
    //   • The Admin UI shows the disabled state and blocks tier saves.
    // Do NOT remove this field — see docs/COMMISSION.md ("Kill-switch policy").
    commissionEnabled: { type: Boolean, default: true },
    commissionTiers: {
      type: [
        {
          _id: false,
          minAmount: { type: Number, required: true, min: 0 },
          maxAmount: { type: Number, default: null },
          commission: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    commissionUpdatedAt: { type: Date, default: null },
    commissionBackfilledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Setting", settingSchema);
