const router = require("express").Router();
const {
  otpLimiter,
  verifyOtpLimiter,
  sellerLoginLimiter,
  sellerRegisterLimiter,
  sellerResetOtpLimiter,
  sellerResetVerifyLimiter,
} = require("../../../middlewares/rateLimiter");
const userAuth   = require("../controllers/userAuth.controller");
const adminAuth  = require("../controllers/adminAuth.controller");
const sellerAuth = require("../controllers/sellerAuth.controller");
const { sellerUpload } = require("../../../middlewares/uploadMiddleware");
const validate = require("../../../middlewares/validate");
const {
  sendOtpSchema,
  verifyOtpSchema,
  adminLoginSchema,
  sellerRegisterSchema,
  sellerLoginSchema,
  sellerSendResetOtpSchema,
  sellerResetPasswordSchema,
  sellerSendResetMobileOtpSchema,
  sellerResetPasswordMobileSchema,
  adminSendResetOtpSchema,
  adminResetPasswordSchema,
  adminSendResetMobileOtpSchema,
  adminResetPasswordMobileSchema,
} = require("../validators/auth.validator");

// User auth
router.post("/send-otp",    otpLimiter, validate(sendOtpSchema), userAuth.sendOtp);
router.post("/verify-otp",  verifyOtpLimiter, validate(verifyOtpSchema), userAuth.verifyOtp);
router.get("/me",           require("../../../middlewares/authenticate"), userAuth.getMe);
router.post("/logout",      userAuth.logout);

// Admin auth
router.post("/admin/login",  validate(adminLoginSchema), adminAuth.login);
router.post("/admin/logout", adminAuth.logout);
router.post("/admin/send-reset-otp", validate(adminSendResetOtpSchema), adminAuth.sendResetOtp);
router.post("/admin/reset-password", validate(adminResetPasswordSchema), adminAuth.resetPassword);
router.post("/admin/send-reset-mobile-otp", validate(adminSendResetMobileOtpSchema), adminAuth.sendResetMobileOtp);
router.post("/admin/reset-password-mobile", validate(adminResetPasswordMobileSchema), adminAuth.resetPasswordViaMobile);

// Seller auth
router.post(
  "/seller/register",
  sellerRegisterLimiter,
  sellerUpload.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "shopLicense", maxCount: 1 },
    { name: "certificate", maxCount: 1 }
  ]),
  validate(sellerRegisterSchema),
  sellerAuth.register
);
router.post("/seller/login",    sellerLoginLimiter, validate(sellerLoginSchema), sellerAuth.login);
router.post("/seller/logout",   sellerAuth.logout);
router.post("/seller/send-reset-otp", sellerResetOtpLimiter, validate(sellerSendResetOtpSchema), sellerAuth.sendResetOtp);
router.post("/seller/reset-password", sellerResetVerifyLimiter, validate(sellerResetPasswordSchema), sellerAuth.resetPassword);
router.post("/seller/send-reset-mobile-otp", sellerResetOtpLimiter, validate(sellerSendResetMobileOtpSchema), sellerAuth.sendResetMobileOtp);
router.post("/seller/reset-password-mobile", sellerResetVerifyLimiter, validate(sellerResetPasswordMobileSchema), sellerAuth.resetPasswordViaMobile);

module.exports = router;

