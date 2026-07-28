/**
 * SocketEmitter Service
 * Centralized, safe socket emission helper.
 * All emit calls are wrapped in try/catch to ensure
 * a socket error never breaks a controller response.
 */
let _io = null;

const setIo = (io) => {
  _io = io;
};

const getIo = () => _io;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely emit an event to a room.
 * @param {string} room - e.g. "room:admin", "room:user_<id>", "room:seller_<id>"
 * @param {string} event - socket event name
 * @param {object} payload - data to send
 */
const emitToRoom = (room, event, payload) => {
  try {
    if (!_io) return;
    _io.to(room).emit(event, payload);
  } catch (err) {
    console.error(`[Socket] Failed to emit "${event}" to room "${room}":`, err.message);
  }
};

// ─── Domain Emitters ──────────────────────────────────────────────────────────

/**
 * Emit a new order event to admin and all relevant sellers.
 * Called after a successful COD order or Razorpay payment verification.
 */
const emitNewOrder = (order) => {
  if (!_io || !order) return;

  const payload = {
    orderId: order.orderId,
    _id: String(order._id),
    customerName: order.customerName,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt || new Date(),
  };

  // Notify admin room
  emitToRoom("room:admin", "new_order", payload);

  // Notify each seller room with their items
  const sellerCounts = new Map();
  for (const item of order.items || []) {
    const sid = item?.sellerId ? String(item.sellerId) : "";
    if (!sid) continue;
    sellerCounts.set(sid, (sellerCounts.get(sid) || 0) + (Number(item.quantity) || 0));
  }
  for (const [sellerId, itemCount] of sellerCounts.entries()) {
    emitToRoom(`room:seller_${sellerId}`, "new_order", {
      ...payload,
      itemCount,
    });
  }
};

/**
 * Emit an order status update to the owning user.
 * Called when admin/seller updates an order's status.
 */
const emitOrderStatusUpdate = (order) => {
  if (!_io || !order) return;

  const userId = order.userId ? String(order.userId) : null;
  if (!userId) return;

  const payload = {
    orderId: order.orderId,
    _id: String(order._id),
    status: order.status,
    shippingInfo: order.shippingInfo || null,
    updatedAt: new Date(),
  };

  emitToRoom(`room:user_${userId}`, "order_status_update", payload);
};

/**
 * Emit a low-stock warning to a specific seller.
 */
const emitLowStockAlert = (sellerId, productName, variantName, currentStock) => {
  if (!_io || !sellerId) return;
  emitToRoom(`room:seller_${sellerId}`, "low_stock_alert", {
    productName,
    variantName,
    currentStock,
    message: `Low stock: "${productName} (${variantName})" — only ${currentStock} left.`,
  });
};

/**
 * Emit a broadcast notification to all connected clients.
 */
const emitBroadcastNotification = (notification) => {
  try {
    if (!_io) return;
    _io.emit("broadcast_notification", notification);
  } catch (err) {
    console.error("[Socket] Failed to emit broadcast_notification:", err.message);
  }
};

/**
 * Emit a new support ticket notification to admins.
 */
const emitSupportTicketCreated = (ticket) => {
  if (!_io || !ticket) return;
  emitToRoom("room:admin", "support_ticket_created", ticket);
};

/**
 * Emit a support chat message to the user room and admin room.
 */
const emitSupportMessage = (ticket, reply) => {
  if (!_io || !ticket || !reply) return;
  const payload = {
    ticketId: ticket.ticketId,
    _id: String(ticket._id),
    userId: String(ticket.userId),
    reply: {
      from: reply.from,
      text: reply.text,
      date: reply.date || new Date()
    },
    status: ticket.status
  };
  
  // Send to specific user
  emitToRoom(`room:user_${ticket.userId}`, "support_message", payload);
  // Send to admins
  emitToRoom("room:admin", "support_message", payload);
};

/**
 * Emit a new seller support ticket notification to admins.
 */
const emitSellerSupportTicketCreated = (ticket) => {
  if (!_io || !ticket) return;
  emitToRoom("room:admin", "seller_support_ticket_created", ticket);
};

/**
 * Emit a seller support chat message to the seller room and admin room.
 */
const emitSellerSupportMessage = (ticket, reply) => {
  if (!_io || !ticket || !reply) return;
  const payload = {
    ticketId: ticket.ticketId,
    _id: String(ticket._id),
    sellerId: String(ticket.sellerId),
    reply: {
      from: reply.from,
      text: reply.text,
      date: reply.date || new Date()
    },
    status: ticket.status
  };
  
  // Send to specific seller
  emitToRoom(`room:seller_${ticket.sellerId}`, "seller_support_message", payload);
  // Send to admins
  emitToRoom("room:admin", "seller_support_message", payload);
};

module.exports = {
  setIo,
  getIo,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitLowStockAlert,
  emitBroadcastNotification,
  emitSupportTicketCreated,
  emitSupportMessage,
  emitSellerSupportTicketCreated,
  emitSellerSupportMessage,
};
