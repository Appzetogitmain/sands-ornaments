const router = require("express").Router();
const orderController = require("../controllers/order.controller");
const authenticate = require("../../../middlewares/authenticate");
const requireRole = require("../../../middlewares/requireRole");

router.use(authenticate, requireRole("seller"));

router.get("/", orderController.getMyOrders);
router.get("/:id/invoice", require("../controllers/invoice.controller").getInvoice);
router.post("/:id/invoice", require("../controllers/invoice.controller").issueInvoice);
router.get("/:id", orderController.getMyOrderDetail);
router.patch("/:orderId/status", orderController.updateOrderStatus);

module.exports = router;
