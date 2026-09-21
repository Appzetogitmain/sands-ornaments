const router = require("express").Router();
const sellerController = require("../controllers/seller.controller");
const authenticate = require("../../../middlewares/authenticate");
const requireRole = require("../../../middlewares/requireRole");

router.use(authenticate, requireRole("admin"));

router.get("/", sellerController.getSellers);
router.get("/:id", sellerController.getSellerDetail);
router.patch("/:id/status", sellerController.updateSellerStatus);
router.delete("/:id", sellerController.deleteSeller);

module.exports = router;
