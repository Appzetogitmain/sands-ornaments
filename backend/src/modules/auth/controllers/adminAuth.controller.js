const bcrypt = require("bcryptjs");
const User = require("../../../models/User");
const EmailOTP = require("../../../models/EmailOTP");
const OTP = require("../../../models/OTP");
const { signToken } = require("../../../config/jwt");
const { success, error } = require("../../../utils/apiResponse");
const { sendEmail } = require("../../../services/emailService");
const { sendOtpSms } = require("../../../services/smsService");

const ADMIN_RESET_MAX_ATTEMPTS = 5;

/**
 * POST /api/auth/admin/login
 * Body: { email, password }
 * Returns: { token, user }  - token stored in localStorage on frontend
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, "Email/phone and password are required.", 400, "MISSING_FIELDS");
    }

    const identifier = String(email).trim();

    // 1. Auto-seeding check: Ensure correct credentials exist in DB
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash("123456", salt);
      admin = await User.create({
        name: "Super Admin",
        email: "sandsjewels007@gmail.com",
        phone: "+919608811487",
        password: hashed,
        role: "admin"
      });
    } else {
      let isChanged = false;
      if (admin.email !== "sandsjewels007@gmail.com") {
        admin.email = "sandsjewels007@gmail.com";
        isChanged = true;
      }
      if (admin.phone !== "+919608811487") {
        admin.phone = "+919608811487";
        isChanged = true;
      }
      // Only set to 123456 if the admin currently has no password
      if (!admin.password) {
        const salt = await bcrypt.genSalt(12);
        admin.password = await bcrypt.hash("123456", salt);
        isChanged = true;
      }
      if (isChanged) {
        await admin.save();
      }
    }

    // 2. Perform search by email or mobile
    const matchedAdmin = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
        { phone: identifier.replace(/^\+91/, "") }
      ],
      role: "admin"
    });

    if (!matchedAdmin) {
      return error(res, "Invalid credentials.", 401, "INVALID_CREDENTIALS");
    }

    if (matchedAdmin.isBlocked) {
      return error(res, "This admin account is blocked.", 403, "ACCOUNT_BLOCKED");
    }

    // Compare password
    if (!matchedAdmin.password) {
      return error(res, "Invalid credentials.", 401, "INVALID_CREDENTIALS");
    }
    const isMatch = await bcrypt.compare(password, matchedAdmin.password);
    if (!isMatch) {
      return error(res, "Invalid credentials.", 401, "INVALID_CREDENTIALS");
    }

    // Sign JWT
    const token = signToken({ userId: matchedAdmin._id, role: "admin", email: matchedAdmin.email });

    return success(
      res,
      {
        token,
        user: { _id: matchedAdmin._id, name: matchedAdmin.name, email: matchedAdmin.email, role: matchedAdmin.role },
      },
      "Admin login successful"
    );
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * POST /api/auth/admin/logout
 */
exports.logout = async (req, res) => {
  return success(res, {}, "Admin logged out successfully");
};

