import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Heart,
  Send,
  Sparkles,
  ShieldCheck,
  Clock,
  Check,
  ChevronRight,
  Lock,
} from "lucide-react";
import { useShop } from "../../../context/ShopContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { formatCurrency } from "../utils/price";

// Import the generated mockup image
import giftCardMockup from "@assets/sands_gift_card_mockup_1777455722986.png";

const GIFT_AMOUNTS = [1000, 2500, 5000, 10000, 25000];

const GiftCardsPage = () => {
  const navigate = useNavigate();
  const { addToCart } = useShop();

  const [selectedAmount, setSelectedAmount] = useState(2500);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    senderName: "",
    message: "",
  });

  // Balance check states
  const [balanceCode, setBalanceCode] = useState("");
  const [balanceResult, setBalanceResult] = useState(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const handleCheckBalance = async () => {
    const code = balanceCode.toUpperCase().trim();
    if (!code) {
      toast.error("Please enter a gift card code.");
      return;
    }
    setCheckingBalance(true);
    setBalanceResult(null);
    try {
      const res = await api.get(`user/gift-cards/validate/${code}`);
      if (res.data.success) {
        setBalanceResult(res.data.data);
        toast.success("Balance retrieved successfully!");
      } else {
        toast.error(res.data.message || "Failed to retrieve balance.");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gift card code is invalid or expired.",
      );
    } finally {
      setCheckingBalance(false);
    }
  };

  const finalAmount = isCustomAmount ? Number(customAmount) : selectedAmount;

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleBuyNow = () => {
    if (isCustomAmount && (!customAmount || Number(customAmount) < 500)) {
      toast.error("Minimum gift card amount is ₹500");
      return;
    }
    if (
      !formData.recipientName ||
      !formData.recipientEmail ||
      !formData.senderName
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!EMAIL_REGEX.test(formData.recipientEmail.trim())) {
      toast.error("Please enter a valid recipient email address");
      return;
    }

    const giftCardItem = {
      id: `GIFT_CARD_${Date.now()}`,
      name: `Sands E-Gift Card (₹${finalAmount})`,
      price: finalAmount,
      image: giftCardMockup,
      isGiftCard: true,
      personalization: formData,
      quantity: 1,
    };

    addToCart(giftCardItem);
    toast.success("Gift card added to bag!");
    navigate("/cart");
  };

  return (
    <div className="bg-[#FDF5F6] min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100 py-16 md:py-24">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#FDF5F6] to-transparent opacity-50" />
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 bg-[#8E2B45]/5 px-4 py-2 rounded-full border border-[#8E2B45]/10">
                <Sparkles className="w-4 h-4 text-[#8E2B45]" />
                <span className="text-[10px] font-bold text-[#8E2B45] uppercase tracking-[0.2em]">
                  The Perfect Surprise
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-display font-semibold text-gray-900 leading-tight tracking-tight">
                Give the gift of <br />
                <span className="text-[#8E2B45] font-bold">
                  Infinite Choice
                </span>
              </h1>

              <p className="text-gray-600 text-lg leading-relaxed max-w-lg">
                Elevate every celebration with the Sands E-Gift Card. Whether
                it's a birthday, anniversary, or a simple "thank you", let them
                discover the brilliance of pure silver craftsmanship.
              </p>

              <div className="flex flex-wrap gap-8 items-center pt-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Instant
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Email Delivery
                  </span>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-gray-900 tracking-tight">
                    No Expiry
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Lifetime Validity
                  </span>
                </div>
                <div className="w-px h-10 bg-gray-100" />
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Secure
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    100% Protected
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-[#8E2B45]/5 blur-3xl rounded-full" />
              <img
                src={giftCardMockup}
                alt="Sands Gift Card Mockup"
                className="relative z-10 w-full max-w-lg mx-auto rounded-[2rem] shadow-2xl shadow-black/10 transform hover:scale-[1.02] transition-transform duration-700"
              />

              {/* Floating Badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-4 -right-4 z-20 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black">
                      Secure
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium">
                      Encrypted Checkout
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Selection Section */}
      <div className="container mx-auto px-6 md:px-12 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left: Configuration */}
          <div className="lg:col-span-7 space-y-12">
            {/* Amount Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold">
                  1
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Select Amount
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {GIFT_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setSelectedAmount(amt);
                      setIsCustomAmount(false);
                    }}
                    className={`py-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-1 ${
                      !isCustomAmount && selectedAmount === amt
                        ? "border-[#8E2B45] bg-[#8E2B45]/5 shadow-md scale-[1.02]"
                        : "border-white bg-white hover:border-gray-200"
                    }`}
                  >
                    <span
                      className={`text-2xl font-semibold tracking-tight ${!isCustomAmount && selectedAmount === amt ? "text-[#8E2B45]" : "text-gray-900"}`}
                    >
                      {formatCurrency(amt)}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      Gift Card
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomAmount(true)}
                  className={`py-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                    isCustomAmount
                      ? "border-[#8E2B45] bg-[#8E2B45]/5 shadow-md scale-[1.02]"
                      : "border-white bg-white hover:border-gray-200"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-widest ${isCustomAmount ? "text-[#8E2B45]" : "text-gray-400"}`}
                  >
                    Custom
                  </span>
                  {isCustomAmount ? (
                    <div className="mt-2 flex items-center border-b border-[#8E2B45]">
                      <span className="text-xl font-semibold text-[#8E2B45]">
                        ₹
                      </span>
                      <input
                        type="number"
                        autoFocus
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-24 bg-transparent border-none text-xl font-semibold text-[#8E2B45] focus:ring-0 p-1"
                        placeholder="500+"
                      />
                    </div>
                  ) : (
                    <span className="text-2xl font-semibold text-gray-300 tracking-tight">
                      ₹ ???
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Personalization */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold">
                  2
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Personalize Your Gift
                </h3>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleFormChange}
                      placeholder="Who is this for?"
                      className="w-full bg-gray-50 border-none rounded-xl py-4 px-6 text-sm focus:ring-2 focus:ring-[#8E2B45]/20 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Recipient Email *
                    </label>
                    <input
                      type="email"
                      name="recipientEmail"
                      value={formData.recipientEmail}
                      onChange={handleFormChange}
                      placeholder="Where should we send it?"
                      className="w-full bg-gray-50 border-none rounded-xl py-4 px-6 text-sm focus:ring-2 focus:ring-[#8E2B45]/20 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="senderName"
                    value={formData.senderName}
                    onChange={handleFormChange}
                    placeholder="From whom?"
                    className="w-full bg-gray-50 border-none rounded-xl py-4 px-6 text-sm focus:ring-2 focus:ring-[#8E2B45]/20 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    Personal Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="Write a heartfelt note..."
                    className="w-full bg-gray-50 border-none rounded-xl py-4 px-6 text-sm focus:ring-2 focus:ring-[#8E2B45]/20 transition-all font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Summary & Action */}
          <div className="lg:col-span-5">
            <div className="sticky top-32 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl shadow-black/5 space-y-8 overflow-hidden relative">
                {/* Design Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8E2B45]/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />

                <div className="text-center space-y-2 relative z-10">
                  <span className="text-[10px] font-bold text-[#8E2B45] uppercase tracking-[0.4em]">
                    Order Summary
                  </span>
                  <h4 className="text-xl font-semibold text-gray-900 tracking-tight">
                    Gift Card Details
                  </h4>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">
                      Gift Card Value
                    </span>
                    <span className="text-xl font-semibold text-gray-900 tracking-tight">
                      {formatCurrency(finalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="text-sm font-medium">Delivery Fee</span>
                    <span className="text-sm font-bold uppercase tracking-widest">
                      Free
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">
                      Processing Fee
                    </span>
                    <span className="text-sm font-bold">₹0</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <div className="flex justify-between items-end mb-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Total to Pay
                      </span>
                      <span className="text-4xl font-semibold text-[#8E2B45] tracking-tighter">
                        {formatCurrency(finalAmount)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleBuyNow}
                    className="w-full bg-[#8E2B45] text-white py-5 rounded-2xl font-semibold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-[#8E2B45]/20 hover:bg-[#5B1E26] hover:-translate-y-1 transition-all active:scale-95 group"
                  >
                    <Send className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    Add to Bag
                  </button>

                  <p className="text-center text-[10px] text-gray-400 font-medium mt-6 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Secure payment guaranteed by Sands Jewels
                  </p>
                </div>
              </div>

              {/* Trust Cards */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-widest text-black">
                      Instant Delivery
                    </h5>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Delivered to recipient via email within minutes.
                    </p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Check className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-widest text-black">
                      Redeemable Site-wide
                    </h5>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Can be used for any gold or silver jewelry.
                    </p>
                  </div>
                </div>
              </div>

              {/* Check Balance Card */}
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8E2B45]/5 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-[#8E2B45]" />
                  </div>
                  <div className="text-left">
                    <h5 className="text-[11px] font-bold uppercase tracking-widest text-black">
                      Check Gift Card Balance
                    </h5>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Verify remaining balance instantly
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="SANDS-XXXX-XXXX-XXXX"
                      value={balanceCode}
                      onChange={(e) =>
                        setBalanceCode(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCheckBalance();
                        }
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-mono outline-none focus:ring-2 focus:ring-[#8E2B45]/20 focus:bg-white focus:border-[#8E2B45] transition-all uppercase placeholder:normal-case placeholder:font-sans"
                    />
                    <button
                      type="button"
                      onClick={handleCheckBalance}
                      disabled={checkingBalance || !balanceCode.trim()}
                      className="bg-black text-white px-5 rounded-xl font-semibold text-xs uppercase tracking-wider hover:bg-[#8E2B45] transition-colors disabled:opacity-50"
                    >
                      {checkingBalance ? "..." : "Check"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {balanceResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3 overflow-hidden text-left"
                      >
                        <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                            Card Code
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-900">
                            {balanceResult.code}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-emerald-700">
                            Initial Value
                          </span>
                          <span className="text-xs font-bold text-gray-750">
                            {formatCurrency(balanceResult.value)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-emerald-700 font-bold">
                            Remaining Balance
                          </span>
                          <span className="text-base font-bold text-emerald-850">
                            {formatCurrency(balanceResult.balance)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-emerald-700">
                            Status
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              balanceResult.status === "active"
                                ? "bg-emerald-100 text-emerald-850"
                                : "bg-amber-100 text-amber-850"
                            }`}
                          >
                            {balanceResult.status.replace("_", " ")}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white py-24 border-t border-gray-100">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-[10px] font-bold text-[#8E2B45] uppercase tracking-[0.4em]">
              Simple Steps
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-black">
              How Sands Gift Cards Work
            </h2>
            <p className="text-gray-500 font-medium">
              Sharing the love with your favorite people has never been easier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Select & Personalize",
                desc: "Choose your desired amount and add a personal message for your loved one.",
              },
              {
                title: "Instant Delivery",
                desc: "After checkout, the unique E-Gift Card is instantly emailed to the recipient.",
              },
              {
                title: "Redeem Anytime",
                desc: "The recipient can enter the unique code at checkout to enjoy their jewelry choice.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#8E2B45] text-white flex items-center justify-center text-2xl font-black mx-auto shadow-xl shadow-[#8E2B45]/20">
                  {i + 1}
                </div>
                <h4 className="text-xl font-bold text-black">{step.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="container mx-auto px-6 md:px-12 py-24">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-3xl font-display font-bold text-black tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Where can I use my Sands Gift Card?",
                a: "Sands Gift Cards can be redeemed on our official website for any product across gold and silver collections.",
              },
              {
                q: "Do Sands Gift Cards expire?",
                a: "No, our gift cards have lifetime validity. You can use them whenever you're ready to sparkle.",
              },
              {
                q: "Can I use multiple gift cards for a single order?",
                a: "Yes, you can combine multiple gift cards at checkout to pay for your order.",
              },
              {
                q: "How will the recipient receive the gift card?",
                a: "The gift card is sent electronically via email to the address provided during personalization, immediately after successful payment.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-gray-100"
              >
                <h5 className="text-lg font-bold text-black mb-3">{faq.q}</h5>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCardsPage;
