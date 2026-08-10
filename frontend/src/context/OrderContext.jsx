import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const OrderContext = createContext(null);

export const OrderProvider = ({ children, showNotification = () => {} }) => {
    const { user, logout: authLogout } = useAuth();
    const isUserRole = user?.role === 'user';
    const hasAuthToken = () => Boolean(localStorage.getItem('sands_token'));

    // ── State ────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState([]);
    const [returns, setReturns] = useState([]);
    const [replacements, setReplacements] = useState([]);
    const [supportTickets, setSupportTickets] = useState([]);
    const [addresses, setAddresses] = useState(() => {
        const saved = localStorage.getItem('addresses');
        return saved ? JSON.parse(saved) : [];
    });
    const [defaultAddressId, setDefaultAddressId] = useState(() => {
        return localStorage.getItem('defaultAddressId') || null;
    });

    // ── Fetch Addresses ──────────────────────────────────────────────────────
    const fetchAddresses = useCallback(async () => {
        if (!isUserRole || !hasAuthToken()) return;
        try {
            const res = await api.get('user/addresses');
            if (res.data.success) {
                const list = res.data.data?.addresses || res.data.addresses || [];
                const normalized = list.map(addr => ({ ...addr, id: addr._id || addr.id }));
                setAddresses(normalized);
                localStorage.setItem('addresses', JSON.stringify(normalized));
                const defaultAddr = normalized.find(a => a.isDefault);
                if (defaultAddr) {
                    setDefaultAddressId(defaultAddr._id);
                    localStorage.setItem('defaultAddressId', defaultAddr._id);
                }
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            console.error('Fetch addresses failed', err);
        }
    }, [isUserRole, authLogout]);

    // ── Address CRUD ─────────────────────────────────────────────────────────
    const addAddress = useCallback(async (address) => {
        try {
            // Normalize address fields to match backend Joi validator
            const normalized = {
                name: String(address.name || '').trim(),
                phone: String(address.phone || '').replace(/\D/g, '').slice(-10),
                flatNo: String(address.flatNo || '').trim(),
                area: String(address.area || '').trim(),
                city: String(address.city || '').trim(),
                district: String(address.district || '').trim(),
                state: String(address.state || '').trim(),
                pincode: String(address.pincode || '').replace(/\D/g, '').trim(),
                type: String(address.type || 'Home').trim() || 'Home',
                isDefault: Boolean(address.isDefault)
            };

            // Create address object with ID for localStorage fallback
            const addressWithId = {
                ...normalized,
                _id: `addr_${Date.now()}`,
                id: `addr_${Date.now()}`,
                createdAt: new Date().toISOString()
            };

            // Optimistic update - add to UI immediately
            const updatedAddresses = [...addresses, addressWithId];
            setAddresses(updatedAddresses);
            localStorage.setItem('addresses', JSON.stringify(updatedAddresses));

            // Try to save to backend
            try {
                const res = await api.post('user/addresses', normalized);
                if (res.data.success) {
                    // Backend save successful, fetch fresh data
                    await fetchAddresses();
                    const { toast } = await import('react-hot-toast');
                    toast.success('Address added successfully');
                    return true;
                } else {
                    const { toast } = await import('react-hot-toast');
                    toast.error(res.data.message || 'Failed to save address');
                    // Revert optimistic update
                    setAddresses(addresses);
                    localStorage.setItem('addresses', JSON.stringify(addresses));
                    return false;
                }
            } catch (apiErr) {
                console.error('Backend API failed to save address:', apiErr);
                // A future-order address must be persisted to the user's account.
                // Never report success for a local-only optimistic copy.
                setAddresses(addresses);
                localStorage.setItem('addresses', JSON.stringify(addresses));
                const { toast } = await import('react-hot-toast');
                toast.error(apiErr.response?.data?.message || 'Failed to save address to server');
                return false;
            }
        } catch (err) {
            console.error('Failed to add address:', err);
            const { toast } = await import('react-hot-toast');
            toast.error('Error: ' + (err.message || 'Failed to add address'));
            return false;
        }
    }, [addresses, fetchAddresses]);

    const removeAddress = useCallback(async (addressId) => {
        try {
            const res = await api.delete(`user/addresses/${addressId}`);
            if (res.data.success) {
                await fetchAddresses();
                const { toast } = await import('react-hot-toast');
                toast.success('Address removed');
                return true;
            }
            const { toast } = await import('react-hot-toast');
            toast.error(res.data.message || 'Failed to remove address');
            return false;
        } catch (err) {
            console.error('Failed to remove address:', err);
            const { toast } = await import('react-hot-toast');
            toast.error(err.response?.data?.message || 'Failed to remove address');
            return false;
        }
    }, [fetchAddresses]);

    const updateAddress = useCallback(async (updatedAddress) => {
        try {
            const normalized = {
                id: updatedAddress.id || updatedAddress._id,
                _id: updatedAddress._id || updatedAddress.id,
                name: String(updatedAddress.name || '').trim(),
                phone: String(updatedAddress.phone || '').replace(/\D/g, '').slice(-10),
                flatNo: String(updatedAddress.flatNo || '').trim(),
                area: String(updatedAddress.area || '').trim(),
                city: String(updatedAddress.city || '').trim(),
                district: String(updatedAddress.district || '').trim(),
                state: String(updatedAddress.state || '').trim(),
                pincode: String(updatedAddress.pincode || '').replace(/\D/g, '').trim(),
                type: String(updatedAddress.type || 'Home').trim() || 'Home',
                isDefault: Boolean(updatedAddress.isDefault)
            };

            const res = await api.patch(`user/addresses/${normalized.id}`, normalized);
            if (res.data.success) {
                await fetchAddresses();
                const { toast } = await import('react-hot-toast');
                toast.success('Address updated');
                return true;
            }
            const { toast } = await import('react-hot-toast');
            toast.error(res.data.message || 'Failed to update address');
            return false;
        } catch (err) {
            console.error('Failed to update address:', err);
            const { toast } = await import('react-hot-toast');
            toast.error(err.response?.data?.message || 'Failed to update address');
            return false;
        }
    }, [fetchAddresses]);

    const setDefaultAddress = useCallback(async (addressId) => {
        try {
            const res = await api.patch(`user/addresses/${addressId}/set-default`);
            if (res.data.success) {
                await fetchAddresses();
                const { toast } = await import('react-hot-toast');
                toast.success('Marked as default address');
                return true;
            }
            const { toast } = await import('react-hot-toast');
            toast.error(res.data.message || 'Failed to set default address');
            return false;
        } catch (err) {
            console.error('Failed to set default address:', err);
            const { toast } = await import('react-hot-toast');
            toast.error(err.response?.data?.message || 'Failed to set default address');
            return false;
        }
    }, [fetchAddresses]);

    // ── Fetch Orders ─────────────────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!isUserRole || !hasAuthToken()) return;
        try {
            const res = await api.get('user/orders');
            if (res.data.success) {
                const list = res.data.data?.orders || res.data.orders || [];
                setOrders(list.map(order => ({ ...order, id: order._id || order.id, displayId: order.orderId || order._id })));
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            console.error('Fetch orders failed', err);
        }
    }, [isUserRole, authLogout]);

    // ── Fetch Returns ─────────────────────────────────────────────────────────
    const fetchReturns = useCallback(async () => {
        if (!isUserRole || !hasAuthToken()) return;
        try {
            const res = await api.get('user/returns');
            if (res.data.success) {
                const list = res.data.data?.returns || res.data.returns || [];
                setReturns(list.map(ret => ({
                    ...ret,
                    id: ret._id || ret.id,
                    displayId: ret.returnId || ret._id || ret.id,
                    requestDate: ret.createdAt || ret.requestDate || ret.date,
                    reason: ret.evidence?.reason || ret.reason || ret.items?.[0]?.reason || '',
                    comments: ret.evidence?.comment || ret.comments || '',
                    images: ret.evidence?.images || ret.images || [],
                    type: 'refund'
                })));
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            console.error('Fetch returns failed', err);
        }
    }, [isUserRole, authLogout]);

    // ── Fetch Replacements ───────────────────────────────────────────────────
    const fetchReplacements = useCallback(async () => {
        if (!isUserRole || !hasAuthToken()) return;
        try {
            const res = await api.get('user/replacements');
            if (res.data.success) {
                const list = res.data.data?.replacements || res.data.replacements || [];
                setReplacements(list.map(rep => ({
                    ...rep,
                    id: rep._id || rep.id,
                    displayId: rep.replacementId || rep._id || rep.id,
                    requestDate: rep.createdAt || rep.requestDate || rep.date,
                    reason: rep.evidence?.reason || rep.reason || rep.originalItems?.[0]?.reason || '',
                    comments: rep.evidence?.comment || rep.comments || '',
                    images: rep.evidence?.images || rep.images || [],
                    video: rep.evidence?.video || rep.video || '',
                    evidenceVideo: rep.evidence?.video || rep.evidenceVideo || '',
                    items: rep.originalItems || rep.items || [],
                    type: 'replacement'
                })));
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            console.error('Fetch replacements failed', err);
        }
    }, [isUserRole, authLogout]);

    // ── Fetch Support Tickets ────────────────────────────────────────────────
    const fetchSupportTickets = useCallback(async () => {
        if (!isUserRole || !hasAuthToken()) return;
        try {
            const res = await api.get('user/support');
            if (res.data.success) {
                const list = res.data.data?.tickets || res.data.tickets || [];
                setSupportTickets(list.map(ticket => ({ ...ticket, id: ticket._id || ticket.id || ticket.ticketId })));
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            console.error('Fetch support tickets failed', err);
        }
    }, [isUserRole, authLogout]);

    // ── Support Ticket CRUD ──────────────────────────────────────────────────
    const createTicket = useCallback(async (ticketData) => {
        try {
            const res = await api.post('user/support', ticketData);
            if (res.data.success) {
                await fetchSupportTickets();
                showNotification('Support ticket created. We will get back to you soon!');
                return res.data.data?.ticket?._id || null;
            }
            const { toast } = await import('react-hot-toast');
            toast.error(res.data.message || 'Failed to create ticket');
        } catch (err) {
            const { toast } = await import('react-hot-toast');
            toast.error(err.response?.data?.message || 'Failed to create ticket');
        }
        return null;
    }, [fetchSupportTickets, showNotification]);

    const addTicketReply = useCallback(async (ticketId, reply) => {
        try {
            const res = await api.post(`user/support/${ticketId}/reply`, { message: reply.text || reply.message || '' });
            if (res.data.success) {
                await fetchSupportTickets();
                showNotification('Reply sent');
                return true;
            }
            const { toast } = await import('react-hot-toast');
            toast.error(res.data.message || 'Failed to send reply');
        } catch (err) {
            const { toast } = await import('react-hot-toast');
            toast.error(err.response?.data?.message || 'Failed to send reply');
        }
        return false;
    }, [fetchSupportTickets, showNotification]);

    const deleteTicket = useCallback((ticketId) => {
        setSupportTickets(prev => prev.filter(t => (t._id || t.id || t.ticketId) !== ticketId));
        showNotification('Ticket removed successfully.');
    }, [showNotification]);

    // ── Refresh aliases ──────────────────────────────────────────────────────
    const refreshOrders = useCallback(() => fetchOrders(), [fetchOrders]);
    const refreshReturns = useCallback(() => fetchReturns(), [fetchReturns]);
    const refreshReplacements = useCallback(() => fetchReplacements(), [fetchReplacements]);
    const refreshSupportTickets = useCallback(() => fetchSupportTickets(), [fetchSupportTickets]);

    // ── clearAllOnAccountDelete ──────────────────────────────────────────────
    const clearOrdersOnDelete = useCallback(() => {
        setOrders([]);
        setAddresses([]);
        setSupportTickets([]);
        setReturns([]);
        setReplacements([]);
        setDefaultAddressId(null);
        localStorage.removeItem('addresses');
        localStorage.removeItem('defaultAddressId');
    }, []);

    const value = {
        orders, returns, replacements, supportTickets,
        addresses, defaultAddressId,
        fetchOrders, fetchReturns, fetchReplacements, fetchSupportTickets, fetchAddresses,
        refreshOrders, refreshReturns, refreshReplacements, refreshSupportTickets,
        addAddress, removeAddress, updateAddress, setDefaultAddress,
        createTicket, addTicketReply, deleteTicket,
        clearOrdersOnDelete,
        // Expose setters for ShopContext aggregator to use after placeOrder
        setOrders,
    };

    return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
    const ctx = useContext(OrderContext);
    if (!ctx) throw new Error('useOrder must be used inside OrderProvider');
    return ctx;
};

export default OrderContext;
