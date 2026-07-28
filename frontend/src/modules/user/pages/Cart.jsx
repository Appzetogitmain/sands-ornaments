import React from 'react';
import { useShop } from '../../../context/ShopContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, Gift, ShieldCheck, ArrowLeft, Plus, Minus, X, Truck, Info, Tag, ChevronDown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CouponsModal from '../components/CouponsModal';
import { useResetScroll } from '../../../hooks/useResetScroll';

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, coupons, applyCoupon, appliedCoupon, couponDiscount, clearAppliedCoupon, toggleGiftWrap, updateGiftMessage } = useShop();
    const navigate = useNavigate();
    const [showCouponModal, setShowCouponModal] = React.useState(false);
    const [couponSectionExpanded, setCouponSectionExpanded] = React.useState(true);
    const [showBreakdown, setShowBreakdown] = React.useState(false);
    const currencyText = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
    const couponSaveText = (coupon) => {
        const type = coupon.type || coupon.discountType;
        const val = coupon.value || coupon.discountValue || 0;
        if (type === 'free_shipping') return 'Free Shipping';
        return `Save ${type === 'percentage' ? `${val}%` : currencyText(val)}`;
    };

    useResetScroll();

    const subtotal = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
    const giftWrapCharge = cart.reduce((acc, item) => acc + (item.giftWrap ? 50 : 0), 0);
    const shipping = (subtotal - Number(couponDiscount || 0) + giftWrapCharge) > 499 ? 0 : 50;
    const discount = Number(couponDiscount || 0);
    const total = subtotal + giftWrapCharge + shipping - discount;
    const gstIncluded = cart.reduce((acc, item) => acc + ((Number(item.gst || item.selectedVariant?.gst || 0)) * (item.quantity || 1)), 0);

    const variantLabel = (item) => {
        const name = item.selectedVariant?.name || item.selectedVariant?.variantName || '';
        const size = item.selectedVariant?.size ? `Size: ${item.selectedVariant.size}` : '';
        if (name && size) return `${name} / ${size}`;
        return name || size;
    };
    const variantKey = (item) => item.variantId || item.packId || 'default';
    const availableCoupons = coupons ? coupons.filter(c => c.active !== false) : [];

    // Gift wrap actions are delegated directly to CartContext

    const handleApplyCoupon = async (code) => {
        const result = await applyCoupon(code, subtotal, cart);
        if (!result.valid) return;
        setShowCouponModal(false);
    };

    if (cart.length === 0) {
        return (
            <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center p-4 font-sans">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[2.5rem] shadow-xl shadow-[#8E2B45]/5 border border-gray-100"
                >
                    <div className="relative inline-block">
                        <div className="w-24 h-24 bg-[#FDF5F6] rounded-full flex items-center justify-center border border-[#EBCDD0] shadow-inner">
                            <ShoppingBag className="w-10 h-10 text-[#8E2B45]" strokeWidth={1.5} />
                        </div>
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-[#8E2B45] rounded-full border-4 border-white"
                        />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Your bag is empty</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Fine jewellery deserves a home. Explore our collection and find pieces that resonate with your soul.
                        </p>
                    </div>
                    <Link
                        to="/shop"
                        className="inline-flex items-center gap-3 bg-[#8E2B45] text-white px-10 py-4 rounded-full hover:bg-[#A33B58] transition-all duration-300 font-bold uppercase tracking-[0.2em] text-xs shadow-lg shadow-[#8E2B45]/20 active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" /> Start Shopping
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-[#8E2B45] transition-all group font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-800 tracking-tight">My Cart ({cart.length})</h1>
                    <div className="w-10" /> {/* Spacer for symmetry */}
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Items Section */}
                    <div className="flex-grow space-y-6">
                        <AnimatePresence mode="popLayout">
                            {cart.map((item, idx) => (
                                <motion.div
                                    key={`${item.id}-${variantKey(item)}`}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative"
                                >
                                    <button
                                        onClick={() => removeFromCart(item.id, variantKey(item))}
                                        className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all z-10"
                                    >
                                        <X className="w-5 h-5" strokeWidth={2} />
                                    </button>

                                    <div className="p-3 md:p-4 flex gap-4">
                                        {/* Image */}
                                        <Link to={`/product/${item.id}`} className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-50">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-[8px] font-medium">No Image</div>
                                            )}
                                        </Link>

                                        {/* Details */}
                                        <div className="flex-grow space-y-2">
                                            <div className="pr-6">
                                                <Link to={`/product/${item.id}`}>
                                                    <h3 className="text-sm md:text-base font-medium text-gray-900 leading-tight hover:text-[#8E2B45] transition-colors line-clamp-2">{item.name}</h3>
                                                </Link>
                                                {variantLabel(item) && (
                                                    <p className="text-[10px] font-normal text-gray-500 uppercase tracking-wide mt-0.5">{variantLabel(item)}</p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mt-1">
                                                <div className="flex flex-wrap items-baseline gap-1.5 md:gap-2">
                                                    <span className="text-base md:text-lg font-semibold text-gray-900">{currencyText(item.price)}</span>
                                                    {item.originalPrice && (
                                                        <span className="text-[10px] md:text-xs text-gray-400 line-through">{currencyText(item.originalPrice)}</span>
                                                    )}
                                                </div>

                                                {/* Quantity Selector */}
                                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-1.5 py-1 shrink-0 mt-1 md:mt-0">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1, variantKey(item))}
                                                        disabled={item.quantity <= 1}
                                                        className="w-6 h-6 shrink-0 flex items-center justify-center rounded border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all"
                                                    >
                                                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                                                    </button>
                                                    <span className="text-xs font-medium text-gray-900 min-w-[20px] text-center">
                                                        {item.quantity || 1}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1, variantKey(item))}
                                                        className="w-6 h-6 shrink-0 flex items-center justify-center rounded bg-[#8E2B45] text-white hover:bg-[#722237] shadow-sm transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-[#2DB37E] text-[10px] md:text-xs">
                                                <Truck className="w-3.5 h-3.5" />
                                                Free Delivery
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trust Banner */}
                                    <div className="bg-[#FFF8F9] border-t border-[#FDF2F4] flex divide-x divide-[#FDF2F4] py-2.5 px-3">
                                        <div className="flex-1 text-center text-[9px] font-normal text-gray-500 uppercase tracking-[0.1em]">6-Month Warranty</div>
                                        <div className="flex-1 text-center text-[9px] font-normal text-gray-500 uppercase tracking-[0.1em]">Lifetime Plating</div>
                                        <div className="flex-1 text-center text-[9px] font-normal text-gray-500 uppercase tracking-[0.1em]">15-Day Returns</div>
                                    </div>

                                    {/* Gift Wrap */}
                                    <div className="p-3 bg-white border-t border-gray-100 space-y-3">
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                id={`gift-${item.id}-${variantKey(item)}`}
                                                checked={item.giftWrap || false}
                                                onChange={() => toggleGiftWrap(item.id, variantKey(item))}
                                                className="w-4 h-4 rounded accent-[#8E2B45] border-gray-200 cursor-pointer"
                                            />
                                            <label htmlFor={`gift-${item.id}-${variantKey(item)}`} className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer font-normal">
                                                Add <span className="text-[#E77382]">gift wrap</span> & message (+ ₹50)
                                            </label>
                                            {item.giftWrap && (
                                                <span className="text-[10px] font-normal text-[#2DB37E] ml-auto flex items-center gap-1">
                                                    <Gift className="w-3.5 h-3.5" /> Added
                                                </span>
                                            )}
                                        </div>
                                        {item.giftWrap && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-1.5"
                                            >
                                                <textarea
                                                    placeholder="Write your custom gift message here (e.g. Happy Birthday!)..."
                                                    value={item.giftMessage || ''}
                                                    onChange={(e) => updateGiftMessage(item.id, variantKey(item), e.target.value)}
                                                    maxLength={200}
                                                    rows={2}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8E2B45]/10 resize-none"
                                                />
                                                <div className="flex justify-between items-center text-[9px] text-gray-400 px-1">
                                                    <span>Gift card note attached</span>
                                                    <span>{item.giftMessage?.length || 0}/200 chars</span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Summary Section */}
                    <div className="w-full lg:w-[400px] shrink-0">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-lg shadow-black/5 sticky top-28 space-y-4">
                            <h2 className="text-base font-medium text-gray-800">Order Summary</h2>

                            <div className="space-y-2.5 pt-1">
                                <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-gray-400 font-normal uppercase tracking-[0.1em]">Final Amount</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-semibold text-gray-900">{currencyText(total)}</span>
                                            <div className="relative flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBreakdown(!showBreakdown)}
                                                    className="p-1 hover:bg-gray-50 rounded-full transition-colors text-gray-300 hover:text-gray-600 focus:outline-none"
                                                    title="Price details"
                                                >
                                                    <Info className="w-3.5 h-3.5" />
                                                </button>
                                                <AnimatePresence>
                                                    {showBreakdown && (
                                                        <>
                                                            {/* Overlay to dismiss */}
                                                            <div className="fixed inset-0 z-40" onClick={() => setShowBreakdown(false)} />
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-white border border-gray-100 rounded-xl p-4 shadow-xl z-50 text-left space-y-2.5 font-sans"
                                                            >
                                                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1.5">Price Details</h3>
                                                                <div className="space-y-1.5 text-xs text-gray-600">
                                                                    <div className="flex justify-between">
                                                                        <span>Subtotal</span>
                                                                        <span className="font-semibold text-gray-900">{currencyText(subtotal)}</span>
                                                                    </div>
                                                                    {discount > 0 && (
                                                                        <div className="flex justify-between text-red-500">
                                                                            <span>Coupon Discount</span>
                                                                            <span>- {currencyText(discount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {giftWrapCharge > 0 && (
                                                                        <div className="flex justify-between text-[#8E2B45]">
                                                                            <span>Gift Wrap</span>
                                                                            <span>+ {currencyText(giftWrapCharge)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between">
                                                                        <span>Shipping</span>
                                                                        <span className="font-semibold text-gray-900">{shipping === 0 ? 'FREE' : currencyText(shipping)}</span>
                                                                    </div>
                                                                    {gstIncluded > 0 && (
                                                                        <div className="flex justify-between text-gray-400">
                                                                            <span>GST (Included)</span>
                                                                            <span>{currencyText(gstIncluded)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="border-t border-gray-50 pt-2 flex justify-between text-xs font-bold text-gray-900">
                                                                    <span>Total Amount</span>
                                                                    <span>{currencyText(total)}</span>
                                                                </div>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                    {(discount > 0 || giftWrapCharge > 0 || shipping > 0) && (
                                        <div className="flex flex-col items-end text-right gap-0.5">
                                            {giftWrapCharge > 0 && <p className="text-[8px] text-[#2DB37E] font-normal">Gift wrap: +{currencyText(giftWrapCharge)}</p>}
                                            {shipping > 0 && <p className="text-[8px] text-gray-400 font-normal">Shipping: +{currencyText(shipping)}</p>}
                                            {discount > 0 && <p className="text-[8px] text-[#E77382] font-normal">Discount: -{currencyText(discount)}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Coupons Section */}
                            <div className="pt-2.5 border-t border-gray-100">
                                <button
                                    onClick={() => setCouponSectionExpanded(!couponSectionExpanded)}
                                    className="w-full flex items-center justify-between mb-2.5 hover:opacity-70 transition-opacity"
                                >
                                    <p className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.08em]">Available Coupons</p>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${couponSectionExpanded ? '' : '-rotate-90'}`} />
                                </button>
                                {couponSectionExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-1 border border-gray-100 rounded-2xl overflow-hidden"
                                    >
                                        {availableCoupons.slice(0, 3).map((coupon) => (
                                            <div key={coupon.code} className="flex items-center justify-between p-2.5 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group cursor-pointer" onClick={() => handleApplyCoupon(coupon.code)}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-[#FFF8F9] flex items-center justify-center text-[#E77382] shrink-0 border border-[#FDF2F4]">
                                                        <Tag className="w-3 h-3" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-medium text-gray-900 uppercase tracking-wide truncate">{coupon.code}</p>
                                                        <p className="text-[8px] text-gray-400 truncate font-normal">{coupon.description || couponSaveText(coupon)}</p>
                                                    </div>
                                                </div>
                                                <ChevronDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#E77382] transition-colors shrink-0" />
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setShowCouponModal(true)}
                                            className="w-full py-2 text-[9px] font-normal text-gray-400 hover:text-[#8E2B45] transition-colors bg-gray-50/50 uppercase tracking-[0.08em]"
                                        >
                                            View All Offers
                                        </button>
                                    </motion.div>
                                )}
                            </div>

                            {appliedCoupon && (
                                <div className="bg-[#FFF8F9] border border-[#EBCDD0] p-3 rounded-lg flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Tag className="w-3.5 h-3.5 text-[#8E2B45] shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-medium text-[#8E2B45] uppercase tracking-wide truncate">{appliedCoupon.code}</p>
                                            <p className="text-[9px] text-[#E77382] font-normal">{currencyText(discount)} Discount</p>
                                        </div>
                                    </div>
                                    <button onClick={clearAppliedCoupon} className="text-[9px] font-normal text-gray-400 hover:text-red-500 uppercase tracking-[0.08em] shrink-0">Remove</button>
                                </div>
                            )}

                            <div className="space-y-2.5 pt-2">
                                <p className="text-[9px] text-gray-400 font-normal text-center uppercase tracking-[0.08em]">Free Shipping on orders above ₹499</p>

                                <Link
                                    to="/checkout"
                                    className="w-full bg-[#8E2B45] text-white py-3 rounded-lg font-semibold uppercase tracking-[0.15em] text-[10px] hover:bg-[#5B1E26] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#8E2B45]/20 active:scale-95"
                                >
                                    <Lock className="w-3.5 h-3.5" />
                                    Checkout
                                </Link>

                                {gstIncluded > 0 && (
                                    <p className="text-[8px] text-gray-400 text-center font-normal">
                                        Prices include {currencyText(gstIncluded)} GST
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <CouponsModal
                isOpen={showCouponModal}
                onClose={() => setShowCouponModal(false)}
                coupons={availableCoupons}
                onApply={handleApplyCoupon}
            />
        </div>
    );
};

export default Cart;
