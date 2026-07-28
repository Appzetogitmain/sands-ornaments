const mongoose = require("mongoose");

const sellerSupportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", index: true },
  sellerName: String,
  sellerEmail: String,
  subject: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["Payout Issue", "Inventory/Catalog", "Commission Dispute", "Verification/KYC", "General Inquiry", "Other"],
    required: true
  },
  message: { type: String },
  attachments: [{
    url: String,
    type: { type: String, enum: ["image", "video"] },
    name: String
  }],
  status: { type: String, enum: ["Open", "In Progress", "Resolved", "Closed"], default: "Open", index: true },
  replies: [{
    from: { type: String, enum: ["seller", "admin"] },
    text: String,
    attachments: [{
      url: String,
      type: { type: String, enum: ["image", "video"] },
      name: String
    }],
    date: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model("SellerSupportTicket", sellerSupportTicketSchema);
