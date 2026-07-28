const router = require("express").Router();
const supportController = require("../controllers/support.controller");
const authenticate = require("../../../middlewares/authenticate");
const requireRole = require("../../../middlewares/requireRole");

router.use(authenticate, requireRole("admin"));
router.get("/upload-signature", supportController.getUploadSignature);
router.get("/", supportController.getAllTickets);
router.post("/:id/reply", supportController.addAdminReply);

// Contact Inquiries
router.get("/inquiries", supportController.getAllInquiries);
router.put("/inquiries/:id", supportController.updateInquiryStatus);
router.delete("/inquiries/:id", supportController.deleteInquiry);

// Seller Support Tickets
router.get("/seller", supportController.getAllSellerTickets);
router.post("/seller/:id/reply", supportController.addAdminSellerReply);

module.exports = router;
