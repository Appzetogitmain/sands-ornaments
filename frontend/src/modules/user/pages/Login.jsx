import React, { useState, useEffect } from "react";
import loginHero from "@assets/login_hero_silver.png";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Crown, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useShop } from "../../../context/ShopContext";
import {
  readMenPendingCartItem,
  clearMenPendingCartItem,
} from "../utils/menNavigation";
import {
  readWomenPendingCartItem,
  clearWomenPendingCartItem,
} from "../utils/womenNavigation";

import logo from "@assets/SANDS JEWELS PINK (1).png";

const Login = () => {
  const { sendOtp, verifyOtp } = useAuth();
  const { addToCart } = useShop();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine mode based on URL
  const isSignup = location.pathname === "/signup";
  const redirectParam = new URLSearchParams(location.search).get("redirect");
  const redirectTarget =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/profile";

  const [phoneNumber, setPhoneNumber] = useState("");
  const [loginStep, setLoginStep] = useState(1);
  const [otp, setOtp] = useState(["", "", "", ""]);

  // Additional fields for Signup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Reset state when mode changes
  useEffect(() => {
    setLoginStep(1);
    setPhoneNumber("");
    setOtp(["", "", "", ""]);
    setFullName("");
    setEmail("");
  }, [isSignup]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phoneNumber.length === 10) {
      const res = await sendOtp(phoneNumber, isSignup ? "signup" : "login");
      if (res.success) {
        setLoginStep(2);
      } else {
        toast.error(res.message);
      }
    } else {
      toast.error("Please enter a valid 10-digit phone number");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length === 4) {
      const res = await verifyOtp(
        phoneNumber,
        enteredOtp,
        isSignup ? "signup" : "login",
        isSignup
          ? {
            name: fullName.trim(),
            email: email.trim(),
          }
          : {},
      );
      if (res.success) {
        const pendingWomenCartItem = readWomenPendingCartItem();
        if (pendingWomenCartItem) {
          addToCart(pendingWomenCartItem);
          clearWomenPendingCartItem();
          navigate("/cart", { replace: true });
          return;
        }

        const pendingCartItem = readMenPendingCartItem();
        if (pendingCartItem) {
          addToCart(pendingCartItem);
          clearMenPendingCartItem();
          navigate("/cart", { replace: true });
          return;
        }

        navigate(redirectTarget, { replace: true });
      } else {
        toast.error(res.message);
      }
    } else {
      toast.error("Please enter the 4-digit OTP");
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;
    let newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 overflow-hidden bg-white">
      {/* Dynamic Background - Abstract Luxury */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-left-bottom scale-[1.35] origin-bottom-left animate-in fade-in duration-1000 grayscale-[20%]"
          style={{
            backgroundImage: `url(${loginHero})`, // Using existing local hero
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-black/20 backdrop-blur-[2px]"></div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-[60] text-black hover:bg-black/5 p-3 rounded-full transition-all group">
        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* Mobile View - Clean & Minimal */}
      <div className="absolute inset-0 z-50 flex flex-col justify-center px-4">
        <div className="relative w-full max-w-sm mx-auto p-[2px] rounded-[2rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          {/* Animated Border */}
          <div className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#D39A9F_360deg)] animate-[spin_4s_linear_infinite] z-0" />
          
          <div className="relative z-10 bg-white/90 backdrop-blur-xl px-6 py-8 rounded-[calc(2rem-2px)] w-full mx-auto">
          {/* Brand */}
          <div className="text-center mb-8 flex flex-col items-center">
            <img
              src={logo}
              alt="Sands Jewels"
              className="w-32 h-auto object-contain mb-2 drop-shadow-sm"
            />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-serif text-black mb-1">
              {loginStep === 1
                ? isSignup
                  ? "Create Account"
                  : "Welcome Back"
                : "Verify OTP"}
            </h2>
            <p className="text-gray-500 text-sm font-serif italic">
              {loginStep === 1
                ? isSignup
                  ? "Begin your journey with us."
                  : "Please login to continue."
                : `Enter code sent to +91 ${phoneNumber}`}
            </p>
          </div>

          {loginStep === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-400 tracking-wide pl-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-12 bg-white border border-[#EBCDD0] rounded-xl px-4 text-black font-medium placeholder:text-gray-300 focus:border-[#D39A9F] focus:ring-1 focus:ring-[#D39A9F] outline-none transition-all"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-400 tracking-wide pl-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 bg-white border border-[#EBCDD0] rounded-xl px-4 text-black font-medium placeholder:text-gray-300 focus:border-[#D39A9F] focus:ring-1 focus:ring-[#D39A9F] outline-none transition-all"
                      placeholder="Enter your email"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-gray-400 tracking-wide pl-1">
                  Mobile Number
                </label>
                <div className="flex bg-white border border-[#EBCDD0] rounded-xl overflow-hidden h-12 items-center focus-within:border-[#D39A9F] focus-within:ring-1 focus-within:ring-[#D39A9F] transition-all">
                  <div className="h-full px-4 flex items-center gap-2 text-black font-medium border-r border-[#EBCDD0]">
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="96088 11487"
                    className="flex-1 h-full bg-transparent border-0 px-4 text-black font-medium text-lg placeholder:text-gray-300 focus:ring-0 outline-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-medium tracking-wide text-xs hover:bg-[#2D1B18] hover:text-white transition-all shadow-md mt-2">
                Get OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-between gap-3 px-2">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onFocus={(e) => e.target.select()}
                    className="w-14 h-16 bg-transparent border-b-2 border-[#EBCDD0] focus:border-[#D39A9F] text-center text-3xl font-medium text-black outline-none transition-all p-0 rounded-none"
                  />
                ))}
              </div>
              <button
                type="submit"
                className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-medium tracking-wide text-xs hover:bg-[#2D1B18] hover:text-white transition-all shadow-md">
                Verify & Proceed
              </button>
              <button
                type="button"
                onClick={() => setLoginStep(1)}
                className="w-full text-center text-[10px] font-medium text-gray-400 tracking-wide py-2 hover:text-[#D39A9F] transition-colors">
                Change Mobile Number
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 font-medium font-serif">
              {isSignup ? "Already a Member?" : "New here?"}
              <Link
                to={isSignup ? "/login" : "/signup"}
                className="ml-1 text-black font-medium border-b border-black hover:text-[#D39A9F] hover:border-[#D39A9F] transition-colors">
                {isSignup ? "Login" : "Join Now"}
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>


    </div>
  );
};

export default Login;
