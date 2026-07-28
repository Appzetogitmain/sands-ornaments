const SupportTicket = require("../../../models/SupportTicket");
const { generateTicketId } = require("../../../utils/generateId");
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
    const { subject, category, orderId, message, userName, userEmail, attachments } = req.body;
    
    if (!subject || (!message && (!attachments || attachments.length === 0))) {
      return error(res, "Subject and either message or attachment are required.", 400);
    }

    const ticket = await SupportTicket.create({
      ticketId: generateTicketId(),
      userId: req.user.userId,
      userName: userName || req.user.name,
      userEmail: userEmail || req.user.email,
      subject,
      category: category || "Other",
      orderId: orderId || "",
      message: message || "",
      attachments: attachments || [],
      replies: [{ from: "user", text: message || "", attachments: attachments || [] }],
      status: "Open"
    });

    // Emit real-time notification to admins
    socketEmitter.emitSupportTicketCreated(ticket);

    return success(res, { ticket }, "Support ticket created", 201);
  } catch (err) { return error(res, err.message); }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
    return success(res, { tickets }, "Tickets retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.addReply = async (req, res) => {
  try {
    const { message, attachments } = req.body;
    if (!message && (!attachments || attachments.length === 0)) {
      return error(res, "Message or attachment is required", 400);
    }
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!ticket) return error(res, "Ticket not found", 404);

    const newReply = { from: "user", text: message || "", attachments: attachments || [], date: new Date() };
    ticket.replies.push(newReply);
    ticket.status = "Open";
    await ticket.save();

    // Emit support message event to user and admin rooms
    socketEmitter.emitSupportMessage(ticket, newReply);

    return success(res, { ticket }, "Reply added");
  } catch (err) { return error(res, err.message); }
};
