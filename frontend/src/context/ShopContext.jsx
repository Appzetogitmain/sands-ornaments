/**
 * ShopContext — Lean Aggregator (post-split architecture)
 *
 * Owns:
 *  - Global UI state: notification toast, pincode modal, activeMetal, pincode, globalGst
 *  - Catalogue: products, categories, coupons (from useCatalogue)
 *  - Auth lifecycle hooks (login/logout side-effects on sub-contexts)
 *
 * Delegates to sub-contexts:
 *  - CartContext       → cart, coupon logic, placeOrder
 *  - WishlistContext   → wishlist
 *  - OrderContext      → orders, addresses, returns, replacements, support
 *  - NotificationContext → userNotifications, notificationsEnabled
 *
 * BACKWARD COMPATIBILITY: useShop() returns the EXACT same shape as before,
 * so no consuming component needs to be changed.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCatalogue } from '../hooks/useCatalogue';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import { useOrder } from './OrderContext';
import { useNotification } from './NotificationContext';
import api from '../services/api';

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { user, loading: authLoading, logout: authLogout, deleteAccount: authDeleteAccount, updateProfile } = useAuth();
    const isUserRole = user?.role === 'user';

    // ── Global UI State ──────────────────────────────────────────────────────
    const [notification, setNotification] = useState(null);
    const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);
    const [pincode, setPincode] = useState(() => localStorage.getItem('user_pincode') || '');
    const [pincodeData, setPincodeData] = useState(() => {
        try {
            const saved = localStorage.getItem('user_pincode_data');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [activeMetal, setActiveMetal] = useState(() => localStorage.getItem('user_active_metal') || 'silver');
    const [globalGst, _setGlobalGst] = useState(() => localStorage.getItem('admin_global_gst') || '0');

    const showNotification = useCallback((message) => setNotification(message), []);

    const setGlobalGst = useCallback((val) => {
        _setGlobalGst(val);
        localStorage.setItem('admin_global_gst', val);
    }, []);

    const updateActiveMetal = useCallback((metal) => {
        setActiveMetal(metal);
        localStorage.setItem('user_active_metal', metal);
    }, []);

    const updatePincode = useCallback((newPincode) => {
        setPincode(newPincode);
        if (newPincode) localStorage.setItem('user_pincode', newPincode);
        else {
            localStorage.removeItem('user_pincode');
            localStorage.removeItem('user_pincode_data');
            setPincodeData(null);
        }
    }, []);

    const checkPincodeServiceability = useCallback(async (targetPincode) => {
        const pinStr = String(targetPincode || '').trim();
        if (!pinStr) {
            const errorResult = { serviceable: false, reason: "Pincode is required" };
            setPincodeData(errorResult);
            return errorResult;
        }

        setPincodeLoading(true);
        try {
            const response = await api.get(`/public/logistics/check-pincode?pincode=${pinStr}`);
            const result = response.data?.data || {};
            setPincodeData(result);
            if (result.serviceable) {
                setPincode(pinStr);
                localStorage.setItem('user_pincode', pinStr);
                localStorage.setItem('user_pincode_data', JSON.stringify(result));
            } else {
                localStorage.removeItem('user_pincode_data');
            }
            return result;
        } catch (err) {
            const errorResult = {
                pincode: pinStr,
                serviceable: false,
                reason: err.response?.data?.message || "Failed to verify pincode"
            };
            setPincodeData(errorResult);
            return errorResult;
        } finally {
            setPincodeLoading(false);
        }
    }, []);


    // Auto-hide notification after 3s
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // ── Catalogue ────────────────────────────────────────────────────────────
    const { products, categories, coupons: apiCoupons, siteSettings, isLoading: isCatalogueLoading } = useCatalogue();

    useEffect(() => {
        localStorage.setItem('sands_products', JSON.stringify(products));
    }, [products]);

    // ── Sub-context delegates ────────────────────────────────────────────────
    const cartCtx = useCart();
    const wishlistCtx = useWishlist();
    const orderCtx = useOrder();
    const notifCtx = useNotification();

    // Feed apiCoupons into CartContext so coupons list stays fresh
    useEffect(() => {
        if (apiCoupons.length > 0) cartCtx.setCoupons(apiCoupons);
    }, [apiCoupons]);

    // Persist coupons list
    useEffect(() => {
        localStorage.setItem('sands_coupons', JSON.stringify(cartCtx.coupons));
    }, [cartCtx.coupons]);

    // ── Auth Lifecycle (login / logout triggers) ─────────────────────────────
    useEffect(() => {
        if (!authLoading && user && isUserRole) {
            // Sync guest data then fetch everything
            wishlistCtx.syncGuestWishlist();
            cartCtx.syncGuestCart();
            orderCtx.fetchAddresses();
            notifCtx.fetchNotifications();
            orderCtx.fetchOrders();
            orderCtx.fetchReturns();
            orderCtx.fetchReplacements();
            orderCtx.fetchSupportTickets();
        } else if (!authLoading && !user) {
            // Clear server-bound data on logout
            orderCtx.setOrders([]);
            wishlistCtx.setWishlist([]);
            orderCtx.clearOrdersOnDelete();
            notifCtx.setUserNotifications([]);
        }
    }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── logout (with cart/wishlist cleanup) ──────────────────────────────────
    const logout = useCallback(() => {
        authLogout();
        cartCtx.setCart([]);
        wishlistCtx.setWishlist([]);
        cartCtx.clearAppliedCoupon();
    }, [authLogout, cartCtx, wishlistCtx]);

    // ── deleteAccount ────────────────────────────────────────────────────────
    const deleteAccount = useCallback(async () => {
        const result = await authDeleteAccount();
        if (!result?.success) return result;

        cartCtx.clearCartOnDelete();
        wishlistCtx.clearWishlistOnDelete();
        orderCtx.clearOrdersOnDelete();
        notifCtx.clearNotificationsOnDelete();

        localStorage.removeItem('sands_token');
        localStorage.removeItem('sands_current_user');
        return result;
    }, [authDeleteAccount, cartCtx, wishlistCtx, orderCtx, notifCtx]);

    // ── placeOrder wrapper: refresh orders after COD success ─────────────────
    // CartContext.placeOrder calls onOrderPlaced which is passed as a prop at provider level.
    // We wire that here so orders auto-refresh after every successful placement.

    const placeOrder = useCallback(async (orderDetails) => {
        const orderId = await cartCtx.placeOrder(orderDetails);
        if (orderId) {
            await orderCtx.fetchOrders();
        }
        return orderId;
    }, [cartCtx, orderCtx]);

    // ── getRecommendations (stub) ─────────────────────────────────────────────
    const getRecommendations = useCallback((uid, n) => products.slice(0, n), [products]);

    // ── getVariantById / getPackById ─────────────────────────────────────────
    const getVariantById = useCallback((variantId) => {
        for (const prod of products) {
            const v = (prod.variants || []).find(v => v.id === variantId || v._id === variantId);
            if (v) return { ...v, product: prod };
        }
        return null;
    }, [products]);

    const getPackById = useCallback((packId) => {
        return products.find(p => p.id === packId) || null;
    }, [products]);

    // ── Legacy login stub (auth is in AuthContext) ───────────────────────────
    const login = useCallback(() => {}, []);

    // ── contextValue: exact same shape as original ShopContext ───────────────
    const contextValue = useMemo(() => ({
        // Cart domain
        cart: cartCtx.cart,
        addToCart: cartCtx.addToCart,
        removeFromCart: cartCtx.removeFromCart,
        updateQuantity: cartCtx.updateQuantity,
        updateCartQty: cartCtx.updateCartQty,
        clearCart: cartCtx.clearCart,
        getCart: cartCtx.getCart,
        coupons: cartCtx.coupons,
        appliedCoupon: cartCtx.appliedCoupon,
        couponDiscount: cartCtx.couponDiscount,
        applyCoupon: cartCtx.applyCoupon,
        clearAppliedCoupon: cartCtx.clearAppliedCoupon,
        validateCoupon: cartCtx.validateCoupon,
        getActiveCoupons: cartCtx.getActiveCoupons,
        addCoupon: cartCtx.addCoupon,
        updateCoupon: cartCtx.updateCoupon,
        deleteCoupon: cartCtx.deleteCoupon,
        toggleCoupon: cartCtx.toggleCoupon,
        toggleGiftWrap: cartCtx.toggleGiftWrap,
        updateGiftMessage: cartCtx.updateGiftMessage,

        // Wishlist domain
        wishlist: wishlistCtx.wishlist,
        addToWishlist: wishlistCtx.addToWishlist,
        removeFromWishlist: wishlistCtx.removeFromWishlist,
        toggleWishlist: wishlistCtx.toggleWishlist,

        // Order domain
        orders: orderCtx.orders,
        returns: orderCtx.returns,
        replacements: orderCtx.replacements,
        supportTickets: orderCtx.supportTickets,
        addresses: orderCtx.addresses,
        defaultAddressId: orderCtx.defaultAddressId,
        addAddress: orderCtx.addAddress,
        removeAddress: orderCtx.removeAddress,
        updateAddress: orderCtx.updateAddress,
        setDefaultAddress: orderCtx.setDefaultAddress,
        createTicket: orderCtx.createTicket,
        addTicketReply: orderCtx.addTicketReply,
        deleteTicket: orderCtx.deleteTicket,
        refreshOrders: orderCtx.refreshOrders,
        refreshReturns: orderCtx.refreshReturns,
        refreshReplacements: orderCtx.refreshReplacements,
        refreshSupportTickets: orderCtx.refreshSupportTickets,

        // Notification domain
        userNotifications: notifCtx.userNotifications,
        notificationsEnabled: notifCtx.notificationsEnabled,
        deleteUserNotification: notifCtx.deleteUserNotification,
        toggleNotificationSettings: notifCtx.toggleNotificationSettings,
        refreshNotifications: notifCtx.refreshNotifications,

        // Aggregated helpers (need both cart + order)
        placeOrder,
        deleteAccount,
        logout,
        login,
        updateProfile,
        getRecommendations,
        getVariantById,
        getPackById,

        // Global UI & config
        user,
        showNotification,
        notification,
        isPincodeModalOpen, setIsPincodeModalOpen,
        pincode, updatePincode,
        pincodeData, pincodeLoading, checkPincodeServiceability,
        activeMetal, updateActiveMetal,
        globalGst, setGlobalGst,

        // Catalogue (read-only from useCatalogue)
        products,
        categories,
        siteSettings,
        isLoading: isCatalogueLoading,
    }), [
        // Cart
        cartCtx.cart, cartCtx.coupons, cartCtx.appliedCoupon, cartCtx.couponDiscount,
        cartCtx.addToCart, cartCtx.removeFromCart, cartCtx.updateQuantity,
        cartCtx.updateCartQty, cartCtx.clearCart, cartCtx.getCart,
        cartCtx.applyCoupon, cartCtx.clearAppliedCoupon, cartCtx.validateCoupon,
        cartCtx.getActiveCoupons, cartCtx.addCoupon, cartCtx.updateCoupon,
        cartCtx.deleteCoupon, cartCtx.toggleCoupon,
        cartCtx.toggleGiftWrap, cartCtx.updateGiftMessage,
        // Wishlist
        wishlistCtx.wishlist, wishlistCtx.addToWishlist,
        wishlistCtx.removeFromWishlist, wishlistCtx.toggleWishlist,
        // Order
        orderCtx.orders, orderCtx.returns, orderCtx.replacements,
        orderCtx.supportTickets, orderCtx.addresses, orderCtx.defaultAddressId,
        orderCtx.addAddress, orderCtx.removeAddress, orderCtx.updateAddress,
        orderCtx.setDefaultAddress, orderCtx.createTicket,
        orderCtx.addTicketReply, orderCtx.deleteTicket,
        orderCtx.refreshOrders, orderCtx.refreshReturns,
        orderCtx.refreshReplacements, orderCtx.refreshSupportTickets,
        // Notification
        notifCtx.userNotifications, notifCtx.notificationsEnabled,
        notifCtx.deleteUserNotification, notifCtx.toggleNotificationSettings,
        notifCtx.refreshNotifications,
        // Aggregated
        placeOrder, deleteAccount, logout, login, updateProfile,
        getRecommendations, getVariantById, getPackById,
        // UI
        user, notification, isPincodeModalOpen, pincode, pincodeData, pincodeLoading, activeMetal, globalGst,
        showNotification, setIsPincodeModalOpen, updatePincode, checkPincodeServiceability,
        updateActiveMetal, setGlobalGst,
        // Catalogue
        products, categories, isCatalogueLoading,
    ]);


    return (
        <ShopContext.Provider value={contextValue}>
            {children}
            {/* Custom Toast Notification */}
            {notification && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#3E2723] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 min-w-[300px] justify-center">
                        <div className="bg-white/20 p-1 rounded-full">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-sm tracking-wide">{notification}</span>
                    </div>
                </div>
            )}
        </ShopContext.Provider>
    );
};

export const useShop = () => useContext(ShopContext);
