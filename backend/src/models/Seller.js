const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  shopName: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  mobileNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gstNumber: { type: String },
  panNumber: { type: String },
  bisNumber: { type: String },
  bisNumberGold: { type: String },
  bisNumberSilver: { type: String },
  dob: { type: Date },
  district: { type: String },
  shopAddress: String,
  city: String,
  state: String,
  pincode: String,
  bankAccount: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    branchName: { type: String }
  },
  documents: {
    aadharUrl: String,
    shopLicenseUrl: String,
    certificateUrl: String,
    partnershipDeedUrl: String,
    panUrl: String,
    gstUrl: String,
    visitingCardUrl: String,
    diamondCertificateUrl: String
  },
  firmType: { type: String, enum: ["sole proprietorship", "Partnership", "Pvt Ltd", "LLP"] },
  cin: { type: String },
  llpin: { type: String },
  status: { type: String, enum: ["PENDING_PROFILE", "PENDING", "APPROVED", "REJECTED"], default: "PENDING_PROFILE", index: true },
  rejectionReason: String,
  registrationDate: { type: Date, default: Date.now },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  metalRates: {
    goldPerGram: { type: Number, default: 0 },
    goldPerMilligram: { type: Number, default: 0 },
    silverPerGram: { type: Number, default: 0 },
    silverPerMilligram: { type: Number, default: 0 },
    gold10g: {
      k14: { type: Number, default: 0 },
      k18: { type: Number, default: 0 },
      k22: { type: Number, default: 0 },
      k24: { type: Number, default: 0 }
    },
    silver10g: {
      sterling925: { type: Number, default: 0 },
      silverOther: { type: Number, default: 0 }
    }
  },
  termsAcceptedAt: { type: Date },
  termsVersion: { type: Date },

  // Auth hardening: DB-backed login lockout to mitigate brute force.
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },

  // ── Courier Preferences ──────────────────────────────────────────────────
  courierPreferences: {
    defaultCourier: {
      type: String,
      enum: ["delhivery", "bluedart", "shiprocket", null],
      default: null,
    },
    fallbackCouriers: {
      type: [String],
      default: [],
    },
    allowCourierOverride: { type: Boolean, default: true },
  },

  // ── Shiprocket Config (per-seller) ───────────────────────────────────────
  // Note: Global Shiprocket creds are in .env. This block stores
  // per-seller overrides or metadata if needed.
  shiprocketConfig: {
    defaultPickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickupLocation",
      default: null,
    },
    preferredCourierId: { type: Number, default: null }, // Shiprocket courier_company_id
  },

  // ── Delhivery Config (per-seller) ────────────────────────────────────────
  delhiveryConfig: {
    pickupName: { type: String, default: null }, // DELHIVERY_PICKUP_NAME override
  },

  // ── Blue Dart Config (per-seller) ────────────────────────────────────────
  bluedartConfig: {
    originArea: { type: String, default: null }, // BLUEDART_ORIGIN_AREA override
  },
  fcmTokens: { type: [String], default: [] },
  fcmTokenMobile: { type: [String], default: [] },

  // ── Wallet ───────────────────────────────────────────────────────────────
  // walletBalance: running balance in ₹ (may be slightly negative due to
  //   commission reversals that overshoot available credit; payout requests
  //   are blocked when balance < ₹500).
  walletBalance: { type: Number, default: 0 },

  // Lifetime cumulative metrics (incremented atomically, never decremented).
  totalCommissionsEarned: { type: Number, default: 0 }, // sum of all confirmed commission credits
  totalPaidOut:           { type: Number, default: 0 }, // sum of all APPROVED payout amounts

}, { timestamps: true });

module.exports = mongoose.model("Seller", sellerSchema);
