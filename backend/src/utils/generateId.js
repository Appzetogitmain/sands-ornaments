const crypto = require("crypto");

/**
 * Characters safe for human reading and codes (no 0/O/1/I confusion)
 */
const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateOrderId  = () => {
  const len = 6;
  const segment = Array.from(crypto.randomBytes(len))
    .map((b) => SAFE_CHARS[b % SAFE_CHARS.length])
    .join("");
  return `ORD-${segment}`;
};
const generateReturnId = () => `RET-${Math.floor(100000 + Math.random() * 900000)}`;
const generateReplacementId = () => `REP-${Math.floor(100000 + Math.random() * 900000)}`;
const generateReplId   = generateReplacementId;
const generateTicketId = () => `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

/**
 * Generates a unique payout-request reference.
 * Format: PAY-XXXXXXXX-<timestamp>
 */
const generatePayoutId = () => {
  const seg = Array.from(crypto.randomBytes(8))
    .map((b) => SAFE_CHARS[b % SAFE_CHARS.length])
    .join("");
  return `PAY-${seg}-${Date.now()}`;
};

/**
 * Generates a unique wallet-transaction reference.
 * Format: TXN-XXXXXXXX-<timestamp>
 */
const generateTxnId = () => {
  const seg = Array.from(crypto.randomBytes(8))
    .map((b) => SAFE_CHARS[b % SAFE_CHARS.length])
    .join("");
  return `TXN-${seg}-${Date.now()}`;
};

/**
 * Generates a cryptographically unique gift card code.
 * Format: SANDS-XXXX-XXXX-XXXX  (alphanumeric, uppercase, no ambiguous chars)
 */
const generateGiftCardCode = () => {
  const segment = (len) =>
    Array.from(crypto.randomBytes(len))
      .map((b) => SAFE_CHARS[b % SAFE_CHARS.length])
      .join("");
  return `SANDS-${segment(4)}-${segment(4)}-${segment(4)}`;
};

module.exports = {
  generateOrderId,
  generateReturnId,
  generateReplId,
  generateReplacementId,
  generateTicketId,
  generateGiftCardCode,
  generatePayoutId,
  generateTxnId,
};

