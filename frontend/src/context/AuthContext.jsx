import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { registerFCMToken } from '../services/pushNotificationService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user on startup
    useEffect(() => {
        const path = window.location.pathname;
        let tokenKey = 'sands_token';
        let userKey = 'sands_current_user';

        if (path.startsWith('/admin')) {
            tokenKey = 'sands_admin_token';
            userKey = 'sands_admin_user';
        } else if (path.startsWith('/seller')) {
            tokenKey = 'sands_seller_token';
            userKey = 'sands_seller_user';
        }

        const token = localStorage.getItem(tokenKey);
        if (token) {
            const cachedUser = localStorage.getItem(userKey);
            if (cachedUser) {
                try {
                    setUser(JSON.parse(cachedUser));
                } catch (e) {}
            }
            loadUser(userKey);
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async (userKey) => {
        try {
            const res = await api.get('auth/me');
            if (res.data.success) {
                // The backend success utility wraps everything in a 'data' field
                const userData = res.data.data?.user || res.data.user;
                if (userData) {
                    setUser(userData);
                    localStorage.setItem(userKey, JSON.stringify(userData));
                }
            }
        } catch (err) {
            console.error("Failed to load user:", err.message);
            logout();
        } finally {
            setLoading(false);
        }
    };

    // --- USER AUTH (OTP) ---
    const sendOtp = async (phone, type) => {
        try {
            const res = await api.post('auth/send-otp', { phone, type });
            return res.data;
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Failed to send OTP" };
        }
    };

    const verifyOtp = async (phone, otp, type, profileData = {}) => {
        try {
            const payload = {
                phone,
                otp,
                type,
                ...(profileData?.name ? { name: profileData.name } : {}),
                ...(profileData?.email ? { email: profileData.email } : {})
            };
            const res = await api.post('auth/verify-otp', payload);
            if (res.data.success) {
                const { user: userData, token } = res.data.data;
                setUser(userData);
                localStorage.setItem('sands_token', token);
                localStorage.setItem('sands_current_user', JSON.stringify(userData));
                toast.success("Login successful!");
                // Register FCM token
                registerFCMToken(true).catch(err => console.error("FCM registration error:", err));
            }
            return res.data;
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Invalid OTP" };
        }
    };

    // --- ADMIN AUTH ---
    const adminLogin = async (email, password) => {
        try {
            const res = await api.post('auth/admin/login', { email, password });
            if (res.data.success) {
                // Backend returns { success: true, data: { token, user } }
                const { user: userData, token } = res.data.data;
                setUser(userData);
                localStorage.setItem('sands_admin_token', token);
                localStorage.setItem('sands_admin_user', JSON.stringify(userData));
                toast.success("Admin login successful!");
                // Register FCM token
                registerFCMToken(true).catch(err => console.error("FCM registration error:", err));
            }
            return res.data;
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Invalid admin credentials" };
        }
    };

    // --- SELLER AUTH ---
    const sellerRegister = async (sellerData) => {
        try {
            const config = sellerData instanceof FormData
                ? { headers: { 'Content-Type': 'multipart/form-data' } }
                : undefined;
            const res = await api.post('auth/seller/register', sellerData, config);
            return res.data;
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Seller registration failed" };
        }
    };

    const sellerLogin = async (identifier, password) => {
        try {
            const res = await api.post('auth/seller/login', { identifier, password });
            if (res.data.success) {
                const { user: userData, token } = res.data.data;
                const normalizedUser = userData?.role ? userData : { ...userData, role: 'seller' };
                setUser(normalizedUser);
                localStorage.setItem('sands_seller_token', token);
                localStorage.setItem('sands_seller_user', JSON.stringify(normalizedUser));
                toast.success("Seller login successful!");
                // Register FCM token
                registerFCMToken(true).catch(err => console.error("FCM registration error:", err));
            }
            return res.data;
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Invalid seller credentials" };
        }
    };

    const logout = (options = {}) => {
        setUser(null);
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
            localStorage.removeItem('sands_admin_token');
            localStorage.removeItem('sands_admin_user');
        } else if (path.startsWith('/seller')) {
            localStorage.removeItem('sands_seller_token');
            localStorage.removeItem('sands_seller_user');
        } else {
            localStorage.removeItem('sands_token');
            localStorage.removeItem('sands_current_user');
        }
        if (!options?.silent) {
            toast.success("Logged out successfully");
        }
    };

    const deleteAccount = async () => {
        try {
            const res = await api.delete('user/profile/me');
            if (res.data.success) {
                logout({ silent: true });
                toast.success("Account deleted successfully");
                return { success: true, message: res.data.message || "Account deleted successfully" };
            }
            return { success: false, message: res.data.message || "Failed to delete account" };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Failed to delete account" };
        }
    };

    const refreshUser = async () => {
        const path = window.location.pathname;
        let userKey = 'sands_current_user';
        if (path.startsWith('/admin')) {
            userKey = 'sands_admin_user';
        } else if (path.startsWith('/seller')) {
            userKey = 'sands_seller_user';
        }
        try {
            const res = await api.get('auth/me');
            if (res.data.success) {
                const userData = res.data.data?.user || res.data.user;
                if (userData) {
                    setUser(userData);
                    localStorage.setItem(userKey, JSON.stringify(userData));
                }
            }
        } catch (err) {
            console.error("Failed to refresh user:", err.message);
        }
    };

    const updateProfile = async (profileData) => {
        const originalUser = user;
        // Optimistically update frontend user state immediately
        const optimisticUser = {
            ...user,
            ...profileData
        };
        setUser(optimisticUser);

        try {
            const res = await api.put('user/profile/me', profileData);
            if (res.data.success) {
                const updatedUser = res.data.data?.user || res.data.user;
                if (updatedUser) {
                    setUser(updatedUser);
                    localStorage.setItem('sands_current_user', JSON.stringify(updatedUser));
                }
                return { success: true, user: updatedUser, message: res.data.message || "Profile updated successfully" };
            }
            // Revert on failure
            setUser(originalUser);
            return { success: false, message: res.data.message || "Failed to update profile" };
        } catch (err) {
            // Revert on error
            setUser(originalUser);
            return { success: false, message: err.response?.data?.message || err.message || "Failed to update profile" };
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            sendOtp, 
            verifyOtp, 
            adminLogin, 
            sellerRegister, 
            sellerLogin, 
            logout,
            deleteAccount,
            updateProfile,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};