// --- EMAIL RESET OTP ---
exports.sendResetOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return error(res, "Email is required", 400);

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return success(res, {}, "If an admin account exists, an OTP has been sent.");
    }

    const defaultOtp = process.env.DEFAULT_OTP || "1234";
    const otp = process.env.USE_REAL_OTP === "true"
      ? String(Math.floor(100000 + Math.random() * 900000))
      : defaultOtp;

    await EmailOTP.deleteMany({ email, purpose: "admin_password_reset" });
    await EmailOTP.create({
      email,
      otp,
      purpose: "admin_password_reset",
      attempts: 0
    });

    try {
      await sendEmail({
        to: email,
        subject: "Sands Jewels Admin Password Reset OTP",
        html: `<p>Your password reset OTP is <strong>${otp}</strong>. This OTP is valid for 15 minutes.</p>`
      });
    } catch (mailErr) {
      console.error("Admin reset OTP email failed:", mailErr.message);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV Admin Reset Email OTP] ${email}: ${otp}`);
    }

    return success(res, {}, "If an admin account exists, an OTP has been sent.");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    if (!email) return error(res, "Email is required", 400);
    if (!otp) return error(res, "OTP is required", 400);
    if (!newPassword) return error(res, "New password is required", 400);
    if (newPassword.length < 6) {
      return error(res, "Password must be at least 6 characters", 400);
    }

    const otpRecord = await EmailOTP.findOne({ email, purpose: "admin_password_reset" });
    if (!otpRecord) {
      return error(res, "OTP expired or not found. Please request a new OTP.", 400, "OTP_EXPIRED");
    }

    if ((Number(otpRecord.attempts) || 0) >= ADMIN_RESET_MAX_ATTEMPTS) {
      await EmailOTP.deleteMany({ email, purpose: "admin_password_reset" });
      return error(res, "Too many failed attempts. Please request a new OTP.", 429, "OTP_MAX_ATTEMPTS");
    }

    if (String(otpRecord.otp) !== otp) {
      await EmailOTP.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      const remaining = ADMIN_RESET_MAX_ATTEMPTS - ((Number(otpRecord.attempts) || 0) + 1);
      return error(res, `Invalid OTP. ${Math.max(0, remaining)} attempt(s) remaining.`, 400, "OTP_INVALID");
    }

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      await EmailOTP.deleteMany({ email, purpose: "admin_password_reset" });
      return success(res, {}, "Password updated successfully");
    }

    const salt = await bcrypt.genSalt(12);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    await EmailOTP.deleteMany({ email, purpose: "admin_password_reset" });

    return success(res, {}, "Password updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// --- MOBILE RESET OTP ---
exports.sendResetMobileOtp = async (req, res) => {
  try {
    const mobileNumber = String(req.body.mobileNumber || "").trim();
    if (!mobileNumber) return error(res, "Mobile number is required", 400);

    const cleanPhone = mobileNumber.replace(/\D/g, "");
    const last10 = cleanPhone.slice(-10);

    const admin = await User.findOne({
      $or: [
        { phone: mobileNumber },
        { phone: mobileNumber.replace(/^\+91/, "") },
        { phone: last10 },
        { phone: `+91${last10}` }
      ],
      role: "admin"
    });

    if (!admin) {
      return success(res, {}, "If an admin account exists, an OTP has been sent.");
    }

    const defaultOtp = process.env.DEFAULT_OTP || "1234";
    const otp = process.env.USE_REAL_OTP === "true"
      ? String(Math.floor(100000 + Math.random() * 900000))
      : defaultOtp;

    await OTP.deleteMany({ phone: admin.phone, purpose: "admin_password_reset" });
    await OTP.create({
      phone: admin.phone,
      otp,
      purpose: "admin_password_reset",
      attempts: 0
    });

    try {
      await sendOtpSms(last10, otp);
    } catch (smsErr) {
      console.error("Admin reset OTP SMS failed:", smsErr.message);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV Admin Reset Mobile OTP] ${admin.phone}: ${otp}`);
    }

    return success(res, {}, "If an admin account exists, an OTP has been sent.");
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
    if (newPassword.length < 6) {
      return error(res, "Password must be at least 6 characters", 400);
    }

    const cleanPhone = mobileNumber.replace(/\D/g, "");
    const last10 = cleanPhone.slice(-10);

    const admin = await User.findOne({
      $or: [
        { phone: mobileNumber },
        { phone: mobileNumber.replace(/^\+91/, "") },
        { phone: last10 },
        { phone: `+91${last10}` }
      ],
      role: "admin"
    });

    if (!admin) {
      return error(res, "Admin account not found", 404);
    }

    const otpRecord = await OTP.findOne({ phone: admin.phone, purpose: "admin_password_reset" });
    if (!otpRecord) {
      return error(res, "OTP expired or not found. Please request a new OTP.", 400, "OTP_EXPIRED");
    }

    if ((Number(otpRecord.attempts) || 0) >= ADMIN_RESET_MAX_ATTEMPTS) {
      await OTP.deleteMany({ phone: admin.phone, purpose: "admin_password_reset" });
      return error(res, "Too many failed attempts. Please request a new OTP.", 429, "OTP_MAX_ATTEMPTS");
    }

    if (String(otpRecord.otp) !== otp) {
      await OTP.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      const remaining = ADMIN_RESET_MAX_ATTEMPTS - ((Number(otpRecord.attempts) || 0) + 1);
      return error(res, `Invalid OTP. ${Math.max(0, remaining)} attempt(s) remaining.`, 400, "OTP_INVALID");
    }

    const salt = await bcrypt.genSalt(12);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    await OTP.deleteMany({ phone: admin.phone, purpose: "admin_password_reset" });

    return success(res, {}, "Password updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
