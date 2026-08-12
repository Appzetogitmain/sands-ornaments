import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ShoppingBag, User, MapPin, CreditCard,
    Box, CheckCircle, XCircle, Truck, PackageCheck, FileText
} from 'lucide-react';
import { sellerOrderService } from '../services/sellerOrderService';
import SellerShipmentPanel from '../components/SellerShipmentPanel';
import SellerFAQ from '../components/SellerFAQ';
import SellerCommissionCard from '../components/SellerCommissionCard';
import toast from 'react-hot-toast';

const formatDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString()}`;

const SellerOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [pendingStatus, setPendingStatus] = useState('');
    const [shippingForm, setShippingForm] = useState({
        carrier: '',
        trackingId: '',
        trackingUrl: '',
        estimatedDelivery: ''
    });
    const [voidTagInputs, setVoidTagInputs] = useState({});

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await sellerOrderService.getOrderDetails(id);
                setOrder(data);
            } catch (err) {
                toast.error('Unable to load seller order details.');
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    useEffect(() => {
        if (!order) return;
        setShippingForm({
            carrier: order.shippingInfo?.carrier || '',
            trackingId: order.shippingInfo?.trackingId || '',
            trackingUrl: order.shippingInfo?.trackingUrl || '',
            estimatedDelivery: formatDateInputValue(order.shippingInfo?.estimatedDelivery)
        });

        // Initialize voidTagInputs from order if available
        const initialTags = {};
        (order.sellerItems || []).forEach(item => {
            if (item.voidTagId) initialTags[item._id] = item.voidTagId;
        });
        setVoidTagInputs(initialTags);
    }, [order]);

    const handleStatusUpdate = async (status, customNote = note) => {
        if (isUpdating) return;

        const target = String(status || '').trim();
        const carrier = String(shippingForm.carrier || '').trim();

        // Frontend guard to match backend rule (carrier required for Shipped/Delivered)
        if (['Shipped', 'Delivered'].includes(target) && !carrier) {
            toast.error('Carrier is required before marking this order as shipped/delivered.');
            return;
        }

        setIsUpdating(true);
        setPendingStatus(target);

        const itemVoidTags = Object.entries(voidTagInputs).map(([itemId, voidTagId]) => ({
            itemId,
            voidTagId
        }));

        try {
            const res = await sellerOrderService.updateOrderStatus(id, status, customNote, shippingForm, itemVoidTags);
            if (!res.success) {
                toast.error(res.message || 'Unable to update order status.');
                return;
            }
            toast.success(res.message || 'Order updated');
            if (res.order) setOrder(res.order);
            setNote('');
        } finally {
            setIsUpdating(false);
            setPendingStatus('');
        }
    };

    const primaryItem = useMemo(() => order?.primaryItem || order?.sellerItems?.[0] || null, [order]);

    if (loading) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest animate-pulse">Synchronizing Data...</div>;
    if (!order) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">Order Not Found</div>;

    const cardClasses = 'bg-white rounded-2xl border border-gray-100 p-8 shadow-sm';
    const sectionTitleClasses = 'text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2';
    const labelClasses = 'text-[9px] font-black text-gray-400 uppercase tracking-widest';
    const valueClasses = 'text-sm font-bold text-gray-900 mt-1 uppercase';
    const shippingAddress = order.shippingAddress || {};
    const canManage = order.canManageStatus;
    const currentStatus = order.orderStatus;
    const canEditShipping = canManage && ['Packed', 'Shipped'].includes(currentStatus);
    const sellerItems = order.sellerItems || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/seller/orders')}
                        className="p-2.5 hover:bg-white rounded-xl border border-gray-100 shadow-sm transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">ORDER #{order.orderId}</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                            STATUS: <span className="text-[#3E2723]">{currentStatus}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {['Confirmed', 'Packed', 'Partially Shipped', 'Shipped', 'Out for Delivery', 'Delivered'].includes(currentStatus) && (
                        <button
                            onClick={() => navigate(`/seller/order-details/${id}/invoice`)}
                            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-[#3E2723]/20 text-[#3E2723] hover:bg-[#3E2723]/5 transition-all flex items-center gap-2"
                        >
                            <FileText size={16} /> Invoice
                        </button>
                    )}
                    {canManage && currentStatus === 'Processing' && (
                        <>
                            <button
                                onClick={() => handleStatusUpdate('Cancelled')}
                                disabled={isUpdating}
                                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100 text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('Confirmed')}
                                disabled={isUpdating}
                                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-[#3E2723] text-white shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> {isUpdating && pendingStatus === 'Confirmed' ? 'Confirming...' : 'Confirm'}
                            </button>
                        </>
                    )}
                    {canManage && currentStatus === 'Confirmed' && (
                        <button
                            onClick={() => handleStatusUpdate('Packed')}
                            disabled={isUpdating}
                            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-600 text-white shadow-xl shadow-violet-600/20 hover:bg-violet-700 transition-all flex items-center gap-2"
                        >
                            <PackageCheck size={16} /> {isUpdating && pendingStatus === 'Packed' ? 'Packing...' : 'Mark Packed'}
                        </button>
                    )}
                    {canManage && currentStatus === 'Packed' && (
                        <button
                            onClick={() => handleStatusUpdate('Shipped')}
                            disabled={isUpdating}
                            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                        >
                            <Truck size={16} /> {isUpdating && pendingStatus === 'Shipped' ? 'Shipping...' : 'Mark Shipped'}
                        </button>
                    )}
                    {canManage && currentStatus === 'Shipped' && (
                        <button
                            onClick={() => handleStatusUpdate('Delivered')}
                            disabled={isUpdating}
                            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <PackageCheck size={16} /> {isUpdating && pendingStatus === 'Delivered' ? 'Delivering...' : 'Mark Delivered'}
                        </button>
                    )}
                </div>
            </div>

            {!canManage && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-4 text-sm font-medium text-amber-700">
                    This order includes items from multiple owners, so status changes stay under admin control.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-8">
                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}><ShoppingBag size={14} className="text-[#3E2723]" /> Order Specifications</h3>
                        <div className="space-y-6">
                            <div>
                                <p className={labelClasses}>Order Date</p>
                                <p className={valueClasses}>{new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className={labelClasses}>Payment Method</p>
                                <p className={valueClasses}>{order.paymentMethod || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className={labelClasses}>Payment Status</p>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                    String(order.paymentStatus).toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-600 border border-gray-100'
                                }`}>
                                    {String(order.paymentStatus || 'pending').toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}><CreditCard size={14} className="text-[#3E2723]" /> Seller Breakdown</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span>Seller Subtotal</span>
                                <span className="text-gray-900">{formatCurrency(order.sellerSubtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span>Items</span>
                                <span className="text-gray-900">{order.sellerItemCount}</span>
                            </div>
                            {!order.allItemsOwnedBySeller && (
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                                    Multi-seller order: only your subtotal is shown here.
                                </p>
                            )}
                        </div>
                    </div>

                    <SellerCommissionCard
                        orderId={order._id || order.id}
                        sellerSubtotal={order.sellerSubtotal || 0}
                    />
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}><Truck size={14} className="text-[#3E2723]" /> Shipment Control</h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className={labelClasses}>Carrier</p>
                                    <input
                                        type="text"
                                        value={shippingForm.carrier}
                                        onChange={(e) => setShippingForm((prev) => ({ ...prev, carrier: e.target.value }))}
                                        disabled={!canEditShipping}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                                        placeholder="Manual courier name"
                                    />
                                </div>
                                <div>
                                    <p className={labelClasses}>Tracking ID</p>
                                    <input
                                        type="text"
                                        value={shippingForm.trackingId}
                                        onChange={(e) => setShippingForm((prev) => ({ ...prev, trackingId: e.target.value }))}
                                        disabled={!canEditShipping}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                                        placeholder="AWB / tracking number"
                                    />
                                </div>
                                <div>
                                    <p className={labelClasses}>Tracking URL</p>
                                    <input
                                        type="text"
                                        value={shippingForm.trackingUrl}
                                        onChange={(e) => setShippingForm((prev) => ({ ...prev, trackingUrl: e.target.value }))}
                                        disabled={!canEditShipping}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                                        placeholder="Optional tracking link"
                                    />
                                </div>
                                <div>
                                    <p className={labelClasses}>Estimated Delivery</p>
                                    <input
                                        type="date"
                                        value={shippingForm.estimatedDelivery}
                                        onChange={(e) => setShippingForm((prev) => ({ ...prev, estimatedDelivery: e.target.value }))}
                                        disabled={!canEditShipping}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <p className={labelClasses}>Internal Note</p>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={!canManage}
                                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 disabled:bg-gray-50 disabled:text-gray-400 min-h-[88px] resize-none"
                                    placeholder="Add a note for packing or shipment updates..."
                                />
                            </div>
                            {canEditShipping ? (
                                <button
                                    onClick={() => handleStatusUpdate(currentStatus, note)}
                                    disabled={isUpdating}
                                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-[#3E2723]/20 text-[#3E2723] hover:bg-[#3E2723]/5 transition-all"
                                >
                                    {isUpdating && pendingStatus === String(currentStatus) ? 'Saving...' : 'Save Shipping Info'}
                                </button>
                            ) : (
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    Shipping info becomes editable once the order reaches packed status.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Courier Shipment Panel */}
                    <div>
                        <SellerShipmentPanel
                            order={order}
                            onShipmentCreated={() => {
                                // Refresh order data
                                sellerOrderService.getOrderDetails(id).then(setOrder);
                            }}
                        />
                    </div>

                    <div className={cardClasses}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h3 className={sectionTitleClasses}><User size={14} className="text-[#3E2723]" /> Customer Credentials</h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className={labelClasses}>Customer Name</p>
                                        <p className={valueClasses}>{order.customerName || order.userId?.fullName || 'Customer'}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className={sectionTitleClasses}><MapPin size={14} className="text-[#3E2723]" /> Shipping Destination</h3>
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-gray-900 leading-relaxed max-w-[320px]">
                                        {[shippingAddress.flatNo, shippingAddress.area, shippingAddress.city, shippingAddress.state, shippingAddress.pincode]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                    {order.shippingInfo?.trackingId && (
                                        <div className="pt-4 border-t border-gray-50">
                                            <p className={labelClasses}>Tracking</p>
                                            <p className="text-[10px] font-black text-blue-600 mt-1 uppercase">{order.shippingInfo?.carrier}: {order.shippingInfo?.trackingId}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}><Box size={14} className="text-[#3E2723]" /> Seller Items</h3>
                        <div className="space-y-4">
                            {sellerItems.map((item) => {
                                const variant = item.productId?.variants?.find(v => String(v._id) === String(item.variantId));
                                const variantImg = variant?.variantImages?.[0];
                                const imgSrc = item.image || variantImg || item.productId?.images?.[0] || item.productId?.image;
                                return (
                                    <div key={item._id} className="flex gap-6 items-center p-6 bg-[#FDFBF7] rounded-[2rem] border border-[#EFEBE9]">
                                        <div className="w-24 h-24 bg-white rounded-2xl border border-gray-100 flex items-center justify-center p-3 shadow-inner">
                                            {imgSrc ? (
                                                <img src={imgSrc} alt={item.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="text-[10px] font-black text-gray-300 uppercase text-center">No Image</div>
                                            )}
                                        </div>
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{item.name || item.productId?.name || 'Jewellery Item'}</h4>
                                            <p className="text-[10px] font-black text-[#8D6E63] uppercase tracking-widest mt-1">SKU: {item.sku || 'Not set'}</p>
                                            {item.giftWrap && (
                                                <div className="mt-2 inline-flex flex-col gap-1 bg-[#FFF8F9] border border-[#FDF2F4] rounded-lg px-3 py-1.5 text-left">
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
                                        <div className="flex flex-wrap gap-10">
                                            <div>
                                                <p className={labelClasses}>Qty</p>
                                                <p className="text-sm font-black text-gray-900 mt-1">{item.quantity || 0}</p>
                                            </div>
                                            <div>
                                                <p className={labelClasses}>Unit Price</p>
                                                <p className="text-sm font-black text-gray-900 mt-1">{formatCurrency(item.price || 0)}</p>
                                            </div>
                                            <div>
                                                <p className={labelClasses}>Line Total</p>
                                                <p className="text-sm font-black text-emerald-600 mt-1">{formatCurrency((item.price || 0) * (item.quantity || 0))}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                Void Tag ID (Security Seal)
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Enter Tag Serial #"
                                                value={voidTagInputs[item._id] || ''}
                                                onChange={(e) => setVoidTagInputs({ ...voidTagInputs, [item._id]: e.target.value })}
                                                className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                                disabled={!canManage || ['Shipped', 'Delivered', 'Cancelled'].includes(currentStatus)}
                                            />
                                            {item.voidTagId && ['Shipped', 'Delivered'].includes(currentStatus) && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-green-600 uppercase tracking-widest">
                                                    <PackageCheck size={10} /> Seal Logged
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    </div>

                    <div className={cardClasses}>
                        <h3 className={sectionTitleClasses}><Truck size={14} className="text-[#3E2723]" /> Order Timeline</h3>
                        <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                            {(order.timeline || []).map((step, index) => (
                                <div key={`${step.status}-${index}`} className="relative">
                                    <div className="absolute -left-[27px] w-3.5 h-3.5 rounded-full border-2 border-[#3E2723] bg-[#3E2723]" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#3E2723]">
                                            {step.status}
                                        </p>
                                        {step.note && <p className="text-[10px] font-medium text-gray-500 mt-1">{step.note}</p>}
                                        {step.date && (
                                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">{new Date(step.date).toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-12">
                <SellerFAQ />
            </div>
        </div>
    );
};

export default SellerOrderDetail;
