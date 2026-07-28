const ContactInquiry = require("../../../models/ContactInquiry");
const { sendEmail } = require("../../../services/emailService");
const { success, error } = require("../../../utils/apiResponse");

const CONTACT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value = "") => String(value || "").trim();

exports.submitContactForm = async (req, res) => {
  try {
    const name = normalizeText(req.body.name);
    const emailAddress = normalizeText(req.body.email).toLowerCase();
    const message = normalizeText(req.body.message);
    const source = normalizeText(req.body.source) || "Homepage Contact Form";

    if (!name) return error(res, "Name is required.", 400, "MISSING_NAME");
    if (!emailAddress) return error(res, "Email is required.", 400, "MISSING_EMAIL");
    if (!CONTACT_EMAIL_REGEX.test(emailAddress)) {
      return error(res, "Please enter a valid email address.", 400, "INVALID_EMAIL");
    }
    if (!message) return error(res, "Message is required.", 400, "MISSING_MESSAGE");
    if (message.length < 10) {
      return error(res, "Message should be at least 10 characters long.", 400, "MESSAGE_TOO_SHORT");
    }

    // Save contact inquiry to the database
    await ContactInquiry.create({
      name,
      email: emailAddress,
      message,
      source
    });

    const recipient = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL;
    if (!recipient) {
      return error(res, "Support email is not configured right now.", 500, "SUPPORT_EMAIL_NOT_CONFIGURED");
    }

    const submittedAt = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: process.env.APP_TIMEZONE || "Asia/Calcutta",
    });

    const mailResult = await sendEmail({
      to: recipient,
      subject: `New Contact Form Message from ${name}`,
      message:
`New contact form message received.

Name: ${name}
Email: ${emailAddress}
Source: ${source}
Submitted At: ${submittedAt}

Message:
${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2b2b2b;">
          <h2 style="margin-bottom: 16px;">New Contact Form Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${emailAddress}</p>
          <p><strong>Source:</strong> ${source}</p>
          <p><strong>Submitted At:</strong> ${submittedAt}</p>
          <div style="margin-top: 20px;">
            <p style="margin-bottom: 8px;"><strong>Message:</strong></p>
            <div style="white-space: pre-wrap; border: 1px solid #e5e5e5; padding: 12px; border-radius: 8px; background: #fafafa;">
              ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
            </div>
          </div>
        </div>
      `,
    });

    if (!mailResult) {
      return error(res, "We could not send your message right now. Please try again in a moment.", 500, "CONTACT_EMAIL_FAILED");
    }

    return success(res, {}, "Your message has been sent successfully.");
  } catch (err) {
    return error(res, err.message || "Failed to submit contact form.");
  }
};
