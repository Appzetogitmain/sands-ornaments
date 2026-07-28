const mongoose = require("mongoose");

const contactInquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  source: { type: String, default: "Homepage Contact Form" },
  status: { type: String, enum: ["Unread", "Read"], default: "Unread", index: true }
}, { timestamps: true });

module.exports = mongoose.model("ContactInquiry", contactInquirySchema);
