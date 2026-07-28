import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import api from "../../../services/api";
import toast from "react-hot-toast";
import loginBg from "@assets/admin-login-bg.png";
import logoName from "@assets/sands-logoname.png";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { adminLogin } = useAuth();

  // Forgot Password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetType, setResetType] = useState("email"); // email or mobile
  const [resetEmail, setResetEmail] = useState("");
  const [resetMobile, setResetMobile] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: Send OTP, 2: Verify & Reset
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await adminLogin(email, password);
      if (result.success) {
        navigate("/admin");
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");

    try {
      if (resetType === "email") {
        const emailVal = String(resetEmail || "").trim().toLowerCase();
        if (!emailVal) {
          toast.error("Email is required");
          setResetLoading(false);
          return;
        }
        const res = await api.post("auth/admin/send-reset-otp", { email: emailVal });
        if (res.data?.success) {
          toast.success(res.data?.message || "OTP sent successfully");
          setResetStep(2);
        } else {
          toast.error(res.data?.message || "Failed to send OTP");
        }
      } else {
        const mobileVal = String(resetMobile || "").trim();
        if (!mobileVal) {
          toast.error("Mobile number is required");
          setResetLoading(false);
          return;
        }
        const res = await api.post("auth/admin/send-reset-mobile-otp", { mobileNumber: mobileVal });
        if (res.data?.success) {
          toast.success(res.data?.message || "OTP sent successfully");
          setResetStep(2);
        } else {
          toast.error(res.data?.message || "Failed to send OTP");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");

    try {
      const otp = String(resetOtp || "").trim();
      const newPassword = String(resetPassword || "").trim();
      if (!otp || !newPassword) {
        toast.error("OTP and new password are required");
        setResetLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        setResetLoading(false);
        return;
      }

      if (resetType === "email") {
        const emailVal = String(resetEmail || "").trim().toLowerCase();
        const res = await api.post("auth/admin/reset-password", {
          email: emailVal,
          otp,
          newPassword
        });
        if (res.data?.success) {
          toast.success("Password updated successfully");
          setShowForgotPassword(false);
          setResetStep(1);
          setResetOtp("");
          setResetPassword("");
        } else {
          toast.error(res.data?.message || "Reset failed");
        }
      } else {
        const mobileVal = String(resetMobile || "").trim();
        const res = await api.post("auth/admin/reset-password-mobile", {
          mobileNumber: mobileVal,
          otp,
          newPassword
        });
        if (res.data?.success) {
          toast.success("Password updated successfully");
          setShowForgotPassword(false);
          setResetStep(1);
          setResetOtp("");
          setResetPassword("");
        } else {
          toast.error(res.data?.message || "Reset failed");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Image with Zoom Animation */}
      <div
        className="absolute inset-0 z-0 scale-105 animate-slow-zoom"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[2px]" />

      <div className="max-w-md w-full relative z-20">
        {/* Branding Section */}
        <div className="text-center mb-10 flex flex-col items-center">
          <img
            src={logoName}
            alt="Sands Jewels"
            className="h-20 md:h-24 w-auto object-contain brightness-0 invert drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
          />
          <div className="mt-4 flex items-center gap-4 w-full px-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            <p className="text-white/70 text-[10px] uppercase tracking-[0.5em] font-bold whitespace-nowrap">
              Administrative Portal
            </p>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
          </div>
        </div>

        {/* Premium Login Card */}
        <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/20">
          {showForgotPassword ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#8D6E63] uppercase tracking-widest">
                  Reset Password
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetStep(1);
                    setError("");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors uppercase font-bold tracking-widest"
                >
                  Back to Login
                </button>
              </div>

              {resetStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => setResetType("email")}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        resetType === "email" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetType("mobile")}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        resetType === "mobile" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Mobile
                    </button>
                  </div>

                  {resetType === "email" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest ml-1">
                        Secure Email
                      </label>
                      <input
                        required
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="sandsjewels007@gmail.com"
                        className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest ml-1">
                        Mobile Number
                      </label>
                      <input
                        required
                        type="text"
                        value={resetMobile}
                        onChange={(e) => setResetMobile(e.target.value)}
                        placeholder="+919608811487"
                        className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:bg-[#2D1B18] transition-all shadow-xl shadow-[#3E2723]/20 active:scale-[0.98] disabled:opacity-70 group"
                  >
                    {resetLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="bg-[#FDFBF7] border border-[#EFEBE9] p-4 rounded-xl text-center space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">OTP Sent To</p>
                    <p className="text-xs font-mono font-bold text-[#3E2723]">
                      {resetType === "email" ? resetEmail : resetMobile}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest ml-1">
                      Enter OTP
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner text-center font-mono tracking-widest"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest ml-1">
                      New Password
                    </label>
                    <input
                      required
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:bg-[#2D1B18] transition-all shadow-xl shadow-[#3E2723]/20 active:scale-[0.98] disabled:opacity-70 group"
                  >
                    {resetLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                  <AlertCircle className="w-4 h-4 animate-bounce" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest ml-1">
                  Email Address or Mobile Number
                </label>
                <div className="relative group">
                  <input
                    required
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 px-12 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest">
                    Encrypted Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setResetStep(1);
                      setError("");
                    }}
                    className="text-[9px] font-bold text-gray-400 hover:text-[#8D6E63] uppercase tracking-wider transition-colors focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8D6E63] focus:outline-none cursor-pointer transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:bg-[#2D1B18] transition-all shadow-xl shadow-[#3E2723]/20 active:scale-[0.98] disabled:opacity-70 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate Access</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <p className="text-center mt-10 text-[10px] text-white/40 font-bold tracking-[0.3em] uppercase">
          &copy; 2025 Sands Jewels &middot; Highly Secure Access
        </p>
      </div>

      <style>
        {`
          @keyframes slow-zoom {
              0% { transform: scale(1); }
              100% { transform: scale(1.15); }
          }
          .animate-slow-zoom {
              animation: slow-zoom 30s ease-in-out infinite alternate;
          }
          .animate-shake {
              animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          }
          @keyframes shake {
              10%, 90% { transform: translate3d(-1px, 0, 0); }
              20%, 80% { transform: translate3d(2px, 0, 0); }
              30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
              40%, 60% { transform: translate3d(4px, 0, 0); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminLogin;
