import api from '../../../services/api';

const isFormData = (payload) =>
  typeof FormData !== 'undefined' && payload instanceof FormData;

const appendCacheBuster = (url) => {
  const source = String(url || '').trim();
  if (!source) return null;
  if (source.startsWith('data:') || source.startsWith('blob:')) return source;
  const stamp = Date.now();
  return source.includes('?') ? `${source}&v=${stamp}` : `${source}?v=${stamp}`;
};

const getAdminOrderCustomerName = (order = {}) =>
  order.customerName ||
  order.userId?.name ||
  [order.shippingAddress?.firstName, order.shippingAddress?.lastName].filter(Boolean).join(' ').trim() ||
  'Customer';

const getAdminOrderCustomerEmail = (order = {}) =>
  order.customerEmail ||
  order.userId?.email ||
  order.shippingAddress?.email ||
  '';

const getAdminOrderCustomerPhone = (order = {}) =>
  order.customerPhone ||
  order.userId?.phone ||
  order.shippingAddress?.phone ||
  '';

const getAdminOrderPrimaryImage = (item = {}) =>
  item?.image ||
  item?.productId?.images?.[0] ||
  item?.productId?.image ||
  '';

const normalizeAdminOrder = (order) => {
  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const customerName = getAdminOrderCustomerName(order);
  const customerEmail = getAdminOrderCustomerEmail(order);
  const customerPhone = getAdminOrderCustomerPhone(order);
  const shippingInfo = order.shippingInfo || {};
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];

  return {
    ...order,
    id: order._id,
    user: order.userId || null,
    customerName,
    customerEmail,
    customerPhone,
    orderStatus: order.status,
    totalAmount: Number(order.total || 0),
    itemCount: items.length,
    shippingCarrier: shippingInfo.carrier || '',
    trackingId: shippingInfo.trackingId || '',
    trackingUrl: shippingInfo.trackingUrl || '',
    estimatedDelivery: shippingInfo.estimatedDelivery || null,
    // Refund fields
    refundId:     order.refundId     || null,
    refundStatus: order.refundStatus || 'none',
    refundAmount: Number(order.refundAmount || 0),
    refundedAt:   order.refundedAt   || null,
    address: {
      name: customerName,
      phone: customerPhone,
      street: [order.shippingAddress?.flatNo, order.shippingAddress?.area].filter(Boolean).join(', '),
      city: order.shippingAddress?.city || '',
      district: order.shippingAddress?.district || '',
      state: order.shippingAddress?.state || '',
      zip: order.shippingAddress?.pincode || ''
    },
    items: items.map((item) => ({
      ...item,
      id: item._id || item.variantId || item.productId?._id,
      image: getAdminOrderPrimaryImage(item)
    })),
    timeline
  };
};

const normalizeAdminReturn = (returnReq) => {
  if (!returnReq) return null;

  const items = Array.isArray(returnReq.items) ? returnReq.items : [];
  const primaryItem = items[0] || null;
  const evidence = returnReq.evidence || {};
  const order = returnReq.orderId || null;
  const customer = returnReq.userId || null;
  const refund = returnReq.refund || {};
  const pickup = returnReq.pickup || {};

  return {
    ...returnReq,
    id: returnReq._id,
    returnDisplayId: returnReq.returnId || returnReq._id,
    order: order,
    orderDisplayId: order?.orderId || 'N/A',
    user: customer,
    customerName: customer?.name || 'Customer',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    itemCount: items.length,
    items,
    primaryItem,
    reason: evidence.reason || primaryItem?.reason || 'Not specified',
    comment: evidence.comment || '',
    adminComment: returnReq.adminComment || '',
    evidenceImages: Array.isArray(evidence.images) ? evidence.images : [],
    evidenceVideo: evidence.video || '',
    refundAmount: Number(refund.amount || 0),
    refundMethod: refund.method || '',
    refundTransactionId: refund.transactionId || '',
    refundInitiatedAt: refund.initiatedAt || null,
    pickupAddress: returnReq.pickupAddress || order?.shippingAddress || null,
    pickup,
    timeline: Array.isArray(returnReq.timeline) ? returnReq.timeline : [],
    logs: Array.isArray(returnReq.logs) ? returnReq.logs : []
  };
};

