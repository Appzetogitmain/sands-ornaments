import React, { useEffect, useState } from 'react';
import { useShop } from '../../../context/ShopContext';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useResetScroll } from '../../../hooks/useResetScroll';
import { useAnalytics } from '../../../hooks/useAnalytics';

import CheckoutAuth from '../components/Checkout/CheckoutAuth';
import CheckoutAddresses from '../components/Checkout/CheckoutAddresses';
import CheckoutPayment from '../components/Checkout/CheckoutPayment';
import CheckoutCartSummary from '../components/Checkout/CheckoutCartSummary';

const Checkout = () => {
    useResetScroll();
    const { cart, placeOrder, addresses, addAddress, defaultAddressId, coupons, applyCoupon, appliedCoupon, couponDiscount, clearAppliedCoupon } = useShop();
    const { user, sendOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();
    const { track } = useAnalytics();
    const currencyText = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
    const cartItemKey = (item) => `${item.id}-${item.variantId || item.packId || 'default'}`;
    const couponSummary = (coupon) => coupon?.description || coupon?.desc || 'Offer available on eligible items';

    // Login State
    const [loginStep, setLoginStep] = useState(1); // 1: Phone, 2: OTP
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']); // 4 digit OTP

    // Checkout Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        flatNo: '',
        area: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
    });
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [loading, setLoading] = useState(false);
    const [addressSelection, setAddressSelection] = useState(addresses.length > 0 ? 'saved' : 'new');
    const [selectedSavedAddressId, setSelectedSavedAddressId] = useState(defaultAddressId || null);
    const [saveNewAddress, setSaveNewAddress] = useState(false);

    const [showCouponModal, setShowCouponModal] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const discount = Number(couponDiscount || 0);

    // Gift Card State
    const [giftCardInput, setGiftCardInput] = useState('');
    const [giftCardLoading, setGiftCardLoading] = useState(false);
    const [appliedGiftCards, setAppliedGiftCards] = useState([]);

    // Calculate totals
    const subtotal = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
    const giftWrapCharge = cart.reduce((acc, item) => acc + (item.giftWrap ? 50 : 0), 0);
    const gstIncluded = cart.reduce((acc, item) => acc + ((Number(item.gst || item.selectedVariant?.gst || 0)) * (item.quantity || 1)), 0);
    const shipping = (appliedCoupon?.isFreeShipping || (subtotal - discount + giftWrapCharge) > 499) ? 0 : 50;

    // Dynamically compute gift card discount based on current remaining balance
    const hasGiftCard = cart.some(item => item.isGiftCard || String(item.id || '').startsWith('GIFT_CARD_'));
    let remainingToPay = Math.max(0, subtotal + giftWrapCharge + shipping - discount);
    const computedGiftCards = appliedGiftCards.map(gc => {
        const amountUsed = Math.min(gc.balance, remainingToPay);
        remainingToPay -= amountUsed;
        return { ...gc, amountUsed };
    });
    const giftCardDiscount = computedGiftCards.reduce((acc, gc) => acc + gc.amountUsed, 0);
    const total = Math.max(0, subtotal + giftWrapCharge + shipping - discount - giftCardDiscount);

    // Force Prepaid if order contains a gift card
    useEffect(() => {
        if (hasGiftCard && paymentMethod !== 'online') {
            setPaymentMethod('online');
            toast.error('Cash on Delivery is not available for orders containing Gift Cards.');
        }
    }, [hasGiftCard, paymentMethod]);

    // Track checkout start
    useEffect(() => {
        if (cart.length > 0) {
            track('checkout_start', {
                cartCount: cart.length,
                subtotal,
                items: cart.map(item => ({
                    id: item.id || item._id,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price
                }))
            });
        }
    }, []);

    // Get active coupons from context
    const availableCoupons = coupons ? coupons.filter(c => c.active !== false) : [];

    const handleApplyCouponValidated = async (coupon) => {
        const code = coupon?.code || couponCode;
        if (!code) return;
        const result = await applyCoupon(code, subtotal, cart);
        if (!result.valid) {
            toast.error(result.error || 'Invalid coupon');
            return;
        }
        setShowCouponModal(false);
    };

    const removeCoupon = () => {
        clearAppliedCoupon();
        setCouponCode('');
    };

    // Gift Card Handlers
    const handleApplyGiftCard = async () => {
        const code = giftCardInput.toUpperCase().trim();
        if (!code) { toast.error('Please enter a gift card code'); return; }
        if (appliedGiftCards.some(gc => gc.code === code)) {
            toast.error('This gift card is already applied'); return;
        }
        const currentRemaining = Math.max(0, subtotal + giftWrapCharge + shipping - discount - giftCardDiscount);
        if (currentRemaining <= 0) {
            toast.error('Your order total is already fully covered by other discounts');
            return;
        }
        setGiftCardLoading(true);
        try {
            const res = await api.get(`user/gift-cards/validate/${code}`);
            if (res.data.success) {
                const { balance } = res.data.data;
                const amountUsed = Math.min(balance, currentRemaining);
                setAppliedGiftCards(prev => [...prev, { code, balance }]);
                setGiftCardInput('');
                toast.success(`Gift card applied! ₹${amountUsed.toLocaleString('en-IN')} will be deducted`);
            } else {
                toast.error(res.data.message || 'Invalid gift card code');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gift card validation failed');
        }
        setGiftCardLoading(false);
    };

    const removeGiftCard = (code) => {
        setAppliedGiftCards(prev => prev.filter(gc => gc.code !== code));
        toast.success('Gift card removed');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Login Handlers
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (phoneNumber.length === 10) {
            const res = await sendOtp(phoneNumber, 'checkout');
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
        const enteredOtp = otp.join('');
        if (enteredOtp.length === 4) {
            const res = await verifyOtp(phoneNumber, enteredOtp, 'checkout');
            if (res.success) {
                setFormData(prev => ({ ...prev, phone: phoneNumber }));
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

    // Checkout Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if ((addressSelection === 'new' || addresses.length === 0) && saveNewAddress) {
            await addAddress({
                name: `${formData.firstName} ${formData.lastName}`,
                phone: formData.phone,
                flatNo: formData.flatNo,
                area: formData.area,
                city: formData.city,
                district: formData.district,
                state: formData.state,
                pincode: formData.pincode,
                type: 'Home'
            });
        }

        const shippingAddress = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            flatNo: formData.flatNo,
            area: formData.area,
            city: formData.city,
            district: formData.district,
            state: formData.state,
            pincode: formData.pincode
        };

        const orderId = await placeOrder({
            addressId: addressSelection === 'saved' ? selectedSavedAddressId : null,
            shippingAddress,
            paymentMethod: paymentMethod === 'online' ? 'razorpay' : 'cod',
            couponCode: appliedCoupon?.code,
            giftCardCodes: appliedGiftCards.map(gc => gc.code),
        });

        setLoading(false);
        if (orderId) {
            navigate('/order-success');
        }
    };

    useEffect(() => {
        if (user) {
            if (addresses.length > 0) {
                // Find default address or fallback to the first saved address
                const activeAddress = addresses.find(a => String(a._id) === String(defaultAddressId) || String(a.id) === String(defaultAddressId)) || addresses[0];
                if (activeAddress) {
                    setFormData({
                        firstName: activeAddress.name ? activeAddress.name.split(' ')[0] : '',
                        lastName: activeAddress.name ? activeAddress.name.split(' ').slice(1).join(' ') : '',
                        email: user.email || '',
                        phone: activeAddress.phone || '',
                        flatNo: activeAddress.flatNo || '',
                        area: activeAddress.area || '',
                        city: activeAddress.city || '',
                        district: activeAddress.district || '',
                        state: activeAddress.state || '',
                        pincode: activeAddress.pincode || ''
                    });
                    setAddressSelection('saved');
                    setSelectedSavedAddressId(activeAddress._id || activeAddress.id);
                }
            } else {
                // No saved addresses, but prefill user's own details
                setFormData(prev => ({
                    ...prev,
                    firstName: user.name ? user.name.split(' ')[0] : '',
                    lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
                    email: user.email || '',
                    phone: user.phone || ''
                }));
                setAddressSelection('new');
                setSelectedSavedAddressId(null);
            }
        }
    }, [user, addresses, defaultAddressId]);

    useEffect(() => {
        if (cart.length === 0) {
            const timer = setTimeout(() => {
                navigate('/cart');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [cart, navigate]);

    if (cart.length === 0) {
        return null;
    }

    if (!user) {
        return (
            <CheckoutAuth
                loginStep={loginStep}
                setLoginStep={setLoginStep}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                otp={otp}
                handleOtpChange={handleOtpChange}
                handleSendOtp={handleSendOtp}
                handleVerifyOtp={handleVerifyOtp}
            />
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl animate-in fade-in duration-700 bg-white min-h-screen">
            <h1 className="text-2xl md:text-4xl font-display font-bold text-black mb-8 md:mb-12 text-center uppercase tracking-widest">
                Checkout
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="lg:col-span-2 space-y-8">
                    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
                        <CheckoutAddresses
                            addresses={addresses}
                            user={user}
                            addressSelection={addressSelection}
                            setAddressSelection={setAddressSelection}
                            selectedSavedAddressId={selectedSavedAddressId}
                            setSelectedSavedAddressId={setSelectedSavedAddressId}
                            formData={formData}
                            setFormData={setFormData}
                            defaultAddressId={defaultAddressId}
                            handleInputChange={handleInputChange}
                            saveNewAddress={saveNewAddress}
                            setSaveNewAddress={setSaveNewAddress}
                        />
                    </form>
                    
                    <CheckoutPayment
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        hasGiftCard={hasGiftCard}
                    />
                </div>

                <CheckoutCartSummary
                    cart={cart}
                    gstIncluded={gstIncluded}
                    currencyText={currencyText}
                    cartItemKey={cartItemKey}
                    subtotal={subtotal}
                    giftWrapCharge={giftWrapCharge}
                    shipping={shipping}
                    discount={discount}
                    total={total}
                    appliedCoupon={appliedCoupon}
                    setShowCouponModal={setShowCouponModal}
                    removeCoupon={removeCoupon}
                    appliedGiftCards={computedGiftCards}
                    giftCardDiscount={giftCardDiscount}
                    giftCardInput={giftCardInput}
                    setGiftCardInput={setGiftCardInput}
                    handleApplyGiftCard={handleApplyGiftCard}
                    giftCardLoading={giftCardLoading}
                    removeGiftCard={removeGiftCard}
                    loading={loading}
                    paymentMethod={paymentMethod}
                    showCouponModal={showCouponModal}
                    couponCode={couponCode}
                    setCouponCode={setCouponCode}
                    handleApplyCouponValidated={handleApplyCouponValidated}
                    availableCoupons={availableCoupons}
                    couponSummary={couponSummary}
                />
            </div>
        </div>
    );
};

export default Checkout;
