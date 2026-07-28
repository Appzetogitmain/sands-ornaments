const SupportTicket = require("../../../models/SupportTicket");
const ContactInquiry = require("../../../models/ContactInquiry");
const SellerSupportTicket = require("../../../models/SellerSupportTicket");
const { success, error } = require("../../../utils/apiResponse");
const socketEmitter = require("../../../services/socketEmitter");
const { generateUploadSignature } = require("../../../utils/cloudinaryUtils");

exports.getUploadSignature = async (req, res) => {
  try {
    const signatureData = generateUploadSignature("sands-ornaments/support");
    return success(res, signatureData, "Upload signature generated");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await SupportTicket.find(query)
      .populate("userId", "name phone email")
      .sort({ updatedAt: -1 });
    return success(res, { tickets }, "Tickets retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.addAdminReply = async (req, res) => {
  try {
    const { message, status, attachments } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return error(res, "Ticket not found", 404);

    const newReply = { from: "admin", text: message, attachments: attachments || [], date: new Date() };
    ticket.replies.push(newReply);
    
    if (status) ticket.status = status;
    else ticket.status = "In Progress";
    
    await ticket.save();

    // Emit support message event to user and admin rooms
    socketEmitter.emitSupportMessage(ticket, newReply);

    return success(res, { ticket }, "Reply added and status updated");
  } catch (err) { return error(res, err.message); }
};

exports.getAllInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const inquiries = await ContactInquiry.find(query).sort({ createdAt: -1 });
    return success(res, { inquiries }, "Contact inquiries retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Read", "Unread"].includes(status)) {
      return error(res, "Invalid status", 400);
    }
    const inquiry = await ContactInquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!inquiry) return error(res, "Inquiry not found", 404);
    return success(res, { inquiry }, "Inquiry status updated");
  } catch (err) { return error(res, err.message); }
};

exports.deleteInquiry = async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) return error(res, "Inquiry not found", 404);
    return success(res, {}, "Inquiry deleted successfully");
  } catch (err) { return error(res, err.message); }
};

exports.getAllSellerTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const tickets = await SellerSupportTicket.find(query).sort({ updatedAt: -1 });
    return success(res, { tickets }, "Seller tickets retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.addAdminSellerReply = async (req, res) => {
  try {
    const { message, status, attachments } = req.body;
    if (!message && (!attachments || attachments.length === 0)) {
      return error(res, "Message or attachment is required", 400);
    }

    const ticket = await SellerSupportTicket.findById(req.params.id);
    if (!ticket) return error(res, "Ticket not found", 404);

    const newReply = { from: "admin", text: message || "", attachments: attachments || [], date: new Date() };
    ticket.replies.push(newReply);

    if (status) ticket.status = status;
    else ticket.status = "In Progress";

    await ticket.save();

    // Emit support message event to seller and admin rooms
    socketEmitter.emitSellerSupportMessage(ticket, newReply);

    return success(res, { ticket }, "Reply added and status updated");
  } catch (err) { return error(res, err.message); }
};
