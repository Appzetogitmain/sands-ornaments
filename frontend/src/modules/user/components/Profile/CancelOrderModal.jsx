import React, { useState } from 'react';
import { X, AlertCircle, Loader2, Info } from 'lucide-react';
import { useShop } from '../../../../context/ShopContext';
import toast from 'react-hot-toast';

const CANCELLATION_REASONS = [
    'Ordered by mistake',
    'Want to change shipping address',
    'Found a better price / changed mind',
    'Delivery is taking too long',
    'Want to change payment method',
    'Other reason'
];

const formatCurrency = (val) => `₹${Math.round(Number(val || 0)).toLocaleString('en-IN')}`;

const CancelOrderModal = ({ isOpen, onClose, order, onSuccess }) => {
    const { cancelOrder, refreshOrders } = useShop();
    const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !order) return null;

    const orderDisplayId = order.displayId || order.orderId || order.id || order._id;
    const orderDisplayShort = String(orderDisplayId || '').replace('ORD-', '');
    const isOnlinePaid = (order.paymentMethod === 'razorpay' || order.paymentMethod === 'online') && (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded');
    const isCod = order.paymentMethod === 'cod' || order.paymentStatus === 'cod';
    const giftCardAmount = Number(order.giftCardDiscount || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const reasonText = selectedReason === 'Other reason'
            ? (customReason.trim() || 'Other reason')
            : selectedReason;

        try {
            setIsSubmitting(true);
            const targetOrderId = order.id || order._id;
            const res = await cancelOrder(targetOrderId, reasonText);
            if (res?.success) {
                if (refreshOrders) {
                    await refreshOrders();
                }
                onSuccess?.();
                onClose();
            }
        } catch (err) {
            console.error('Cancellation error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to cancel order');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={!isSubmitting ? onClose : undefined}
            />

            {/* Modal Box */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white relative z-10 w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-serif font-bold text-[#3E2723]">Cancel Order</h3>
                            <p className="text-[11px] text-gray-500">Order #{orderDisplayShort}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                    {/* Refund Notice Banner */}
                    <div className="bg-[#FAF7F2] border border-[#EFEBE9] rounded-xl p-3.5 space-y-1.5 text-xs text-[#5D4037]">
                        <div className="flex items-center gap-1.5 font-bold text-[#3E2723]">
                            <Info className="w-4 h-4 text-[#8D6E63]" />
                            <span>Refund & Cancellation Details</span>
                        </div>
                        {isOnlinePaid && (
                            <p>
                                • <span className="font-semibold">{formatCurrency(order.total)}</span> will be refunded back to your original payment method (Bank/UPI/Card) within 5–7 business days.
                            </p>
                        )}
                        {isCod && (
                            <p>
                                • This is a <span className="font-semibold">Cash on Delivery</span> order. No payment was collected, so no refund is necessary.
                            </p>
                        )}
                        {giftCardAmount > 0 && (
                            <p className="text-emerald-700">
                                • <span className="font-semibold">{formatCurrency(giftCardAmount)}</span> gift card balance will be immediately restored to your card.
                            </p>
                        )}
                    </div>

                    {/* Reason Selection */}
                    <div>
                        <label className="block text-xs font-bold text-[#3E2723] uppercase tracking-wider mb-2.5">
                            Please select a reason for cancellation
                        </label>
                        <div className="space-y-2">
                            {CANCELLATION_REASONS.map((reason) => (
                                <label
                                    key={reason}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                                        selectedReason === reason
                                            ? 'border-[#3E2723] bg-[#FDF5F6] text-[#3E2723] font-semibold'
                                            : 'border-gray-100 hover:border-gray-200 text-gray-700'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="cancelReason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={() => setSelectedReason(reason)}
                                        className="accent-[#3E2723] w-4 h-4"
                                    />
                                    <span>{reason}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Custom explanation if 'Other' selected */}
                    {selectedReason === 'Other reason' && (
                        <div className="animate-in fade-in duration-200">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Tell us more (optional)
                            </label>
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Describe why you want to cancel this order..."
                                rows={3}
                                maxLength={250}
                                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Keep Order
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Cancelling...</span>
                                </>
                            ) : (
                                <span>Cancel Order</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancelOrderModal;
