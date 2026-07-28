const Seller = require("../../../models/Seller");
const Notification = require("../../../models/Notification");
const EmailOTP = require("../../../models/EmailOTP");
const OTP = require("../../../models/OTP");
const Page = require("../../../models/Page");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { success, error } = require("../../../utils/apiResponse");
const { sendEmail } = require("../../../services/emailService");
const { sendOtpSms } = require("../../../services/smsService");

const MIN_SELLER_PASSWORD_LEN = 6;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SELLER_RESET_MAX_ATTEMPTS = 5;

const signToken = (id) => {
  return jwt.sign({ userId: id, role: "seller" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

exports.register = async (req, res) => {
  try {
    const {
      shopName,
      fullName,
      email,
      mobileNumber,
      password,
      shopAddress,
      city,
      state,
      acceptTerms,
    } = req.body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedMobile = String(mobileNumber || "").trim();

    if (!shopName || !String(shopName).trim())
      return error(res, "Shop name is required", 400);
    if (!fullName || !String(fullName).trim())
      return error(res, "Full name is required", 400);
    if (!/^[A-Za-z\s]+$/.test(String(fullName).trim())) {
      return error(res, "Full name should contain only alphabets", 400);
    }
    if (!normalizedEmail) return error(res, "Email is required", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return error(res, "Please enter a valid email address", 400);
    if (!normalizedMobile) return error(res, "Mobile number is required", 400);
    if (!/^\d{10}$/.test(normalizedMobile))
      return error(res, "Mobile number must be 10 digits", 400);
    if (!password || !String(password).trim())
      return error(res, "Password is required", 400);
    if (String(password).trim().length < MIN_SELLER_PASSWORD_LEN) {
      return error(
        res,
        `Password must be at least ${MIN_SELLER_PASSWORD_LEN} characters`,
        400,
      );
    }

    if (!shopAddress || !String(shopAddress).trim())
      return error(res, "Shop address is required", 400);
    if (!city || !String(city).trim())
      return error(res, "City is required", 400);
    if (!/^[A-Za-z\s]+$/.test(String(city).trim())) {
      return error(res, "City should contain only alphabets", 400);
    }
    if (!state || !String(state).trim())
      return error(res, "State is required", 400);
    if (!/^[A-Za-z\s]+$/.test(String(state).trim())) {
      return error(res, "State should contain only alphabets", 400);
    }

    const existingEmail = normalizedEmail
      ? await Seller.findOne({ email: normalizedEmail })
      : null;
    if (existingEmail)
      return error(res, "Seller with this email already exists", 400);

    const existingMobile = normalizedMobile
      ? await Seller.findOne({ mobileNumber: normalizedMobile })
      : null;
    if (existingMobile)
      return error(res, "Seller with this mobile number already exists", 400);

    const sellerTermsPage = await Page.findOne({ slug: "seller-terms" });
    if (!sellerTermsPage || !String(sellerTermsPage.content || "").trim()) {
      return error(
        res,
        "Seller terms are not configured yet. Please contact support.",
        400,
      );
    }

    const acceptedTerms =
      acceptTerms === true || acceptTerms === "true" || acceptTerms === "1";
    if (!acceptedTerms) {
      return error(
        res,
        "Please accept the seller terms & conditions to continue.",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const seller = await Seller.create({
      shopName,
      fullName,
      email: normalizedEmail,
      mobileNumber: normalizedMobile,
      password: hashedPassword,
      shopAddress,
      city,
      state,
      termsAcceptedAt: new Date(),
      termsVersion:
        sellerTermsPage.lastUpdated || sellerTermsPage.updatedAt || new Date(),
      status: "PENDING_PROFILE",
    });

    const adminNotification = await Notification.create({
      title: "New seller registered",
      message: `${fullName} registered with shop ${shopName}. Email: ${email}. Mobile: ${mobileNumber}. Location: ${city || "N/A"}, ${state || "N/A"}.`,
      type: "SELLER_REQUEST",
      priority: "High",
      link: `/admin/seller-details/${seller._id}`,
      isBroadcast: true,
    }).catch(() => null);

    if (adminNotification) {
      try {
        const { emitBroadcastNotification } = require("../../../services/socketEmitter");
        emitBroadcastNotification(adminNotification);
      } catch (err) {
        console.error("Failed to emit socket notification:", err.message);
      }
    }

    if (process.env.ADMIN_EMAIL) {
      try {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "New seller registration received",
          html: `New seller registration received.\n\nName: ${fullName}\nShop: ${shopName}\nEmail: ${normalizedEmail}\nMobile: ${normalizedMobile}\nLocation: ${city || "N/A"}, ${state || "N/A"}\n\nReview in admin panel.`,
        });
      } catch (mailErr) {
        console.error(
          "Admin seller registration email failed:",
          mailErr.message,
        );
      }
    }

    return success(
      res,
      { sellerId: seller._id },
      "Registration successful. Please log in to complete your profile.",
      201,
    );
  } catch (err) {
    return error(res, err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, identifier } = req.body;
    const lookup = String(identifier || email || "")
      .trim()
      .toLowerCase();

    const seller = await Seller.findOne({
      $or: [{ email: lookup }, { mobileNumber: lookup }],
    });
    if (!seller) return error(res, "Invalid credentials", 401);

    // Brute-force protection: lock account temporarily after repeated failures.
    if (seller.lockUntil && new Date(seller.lockUntil).getTime() > Date.now()) {
      const mins = Math.ceil(
        (new Date(seller.lockUntil).getTime() - Date.now()) / (60 * 1000),
      );
      return error(
        res,
        `Too many failed attempts. Try again in ${mins} minute(s).`,
        429,
        "SELLER_LOCKED",
      );
    }

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      seller.loginAttempts = Number(seller.loginAttempts || 0) + 1;
      if (seller.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        seller.lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        seller.loginAttempts = 0; // reset counter once locked
      }
      await seller.save();
      return error(res, "Invalid credentials", 401);
    }

    // Successful login: clear counters if present.
    if (seller.loginAttempts || seller.lockUntil) {
      seller.loginAttempts = 0;
      seller.lockUntil = null;
      await seller.save();
    }

    const token = signToken(seller._id);

    // Remove password from response
    const sellerObj = seller.toObject();
    delete sellerObj.password;

    return success(res, { token, user: sellerObj }, "Seller login successful");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.logout = async (req, res) => {
  return success(res, {}, "Logged out");
};

// --- SELLER PASSWORD RESET (EMAIL OTP) ---
exports.sendResetOtp = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!normalizedEmail) return error(res, "Email is required", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return error(res, "Please enter a valid email address", 400);
    }

    // Always respond success to avoid account enumeration.
    const seller = await Seller.findOne({ email: normalizedEmail }).select(
      "_id email fullName",
    );
    if (!seller) {
      return success(res, {}, "If an account exists, an OTP has been sent.");
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    await EmailOTP.deleteMany({
      email: normalizedEmail,
      purpose: "seller_password_reset",
    });
    await EmailOTP.create({
      email: normalizedEmail,
      otp,
      purpose: "seller_password_reset",
      attempts: 0,
    });

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Sands Jewels - Seller Password Reset OTP",
        html: `Hello ${seller.fullName || "Seller"},\n\nYour OTP to reset your seller password is: ${otp}\n\nThis OTP is valid for 10 minutes.\nIf you did not request this, you can ignore this message.\n\nThanks,\nSands Jewels`,
      });
    } catch (mailErr) {
      // Still return a generic response; log internally.
      console.error("Seller reset OTP email failed:", mailErr.message);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV Seller Reset OTP] ${normalizedEmail}: ${otp}`);
    }

    return success(res, {}, "If an account exists, an OTP has been sent.");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    if (!normalizedEmail) return error(res, "Email is required", 400);
    if (!otp) return error(res, "OTP is required", 400);
    if (!newPassword) return error(res, "New password is required", 400);
    if (newPassword.length < MIN_SELLER_PASSWORD_LEN) {
      return error(
        res,
        `Password must be at least ${MIN_SELLER_PASSWORD_LEN} characters`,
        400,
      );
    }

    const otpRecord = await EmailOTP.findOne({
      email: normalizedEmail,
      purpose: "seller_password_reset",
    });
    if (!otpRecord) {
      return error(
        res,
        "OTP expired or not found. Please request a new OTP.",
        400,
        "OTP_EXPIRED",
      );
    }

    if ((Number(otpRecord.attempts) || 0) >= SELLER_RESET_MAX_ATTEMPTS) {
      await EmailOTP.deleteMany({
        email: normalizedEmail,
        purpose: "seller_password_reset",
      });
      return error(
        res,
        "Too many failed attempts. Please request a new OTP.",
        429,
        "OTP_MAX_ATTEMPTS",
      );
    }

    if (String(otpRecord.otp) !== otp) {
      await EmailOTP.updateOne(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } },
      );
      const remaining =
        SELLER_RESET_MAX_ATTEMPTS - ((Number(otpRecord.attempts) || 0) + 1);
      return error(
        res,
        `Invalid OTP. ${Math.max(0, remaining)} attempt(s) remaining.`,
        400,
        "OTP_INVALID",
      );
    }

    const seller = await Seller.findOne({ email: normalizedEmail });
    if (!seller) {
      // Still delete OTP so it can't be replayed
      await EmailOTP.deleteMany({
        email: normalizedEmail,
        purpose: "seller_password_reset",
      });
      return success(res, {}, "Password updated successfully");
    }

    const salt = await bcrypt.genSalt(10);
    seller.password = await bcrypt.hash(newPassword, salt);
    // Clear lockouts on password reset
    seller.loginAttempts = 0;
    seller.lockUntil = null;
    await seller.save();

    await EmailOTP.deleteMany({
      email: normalizedEmail,
      purpose: "seller_password_reset",
    });

    return success(res, {}, "Password updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// --- SELLER PASSWORD RESET (MOBILE SMS OTP) ---
exports.sendResetMobileOtp = async (req, res) => {
  try {
    const mobileNumber = String(req.body.mobileNumber || "").trim();
    if (!mobileNumber) return error(res, "Mobile number is required", 400);
    if (!/^\d{10}$/.test(mobileNumber)) {
      return error(res, "Please enter a valid 10-digit mobile number", 400);
    }

    // Always respond success to avoid account enumeration
    const seller = await Seller.findOne({ mobileNumber }).select(
      "_id mobileNumber fullName",
    );
    if (!seller) {
      return success(res, {}, "If an account exists, an OTP has been sent.");
    }

    const defaultOtp = process.env.DEFAULT_OTP || "1234";
    const otp =
      process.env.USE_REAL_OTP === "true"
        ? String(Math.floor(100000 + Math.random() * 900000))
        : defaultOtp;

    await OTP.deleteMany({
      phone: mobileNumber,
      purpose: "seller_password_reset",
    });
    await OTP.create({
      phone: mobileNumber,
      otp,
      purpose: "seller_password_reset",
      attempts: 0,
    });

    try {
      await sendOtpSms(mobileNumber, otp);
    } catch (smsErr) {
      console.error("Seller reset OTP SMS failed:", smsErr.message);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV Seller Reset Mobile OTP] ${mobileNumber}: ${otp}`);
    }

    return success(res, {}, "If an account exists, an OTP has been sent.");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.resetPasswordViaMobile = async (req, res) => {
  try {
    const mobileNumber = String(req.body.mobileNumber || "").trim();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    if (!mobileNumber) return error(res, "Mobile number is required", 400);
    if (!otp) return error(res, "OTP is required", 400);
    if (!newPassword) return error(res, "New password is required", 400);
    if (newPassword.length < MIN_SELLER_PASSWORD_LEN) {
      return error(
        res,
        `Password must be at least ${MIN_SELLER_PASSWORD_LEN} characters`,
        400,
      );
    }

    const otpRecord = await OTP.findOne({
      phone: mobileNumber,
      purpose: "seller_password_reset",
    });
    if (!otpRecord) {
      return error(
        res,
        "OTP expired or not found. Please request a new OTP.",
        400,
        "OTP_EXPIRED",
      );
    }

    if ((Number(otpRecord.attempts) || 0) >= SELLER_RESET_MAX_ATTEMPTS) {
      await OTP.deleteMany({
        phone: mobileNumber,
        purpose: "seller_password_reset",
      });
      return error(
        res,
        "Too many failed attempts. Please request a new OTP.",
        429,
        "OTP_MAX_ATTEMPTS",
      );
    }

    if (String(otpRecord.otp) !== otp) {
      await OTP.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      const remaining =
        SELLER_RESET_MAX_ATTEMPTS - ((Number(otpRecord.attempts) || 0) + 1);
      return error(
        res,
        `Invalid OTP. ${Math.max(0, remaining)} attempt(s) remaining.`,
        400,
        "OTP_INVALID",
      );
    }

    const seller = await Seller.findOne({ mobileNumber });
    if (!seller) {
      await OTP.deleteMany({
        phone: mobileNumber,
        purpose: "seller_password_reset",
      });
      return success(res, {}, "Password updated successfully");
    }

    const salt = await bcrypt.genSalt(10);
    seller.password = await bcrypt.hash(newPassword, salt);
    seller.loginAttempts = 0;
    seller.lockUntil = null;
    await seller.save();

    await OTP.deleteMany({
      phone: mobileNumber,
      purpose: "seller_password_reset",
    });

    return success(res, {}, "Password updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
