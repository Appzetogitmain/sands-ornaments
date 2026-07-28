const router = require("express").Router();
const controller = require("../controllers/directSale.controller");
const authenticate = require("../../../middlewares/authenticate");
const requireRole = require("../../../middlewares/requireRole");

// Require admin authentication
router.use(authenticate, requireRole("admin"));

router.get("/", controller.list);
router.post("/preview", controller.preview);
router.post("/confirm", controller.confirm);
router.patch("/:id/void", controller.void);

module.exports = router;
