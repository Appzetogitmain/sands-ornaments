import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user, logout: authLogout } = useAuth();
    const { socket } = useSocket();
    const isUserRole = user?.role === 'user';
    const isAdminRole = user?.role === 'admin';
    const isSellerRole = user?.role === 'seller';
    const hasAuthToken = () => Boolean(localStorage.getItem('sands_token'));

    // Track seen event IDs to prevent duplicate toasts
    const seenEventIds = useRef(new Set());

    // ── State ────────────────────────────────────────────────────────────────
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        return localStorage.getItem('notificationsEnabled') === 'true';
    });

    const [userNotifications, setUserNotifications] = useState(() => {
        const saved = localStorage.getItem('userNotifications');
        return saved ? JSON.parse(saved) : [];
    });

    // ── Persistence ──────────────────────────────────────────────────────────
    useEffect(() => {
        localStorage.setItem('notificationsEnabled', notificationsEnabled);
    }, [notificationsEnabled]);

    useEffect(() => {
        localStorage.setItem('userNotifications', JSON.stringify(userNotifications));
    }, [userNotifications]);

    // ── fetchNotifications ───────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!user || !hasAuthToken() || user.role === 'seller') return;
        try {
            const res = await api.get('user/notifications');
            if (res.data.success) {
                const list = res.data.data?.notifications || res.data.notifications || [];
                setUserNotifications(list.map(note => ({ ...note, id: note._id || note.id })));
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            console.error('Fetch notifications failed', err);
        }
    }, [user, authLogout]);

    // Fetch on mount/login
    useEffect(() => {
        if (user && user.role !== 'seller') {
            fetchNotifications();
        }
    }, [user, fetchNotifications]);

    // ── deleteUserNotification (hide/delete notification) ──────────────────────
    const deleteUserNotification = useCallback(async (id) => {
        if (!user || !hasAuthToken() || user.role === 'seller') return;
        try {
            await api.delete(`user/notifications/${id}`);
            await fetchNotifications();
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            setUserNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
        }
    }, [user, fetchNotifications, authLogout]);

    // ── markNotificationRead ──────────────────────────────────────────────────
    const markNotificationRead = useCallback(async (id) => {
        if (!user || !hasAuthToken() || user.role === 'seller') return;
        try {
            await api.patch(`user/notifications/${id}/read`);
            await fetchNotifications();
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) { authLogout({ silent: true }); return; }
            setUserNotifications(prev => prev.map(n => {
                if ((n._id || n.id) === id) {
                    return { ...n, isReadByMe: true };
                }
                return n;
            }));
        }
    }, [user, fetchNotifications, authLogout]);

    // ── toggleNotificationSettings ───────────────────────────────────────────
    const toggleNotificationSettings = useCallback(() => {
        setNotificationsEnabled(prev => !prev);
    }, []);

    // ── clearOnDelete ────────────────────────────────────────────────────────
    const clearNotificationsOnDelete = useCallback(() => {
        setUserNotifications([]);
        localStorage.removeItem('userNotifications');
        localStorage.removeItem('notificationsEnabled');
    }, []);

    const refreshNotifications = useCallback(() => fetchNotifications(), [fetchNotifications]);

    // ── Socket Realtime Listeners ─────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !user) return;

        // ── Handler: New Order (Admin + Seller) ──────────────────────────
        const handleNewOrder = (data) => {
            // Deduplicate: avoid showing the same event twice
            const eventKey = `new_order_${data._id || data.orderId}`;
            if (seenEventIds.current.has(eventKey)) return;
            seenEventIds.current.add(eventKey);

            if (isAdminRole) {
                toast.success(
                    `🛒 New Order: #${data.orderId} — ₹${Number(data.total || 0).toLocaleString('en-IN')} from ${data.customerName || 'Customer'}`,
                    { duration: 6000, id: eventKey }
                );
            } else if (isSellerRole) {
                toast.success(
                    `🛒 New Order: #${data.orderId} — ${data.itemCount || 1} item(s)`,
                    { duration: 6000, id: eventKey }
                );
            }
        };

        // ── Handler: Order Status Update (User) ──────────────────────────
        const handleOrderStatusUpdate = (data) => {
            const eventKey = `status_update_${data._id}_${data.status}`;
            if (seenEventIds.current.has(eventKey)) return;
            seenEventIds.current.add(eventKey);

            const statusEmoji = {
                Confirmed: '✅',
                Packed: '📦',
                Shipped: '🚚',
                'Out for Delivery': '🏃',
                Delivered: '🎉',
                Cancelled: '❌',
            }[data.status] || '🔔';

            toast.success(
                `${statusEmoji} Order #${data.orderId} is now ${data.status}`,
                { duration: 7000, id: eventKey }
            );

            // Refresh notification list so the bell icon count updates
            if (user) {
                fetchNotifications();
            }
        };

        // ── Handler: Low Stock Alert (Seller) ─────────────────────────────
        const handleLowStock = (data) => {
            const eventKey = `low_stock_${data.productName}_${data.variantName}`;
            if (seenEventIds.current.has(eventKey)) return;
            seenEventIds.current.add(eventKey);

            if (isSellerRole) {
                toast(data.message, {
                    icon: '⚠️',
                    duration: 8000,
                    id: eventKey,
                    style: { background: '#FFF7ED', color: '#92400E', border: '1px solid #FDE68A' }
                });
            }
        };

        // ── Handler: Broadcast Notification (User) ───────────────────────
        const handleBroadcastNotification = (data) => {
            const eventKey = `broadcast_${data._id || data.id}`;
            if (seenEventIds.current.has(eventKey)) return;
            seenEventIds.current.add(eventKey);

            if (user) {
                toast.success(
                    `📢 ${data.title}: ${data.message}`,
                    { duration: 8000, id: eventKey }
                );
                setUserNotifications(prev => {
                    const exists = prev.some(n => (n._id || n.id) === (data._id || data.id));
                    if (exists) return prev;
                    const mappedNote = { ...data, id: data._id || data.id, isReadByMe: false };
                    return [mappedNote, ...prev];
                });
            }
        };

        socket.on('new_order', handleNewOrder);
        socket.on('order_status_update', handleOrderStatusUpdate);
        socket.on('low_stock_alert', handleLowStock);
        socket.on('broadcast_notification', handleBroadcastNotification);

        return () => {
            socket.off('new_order', handleNewOrder);
            socket.off('order_status_update', handleOrderStatusUpdate);
            socket.off('low_stock_alert', handleLowStock);
            socket.off('broadcast_notification', handleBroadcastNotification);
        };
    }, [socket, user, isAdminRole, isSellerRole, fetchNotifications]);

    // Compute unreadCount based on notifications where isReadByMe is false
    const unreadCount = userNotifications.filter(n => !n.isReadByMe).length;

    const value = {
        userNotifications, notificationsEnabled, unreadCount,
        fetchNotifications, deleteUserNotification, markNotificationRead,
        toggleNotificationSettings, refreshNotifications,
        clearNotificationsOnDelete,
        // Expose setter for ShopContext clear-on-logout
        setUserNotifications,
    };

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used inside NotificationProvider');
    return ctx;
};

export default NotificationContext;
