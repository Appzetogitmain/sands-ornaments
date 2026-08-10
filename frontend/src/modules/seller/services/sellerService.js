import api from '../../../services/api';

export const sellerService = {

    getProfile: async () => {
        try {
            const res = await api.get('/seller/profile/me');
            return res.data?.data?.seller || res.data?.seller || null;
        } catch (err) {
            console.error("Failed to fetch seller profile:", err);
            return null;
        }
    },

    updateProfile: async (payload) => {
        try {
            const config = payload instanceof FormData
                ? { headers: { 'Content-Type': 'multipart/form-data' } }
                : undefined;
            const res = await api.put('/seller/profile/me', payload, config);
            return res.data;
        } catch (err) {
            console.error("Failed to update seller profile:", err);
            return { success: false, message: err.response?.data?.message || "Profile update failed" };
        }
    },

    changePassword: async (payload) => {
        try {
            const res = await api.put('/seller/profile/change-password', payload);
            return res.data;
        } catch (err) {
            console.error("Failed to change password:", err);
            return { success: false, message: err.response?.data?.message || "Password update failed" };
        }
    },

    getMetalPricing: async () => {
        try {
            const res = await api.get('/seller/profile/metal-pricing');
            return res.data?.data || res.data || { metalRates: {}, gstRate: 0 };
        } catch (err) {
            console.error("Failed to fetch metal pricing:", err);
            return { metalRates: {}, gstRate: 0 };
        }
    },

    updateMetalPricing: async (payload) => {
        try {
            const res = await api.patch('/seller/profile/metal-pricing', payload);
            return res.data;
        } catch (err) {
            console.error("Failed to update metal pricing:", err);
            return { success: false, message: err.response?.data?.message || "Metal pricing update failed" };
        }
    },

    deleteAccount: async () => {
        try {
            const res = await api.delete('/seller/profile/me');
            return res.data;
        } catch (err) {
            console.error("Failed to delete seller account:", err);
            return { success: false, message: err.response?.data?.message || "Account deletion failed" };
        }
    }
};