const normalizeAdminReplacement = (replacement) => {
  if (!replacement) return null;

  const originalItems = Array.isArray(replacement.originalItems) ? replacement.originalItems : [];
  const replacementItems = Array.isArray(replacement.replacementItems) ? replacement.replacementItems : [];
  const evidence = replacement.evidence || {};
  const customer = replacement.userId || null;
  const order = replacement.orderId || null;

  return {
    ...replacement,
    id: replacement._id,
    replacementDisplayId: replacement.replacementId || replacement._id,
    adminComment: replacement.adminComment || '',
    replacementMode: replacement.replacementMode || 'after_pickup',
    itemCondition: replacement.itemCondition || '',
    stockAction: replacement.stockAction || '',
    user: customer,
    customerName: customer?.name || 'Customer',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    order: order,
    orderDisplayId: order?.orderId || 'N/A',
    originalItems,
    replacementItems,
    originalItemCount: originalItems.length,
    replacementItemCount: replacementItems.length,
    primaryOriginalItem: originalItems[0] || null,
    primaryReplacementItem: replacementItems[0] || null,
    reason: evidence.reason || originalItems[0]?.reason || 'Not specified',
    comment: evidence.comment || '',
    evidenceImages: Array.isArray(evidence.images) ? evidence.images : [],
    evidenceVideo: evidence.video || '',
    pickupAddress: order?.shippingAddress || null,
    pickup: replacement.pickup || {},
    shipment: replacement.shipment || {},
    timeline: Array.isArray(replacement.timeline) ? replacement.timeline : []
  };
};

