import api from '../../../services/api';

export const adminDirectSaleService = {
    list: async (params = {}) => {
        try {
            const res = await api.get('admin/direct-sales', { params });
            return res.data || res;
        } catch (err) {
            return err.response?.data || { success: false, message: err.message };
        }
    },
    preview: async (data) => {
        try {
            const res = await api.post('admin/direct-sales/preview', data);
            return res.data || res;
        } catch (err) {
            return err.response?.data || { success: false, message: err.message };
        }
    },
    confirm: async (data) => {
        try {
            const res = await api.post('admin/direct-sales/confirm', data);
            return res.data || res;
        } catch (err) {
            return err.response?.data || { success: false, message: err.message };
        }
    },
    void: async (id, data) => {
        try {
            const res = await api.patch(`admin/direct-sales/${id}/void`, data);
            return res.data || res;
        } catch (err) {
            return err.response?.data || { success: false, message: err.message };
        }
    }
};
