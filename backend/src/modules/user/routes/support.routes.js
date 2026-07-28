const router = require("express").Router();
const supportController = require("../controllers/support.controller");
const authenticate = require("../../../middlewares/authenticate");
const requireRole = require("../../../middlewares/requireRole");
const requireActiveUser = require("../../../middlewares/requireActiveUser");

router.use(authenticate, requireRole("user", "seller", "admin"), requireActiveUser);
router.get("/upload-signature", supportController.getUploadSignature);
router.get("/", supportController.getMyTickets);
router.post("/", supportController.createTicket);
router.post("/:id/reply", supportController.addReply);

module.exports = router;
