import api from '../../../services/api';

export const sellerShippingService = {
  /**
   * Check courier serviceability for a route.
   */
  checkServiceability: async ({ courier, pickupPincode, deliveryPincode, paymentMode, weight, pickupLocationId }) => {
    const res = await api.post('seller/shipping/serviceability', {
      courier, pickupPincode, deliveryPincode, paymentMode, weight, pickupLocationId,
    });
    return res.data?.data || {};
  },

  /**
   * Create a new shipment for seller's items in an order.
   */
  createShipment: async (orderId, { courier, packageInfo, paymentMode, codAmount, pickupLocationId }) => {
    const res = await api.post(`seller/shipping/orders/${orderId}/create`, {
      courier, packageInfo, paymentMode, codAmount, pickupLocationId,
    });
    return res.data?.data || {};
  },

  /**
   * Get shipment(s) for a specific order.
   */
  getOrderShipments: async (orderId) => {
    const res = await api.get(`seller/shipping/orders/${orderId}`);
    return res.data?.data?.shipments || [];
  },

  /**
   * Track / sync shipment status from courier.
   */
  trackOrderShipment: async (orderId) => {
    const res = await api.post(`seller/shipping/orders/${orderId}/track`);
    return res.data?.data?.shipment || null;
  },

  /**
   * Cancel shipment for an order.
   */
  cancelOrderShipment: async (orderId) => {
    const res = await api.post(`seller/shipping/orders/${orderId}/cancel`);
    return res.data?.data?.shipment || null;
  },

  /**
   * List all shipments for the authenticated seller.
   */
  getMyShipments: async (params = {}) => {
    const res = await api.get('seller/shipping', { params });
    return {
      shipments: res.data?.data?.shipments || [],
      pagination: res.data?.pagination || { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
    };
  },
};
