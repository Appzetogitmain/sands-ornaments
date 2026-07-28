/**
 * 📧 Email Templates — Sands Jewels
 * All transactional HTML email templates live here.
 */
"use strict";

const BRAND_COLOR = "#C8A882";
const BRAND_DARK = "#1a1a1a";
const BRAND_LIGHT = "#FDF5F6";

// ── Base layout ───────────────────────────────────────────────────────────────
const layout = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_DARK};padding:28px 40px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">Sands Jewels</span>
            <p style="color:${BRAND_COLOR};margin:4px 0 0;font-size:12px;letter-spacing:3px;">FINE JEWELLERY</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 28px;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f4ef;padding:24px 40px;text-align:center;border-top:1px solid #ece8e1;">
            <p style="margin:0;font-size:12px;color:#888;">© ${new Date().getFullYear()} Sands Jewels. All rights reserved.</p>
            <p style="margin:6px 0 0;font-size:12px;color:#aaa;">
              Questions? <a href="mailto:support@sandsjewels.com" style="color:${BRAND_COLOR};text-decoration:none;">support@sandsjewels.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:${BRAND_DARK};color:#fff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.5px;">${text}</a>`;

const badge = (text, color = BRAND_COLOR) =>
  `<span style="background:${color};color:#fff;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;">${text}</span>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #ece8e1;margin:24px 0;"/>`;