export const adminService = {
  // Product Orchestration
  getProducts: async (params = {}) => {
    try {
      const res = await api.get('admin/products', { params });
      return {
        products: res.data.data?.products || res.data.products || [],
        pagination: res.data.data?.pagination || res.data.pagination
      };
    } catch (err) {
      console.error("Admin fetch products failed:", err);
      return { products: [], pagination: null };
    }
  },
  deleteProduct: async (id) => {
    try {
      const res = await api.delete(`admin/products/${id}`);
      return res.data.success;
    } catch (err) {
      console.error("Admin delete product failed:", err);
      return false;
    }
  },
  bulkUpdatePrices: async (config) => {
    try {
      const res = await api.patch('admin/products/bulk/prices', config);
      return res.data.success;
    } catch (err) {
      console.error("Admin bulk price update failed:", err);
      return false;
    }
  },
  getProductById: async (id) => {
    try {
      const res = await api.get(`admin/products/${id}`);
      return res.data.data?.product || res.data.product;
    } catch (err) {
      console.error("Admin fetch product details failed:", err);
      throw err;
    }
  },
  createProduct: async (data) => {
    try {
      const config = isFormData(data)
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const res = await api.post('admin/products', data, config);
      return res.data;
    } catch (err) {
      console.error("Admin create product failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to create product" };
    }
  },
  updateProduct: async (id, data) => {
    try {
      const config = isFormData(data)
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const res = await api.put(`admin/products/${id}`, data, config);
      return res.data;
    } catch (err) {
      console.error("Admin update product failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update product" };
    }
  },
  toggleProductStatus: async (id) => {
    try {
      const res = await api.patch(`admin/products/${id}/toggle-status`);
      return res.data.success;
    } catch (err) {
      console.error("Admin toggle product status failed:", err);
      return false;
    }
  },

  // Category Management
  getCategories: async () => {
    try {
      const res = await api.get('admin/categories');
      return res.data.data.categories || [];
    } catch (err) {
      console.error("Admin fetch categories failed:", err);
      return [];
    }
  },
  getCategoryById: async (id) => {
    try {
      const res = await api.get(`admin/categories/${id}`);
      return res.data.data.category;
    } catch (err) {
      console.error("Admin fetch category details failed:", err);
      throw err;
    }
  },
  createCategory: async (data) => {
    try {
      const config = isFormData(data)
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const res = await api.post('admin/categories', data, config);
      return res.data;
    } catch (err) {
      console.error("Admin create category failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to create category" };
    }
  },
  updateCategory: async (id, data) => {
    try {
      const config = isFormData(data)
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const res = await api.put(`admin/categories/${id}`, data, config);
      return res.data;
    } catch (err) {
      console.error("Admin update category failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update category" };
    }
  },
  deleteCategory: async (id) => {
    try {
      const res = await api.delete(`admin/categories/${id}`);
      return res.data.success;
    } catch (err) {
      console.error("Admin delete category failed:", err);
      return false;
    }
  },

  // Banner Management
  getBanners: async () => {
    try {
      const res = await api.get('admin/cms/banners');
      return res.data.data?.banners || res.data.banners || [];
    } catch (err) {
      console.error("Admin fetch banners failed:", err);
      return [];
    }
  },
  getBannerById: async (id) => {
    try {
      const res = await api.get(`admin/cms/banners/${id}`);
      return res.data.data?.banner || res.data.banner || null;
    } catch (err) {
      console.error("Admin fetch banner failed:", err);
      throw err;
    }
  },
  createBanner: async (data) => {
    try {
      const config = isFormData(data)
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const res = await api.post('admin/cms/banners', data, config);
      return res.data;
    } catch (err) {
      console.error("Admin create banner failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to create banner" };
    }
  },
  updateBanner: async (id, data) => {
    try {
      const config = isFormData(data)
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const res = await api.put(`admin/cms/banners/${id}`, data, config);
      return res.data;
    } catch (err) {
      console.error("Admin update banner failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update banner" };
    }
  },
  deleteBanner: async (id) => {
    try {
      const res = await api.delete(`admin/cms/banners/${id}`);
      return {
        success: res.data.success,
        message: res.data.message || "Banner deleted"
      };
    } catch (err) {
      console.error("Admin delete banner failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to delete banner"
      };
    }
  },


  // Coupon Management
  getCoupons: async () => {
    try {
      const res = await api.get('admin/coupons');
      return res.data.data.coupons || [];
    } catch (err) {
      console.error("Admin fetch coupons failed:", err);
      return [];
    }
  },
  getCouponById: async (id) => {
    try {
      const res = await api.get(`admin/coupons/${id}`);
      return res.data.data?.coupon || res.data.coupon;
    } catch (err) {
      console.error("Admin fetch coupon failed:", err);
      throw err;
    }
  },
  createCoupon: async (data) => {
    try {
      const res = await api.post('admin/coupons', data);
      return res.data;
    } catch (err) {
      console.error("Admin create coupon failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to create coupon" };
    }
  },
  updateCoupon: async (id, data) => {
    try {
      const res = await api.put(`admin/coupons/${id}`, data);
      return res.data;
    } catch (err) {
      console.error("Admin update coupon failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update coupon" };
    }
  },
  deleteCoupon: async (id) => {
    try {
      const res = await api.delete(`admin/coupons/${id}`);
      return res.data.success;
    } catch (err) {
      console.error("Admin delete coupon failed:", err);
      return false;
    }
  },
  toggleCoupon: async (id) => {
    try {
      const res = await api.patch(`admin/coupons/${id}/toggle`);
      return res.data;
    } catch (err) {
      console.error("Admin toggle coupon failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to toggle coupon" };
    }
  },

  // Inventory Management
  getInventory: async (params = {}) => {
    try {
      const res = await api.get('admin/inventory', { params });
      return res.data.data?.inventory || res.data.inventory || [];
    } catch (err) {
      console.error("Admin fetch inventory failed:", err);
      return [];
    }
  },
  adjustStock: async (payload) => {
    try {
      const res = await api.post('admin/inventory/adjust', payload);
      return res.data;
    } catch (err) {
      console.error("Admin adjust stock failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to adjust stock" };
    }
  },
  getStockHistory: async (params = {}) => {
    try {
      const res = await api.get('admin/inventory/history', { params });
      return res.data.data?.logs || res.data.logs || [];
    } catch (err) {
      console.error("Admin fetch stock history failed:", err);
      return [];
    }
  },
  getLowStockAlerts: async (params = {}) => {
    try {
      const res = await api.get('admin/inventory/alerts', { params });
      return res.data.data?.alerts || res.data.alerts || [];
    } catch (err) {
      console.error("Admin fetch low stock alerts failed:", err);
      return [];
    }
  },

  // Homepage Sections (CMS)
  getHomepageLayout: async () => {
    try {
      const res = await api.get('admin/cms/homepage');
      return res.data.layout;
    } catch (err) {
      console.error("Admin fetch homepage layout failed:", err);
      return null;
    }
  },
  getMetalPricing: async () => {
    try {
      const res = await api.get('admin/settings/metal-pricing');
      return res.data?.data || res.data || { metalRates: {} };
    } catch (err) {
      console.error("Admin fetch metal pricing failed:", err);
      return { metalRates: {} };
    }
  },
  updateMetalPricing: async (payload) => {
    try {
      const res = await api.patch('admin/settings/metal-pricing', payload);
      return res.data;
    } catch (err) {
      console.error("Admin update metal pricing failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update metal pricing" };
    }
  },
  getTaxSettings: async () => {
    try {
      const res = await api.get('admin/settings/tax');
      return res.data?.data || res.data || { gstRate: 0, totalProductCount: 0 };
    } catch (err) {
      console.error("Admin fetch tax settings failed:", err);
      return { gstRate: 0, totalProductCount: 0 };
    }
  },
  updateTaxSettings: async (payload) => {
    try {
      const res = await api.patch('admin/settings/tax', payload);
      return res.data;
    } catch (err) {
      console.error("Admin update tax settings failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update tax settings" };
    }
  },
  getSections: async (pageKey = null) => {
    try {
      const res = await api.get('admin/sections', { params: pageKey ? { pageKey } : undefined });
      return res.data.data?.sections || res.data.sections || [];
    } catch (err) {
      console.error("Admin fetch sections failed:", err);
      return [];
    }
  },
  getSectionById: async (id, pageKey = null) => {
    try {
      const res = await api.get(`admin/sections/${id}`, { params: pageKey ? { pageKey } : undefined });
      return res.data.data?.section || res.data.section;
    } catch (err) {
      console.error("Admin fetch section failed:", err);
      throw err;
    }
  },
  updateSection: async (id, payload, pageKey = null) => {
    try {
      const res = await api.put(`admin/sections/${id}`, payload, { params: pageKey ? { pageKey } : undefined });
      return res.data;
    } catch (err) {
      console.error("Admin update section failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update section" };
    }
  },
  bulkUpsertSections: async (sections, pageKey = null) => {
    try {
      const res = await api.post('admin/sections/bulk', { sections, pageKey });
      return res.data;
    } catch (err) {
      console.error("Admin bulk section upsert failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to seed sections" };
    }
  },
  uploadSectionImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('admin/sections/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return appendCacheBuster(res.data?.data?.url || null);
    } catch (err) {
      console.error("Admin section image upload failed:", err);
      return null;
    }
  },
  updateHomepageSection: async (sectionId, data) => {
    try {
      const res = await api.patch(`admin/cms/homepage/sections/${sectionId}`, data);
      return res.data.success;
    } catch (err) {
      console.error("Admin update section failed:", err);
      return false;
    }
  },

  // Order Management
  getOrderSummary: async () => {
    try {
      const res = await api.get('admin/orders/summary');
      const summary = res.data.data?.summary || res.data.summary || {};
      return {
        total: Number(summary.total || 0),
        pending: Number(summary.pending || 0),
        delivered: Number(summary.delivered || 0),
        cancelled: Number(summary.cancelled || 0),
        returned: Number(summary.returned || 0)
      };
    } catch (err) {
      console.error("Admin fetch order summary failed:", err);
      return { total: 0, pending: 0, delivered: 0, cancelled: 0, returned: 0 };
    }
  },
  getOrders: async (params = {}) => {
    try {
      const res = await api.get('admin/orders', { params });
      const orders = res.data.data?.orders || res.data.orders || [];
      const pagination = res.data.data?.pagination || res.data.pagination || {
        total: orders.length,
        page: Number(params.page) || 1,
        limit: Number(params.limit) || orders.length || 20,
        pages: 1
      };
      return {
        orders: orders.map(normalizeAdminOrder).filter(Boolean),
        pagination
      };
    } catch (err) {
      console.error("Admin fetch orders failed:", err);
      return {
        orders: [],
        pagination: { total: 0, page: 1, limit: Number(params.limit) || 20, pages: 1 }
      };
    }
  },
  getOrderDetails: async (id) => {
    try {
      const res = await api.get(`admin/orders/${id}`);
      return normalizeAdminOrder(res.data.data?.order || res.data.order);
    } catch (err) {
      console.error("Admin fetch order details failed:", err);
      throw err;
    }
  },
  updateOrderStatus: async (id, payload) => {
    try {
      const requestBody = typeof payload === 'string' ? { status: payload } : payload;
      const res = await api.patch(`admin/orders/${id}/status`, requestBody);
      return {
        success: res.data.success,
        message: res.data.message || 'Order updated',
        order: normalizeAdminOrder(res.data.data?.order || res.data.order)
      };
    } catch (err) {
      console.error("Admin update order status failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to update order"
      };
    }
  },
  processRefund: async (id, payload = {}) => {
    try {
      const res = await api.post(`admin/orders/${id}/refund`, payload);
      return {
        success: res.data.success,
        message: res.data.message || 'Refund processed',
        order: normalizeAdminOrder(res.data.data?.order || res.data.order),
        refundId: res.data.data?.refundId || null,
        refundAmount: res.data.data?.refundAmount || 0
      };
    } catch (err) {
      console.error("Admin process refund failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to process refund"
      };
    }
  },

  // Return Management (RMA)
  getReturns: async (params = {}) => {
    try {
      const res = await api.get('admin/returns', { params });
      const returns = res.data.data?.returns || res.data.returns || [];
      return returns.map(normalizeAdminReturn).filter(Boolean);
    } catch (err) {
      console.error("Admin fetch returns failed:", err);
      return [];
    }
  },
  getReturnDetails: async (id) => {
    try {
      const res = await api.get(`admin/returns/${id}`);
      return normalizeAdminReturn(res.data.data?.returnReq || res.data.returnRequest || res.data.returnReq);
    } catch (err) {
      console.error("Admin fetch return details failed:", err);
      throw err;
    }
  },
  processReturn: async (id, payload) => {
    try {
      const requestBody = typeof payload === 'string' ? { status: payload } : payload;
      const res = await api.patch(`admin/returns/${id}/status`, requestBody);
      return {
        success: res.data.success,
        message: res.data.message || 'Return updated',
        returnReq: normalizeAdminReturn(res.data.data?.returnReq || res.data.returnReq)
      };
    } catch (err) {
      console.error("Admin process return failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to process return"
      };
    }
  },
  getReplacements: async (params = {}) => {
    try {
      const res = await api.get('admin/replacements', { params });
      const replacements = res.data.data?.replacements || res.data.replacements || [];
      return replacements.map(normalizeAdminReplacement).filter(Boolean);
    } catch (err) {
      console.error("Admin fetch replacements failed:", err);
      return [];
    }
  },
  getReplacementDetails: async (id) => {
    try {
      const res = await api.get(`admin/replacements/${id}`);
      return normalizeAdminReplacement(res.data.data?.repl || res.data.repl || res.data.data?.replacement || res.data.replacement);
    } catch (err) {
      console.error("Admin fetch replacement details failed:", err);
      throw err;
    }
  },
  processReplacement: async (id, payload) => {
    try {
      const requestBody = typeof payload === 'string' ? { status: payload } : payload;
      const res = await api.patch(`admin/replacements/${id}/status`, requestBody);
      return {
        success: res.data.success,
        message: res.data.message || 'Replacement updated',
        repl: normalizeAdminReplacement(res.data.data?.repl || res.data.repl)
      };
    } catch (err) {
      console.error("Admin process replacement failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to process replacement"
      };
    }
  },

  // Seller Management
  getSellers: async (params = {}) => {
    try {
      const res = await api.get('admin/sellers', { params });
      return res.data.data?.sellers || res.data.sellers || [];
    } catch (err) {
      console.error("Admin fetch sellers failed:", err);
      return [];
    }
  },
  getSellerDetails: async (id) => {
    try {
      const res = await api.get(`admin/sellers/${id}`);
      return res.data.data || { seller: res.data.seller };
    } catch (err) {
      console.error("Admin fetch seller details failed:", err);
      throw err;
    }
  },
  updateSellerStatus: async (id, status, rejectionReason = null) => {
    try {
      const res = await api.patch(`admin/sellers/${id}/status`, { status, rejectionReason });
      return {
        success: res.data.success,
        seller: res.data.data?.seller || res.data.seller || null,
        message: res.data.message || `Seller ${status.toLowerCase()} successfully`
      };
    } catch (err) {
      console.error("Admin update seller status failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to update seller"
      };
    }
  },

  // User Management
  getUsers: async (params = {}) => {
    try {
      const res = await api.get('admin/users', { params });
      return res.data.data?.users || res.data.users || [];
    } catch (err) {
      console.error("Admin fetch users failed:", err);
      return [];
    }
  },
  getUserById: async (id) => {
    try {
      const res = await api.get(`admin/users/${id}`);
      return res.data.data || { user: res.data.user };
    } catch (err) {
      console.error("Admin fetch user details failed:", err);
      throw err;
    }
  },
  toggleUserStatus: async (id) => {
    try {
      const res = await api.patch(`admin/users/${id}/block`);
      return {
        success: res.data.success,
        user: res.data.data?.user || res.data.user || null,
        message: res.data.message || "User status updated"
      };
    } catch (err) {
      console.error("Admin toggle user status failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to update user status"
      };
    }
  },

  // Review Management
  getReviews: async (params = {}) => {
    try {
      const res = await api.get('admin/reviews', { params });
      return res.data.data?.reviews || res.data.reviews || [];
    } catch (err) {
      console.error("Admin fetch reviews failed:", err);
      return [];
    }
  },
  updateReviewStatus: async (id, action) => {
    try {
      const res = await api.patch(`admin/reviews/${id}/toggle`, { action });
      return {
        success: res.data.success,
        review: res.data.data?.review || res.data.review || null,
        message: res.data.message || "Review updated"
      };
    } catch (err) {
      console.error("Admin update review failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to update review"
      };
    }
  },
  deleteReview: async (id) => {
    try {
      const res = await api.delete(`admin/reviews/${id}`);
      return {
        success: res.data.success,
        message: res.data.message || "Review deleted successfully"
      };
    } catch (err) {
      console.error("Admin delete review failed:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Failed to delete review"
      };
    }
  },

  // Blog Management
  getAdminBlogs: async () => {
    try {
      const res = await api.get('admin/blogs');
      return res.data.data.blogs || [];
    } catch (err) {
      console.error("Admin fetch blogs failed:", err);
      return [];
    }
  },
  createBlog: async (formData) => {
    try {
      const res = await api.post('admin/blogs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err) {
      console.error("Admin create blog failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to create blog" };
    }
  },
  updateBlog: async (id, formData) => {
    try {
      const res = await api.put(`admin/blogs/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err) {
      console.error("Admin update blog failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update blog" };
    }
  },
  deleteBlog: async (id) => {
    try {
      const res = await api.delete(`admin/blogs/${id}`);
      return res.data.success;
    } catch (err) {
      console.error("Admin delete blog failed:", err);
      return false;
    }
  },

  // Dynamic Pages (CMS)
  getPages: async () => {
    try {
      const res = await api.get('admin/pages');
      return res.data.data?.pages || res.data.pages || [];
    } catch (err) {
      console.error("Fetch pages failed:", err);
      return [];
    }
  },
  getPageBySlug: async (slug) => {
    try {
      const res = await api.get(`admin/pages/${slug}`);
      return res.data;
    } catch (err) {
      console.error(`Fetch page ${slug} failed:`, err);
      return { success: false, message: err.response?.data?.message || "Failed to fetch page" };
    }
  },
  savePage: async (data) => {
    try {
      const res = await api.post(`admin/pages`, data);
      return res.data;
    } catch (err) {
      console.error("Save page failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to save page" };
    }
  },

  // Admin Notifications
  getAdminNotifications: async (params = {}) => {
    try {
      const res = await api.get('admin/notifications', { params });
      return res.data.data?.notifications || res.data.notifications || [];
    } catch (err) {
      console.error("Admin fetch notifications failed:", err);
      return [];
    }
  },
  markAdminNotificationRead: async (id) => {
    try {
      const res = await api.patch(`admin/notifications/${id}/read`);
      return res.data.success;
    } catch (err) {
      console.error("Admin mark notification read failed:", err);
      return false;
    }
  },
  markAllAdminNotificationsRead: async () => {
    try {
      const res = await api.patch('admin/notifications/read-all');
      return res.data.success;
    } catch (err) {
      console.error("Admin mark all notifications read failed:", err);
      return false;
    }
  },
  deleteAdminNotification: async (id) => {
    try {
      const res = await api.delete(`admin/notifications/${id}`);
      return res.data.success;
    } catch (err) {
      console.error("Admin delete notification failed:", err);
      return false;
    }
  },
  broadcastAdminNotification: async (payload = {}) => {
    try {
      const res = await api.post('admin/notifications/broadcast', payload);
      return {
        success: !!res.data?.success,
        notification: res.data?.data?.notification || res.data?.notification || null,
        message: res.data?.message || "Notification broadcasted successfully"
      };
    } catch (err) {
      console.error("Admin broadcast notification failed:", err);
      return {
        success: false,
        notification: null,
        message: err.response?.data?.message || "Failed to broadcast notification"
      };
    }
  },

  // FAQ Management
  getFAQs: async () => {
    try {
      const res = await api.get('admin/cms/faqs');
      return res.data.data?.faqs || res.data.faqs || [];
    } catch (err) {
      console.error("Admin fetch FAQs failed:", err);
      return [];
    }
  },
  createFAQ: async (faqData) => {
    try {
      const res = await api.post('admin/cms/faqs', faqData);
      return { success: true, faq: res.data.data?.faq || res.data.faq };
    } catch (err) {
      console.error("Admin create FAQ failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to create FAQ" };
    }
  },
  updateFAQ: async (id, faqData) => {
    try {
      const res = await api.put(`admin/cms/faqs/${id}`, faqData);
      return { success: true, faq: res.data.data?.faq || res.data.faq };
    } catch (err) {
      console.error("Admin update FAQ failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to update FAQ" };
    }
  },
  deleteFAQ: async (id) => {
    try {
      await api.delete(`admin/cms/faqs/${id}`);
      return { success: true };
    } catch (err) {
      console.error("Admin delete FAQ failed:", err);
      return { success: false, message: err.response?.data?.message || "Failed to delete FAQ" };
    }
  }
};
