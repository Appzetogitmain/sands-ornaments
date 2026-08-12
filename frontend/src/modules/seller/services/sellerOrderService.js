import api from '../../../services/api';

const getPrimarySellerItem = (order) => {
    const sellerItems = Array.isArray(order?.sellerItems) ? order.sellerItems : [];
    return sellerItems[0] || null;
};

const getPrimaryItemImage = (item) =>
    item?.image ||
    item?.productId?.images?.[0] ||
    item?.productId?.image ||
    '';

const mapSellerOrder = (order) => {
    const primaryItem = getPrimarySellerItem(order);
    return {
        ...order,
        id: order._id,
        orderStatus: order.status,
        orderDate: order.createdAt,
        totalAmount: Number(order.total || 0),
        sellerSubtotal: Number(order.sellerSubtotal || 0),
        quantity: (order.sellerItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        product: primaryItem?.name || primaryItem?.productId?.name || 'Seller Order',
        productImage: getPrimaryItemImage(primaryItem),
        primaryItem,
    };
};

const normalizeReturn = (returnReq) => {
    if (!returnReq) return null;
    const primaryItem = Array.isArray(returnReq.items) ? returnReq.items[0] : null;
    return {
        ...returnReq,
        id: returnReq._id,
        returnDisplayId: returnReq.returnId || returnReq._id,
        orderDisplayId: returnReq.orderId?.orderId || returnReq.orderId || 'N/A',
        product: primaryItem?.name || 'Returned item',
        barcode: primaryItem?.sku || 'N/A',
        quantity: Number(primaryItem?.qty || 0),
        returnReason: returnReq.evidence?.reason || primaryItem?.reason || 'Not specified',
        comment: returnReq.evidence?.comment || '',
        createdAt: returnReq.createdAt || returnReq.requestDate,
        images: returnReq.evidence?.images || [],
        video360: returnReq.evidence?.video || '',
        customerName: returnReq.userId?.name || returnReq.customerName || 'Customer',
        customerEmail: returnReq.userId?.email || '',
        customerPhone: returnReq.userId?.phone || '',
        item: primaryItem,
        user: returnReq.userId,
        order: returnReq.orderId,
    };
};

const normalizeReplacement = (replacementReq) => {
    if (!replacementReq) return null;
    const primaryItem = Array.isArray(replacementReq.originalItems) ? replacementReq.originalItems[0] : null;
    return {
        ...replacementReq,
        id: replacementReq._id,
        replacementDisplayId: replacementReq.replacementId || replacementReq._id,
        orderDisplayId: replacementReq.orderId?.orderId || replacementReq.orderId || 'N/A',
        product: primaryItem?.name || 'Replacement item',
        barcode: primaryItem?.sku || 'N/A',
        quantity: Number(primaryItem?.qty || 0),
        replacementReason: replacementReq.evidence?.reason || primaryItem?.reason || 'Not specified',
        comment: replacementReq.evidence?.comment || '',
        createdAt: replacementReq.createdAt || replacementReq.requestDate,
        images: replacementReq.evidence?.images || [],
        evidenceVideo: replacementReq.evidence?.video || '',
        customerName: replacementReq.userId?.name || replacementReq.customerName || 'Customer',
        customerEmail: replacementReq.userId?.email || '',
        customerPhone: replacementReq.userId?.phone || '',
        item: primaryItem,
        user: replacementReq.userId,
        order: replacementReq.orderId,
    };
};

export const sellerOrderService = {
    getSellerOrdersPaged: async (params = {}) => {
        const res = await api.get('seller/orders', { params });
        const payload = res.data?.data || {};
        const orders = payload.orders || [];
        return {
            orders: orders.map(mapSellerOrder),
            pagination: payload.pagination || {
                page: Number(params.page || 1),
                limit: Number(params.limit || 10),
                totalItems: orders.length,
                totalPages: 1
            }
        };
    },

    getSellerOrders: async () => {
        // Backward-compatible helper now that backend is paginated by default.
        const { orders } = await sellerOrderService.getSellerOrdersPaged({ page: 1, limit: 100 });
        return orders;
    },

    getOrderDetails: async (id) => {
        const res = await api.get(`seller/orders/${id}`);
        const order = res.data?.data?.order;
        return order ? mapSellerOrder(order) : null;
    },

    getSellerInvoice: async (id) => {
        const res = await api.get(`seller/orders/${id}/invoice`);
        return res.data?.data?.invoice || null;
    },

    issueSellerInvoice: async (id) => {
        const res = await api.post(`seller/orders/${id}/invoice`);
        return res.data?.data?.invoice || null;
    },

    updateOrderStatus: async (orderId, status, note = '', shippingInfo = null, itemVoidTags = []) => {
        try {
            const res = await api.patch(`seller/orders/${orderId}/status`, { status, note, shippingInfo, itemVoidTags });
            const order = res.data?.data?.order;
            return {
                success: true,
                message: res.data?.message || 'Order updated',
                order: order ? mapSellerOrder(order) : null,
            };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || 'Update failed',
            };
        }
    },

    getReturns: async () => {
        try {
            const { returns } = await sellerOrderService.getReturnsPaged({ page: 1, limit: 100 });
            return returns;
        } catch (err) {
            console.error('Failed to fetch return requests:', err);
            return [];
        }
    },

    getReturnsPaged: async (params = {}) => {
        try {
            const res = await api.get('seller/returns', { params });
            const payload = res.data?.data || {};
            const list = payload.returns || res.data?.returns || [];
            return {
                returns: list.map(normalizeReturn).filter(Boolean),
                pagination: payload.pagination || {
                    page: Number(params.page || 1),
                    limit: Number(params.limit || 10),
                    totalItems: list.length,
                    totalPages: 1
                }
            };
        } catch (err) {
            console.error('Failed to fetch return requests:', err);
            return { returns: [], pagination: { page: 1, limit: Number(params.limit || 10), totalItems: 0, totalPages: 1 } };
        }
    },

    getReturnDetails: async (id) => {
        const res = await api.get(`seller/returns/${id}`);
        return normalizeReturn(res.data?.data?.returnReq || res.data?.returnReq);
    },

    processReturn: async (returnId, status, remarks = '', voidTagStatus = null, voidTagNotes = '') => {
        try {
            const res = await api.patch(`seller/returns/${returnId}/process`, { status, remarks, voidTagStatus, voidTagNotes });
            return {
                success: true,
                message: res.data?.message || 'Return updated',
                data: normalizeReturn(res.data?.data?.returnReq || res.data?.returnReq),
            };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || 'Process failed',
            };
        }
    },

    getReplacements: async () => {
        try {
            const { replacements } = await sellerOrderService.getReplacementsPaged({ page: 1, limit: 100 });
            return replacements;
        } catch (err) {
            console.error('Failed to fetch replacement requests:', err);
            return [];
        }
    },

    getReplacementsPaged: async (params = {}) => {
        try {
            const res = await api.get('seller/replacements', { params });
            const payload = res.data?.data || {};
            const list = payload.replacements || res.data?.replacements || [];
            return {
                replacements: list.map(normalizeReplacement).filter(Boolean),
                pagination: payload.pagination || {
                    page: Number(params.page || 1),
                    limit: Number(params.limit || 10),
                    totalItems: list.length,
                    totalPages: 1
                }
            };
        } catch (err) {
            console.error('Failed to fetch replacement requests:', err);
            return { replacements: [], pagination: { page: 1, limit: Number(params.limit || 10), totalItems: 0, totalPages: 1 } };
        }
    },

    getReplacementDetails: async (id) => {
        const res = await api.get(`seller/replacements/${id}`);
        return normalizeReplacement(res.data?.data?.replacementReq || res.data?.replacementReq);
    },

    processReplacement: async (replacementId, status, remarks = '') => {
        try {
            const res = await api.patch(`seller/replacements/${replacementId}/process`, { status, remarks });
            return {
                success: true,
                message: res.data?.message || 'Replacement updated',
                data: normalizeReplacement(res.data?.data?.replacementReq || res.data?.replacementReq),
            };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || 'Process failed',
            };
        }
    },

    getNotifications: async (params = {}) => {
        try {
            const res = await api.get('seller/notifications', { params });
            const data = res.data?.data || res.data;
            return {
                notifications: data?.notifications || [],
                pagination: data?.pagination || null,
            };
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            return { notifications: [], pagination: null };
        }
    },

    markNotificationsRead: async () => {
        try {
            await api.patch('seller/notifications/read-all');
            return true;
        } catch (err) {
            console.error('Failed to mark notifications as read:', err);
            return false;
        }
    },

    markNotificationRead: async (notificationId) => {
        try {
            if (!notificationId) return false;
            await api.patch(`seller/notifications/${notificationId}/read`);
            return true;
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            return false;
        }
    },

    deleteNotification: async (notificationId) => {
        try {
            if (!notificationId) return false;
            await api.delete(`seller/notifications/${notificationId}`);
            return true;
        } catch (err) {
            console.error('Failed to delete notification:', err);
            return false;
        }
    }
};
