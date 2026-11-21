import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Clock,
    CreditCard,
    MapPin,
    Package,
    RefreshCw,
    Tag,
    Truck,
    User,
    X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';
import CommissionBreakdownCard from '../components/CommissionBreakdownCard';
import AdminShipmentCard from '../components/AdminShipmentCard';

const STATUS_STYLES = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    Processing: 'bg-amber-50 text-amber-700 border-amber-100',
    Confirmed: 'bg-blue-50 text-blue-700 border-blue-100',
    Packed: 'bg-violet-50 text-violet-700 border-violet-100',
    Shipped: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Out for Delivery': 'bg-sky-50 text-sky-700 border-sky-100',
    Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Cancelled: 'bg-red-50 text-red-700 border-red-100',
    'Return Requested': 'bg-orange-50 text-orange-700 border-orange-100',
    Returned: 'bg-gray-100 text-gray-700 border-gray-200'
};

const ALLOWED_TRANSITIONS = {
    Pending: [],
    Processing: ['Confirmed', 'Cancelled'],
    Confirmed: ['Packed', 'Cancelled'],
    Packed: ['Shipped', 'Cancelled'],
    Shipped: ['Out for Delivery', 'Delivered'],
    'Out for Delivery': ['Delivered'],
    Delivered: [],
    Cancelled: [],
    'Return Requested': ['Returned'],
    Returned: []
};

const currency = (value) => `INR ${Number(value || 0).toLocaleString()}`;

