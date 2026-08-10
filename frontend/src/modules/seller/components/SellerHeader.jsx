import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut, ShoppingBag, XCircle, RotateCcw, RefreshCw, AlertTriangle, CheckCircle2, Menu, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import { sellerOrderService } from '../services/sellerOrderService';
import { useAuth } from '../../../context/AuthContext';
const SellerHeader = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: seller, logout, refreshUser } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
        if (typeof refreshUser === 'function') {
            refreshUser();
        }

        // Production hardening: poll less frequently and avoid background-tab noise.
        const interval = setInterval(() => {
            loadNotifications();
            if (typeof refreshUser === 'function') refreshUser();
        }, 30000);
        const onVisibility = () => {
            if (!document.hidden) {
                loadNotifications();
                if (typeof refreshUser === 'function') refreshUser();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const loadNotifications = async () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        const res = await sellerOrderService.getNotifications({ page: 1, limit: 20 });
        const safeList = Array.isArray(res?.notifications) ? res.notifications : [];
        setNotifications(safeList);
        // Backend uses isRead; keep the UI stable by computing unread count here.
        setUnreadCount(safeList.filter(n => !n?.isRead).length);
    };

    const handleLogout = () => {
        logout();
        navigate('/seller/login');
    };

    const markRead = () => {
        sellerOrderService.markNotificationsRead();
        // Optimistic UI update: treat all as read right away.
        setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => ({ ...n, isRead: true })) : prev));
        setUnreadCount(0);
        setShowNotifications(!showNotifications);
    };

    const handleNotificationClick = async (notification) => {
        if (!notification) return;
        const id = notification._id || notification.id;
        const link = notification.link;

        // Optimistic: mark this one as read locally
        setNotifications((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((n) => {
                const nid = n?._id || n?.id;
                if (String(nid) !== String(id)) return n;
                return { ...n, isRead: true };
            });
        });
        setUnreadCount((c) => Math.max(0, Number(c || 0) - (notification?.isRead ? 0 : 1)));

        // Best-effort: persist read state
        if (id && !notification?.isRead) {
            await sellerOrderService.markNotificationRead(id);
        }

        setShowNotifications(false);
        if (link && typeof link === 'string') {
            navigate(link);
        }
    };

    const getIcon = (type) => {
        switch(type) {
            case 'ORDER': return <ShoppingBag className="text-blue-500" size={16} />;
            case 'CANCEL': return <XCircle className="text-red-500" size={16} />;
            case 'RETURN': return <RotateCcw className="text-amber-500" size={16} />;
            case 'REPLACEMENT': return <RefreshCw className="text-violet-500" size={16} />;
            case 'STOCK': return <AlertTriangle className="text-purple-500" size={16} />;
            default: return <Bell className="text-gray-400" size={16} />;
        }
    };

    const handleManualRefresh = async () => {
        try {
            setIsRefreshing(true);
            await loadNotifications();
            if (typeof refreshUser === 'function') await refreshUser();
        } finally {
            setIsRefreshing(false);
        }
    };

    const getStatusMeta = () => {
        const rawStatus = String(seller?.status || '').trim().toUpperCase();
        switch (rawStatus) {
            case 'APPROVED':
            case 'ACTIVE':
            case 'VERIFIED':
                return { label: 'Verified Merchant', tone: 'text-emerald-600' };
            case 'REJECTED':
                return { label: 'Rejected Account', tone: 'text-red-600' };
            default:
                return { label: 'Pending Approval', tone: 'text-amber-600' };
        }
    };

    // Helper to get page title based on path
    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('dashboard')) return 'Dashboard';
        if (path.includes('products')) return 'Products';
        if (path.includes('add-product')) return 'Add Product';
        if (path.includes('orders')) return 'Orders';
        if (path.includes('shipments')) return 'Shipments';
        if (path.includes('returns')) return 'Returns';
        if (path.includes('replacements')) return 'Replacements';
        if (path.includes('customers')) return 'Customer Management';
        if (path.includes('profile')) return 'Identity Configuration';
        if (path.includes('offline-sale')) return 'Direct Sales';
        if (path.includes('inventory')) return 'Inventory Analysis';
        return 'Seller Panel';
    };

    return (
        <header className={`h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 fixed top-0 right-0 z-40 shadow-sm font-sans transition-all duration-500 ease-in-out ${isSidebarOpen ? 'left-0 lg:left-80' : 'left-0 lg:left-20'}`}>
            <div className="flex items-center gap-3 lg:gap-4">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2.5 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 lg:border-none shadow-sm lg:shadow-none"
                >
                    <Menu className="w-5 h-5 text-gray-500" />
                </button>
                <h2 className="text-sm lg:text-lg font-bold text-gray-800 tracking-tight line-clamp-1">
                    {getPageTitle()}
                </h2>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
                {/* Notification Bell */}
                <div className="relative">
                    <button 
                        onClick={markRead}
                        className="relative p-2.5 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 shadow-sm group"
                    >
                        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-amber-600' : 'text-gray-500'} group-hover:scale-110 transition-transform`} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-6 font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[110]">
                            <div className="px-6 pb-4 border-b border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setShowNotifications(false)}
                                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-900 transition-all lg:hidden"
                                    >
                                        <ArrowLeft size={14} />
                                    </button>
                                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Activity Stream</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleManualRefresh}
                                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-900 transition-all"
                                        title="Refresh"
                                    >
                                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNotifications(false);
                                            navigate('/seller/notifications');
                                        }}
                                        className="text-[8px] font-black text-[#8D6E63] uppercase tracking-widest leading-none hover:underline"
                                        title="View all notifications"
                                    >
                                        View All
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto sidebar-scroll">
                                {notifications.length > 0 ? (
                                    notifications.map((n, i) => {
                                        const id = n?._id || n?.id;
                                        return (
                                            <div
                                                key={id || i}
                                                className="w-full px-6 py-4 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 flex gap-4 items-start justify-between group"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleNotificationClick(n)}
                                                    className="flex-1 min-w-0 text-left flex gap-4 items-start focus:outline-none"
                                                >
                                                    <div className="p-2 bg-gray-50 rounded-lg shrink-0">{getIcon(n.type)}</div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[10px] font-black text-gray-900 uppercase leading-snug line-clamp-1">{n.title}</p>
                                                            {!n.isRead && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed line-clamp-2">{n.message}</p>
                                                        <p className="text-[8px] font-medium text-gray-300 mt-1 uppercase tracking-tighter">
                                                            {new Date(n.createdAt || n.date || Date.now()).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (id) {
                                                            const success = await sellerOrderService.deleteNotification(id);
                                                            if (success) {
                                                                loadNotifications();
                                                            }
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all self-center shrink-0"
                                                    title="Delete notification"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-12 text-center space-y-3">
                                        <CheckCircle2 className="w-8 h-8 text-gray-100 mx-auto" strokeWidth={1} />
                                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-gray-100 mx-1 hidden sm:block" />

                {/* Profile */}
                <div className="flex items-center gap-2 lg:gap-3 group cursor-pointer">
                    <div className="text-right hidden sm:block font-medium">
                        <p className="text-[11px] lg:text-sm text-gray-900 font-bold tracking-tight uppercase line-clamp-1">{seller?.fullName || 'Seller'}</p>
                        <p className={`text-[9px] lg:text-xs font-black uppercase tracking-widest mt-0.5 ${getStatusMeta().tone}`}>{getStatusMeta().label}</p>
                    </div>
                    <div className="relative">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#3E2723] text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-[#3E2723]/20 border border-white/10 group-hover:scale-105 transition-transform">
                            {seller?.fullName?.charAt(0) || 'S'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default SellerHeader;
