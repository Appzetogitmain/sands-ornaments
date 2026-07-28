const SellerSupportTicket = require("../../../models/SellerSupportTicket");
const Seller = require("../../../models/Seller");
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

exports.createTicket = async (req, res) => {
  try {
    const { subject, category, message, attachments } = req.body;
    if (!subject || !category || (!message && (!attachments || attachments.length === 0))) {
      return error(res, "Subject, category, and message/attachments are required.", 400);
    }

    const seller = await Seller.findById(req.user.userId);
    if (!seller) return error(res, "Seller not found", 404);

    const ticketId = `STK-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticket = await SellerSupportTicket.create({
      ticketId,
      sellerId: req.user.userId,
      sellerName: seller.shopName || seller.fullName || "Merchant",
      sellerEmail: seller.email,
      subject,
      category,
      message: message || "",
      attachments: attachments || [],
      replies: [{ from: "seller", text: message || "", attachments: attachments || [] }],
      status: "Open"
    });

    // Emit real-time socket notification to admin
    socketEmitter.emitSellerSupportTicketCreated(ticket);

    return success(res, { ticket }, "Support ticket created successfully", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SellerSupportTicket.find({ sellerId: req.user.userId }).sort({ updatedAt: -1 });
    return success(res, { tickets }, "Tickets retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.addReply = async (req, res) => {
  try {
    const { message, attachments } = req.body;
    if (!message && (!attachments || attachments.length === 0)) {
      return error(res, "Message or attachment is required", 400);
    }

    const ticket = await SellerSupportTicket.findOne({ _id: req.params.id, sellerId: req.user.userId });
    if (!ticket) return error(res, "Ticket not found", 404);

    const newReply = { from: "seller", text: message || "", attachments: attachments || [], date: new Date() };
    ticket.replies.push(newReply);
    ticket.status = "Open"; // reset to Open so admins see it as pending
    await ticket.save();

    // Emit support message event via WebSockets
    socketEmitter.emitSellerSupportMessage(ticket, newReply);

    return success(res, { ticket }, "Reply added successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