const formatDateTime = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const ACTION_LABELS = {
    Confirmed: 'Confirm Order',
    Packed: 'Mark Packed',
    Shipped: 'Mark Shipped',
    'Out for Delivery': 'Set Out for Delivery',
    Delivered: 'Mark Delivered',
    Cancelled: 'Cancel Order',
    Returned: 'Mark Returned'
};

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionNote, setActionNote] = useState('');
    const [shippingForm, setShippingForm] = useState({
        carrier: '',
        trackingId: '',
        trackingUrl: '',
        estimatedDelivery: ''
    });
    const [voidTagInputs, setVoidTagInputs] = useState({});

    // Refund modal state
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [isRefunding, setIsRefunding] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const data = await adminService.getOrderDetails(id);
                setOrder(data);
            } catch (err) {
                toast.error('Unable to load this order right now.');
                navigate('/admin/orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id, navigate]);

    useEffect(() => {
        if (!order) return;
        setShippingForm({
            carrier: order.shippingCarrier || '',
            trackingId: order.trackingId || '',
            trackingUrl: order.trackingUrl || '',
            estimatedDelivery: formatDateInputValue(order.estimatedDelivery)
        });

        // Initialize voidTagInputs from order if available
        const initialTags = {};
        (order.items || []).forEach(item => {
            if (item.voidTagId) initialTags[item._id] = item.voidTagId;
        });
        setVoidTagInputs(initialTags);
    }, [order]);

    const timeline = useMemo(() => {
        if (!order) return [];
        if (Array.isArray(order.timeline) && order.timeline.length > 0) {
            return order.timeline.map((entry, index) => ({
                id: `${entry.status}-${entry.date || index}`,
                status: entry.status || 'Updated',
                note: entry.note || '',
                date: entry.date
            }));
        }

        return [{
            id: 'created',
            status: order.orderStatus || 'Processing',
            note: 'Order created',
            date: order.createdAt
        }];
    }, [order]);

    const allowedTransitions = order ? (ALLOWED_TRANSITIONS[order.orderStatus] || []) : [];
    const canEditShipping = order && ['Packed', 'Shipped', 'Out for Delivery'].includes(order.orderStatus);

    const refreshOrder = async () => {
        const freshOrder = await adminService.getOrderDetails(id);
        setOrder(freshOrder);
        return freshOrder;
    };

    const handleStatusUpdate = async (nextStatus) => {
        if (!order || !nextStatus) return;

        setIsSubmitting(true);

        const itemVoidTags = Object.entries(voidTagInputs).map(([itemId, voidTagId]) => ({
            itemId,
            voidTagId
        }));

        try {
            const payload = {
                status: nextStatus,
                note: actionNote.trim(),
                shippingInfo: shippingForm,
                itemVoidTags
            };
            const res = await adminService.updateOrderStatus(id, payload);
            if (!res.success) {
                toast.error(res.message || 'Unable to update order.');
                return;
            }

            setOrder(res.order || await refreshOrder());
            setActionNote('');
            toast.success(res.message || 'Order updated');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefund = async () => {
        if (!order) return;
        setIsRefunding(true);
        try {
            const payload = {};
            const parsedAmount = parseFloat(refundAmount);
            if (refundAmount && !isNaN(parsedAmount) && parsedAmount > 0) {
                payload.amount = parsedAmount;
            }
            if (refundReason.trim()) payload.reason = refundReason.trim();

            const res = await adminService.processRefund(order._id, payload);
            if (!res.success) {
                toast.error(res.message || 'Refund failed.');
                return;
            }
            setOrder(res.order || await refreshOrder());
            setShowRefundModal(false);
            setRefundAmount('');
            setRefundReason('');
            toast.success(res.message || 'Refund processed successfully!');
        } finally {
            setIsRefunding(false);
        }
    };

    const openRefundModal = () => {
        setRefundAmount(String(order?.totalAmount || ''));
        setRefundReason('');
        setShowRefundModal(true);
    };

    const handleSaveShipping = async () => {
        if (!order) return;

        setIsSubmitting(true);
        try {
            const res = await adminService.updateOrderStatus(id, {
                status: order.orderStatus,
                note: actionNote.trim(),
                shippingInfo: shippingForm
            });

            if (!res.success) {
                toast.error(res.message || 'Unable to save shipping info.');
                return;
            }

            setOrder(res.order || await refreshOrder());
            setActionNote('');
            toast.success(res.message || 'Shipping info updated');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest">Loading order details...</div>;
    }

    if (!order) {
        return <div className="p-10 text-center text-red-400 font-bold uppercase tracking-widest">Order not found</div>;
    }

    return (
        <div className="space-y-6 font-sans text-left pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                    onClick={() => navigate('/admin/orders')}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Orders
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                    <p className="text-xl font-black text-gray-900">#{order.orderId}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Created On</p>
                    <p className="text-sm font-bold text-gray-900">{formatDateTime(order.createdAt)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[order.orderStatus] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                        {order.orderStatus}
                    </span>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment</p>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-wider">{order.paymentMethod || 'N/A'}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{order.paymentStatus || 'pending'}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Final Total</p>
                    <p className="text-2xl font-black text-gray-900">{currency(order.totalAmount)}</p>
                </div>
                {/* Refund CTA — only for Razorpay paid orders not yet refunded */}
                {order.paymentMethod === 'razorpay' && order.refundStatus !== 'processed' && (
                    <button
                        type="button"
                        onClick={openRefundModal}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                        <RefreshCw size={14} />
                        {order.refundStatus === 'failed' ? 'Retry Refund' : 'Issue Refund'}
                    </button>
                )}
                {order.refundStatus === 'processed' && (
                    <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
                            ✓ Refunded
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {currency(order.refundAmount)} · {order.refundId}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                            <Package size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Order Items ({order.itemCount || 0})</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/60 border-b border-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(order.items || []).map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-gray-50/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex-shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                                                No Image
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                                            {item.sku || 'No SKU'}
                                                        </div>
                                                        {item.giftWrap && (
                                                            <div className="mt-2 inline-flex flex-col gap-1 bg-[#FFF8F9] border border-[#FDF2F4] rounded-lg px-3 py-1.5">
                                                                <span className="text-[9px] font-black text-[#8E2B45] uppercase tracking-wider flex items-center gap-1">
                                                                    🎁 Gift Wrapped (+ ₹50)
                                                                </span>
                                                                {item.giftMessage && (
                                                                    <span className="text-[11px] font-serif italic text-gray-700 leading-normal">
                                                                        "{item.giftMessage}"
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2 ml-4">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            Void Tag ID (Security Seal)
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Enter Tag Serial #"
                                                            value={voidTagInputs[item._id] || ''}
                                                            onChange={(e) => setVoidTagInputs({ ...voidTagInputs, [item._id]: e.target.value })}
                                                            className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                                            disabled={['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(order.orderStatus)}
                                                        />
                                                        {item.voidTagId && ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus) && (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-green-600 uppercase tracking-widest">
                                                                Seal Logged
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-black text-gray-900">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-gray-500">{currency(item.price)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-gray-900">{currency((item.quantity || 0) * (item.price || 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Billing Summary</h3>
                        </div>
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Subtotal</span>
                                <span className="text-gray-900">{currency(order.subtotal)}</span>
                            </div>
                            {Number(order.discount || 0) > 0 && (
                                <div className="flex justify-between text-xs font-bold text-emerald-600">
                                    <span>Discount</span>
                                    <span>-{currency(order.discount)}</span>
                                </div>
                            )}
                            {Number(order.giftWrapCharge || 0) > 0 && (
                                <div className="flex justify-between text-xs font-bold text-gray-500">
                                    <span>Gift Wrapping</span>
                                    <span className="text-gray-900">{currency(order.giftWrapCharge)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Shipping</span>
                                <span className="text-gray-900">{currency(order.shipping)}</span>
                            </div>
                            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Final Total</span>
                                <span className="text-xl font-black text-gray-900">{currency(order.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {(order.couponCode || Number(order.discount || 0) > 0) && (
                        <div className="bg-purple-50 rounded-2xl border border-purple-100 p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Applied Coupon</p>
                                    <p className="text-lg font-black text-purple-900">{order.couponCode || 'Discount Applied'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Savings</p>
                                <p className="text-xl font-black text-purple-600">{currency(order.discount)}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <CommissionBreakdownCard
                        orderId={order._id}
                        commissionSummary={order.commissionSummary}
                    />

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-2">
                            <Truck size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Admin Actions</h3>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Note</label>
                            <textarea
                                value={actionNote}
                                onChange={(e) => setActionNote(e.target.value)}
                                placeholder="Add a note for this status or shipping update..."
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all min-h-[88px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {allowedTransitions.map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleStatusUpdate(status)}
                                    disabled={isSubmitting}
                                    className="px-4 py-3 rounded-xl bg-[#3E2723] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#2d1e1b] transition-all disabled:opacity-60"
                                >
                                    {ACTION_LABELS[status] || status}
                                </button>
                            ))}
                            {allowedTransitions.length === 0 && (
                                <div className="sm:col-span-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    No further admin transitions available for this order.
                                </div>
                            )}
                        </div>
                    </div>

                    <AdminShipmentCard
                        order={order}
                        onOrderUpdated={refreshOrder}
                    />

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-2">
                            <Truck size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Manual Shipping Info</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Carrier</label>
                                <input
                                    value={shippingForm.carrier}
                                    onChange={(e) => setShippingForm((prev) => ({ ...prev, carrier: e.target.value }))}
                                    placeholder="e.g. Delhivery, Blue Dart, Manual Dispatch"
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tracking ID</label>
                                <input
                                    value={shippingForm.trackingId}
                                    onChange={(e) => setShippingForm((prev) => ({ ...prev, trackingId: e.target.value }))}
                                    placeholder="Enter AWB / tracking ID"
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tracking URL</label>
                                <input
                                    value={shippingForm.trackingUrl}
                                    onChange={(e) => setShippingForm((prev) => ({ ...prev, trackingUrl: e.target.value }))}
                                    placeholder="https://..."
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Delivery</label>
                                <input
                                    type="date"
                                    value={shippingForm.estimatedDelivery}
                                    onChange={(e) => setShippingForm((prev) => ({ ...prev, estimatedDelivery: e.target.value }))}
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSaveShipping}
                            disabled={isSubmitting || !canEditShipping}
                            className="w-full px-4 py-3 rounded-xl border border-[#3E2723]/15 text-[10px] font-black uppercase tracking-widest text-[#3E2723] hover:bg-[#3E2723]/5 transition-all disabled:opacity-50"
                        >
                            Save Shipping Info
                        </button>
                        {!canEditShipping && (
                            <p className="text-[10px] font-bold text-gray-400">
                                Shipping info can be edited once the order reaches `Packed`, `Shipped`, or `Out for Delivery`.
                            </p>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <User size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Customer</h3>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm font-black text-gray-900">{order.customerName}</p>
                            <p className="text-xs font-semibold text-gray-500">{order.customerEmail || 'Email not provided'}</p>
                            <p className="text-xs font-semibold text-gray-500">{order.customerPhone || 'Phone not provided'}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <MapPin size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Delivery Address</h3>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <p className="font-black text-xs text-gray-900 mb-1">{order.address?.name}</p>
                            <p className="text-xs font-bold text-gray-400 mb-3">{order.address?.phone || 'N/A'}</p>
                            <p className="text-xs font-bold text-gray-600 leading-relaxed">
                                {[order.address?.street, order.address?.city, order.address?.district, order.address?.state].filter(Boolean).join(', ')}
                                {order.address?.zip ? ` - ${order.address.zip}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Clock size={16} className="text-gray-400" />
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Order Timeline</h3>
                        </div>
                        <div className="space-y-6 relative pl-2">
                            {timeline.map((step, index) => {
                                const isCancelled = step.status === 'Cancelled';
                                return (
                                    <div key={step.id} className="relative flex items-start gap-4 z-10">
                                        {index !== timeline.length - 1 && (
                                            <div className={`absolute left-[9px] top-6 bottom-[-24px] w-[2px] ${isCancelled ? 'bg-red-100' : 'bg-emerald-100'} -z-10`} />
                                        )}
                                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 ${isCancelled ? 'bg-red-500 border-red-500' : 'bg-emerald-500 border-emerald-500'}`} />
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isCancelled ? 'text-red-600' : 'text-gray-900'}`}>{step.status}</p>
                                            <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">{formatDateTime(step.date)}</p>
                                            {step.note ? (
                                                <p className="text-xs font-semibold text-gray-500 mt-2 leading-relaxed">{step.note}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Refund Modal ─────────────────────────────────────────────────── */}
            {showRefundModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                                    <RefreshCw size={16} className="text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Issue Refund</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Order #{order.orderId}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowRefundModal(false)}
                                disabled={isRefunding}
                                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <X size={16} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Payment info banner */}
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-1">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Razorpay Payment ID</p>
                                <p className="text-xs font-bold text-amber-900 font-mono">{order.razorpayPaymentId || 'N/A'}</p>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Refund Amount (INR)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={order.totalAmount}
                                        step="0.01"
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(e.target.value)}
                                        placeholder={String(order.totalAmount || '')}
                                        disabled={isRefunding}
                                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-8 pr-4 text-sm font-bold text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all"
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    Max: {currency(order.totalAmount)} &nbsp;·&nbsp; Leave blank to refund full amount
                                </p>
                            </div>

                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Reason (optional)
                                </label>
                                <textarea
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="e.g. Customer request, defective item, duplicate order..."
                                    disabled={isRefunding}
                                    rows={3}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all resize-none"
                                />
                            </div>

                            {/* Warning */}
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">⚠ Irreversible Action</p>
                                <p className="text-xs font-semibold text-red-500 leading-relaxed">
                                    This will immediately issue a refund via Razorpay. This action cannot be undone. Please verify the amount before proceeding.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                type="button"
                                onClick={() => setShowRefundModal(false)}
                                disabled={isRefunding}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRefund}
                                disabled={isRefunding}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isRefunding ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={13} />
                                        Confirm Refund
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetailPage;
