import React, { useState, useEffect } from "react";
import { useShop } from "../../../context/ShopContext";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Truck,
  Tag,
  X,
  Percent,
} from "lucide-react";
import CouponsModal from "../components/CouponsModal";
import logo from "@assets/logo.png";
import api from "../../../services/api";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    getCart,
    placeOrder,
    packs,
    getVariantById,
    getPackById,
    validateCoupon,
    getActiveCoupons,
  } = useShop();

  const directBuyItem = location.state?.directBuyItem;
  const cartItems = directBuyItem
    ? [directBuyItem]
    : user
      ? getCart(user.id)
      : [];
  const enrichedCart = cartItems
    .map((item) => {
      // Try to get variant first
      const variantData = getVariantById(item.packId);
      if (variantData) {
        return {
          ...item,
          id: variantData.id,
          variantId: variantData.id,
          name: variantData.product.name,
          weight: variantData.weight,
          price: variantData.price,
          mrp: variantData.mrp,
          image: variantData.product.image,
          category: variantData.product.category,
          categoryId: variantData.product.categoryId,
          productId: variantData.product.id,
        };
      }

      // Fallback to legacy pack
      const pack = getPackById(item.packId);
      if (pack) {
        return { ...item, ...pack };
      }
      return null;
    })
    .filter(Boolean);

  const subtotal = enrichedCart.reduce(
    (acc, item) => acc + (item.price || 0) * item.qty,
    0,
  );
  const cartCategories = [
    ...new Set(enrichedCart.map((item) => item.category)),
  ];

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);

  // Coupon management state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  const total = subtotal - couponDiscount;
  const availableCoupons = getActiveCoupons();

  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await api.get("user/addresses");
        if (res.data.success) {
          const addressList = res.data.data?.addresses || res.data.addresses || [];
          setAddresses(addressList);
          const defaultAddr = addressList.find((a) => a.isDefault);
          if (defaultAddr) {
            setFormData({
              fullName: `${defaultAddr.firstName} ${defaultAddr.lastName}`,
              phone: defaultAddr.phone || "",
              address: defaultAddr.streetAddress || "",
              city: defaultAddr.city || "",
              state: defaultAddr.state || "",
              pincode: defaultAddr.zipCode || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch addresses");
      }
    };
    if (user) fetchAddresses();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setLoading(true);
    const result = await validateCoupon(couponCode, subtotal, enrichedCart);
    setLoading(false);

    if (result.valid) {
      setAppliedCoupon(result.coupon);
      setCouponDiscount(result.discount);
      setCouponError("");
    } else {
      setCouponError(result.error);
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map simple formData to the object backend expects
      const nameParts = formData.fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || " ";

      const shippingAddress = {
        firstName,
        lastName,
        phone: formData.phone,
        email: user?.email || "",
        streetAddress: formData.address,
        city: formData.city,
        state: formData.state,
        country: "India",
        zipCode: formData.pincode,
        isDefault: false,
      };

      const orderData = {
        items: enrichedCart,
        shippingAddress,
        paymentMethod: paymentMethod,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
      };

      const orderId = await placeOrder(orderData);
      setLoading(false);

      if (orderId) {
        navigate(`/order-success/${orderId}`);
      }
    } catch (err) {
      console.error("Checkout submission failed", err);
      setLoading(false);
    }
  };

  if (enrichedCart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No items to checkout
          </h2>
          <button
            onClick={() => navigate("/catalog")}
            className="text-primary font-bold hover:underline"
          >
            Return to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfcfc] min-h-screen py-4 md:py-12">
      <div className="container mx-auto px-3 md:px-12">
        <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors text-footerBg/70"
          >
            <ArrowLeft size={20} md:size={24} />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-footerBg uppercase tracking-tighter md:tracking-tight leading-none">
              Checkout
            </h1>
            <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
              Complete your order
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column: Forms */}
          <div className="space-y-8">
            {/* Shipping Address */}
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg md:text-xl font-bold text-footerBg mb-4 md:mb-6 flex items-center gap-2">
                <Truck size={18} className="text-primary" />
                Delivery Details
              </h3>
              <form
                id="checkout-form"
                onSubmit={handleSubmit}
                className="space-y-3 md:space-y-4"
              >
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                      Full Name
                    </label>
                    <input
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Ex: John Doe"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                      Phone
                    </label>
                    <input
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="+91"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                    Detailed Address
                  </label>
                  <textarea
                    required
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    placeholder="Flat No, Building, Area"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                      City
                    </label>
                    <input
                      required
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                      Pincode
                    </label>
                    <input
                      required
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                      State
                    </label>
                    <input
                      required
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg md:text-xl font-bold text-footerBg mb-4 md:mb-6 flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                Payment Method
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <label
                  className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-gray-50 hover:border-gray-100"}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-footerBg flex items-center gap-2 text-sm md:text-base">
                      <Banknote size={14} /> Cash on Delivery
                    </div>
                    <div className="text-[10px] md:text-sm text-gray-500">
                      COD Available
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "online" ? "border-primary bg-primary/5" : "border-gray-50 hover:border-gray-100"}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="online"
                    checked={paymentMethod === "online"}
                    onChange={() => setPaymentMethod("online")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-footerBg flex items-center gap-2 text-sm md:text-base">
                      <CreditCard size={14} /> UPI/Card
                    </div>
                    <div className="text-[10px] md:text-sm text-gray-500">
                      Secure Online
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Apply Coupon */}
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg md:text-xl font-bold text-footerBg mb-4 md:mb-6 flex items-center gap-2">
                <Tag size={18} className="text-primary" />
                Apply Coupon
              </h3>

              {!appliedCoupon ? (
                <div className="space-y-3 md:space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      className="flex-1 bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2 md:py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase font-bold text-xs md:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-footerBg text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCouponsModal(true)}
                    className="text-primary text-[10px] md:text-sm font-bold hover:underline flex items-center gap-1"
                  >
                    <Tag size={12} />
                    View All Coupons ({availableCoupons.length})
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 md:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center border border-emerald-100">
                      <Percent size={14} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-black text-emerald-600 text-[10px] md:text-sm uppercase tracking-wider">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-[9px] md:text-xs text-emerald-500 font-bold">
                        Saved ₹{couponDiscount}!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="h-fit sticky top-28">
            <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-gradient-to-r from-primary to-footerBg" />

              <h2 className="text-lg md:text-xl font-black text-footerBg uppercase tracking-tight mb-4 md:mb-6">
                Order Summary
              </h2>

              <div className="max-h-48 md:max-h-60 overflow-y-auto pr-2 space-y-3 md:space-y-4 mb-4 md:mb-6 custom-scrollbar">
                {enrichedCart.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 md:gap-4 border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs md:text-sm font-bold text-footerBg line-clamp-2 md:line-clamp-1 truncate-none whitespace-normal leading-tight">
                        {item.name}
                      </h4>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] md:text-xs text-gray-400">
                            Qty: {item.qty}
                          </span>
                          {item.weight && (
                            <span className="text-[10px] text-primary font-bold">
                              {item.weight}
                            </span>
                          )}
                        </div>
                        <span className="text-xs md:text-sm font-black text-footerBg">
                          ₹{item.price * item.qty}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t border-gray-100">
                <div className="flex justify-between text-gray-500 text-[11px] md:text-sm">
                  <span>Subtotal</span>
                  <span className="font-bold text-footerBg">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[11px] md:text-sm">
                  <span>Delivery</span>
                  <span className="text-emerald-500 font-bold italic">
                    FREE
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-500 text-[11px] md:text-sm font-black">
                    <span>Saving ({appliedCoupon.code})</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg md:text-xl font-black text-footerBg pt-2">
                  <span className="text-sm md:text-lg">Total</span>
                  <span>₹{total}</span>
                </div>
              </div>

              <button
                form="checkout-form"
                type="submit"
                disabled={loading}
                className="w-full bg-footerBg text-white py-3 md:py-4 rounded-xl font-black text-[11px] md:text-xs uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-lg mt-5 md:mt-8 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
              >
                {loading ? "Securing Order..." : `Place Order • ₹${total}`}
              </button>

              <p className="text-[9px] md:text-xs text-center text-gray-400 mt-3 md:mt-4">
                Secure Checkout with Sands Jewels
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Modal */}
      <CouponsModal
        isOpen={showCouponsModal}
        onClose={() => setShowCouponsModal(false)}
        coupons={availableCoupons}
        onApply={(code) => {
          setCouponCode(code);
          setTimeout(() => handleApplyCoupon(), 100);
        }}
      />
    </div>
  );
};

export default CheckoutPage;
