const router = require("express").Router();
const requireRole = require("../../../middlewares/requireRole");

// Profile route allows unapproved access for onboarding completion
router.use("/profile",   require("./profile.routes"));

// All other seller routes require standard approved role status
router.use(requireRole("seller"));

router.use("/products",  require("./product.routes"));
router.use("/orders",    require("./order.routes"));
router.use("/dashboard", require("./dashboard.routes"));
router.use("/analytics", require("./analytics.routes"));
router.use("/customers", require("./customer.routes"));
router.use("/returns",   require("./return.routes"));
router.use("/replacements", require("./replacement.routes"));
router.use("/inventory", require("./inventory.routes"));
router.use("/direct-sales", require("./directSale.routes"));
router.use("/shipping",  require("./shipping.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/pickup-locations", require("./pickupLocation.routes"));
router.use("/commission", require("./commission.routes"));
router.use("/payout",     require("./payout.routes"));
router.use("/support",    require("./support.routes"));

module.exports = router;
