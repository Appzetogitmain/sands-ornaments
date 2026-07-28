import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight, ShieldCheck, Phone } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import loginBg from '@assets/admin-login-bg.png';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const SellerLogin = () => {
    const navigate = useNavigate();
    const { sellerLogin } = useAuth();
    const [loginType, setLoginType] = useState('email'); // 'email' or 'mobile'
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [showReset, setShowReset] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1=email, 2=otp+newpass
    const [resetEmail, setResetEmail] = useState('');
    const [resetMobile, setResetMobile] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await sellerLogin(formData.identifier, formData.password);
            if (res.success) {
                navigate('/seller/dashboard');
            } else {
                setError(res.message || 'Invalid merchant credentials');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 px-12 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner";
    const iconClasses = "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors mt-[2px]";

    const openReset = () => {
        setShowReset(true);
        setResetStep(1);
        setResetEmail(loginType === 'email' ? formData.identifier : '');
        setResetMobile(loginType === 'mobile' ? formData.identifier : '');
        setResetOtp('');
        setResetPassword('');
    };

    const sendResetOtp = async () => {
        setResetLoading(true);
        try {
            if (loginType === 'email') {
                const email = String(resetEmail || '').trim().toLowerCase();
                if (!email) {
                    toast.error('Email is required');
                    return;
                }
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(email)) {
                    toast.error('Enter a valid email address');
                    return;
                }
                const res = await api.post('auth/seller/send-reset-otp', { email });
                if (res.data?.success) {
                    toast.success(res.data?.message || 'OTP sent to email');
                    setResetStep(2);
                } else {
                    toast.error(res.data?.message || 'Failed to send OTP');
                }
            } else {
                const mobile = String(resetMobile || '').trim();
                if (!mobile) {
                    toast.error('Mobile number is required');
                    return;
                }
                if (!/^\d{10}$/.test(mobile)) {
                    toast.error('Enter a valid 10-digit mobile number');
                    return;
                }
                const res = await api.post('auth/seller/send-reset-mobile-otp', { mobileNumber: mobile });
                if (res.data?.success) {
                    toast.success(res.data?.message || 'OTP sent to mobile');
                    setResetStep(2);
                } else {
                    toast.error(res.data?.message || 'Failed to send OTP');
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setResetLoading(false);
        }
    };

    const resetSellerPassword = async () => {
        setResetLoading(true);
        try {
            const otp = String(resetOtp || '').trim();
            const newPassword = String(resetPassword || '').trim();
            if (!otp || !newPassword) {
                toast.error('OTP and new password are required');
                return;
            }
            if (newPassword.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }

            if (loginType === 'email') {
                const email = String(resetEmail || '').trim().toLowerCase();
                if (!email) {
                    toast.error('Email is required');
                    return;
                }
                const res = await api.post('auth/seller/reset-password', { email, otp, newPassword });
                if (res.data?.success) {
                    toast.success(res.data?.message || 'Password updated');
                    setShowReset(false);
                    setResetStep(1);
                } else {
                    toast.error(res.data?.message || 'Password reset failed');
                }
            } else {
                const mobile = String(resetMobile || '').trim();
                if (!mobile) {
                    toast.error('Mobile number is required');
                    return;
                }
                const res = await api.post('auth/seller/reset-password-mobile', { mobileNumber: mobile, otp, newPassword });
                if (res.data?.success) {
                    toast.success(res.data?.message || 'Password updated');
                    setShowReset(false);
                    setResetStep(1);
                } else {
                    toast.error(res.data?.message || 'Password reset failed');
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Password reset failed');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-[#Fdfbf7]">
            {/* Elegant Sand-themed Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#D7CCC8]/40 to-[#EFEBE9]/40 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[#8D6E63]/20 to-[#D7CCC8]/20 blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-4xl bg-white/60 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_32px_rgba(141,110,99,0.08)] border border-white/80 relative z-10 flex flex-col md:flex-row gap-10 md:gap-16 items-center">
                
                {/* Left Side: Branding */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 md:border-r md:border-[#8D6E63]/20 md:pr-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-[#5D4037] via-[#8D6E63] to-[#D7CCC8] rounded-3xl flex items-center justify-center shadow-xl shadow-[#8D6E63]/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <span className="text-5xl font-bold text-white tracking-widest font-serif drop-shadow-md">S</span>
                    </div>
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight font-serif">Sands Jewels</h2>
                        <p className="text-sm sm:text-base font-semibold text-[#8D6E63] tracking-widest uppercase mt-3">Merchant Gateway</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 pt-8">
                        <ShieldCheck size={18} className="text-[#8D6E63]" />
                        <span className="text-xs font-medium text-gray-500 tracking-wide">Encrypted & Secure Session</span>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 w-full max-w-sm mx-auto space-y-6">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 animate-in shake-1 overflow-hidden">
                                <AlertCircle size={18} className="shrink-0" />
                                <span className="text-xs font-medium tracking-wide leading-relaxed">{error}</span>
                            </div>
                        )}

                        <div className="flex gap-2 p-1 bg-white/60 rounded-xl mb-4 border border-white">
                            <button 
                                type="button"
                                onClick={() => {
                                    setLoginType('email');
                                    setFormData({ identifier: '', password: '' });
                                    setError('');
                                }} 
                                className={`flex-1 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all ${loginType === 'email' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Email
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setLoginType('mobile');
                                    setFormData({ identifier: '', password: '' });
                                    setError('');
                                }} 
                                className={`flex-1 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all ${loginType === 'mobile' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Mobile
                            </button>
                        </div>

                        <div className="space-y-1">
                            <div className="relative group">
                                <input 
                                    required
                                    type={loginType === 'email' ? 'email' : 'text'}
                                    name="identifier"
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    className={inputClasses}
                                    placeholder={loginType === 'email' ? 'Enter Email Address' : 'Enter Mobile Number'}
                                />
                                {loginType === 'email' ? <Mail className={iconClasses} /> : <Phone className={iconClasses} />}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="relative group">
                                <input 
                                    required
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={inputClasses}
                                    placeholder="Enter Security Password"
                                />
                                <Lock className={iconClasses} />
                            </div>
                            <div className="flex justify-end p-1">
                                <button
                                    type="button"
                                    onClick={openReset}
                                    className="text-[10px] font-medium text-[#8D6E63] tracking-wide hover:text-[#3E2723] transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        <button 
                            disabled={loading}
                            type="submit" 
                            className="w-full bg-[#3E2723] text-white py-4 rounded-2xl font-medium tracking-wide text-xs shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Log In Now
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-6 border-t border-[#8D6E63]/10">
                        <Link to="/seller/register" className="inline-flex items-center gap-2 text-[#8D6E63] font-semibold text-xs hover:text-[#3E2723] transition-colors">
                            Create New Seller Account <LogIn size={14} />
                        </Link>
                    </div>
                </div>
            </div>

            {showReset && (
                <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white overflow-hidden font-sans">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 tracking-tight">Reset Password</h3>
                                <p className="text-[10px] font-medium text-gray-400 tracking-wide mt-1">
                                    {loginType === 'email'
                                        ? (resetStep === 1 ? 'Send OTP to email' : 'Verify OTP & set new password')
                                        : (resetStep === 1 ? 'Send OTP to mobile' : 'Verify OTP & set new password')
                                    }
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowReset(false)}
                                className="px-3 py-2 rounded-xl text-[10px] font-medium tracking-wide border border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {loginType === 'email' ? (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-gray-500 tracking-wide">Email</label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all"
                                        placeholder="Enter your registered email"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-gray-500 tracking-wide">Mobile Number</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        value={resetMobile}
                                        onChange={(e) => setResetMobile(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all"
                                        placeholder="Enter your registered mobile number"
                                    />
                                </div>
                            )}

                            {resetStep === 2 && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-gray-500 tracking-wide">OTP</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={resetOtp}
                                            onChange={(e) => setResetOtp(e.target.value)}
                                            className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all"
                                            placeholder="6-digit OTP"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-gray-500 tracking-wide">New Password</label>
                                        <input
                                            type="password"
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all"
                                            placeholder="Minimum 6 characters"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-50 flex items-center justify-end gap-3">
                            {resetStep === 1 ? (
                                <button
                                    type="button"
                                    disabled={resetLoading}
                                    onClick={sendResetOtp}
                                    className="bg-[#3E2723] text-white px-6 py-3 rounded-2xl font-medium tracking-wide text-[10px] hover:bg-[#2D1B18] transition-all disabled:opacity-70"
                                >
                                    {resetLoading ? 'Sending...' : 'Send OTP'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        disabled={resetLoading}
                                        onClick={() => {
                                            setResetStep(1);
                                            setResetOtp('');
                                            setResetPassword('');
                                        }}
                                        className="px-5 py-3 rounded-2xl font-medium tracking-wide text-[10px] border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-70"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={resetLoading}
                                        onClick={resetSellerPassword}
                                        className="bg-[#3E2723] text-white px-6 py-3 rounded-2xl font-medium tracking-wide text-[10px] hover:bg-[#2D1B18] transition-all disabled:opacity-70"
                                    >
                                        {resetLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerLogin;

