import api from '../../../services/api';

export const adminShippingService = {
  /**
   * List all shipments with filters.
   */
  getAllShipments: async (params = {}) => {
    const res = await api.get('admin/shipping', { params });
    return {
      shipments: res.data?.data?.shipments || [],
      pagination: res.data?.pagination || { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    };
  },

  /**
   * Get single shipment detail.
   */
  getShipmentDetail: async (shipmentId) => {
    const res = await api.get(`admin/shipping/${shipmentId}`);
    return res.data?.data?.shipment || null;
  },

  /**
   * Track / sync shipment from courier.
   */
  trackShipment: async (shipmentId) => {
    const res = await api.post(`admin/shipping/${shipmentId}/track`);
    return res.data?.data?.shipment || null;
  },

  /**
   * Cancel a shipment.
   */
  cancelShipment: async (shipmentId) => {
    const res = await api.post(`admin/shipping/${shipmentId}/cancel`);
    return res.data?.data?.shipment || null;
  },

  /**
   * Override shipment status.
   */
  overrideStatus: async (shipmentId, { status, message }) => {
    const res = await api.patch(`admin/shipping/${shipmentId}/override-status`, { status, message });
    return res.data?.data?.shipment || null;
  },

  /**
   * Get shipping reports.
   */
  getReports: async (params = {}) => {
    const res = await api.get('admin/shipping/reports', { params });
    return res.data?.data || {};
  },

  /**
   * Create a shipment via Shiprocket for an order.
   */
  createShipment: async (orderId, payload) => {
    const res = await api.post(`admin/shipping/orders/${orderId}/create`, payload);
    return res.data?.data || {};
  },

  /**
   * Get all shipments for an order.
   */
  getOrderShipments: async (orderId) => {
    const res = await api.get(`admin/shipping/orders/${orderId}`);
    return res.data?.data?.shipments || [];
  },

  /**
   * Get pickup locations from Shiprocket.
   */
  getPickupLocations: async () => {
    const res = await api.get('admin/shipping/pickup-locations');
    return res.data?.data?.locations || [];
  },

  /**
   * Re-generate label for a shipment.
   */
  regenerateLabel: async (shipmentId) => {
    const res = await api.post(`admin/shipping/${shipmentId}/generate-label`);
    return res.data?.data || {};
  },

  /**
   * Generate manifest for a shipment.
   */
  generateManifest: async (shipmentId) => {
    const res = await api.post(`admin/shipping/${shipmentId}/manifest`);
    return res.data?.data || {};
  },
};