const rupees = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const itemsTable = (items = []) => {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0ebe4;">
        <span style="font-size:14px;color:${BRAND_DARK};font-weight:600;">${item.name || "Product"}</span>
        ${item.variantName ? `<br/><span style="font-size:12px;color:#888;">${item.variantName}</span>` : ""}
        ${item.sku ? `<br/><span style="font-size:11px;color:#bbb;">SKU: ${item.sku}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f0ebe4;text-align:center;font-size:13px;color:#555;">×${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0ebe4;text-align:right;font-size:14px;font-weight:600;color:${BRAND_DARK};">${rupees(item.price * item.quantity)}</td>
    </tr>`,
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;color:#999;font-weight:600;text-transform:uppercase;padding-bottom:8px;">Item</th>
          <th style="text-align:center;font-size:11px;color:#999;font-weight:600;text-transform:uppercase;padding-bottom:8px;">Qty</th>
          <th style="text-align:right;font-size:11px;color:#999;font-weight:600;text-transform:uppercase;padding-bottom:8px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const summaryRow = (label, value, bold = false) =>
  `<tr>
    <td style="padding:4px 0;font-size:13px;color:${bold ? BRAND_DARK : "#666"};">${label}</td>
    <td style="padding:4px 0;font-size:13px;color:${BRAND_DARK};text-align:right;${bold ? "font-weight:700;" : ""}">${value}</td>
  </tr>`;

// ── Templates ─────────────────────────────────────────────────────────────────

/**
 * 1. Order Confirmation (COD)
 */
const orderConfirmation = ({ order, userName }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Order Confirmed! 🎉</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, your order has been placed successfully.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${BRAND_DARK};">${order.orderId}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#888;">Payment: ${badge(order.paymentMethod === "cod" ? "Cash on Delivery" : "Prepaid", "#4CAF50")}</p>
    </div>

    ${itemsTable(order.items)}
    ${divider()}

    <table width="100%" cellpadding="0" cellspacing="0">
      ${summaryRow("Subtotal", rupees(order.subtotal || order.total))}
      ${order.discount > 0 ? summaryRow("Discount", `- ${rupees(order.discount)}`) : ""}
      ${order.shippingCharge > 0 ? summaryRow("Shipping", rupees(order.shippingCharge)) : summaryRow("Shipping", "FREE")}
      ${order.taxAmount > 0 ? summaryRow("GST", rupees(order.taxAmount)) : ""}
      ${summaryRow("<strong>Total</strong>", `<strong>${rupees(order.total)}</strong>`, true)}
    </table>

    ${divider()}

    <p style="font-size:14px;color:#555;margin:0 0 8px;"><strong>Shipping to:</strong></p>
    <p style="font-size:13px;color:#666;margin:0;line-height:1.7;">
      ${[order.shippingAddress?.firstName, order.shippingAddress?.lastName].filter(Boolean).join(" ")}<br/>
      ${order.shippingAddress?.flatNo}, ${order.shippingAddress?.area}<br/>
      ${order.shippingAddress?.city}, ${order.shippingAddress?.state} – ${order.shippingAddress?.pincode}
    </p>

    ${divider()}
    <div style="text-align:center;padding:8px 0;">
      ${btn("Track Your Order", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/order-tracking/${order._id}`)}
    </div>`;

  return layout(`Order Confirmed — ${order.orderId}`, body);
};

/**
 * 2. Payment Success (Razorpay)
 */
const paymentSuccess = ({ order, userName, paymentId }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Payment Successful! ✅</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, we've received your payment and your order is being processed.</p>

    <div style="background:#f0faf0;border:1px solid #c3e6c3;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;font-weight:600;">Order ID</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${BRAND_DARK};">${order.orderId}</p>
          </td>
          <td style="text-align:right;">
            <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;font-weight:600;">Amount Paid</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#2e7d32;">${rupees(order.total)}</p>
          </td>
        </tr>
      </table>
      ${paymentId ? `<p style="margin:12px 0 0;font-size:12px;color:#aaa;">Payment Ref: ${paymentId}</p>` : ""}
    </div>

    ${itemsTable(order.items)}
    ${divider()}
    <div style="text-align:center;padding:8px 0;">
      ${btn("View Order Details", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/order-tracking/${order._id}`)}
    </div>`;

  return layout(`Payment Confirmed — ${order.orderId}`, body);
};

/**
 * 3. Order Shipped
 */
const orderShipped = ({
  order,
  userName,
  trackingId,
  courier,
  trackingUrl,
}) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Your Order is on the Way! 🚚</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, great news — your order has been shipped!</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Order ID</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${BRAND_DARK};">${order.orderId}</p></td>
          <td style="text-align:right;">
            <p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Courier</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${BRAND_DARK};">${courier || "Standard Delivery"}</p>
          </td>
        </tr>
      </table>
      ${trackingId ? `<p style="margin:12px 0 0;font-size:13px;color:#555;">AWB / Tracking #: <strong>${trackingId}</strong></p>` : ""}
    </div>

    ${divider()}
    <div style="text-align:center;padding:8px 0;">
      ${btn("Track Shipment", trackingUrl || `${process.env.CLIENT_URL || "https://sandsjewels.com"}/order-tracking/${order._id}`)}
    </div>`;

  return layout(`Your Order is Shipped — ${order.orderId}`, body);
};

/**
 * 4. Order Cancelled
 */
const orderCancelled = ({ order, userName, reason }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Order Cancelled</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, your order <strong>${order.orderId}</strong> has been cancelled.</p>
    ${reason ? `<p style="background:#fff3f3;border-left:4px solid #e57373;padding:12px 16px;border-radius:4px;font-size:13px;color:#555;">Reason: ${reason}</p>` : ""}
    ${order.paymentStatus === "paid" ? `<p style="font-size:14px;color:#2e7d32;font-weight:600;">A refund of ${rupees(order.total)} will be initiated within 5–7 business days.</p>` : ""}
    ${divider()}
    <div style="text-align:center;">
      ${btn("Continue Shopping", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/shop`)}
    </div>`;

  return layout(`Order Cancelled — ${order.orderId}`, body);
};

/**
 * 5. Return Request Submitted
 */
const returnRequested = ({ returnReq, userName, order }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Return Request Received</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, we've received your return request for order <strong>${order?.orderId || ""}</strong>.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;">Return ID</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${BRAND_DARK};">${returnReq.returnId}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#555;">Status: ${badge("Pending Review", "#FF9800")}</p>
      ${returnReq.evidence?.reason ? `<p style="margin:8px 0 0;font-size:13px;color:#555;">Reason: ${returnReq.evidence.reason}</p>` : ""}
    </div>

    <p style="font-size:13px;color:#666;line-height:1.7;">Our team will review your request within <strong>24–48 hours</strong>. You will receive an email once a decision is made.</p>
    ${divider()}
    <div style="text-align:center;">
      ${btn("View Return Status", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/return/${returnReq._id}`)}
    </div>`;

  return layout(`Return Request — ${returnReq.returnId}`, body);
};

/**
 * 6. Return Status Update
 */
const returnStatusUpdate = ({
  returnReq,
  userName,
  newStatus,
  note,
  order,
}) => {
  const statusColors = {
    Approved: "#4CAF50",
    Rejected: "#e57373",
    "Pickup Scheduled": "#2196F3",
    "Refund Initiated": "#9C27B0",
    Refunded: "#009688",
    Closed: "#888",
  };
  const color = statusColors[newStatus] || BRAND_COLOR;

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Return Update</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, your return request has been updated.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Return ID</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${BRAND_DARK};">${returnReq.returnId}</p></td>
          <td style="text-align:right;"><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">New Status</p>
              <p style="margin:4px 0 0;">${badge(newStatus, color)}</p></td>
        </tr>
      </table>
      ${note ? `<p style="margin:12px 0 0;font-size:13px;color:#555;border-top:1px solid #ece8e1;padding-top:12px;">Note from team: ${note}</p>` : ""}
      ${newStatus === "Refunded" && returnReq.refund?.amount ? `<p style="margin:12px 0 0;font-size:14px;color:#2e7d32;font-weight:600;">Refund of ${rupees(returnReq.refund.amount)} has been initiated.</p>` : ""}
    </div>
    ${divider()}
    <div style="text-align:center;">
      ${btn("View Return Details", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/return/${returnReq._id}`)}
    </div>`;

  return layout(`Return ${newStatus} — ${returnReq.returnId}`, body);
};

/**
 * 7. Seller — New Order Notification
 */
const sellerNewOrder = ({ order, sellerName, sellerItems }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">New Order Received! 🛍️</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${sellerName || "there"}, you have a new order waiting to be processed.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Order ID</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${BRAND_DARK};">${order.orderId}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#555;">Payment: ${badge(order.paymentStatus === "paid" ? "Paid" : "Cash on Delivery", order.paymentStatus === "paid" ? "#4CAF50" : "#FF9800")}</p>
    </div>

    <p style="font-size:14px;font-weight:600;color:${BRAND_DARK};margin:0 0 12px;">Your Items in this Order:</p>
    ${itemsTable(sellerItems)}

    ${divider()}
    <p style="font-size:13px;color:#666;">Please prepare and ship this order at the earliest. Log in to your seller dashboard to create a shipment.</p>
    <div style="text-align:center;margin-top:20px;">
      ${btn("Process Order", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/seller/order-details/${order._id}`)}
    </div>`;

  return layout(`New Order — ${order.orderId}`, body);
};

/**
 * 8. Seller — Return Notif
 */
const sellerReturnNotif = ({ order, sellerName, item, returnId }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Return Requested for Your Item</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${sellerName || "there"}, a customer has requested a return for an item from order <strong>${order?.orderId || ""}</strong>.</p>

    <div style="background:#fff8f0;border:1px solid #ffe0b2;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#555;"><strong>Item:</strong> ${item?.name || "N/A"}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#555;"><strong>Return ID:</strong> ${returnId}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#555;"><strong>Reason:</strong> ${item?.reason || "Not specified"}</p>
    </div>

    <p style="font-size:13px;color:#666;">The admin team is reviewing this return. You will be notified of further updates.</p>
    ${divider()}
    <div style="text-align:center;">
      ${btn("View in Dashboard", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/seller/returns`)}
    </div>`;

  return layout(`Return Request — Order ${order?.orderId}`, body);
};

/**
 * 9. Welcome Email (new user registration)
 */
const welcomeEmail = ({ userName }) => {
  const body = `
    <h2 style="margin:0 0 4px;font-size:24px;color:${BRAND_DARK};">Welcome to Sands Jewels ✨</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, we're thrilled to have you join our community of fine jewellery lovers.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="font-size:28px;margin:0;">💍</p>
      <p style="font-size:16px;color:${BRAND_DARK};font-weight:600;margin:8px 0 4px;">Discover Timeless Elegance</p>
      <p style="font-size:13px;color:#888;margin:0;">Gold · Silver · Diamond · Handcrafted Jewellery</p>
    </div>

    <div style="text-align:center;">
      ${btn("Start Shopping", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/shop`)}
    </div>`;

  return layout("Welcome to Sands Jewels!", body);
};

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * 10. Gift Card Delivery — sent to the RECIPIENT
 */
const giftCardDelivery = ({ giftCard }) => {
  const shopUrl = process.env.CLIENT_URL || "https://sandsjewels.com";
  const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">You've Received a Gift! 🎁</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">
      <strong>${giftCard.senderName}</strong> has sent you a Sands Jewels E-Gift Card.
      ${giftCard.personalMessage ? `<br/><em style="color:#888;">"${giftCard.personalMessage}"</em>` : ""}
    </p>

    <div style="background:linear-gradient(135deg,#1a1a1a 0%,#3d1a24 100%);border-radius:16px;padding:36px 32px;text-align:center;margin-bottom:28px;">
      <p style="margin:0;font-size:11px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:3px;">Sands Jewels</p>
      <p style="margin:8px 0 24px;font-size:12px;color:#aaa;letter-spacing:1px;">E-Gift Card</p>
      <p style="margin:0;font-size:13px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">Card Value</p>
      <p style="margin:4px 0 28px;font-size:42px;font-weight:700;color:#fff;letter-spacing:-1px;">${rupees(giftCard.value)}</p>
      <div style="background:rgba(255,255,255,0.08);border:2px dashed rgba(255,255,255,0.2);border-radius:10px;padding:18px 24px;display:inline-block;">
        <p style="margin:0 0 4px;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">Your Gift Card Code</p>
        <p style="margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:4px;font-family:monospace;">${giftCard.code}</p>
      </div>
    </div>

    <p style="font-size:14px;color:#555;text-align:center;margin:0 0 24px;line-height:1.7;">
      Hi <strong>${giftCard.recipientName}</strong>, use the code above at checkout to redeem your gift.<br/>
      ${giftCard.expiresAt ? `Valid until <strong>${new Date(giftCard.expiresAt).toLocaleDateString("en-IN")}</strong>.` : "This card has <strong>no expiry</strong> — use it whenever you're ready!"}
    </p>

    ${divider()}

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:${BRAND_DARK};text-transform:uppercase;letter-spacing:1px;">How to Redeem</p>
      <ol style="margin:10px 0 0;padding-left:20px;font-size:13px;color:#555;line-height:2;">
        <li>Visit <a href="${shopUrl}/shop" style="color:${BRAND_COLOR};text-decoration:none;">sandsjewels.com</a> and add items to your bag</li>
        <li>At checkout, enter your gift card code in the "Gift Card" field</li>
        <li>The card balance will be deducted from your order total</li>
      </ol>
    </div>

    <div style="text-align:center;padding:8px 0;">
      ${btn("Start Shopping", `${shopUrl}/shop`)}
    </div>`;

  return layout(`Your Sands Gift Card — ${rupees(giftCard.value)}`, body);
};

/**
 * 11. Gift Card Purchase Confirmation — sent to the BUYER
 */
const giftCardPurchaseConfirmation = ({ giftCard, buyerName }) => {
  const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const shopUrl = process.env.CLIENT_URL || "https://sandsjewels.com";

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Gift Card Sent Successfully! ✅</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${buyerName || "there"}, your Sands E-Gift Card has been delivered to <strong>${giftCard.recipientEmail}</strong>.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Recipient</p>
              <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:${BRAND_DARK};">${giftCard.recipientName}</p></td>
          <td style="text-align:right;"><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Card Value</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${BRAND_DARK};">${rupees(giftCard.value)}</p></td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#888;border-top:1px solid #ece8e1;padding-top:12px;">Code: <strong style="font-family:monospace;letter-spacing:2px;">${giftCard.code}</strong></p>
      ${giftCard.personalMessage ? `<p style="margin:6px 0 0;font-size:12px;color:#aaa;">Message: "${giftCard.personalMessage}"</p>` : ""}
    </div>

    ${divider()}
    <div style="text-align:center;">
      ${btn("Send Another Gift", `${shopUrl}/gift-cards`)}
    </div>`;

  return layout("Gift Card Sent — Sands Jewels", body);
};

module.exports = {
  orderConfirmation,
  paymentSuccess,
  orderShipped,
  orderCancelled,
  returnRequested,
  returnStatusUpdate,
  sellerNewOrder,
  sellerReturnNotif,
  welcomeEmail,
  giftCardDelivery,
  giftCardPurchaseConfirmation,
  replacementRequested,
  replacementStatusUpdate,
  sellerReplacementNotif,
};

/**
 * 12. Replacement Request Submitted
 */
function replacementRequested({ replacementReq, userName, order }) {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Replacement Request Received</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, we've received your replacement request for order <strong>${order?.orderId || ""}</strong>.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;">Replacement ID</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${BRAND_DARK};">${replacementReq.replacementId}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#555;">Status: ${badge("Pending Review", "#FF9800")}</p>
      ${replacementReq.evidence?.reason ? `<p style="margin:8px 0 0;font-size:13px;color:#555;">Reason: ${replacementReq.evidence.reason}</p>` : ""}
    </div>

    <p style="font-size:13px;color:#666;line-height:1.7;">Our team will review your replacement request within <strong>24–48 hours</strong>. You will receive an email once a decision is made.</p>
    ${divider()}
    <div style="text-align:center;">
      ${btn("View Replacement Status", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/profile/replacements`)}
    </div>`;

  return layout(`Replacement Request — ${replacementReq.replacementId}`, body);
}

/**
 * 13. Replacement Status Update
 */
function replacementStatusUpdate({
  replacementReq,
  userName,
  newStatus,
  note,
  order,
}) {
  const statusColors = {
    Approved: "#4CAF50",
    Rejected: "#e57373",
    "Pickup Scheduled": "#2196F3",
    "Pickup Completed": "#3F51B5",
    "Replacement Shipped": "#9C27B0",
    Delivered: "#009688",
    Closed: "#888",
  };
  const color = statusColors[newStatus] || BRAND_COLOR;

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Replacement Update</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${userName || "there"}, your replacement request has been updated.</p>

    <div style="background:${BRAND_LIGHT};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Replacement ID</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${BRAND_DARK};">${replacementReq.replacementId}</p></td>
          <td style="text-align:right;"><p style="margin:0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">New Status</p>
              <p style="margin:4px 0 0;">${badge(newStatus, color)}</p></td>
        </tr>
      </table>
      ${note ? `<p style="margin:12px 0 0;font-size:13px;color:#555;border-top:1px solid #ece8e1;padding-top:12px;">Note from team: ${note}</p>` : ""}
      ${newStatus === "Replacement Shipped" && replacementReq.shipment?.awb ? `<p style="margin:12px 0 0;font-size:13px;color:#555;">Tracking AWB: <strong>${replacementReq.shipment.awb}</strong> (${replacementReq.shipment.partner || "Courier"})</p>` : ""}
    </div>
    ${divider()}
    <div style="text-align:center;">
      ${btn("View Replacement Details", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/profile/replacements`)}
    </div>`;

  return layout(`Replacement ${newStatus} — ${replacementReq.replacementId}`, body);
}

/**
 * 14. Seller — Replacement Notif
 */
function sellerReplacementNotif({ order, sellerName, item, replacementId }) {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:${BRAND_DARK};">Replacement Requested for Your Item</h2>
    <p style="color:#666;margin:0 0 24px;font-size:15px;">Hi ${sellerName || "there"}, a customer has requested a replacement for an item from order <strong>${order?.orderId || ""}</strong>.</p>

    <div style="background:#fff8f0;border:1px solid #ffe0b2;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#555;"><strong>Item:</strong> ${item?.name || "N/A"}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#555;"><strong>Replacement ID:</strong> ${replacementId}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#555;"><strong>Reason:</strong> ${item?.reason || "Not specified"}</p>
    </div>

    <p style="font-size:13px;color:#666;">The admin team is reviewing this replacement request. You will be notified of further updates.</p>
    ${divider()}
    <div style="text-align:center;">
      ${btn("View in Dashboard", `${process.env.CLIENT_URL || "https://sandsjewels.com"}/seller/replacements`)}
    </div>`;

  return layout(`Replacement Request — Order ${order?.orderId}`, body);
}
