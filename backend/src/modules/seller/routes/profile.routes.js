const router = require("express").Router();
const profileController = require("../controllers/profile.controller");
const authenticate = require("../../../middlewares/authenticate");
const requireRole = require("../../../middlewares/requireRole");

const { sellerUpload } = require("../../../middlewares/uploadMiddleware");

router.get("/me", authenticate, requireRole("seller", { allowUnapproved: true }), profileController.getProfile);
router.put(
  "/me",
  authenticate,
  requireRole("seller", { allowUnapproved: true }),
  sellerUpload.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "shopLicense", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
    { name: "partnershipDeed", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "gst", maxCount: 1 },
    { name: "visitingCard", maxCount: 1 },
    { name: "diamondCertificate", maxCount: 1 }
  ]),
  profileController.updateProfile
);
router.delete("/me", authenticate, requireRole("seller"), profileController.deleteAccount);
router.put("/change-password", authenticate, requireRole("seller", { allowUnapproved: true }), profileController.changePassword);
router.get("/metal-pricing", authenticate, requireRole("seller"), profileController.getMetalPricing);
router.patch("/metal-pricing", authenticate, requireRole("seller"), profileController.updateMetalPricing);

module.exports = router;
