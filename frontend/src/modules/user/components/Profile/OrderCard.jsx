import React, { useState } from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../../../context/ShopContext';
import toast from 'react-hot-toast';
import { ProductThumb } from './ProductThumb';
import ReturnActionModal from './ReturnActionModal';

const formatCurrency = (value) => (
    `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`
);

const OrderCard = ({ order, isExpanded, onToggle }) => {
    const [localShow, setLocalShow] = useState(false);
    const [isActionModalOpen, setActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState('return'); // 'return' or 'exchange'

    const { returns, replacements, refreshReturns, refreshReplacements } = useShop();
    const returnRequest = returns.find(r => String(r.orderId?._id || r.orderId) === String(order.id || order._id));
    const replacementRequest = replacements.find(r => String(r.orderId?._id || r.orderId) === String(order.id || order._id));
    const activeRequest = returnRequest || replacementRequest;
    const requestType = returnRequest ? 'return' : replacementRequest ? 'exchange' : null;

    const showDetails = isExpanded !== undefined ? isExpanded : localShow;
    const setShowDetails = onToggle || setLocalShow;

    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = order.subtotal !== undefined ? order.subtotal : items.reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 0)), 0);
    const shipping = order.shipping !== undefined ? order.shipping : 0;
    const discount = order.discount !== undefined ? order.discount : 0;
    const giftWrapCharge = order.giftWrapCharge !== undefined ? order.giftWrapCharge : 0;
    const giftCardDiscount = order.giftCardDiscount !== undefined ? order.giftCardDiscount : 0;
    const canRaiseRequest = String(order.status || order.orderStatus || '').trim() === 'Delivered';
    const orderDisplayId = order.displayId || order.orderId || order.id || order._id;
    const orderDisplayShort = String(orderDisplayId || '').replace('ORD-', '');

    const openAction = (type) => {
        if (!canRaiseRequest) {
            toast.error('Return/Exchange is available only after delivery.');
            return;
        }
        setActionType(type);
        setActionModalOpen(true);
    };

    const handleActionSuccess = () => {
        refreshReturns();
        refreshReplacements();
    };

    const getStepStatus = (step) => {
        if (!activeRequest) return 'pending';
        const statusMap = {
            "Pending Approval": 1,
            "Approved": 1,
            "Pickup Scheduled": 2,
            "Pickup Completed": 2,
            "Replacement Shipped": 2,
            "Delivered": 3,
            "Closed": 3,
            "Rejected": 3
        };
        const currentStep = statusMap[activeRequest.status] || 1;
        return currentStep >= step ? 'completed' : 'pending';
    };

    return (
        <div className="md:bg-white md:shadow-sm md:rounded-2xl md:border md:border-gray-100 overflow-hidden font-sans mb-6 md:mb-5">
            <ReturnActionModal isOpen={isActionModalOpen} onClose={() => setActionModalOpen(false)} type={actionType} order={order} onSuccess={handleActionSuccess} />
            {/* Mobile View */}
            <div className="md:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Order ID</p>
                        <h4 className="text-sm font-bold text-black">#{orderDisplayShort}</h4>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date</p>
                        <p className="text-xs font-medium text-gray-600">{new Date(order.createdAt || order.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                </div>

                {activeRequest ? (
                    <div className="bg-[#FDF5F6] p-4 rounded-xl border border-[#EBCDD0] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded-full">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-black capitalize">{requestType} In Progress</h4>
                                <p className="text-[10px] text-gray-500">{new Date(activeRequest.createdAt || activeRequest.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Link
                            to={`/order-tracking/${order.id}`}
                            className="bg-white border border-[#EFEBE9] text-[#3E2723] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm"
                        >
                            Track
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 py-1">
                            <div className="flex -space-x-3 overflow-hidden">
                                {items.slice(0, 3).map((item, idx) => (
                                    <ProductThumb
                                        key={idx}
                                        src={item.image}
                                        alt={item.name}
                                        className="w-10 h-10 rounded-lg border-2 border-white object-cover shadow-sm"
                                        fallbackClassName="border-gray-100 bg-white"
                                        fallbackIconClassName="w-3 h-3"
                                    />
                                ))}
                                {items.length > 3 && (
                                    <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm">
                                        +{items.length - 3}
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow">
                                <p className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider">Items</p>
                                <p className="text-xs font-medium text-gray-700">{items.length} {items.length === 1 ? 'Product' : 'Products'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider">Total</p>
                                <p className="text-sm font-bold text-[#3E2723]">{formatCurrency(order.total)}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button className="flex-1 bg-[#FAFAFA] text-[#3E2723] py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-gray-100 active:scale-95 transition-transform" onClick={() => setShowDetails(!showDetails)}>
                                {showDetails ? 'Close' : 'Details'}
                            </button>
                            <button
                                onClick={() => openAction('return')}
                                disabled={!canRaiseRequest}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border active:scale-95 transition-transform ${canRaiseRequest ? 'bg-[#FAFAFA] text-[#3E2723] border-gray-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                            >
                                Return
                            </button>
                            <button
                                onClick={() => openAction('exchange')}
                                disabled={!canRaiseRequest}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border active:scale-95 transition-transform ${canRaiseRequest ? 'bg-[#FAFAFA] text-[#3E2723] border-gray-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                            >
                                Exchange
                            </button>
                            <Link to={`/order-tracking/${order.id}`} className="flex-1 bg-black text-white py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center shadow-md shadow-black/5 active:scale-95 transition-transform hover:bg-[#D39A9F]">
                                Track
                            </Link>
                        </div>
                    </>
                )}

                {/* Mobile Details View (Only if not tracking return, or simplified) */}
                {showDetails && !activeRequest && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-3 bg-[#FDF5F6] p-3 rounded-xl border border-[#EBCDD0]">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <ProductThumb
                                        src={item.image}
                                        alt={item.name}
                                        className="w-12 h-12 rounded-lg object-cover border border-white shadow-sm"
                                        fallbackClassName="bg-white"
                                        fallbackIconClassName="w-4 h-4"
                                    />
                                    <div className="flex-grow min-w-0">
                                        <p className="text-[10px] font-bold text-[#3E2723] truncate">{item.name}</p>
                                        <p className="text-[10px] text-[#8D6E63]">Qty: {item.quantity} • {formatCurrency(item.price)}</p>
                                    </div>
                                    <p className="text-xs font-bold text-[#3E2723]">{formatCurrency((item.price || 0) * (item.quantity || 0))}</p>
                                </div>
                            ))}
                            <div className="border-t border-[#EFEBE9] pt-2 mt-1 space-y-1 text-[10px]">
                                <div className="flex justify-between text-[#8D6E63]"><p>Subtotal</p><p>{formatCurrency(subtotal)}</p></div>
                                {discount > 0 && <div className="flex justify-between text-red-500"><p>Discount</p><p>- {formatCurrency(discount)}</p></div>}
                                {giftWrapCharge > 0 && <div className="flex justify-between text-[#8E2B45]"><p>Gift Wrap</p><p>+ {formatCurrency(giftWrapCharge)}</p></div>}
                                <div className="flex justify-between text-[#8D6E63]"><p>Shipping</p><p>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</p></div>
                                {giftCardDiscount > 0 && <div className="flex justify-between text-emerald-600"><p>Gift Card</p><p>- {formatCurrency(giftCardDiscount)}</p></div>}
                                <div className="flex justify-between font-bold text-[#3E2723] pt-1"><p>Grand Total</p><p>{formatCurrency(order.total)}</p></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:p-4 md:px-6 bg-[#FAFAFA] text-[10px] md:text-sm">
                    <div className="flex flex-wrap gap-4 md:gap-8 text-[#3E2723]">
                        <div>
                            <span className="font-bold block text-gray-900">{new Date(order.createdAt || order.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 mr-1">Order no.:</span>
                            <span className="font-bold text-gray-900">#{orderDisplayShort}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 mr-1">Items:</span>
                            <span className="font-bold text-gray-900">{items.length}</span>
                        </div>
                    </div>
                    <div
                        className="flex items-center gap-1.5 cursor-pointer text-[#3E2723] hover:underline font-bold"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        <span>{showDetails ? 'Hide' : 'Details'}</span>
                        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`} />
                    </div>
                </div>

                {/* Return Tracker OR Action Buttons */}
                {activeRequest ? (
                    <div className="p-4 md:p-6 bg-white border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 p-3 rounded-full border border-blue-100">
                                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-[#3E2723] capitalize">{requestType} In Progress</h4>
                                <p className="text-xs text-[#8D6E63]">Requested on {new Date(activeRequest.createdAt || activeRequest.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Link
                            to={`/order-tracking/${order.id}`}
                            className="bg-white border border-[#EFEBE9] text-[#3E2723] px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#FAFAFA] transition-colors"
                        >
                            Track Status
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-end gap-3 p-3 md:p-4 bg-white">
                        <button
                            onClick={() => openAction('return')}
                            disabled={!canRaiseRequest}
                            className={`px-4 md:px-6 py-2 text-[10px] md:text-sm font-bold border rounded-lg uppercase tracking-wider transition-colors ${canRaiseRequest ? 'text-[#8D6E63] border-[#EFEBE9] hover:bg-[#FDFBF7] hover:border-[#D7CCC8]' : 'text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                        >
                            Return
                        </button>
                        <button
                            onClick={() => openAction('exchange')}
                            disabled={!canRaiseRequest}
                            className={`px-4 md:px-6 py-2 text-[10px] md:text-sm font-bold border rounded-lg uppercase tracking-wider transition-colors ${canRaiseRequest ? 'text-[#8D6E63] border-[#EFEBE9] hover:bg-[#FDFBF7] hover:border-[#D7CCC8]' : 'text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                        >
                            Exchange
                        </button>
                        <Link to={`/order-tracking/${order.id}`} className="bg-[#3E2723] text-white px-6 md:px-8 py-2 text-[10px] md:text-sm font-bold rounded-lg uppercase tracking-wider hover:bg-[#5D4037] transition-all shadow-sm flex items-center justify-center">
                            Track Order
                        </Link>
                    </div>
                )}

                {/* Collapsible Section */}
                {showDetails && (
                    <div className="bg-[#FAFAFA] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Products Reel */}
                        <div className="flex gap-4 md:gap-8 overflow-x-auto p-4 md:p-6 scrollbar-hide">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex-shrink-0 w-32 md:w-48 text-center group">
                                    <div className="relative mb-2 inline-block">
                                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-lg overflow-hidden border border-gray-200 bg-white">
                                            <ProductThumb
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                fallbackClassName="bg-[#FAFAFA]"
                                                fallbackIconClassName="w-5 h-5"
                                            />
                                        </div>
                                        <span className="absolute -top-1.5 -right-1.5 bg-[#3E2723] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                            {item.quantity}
                                        </span>
                                    </div>
                                    <h4 className="text-[10px] md:text-xs text-[#3E2723] font-medium leading-relaxed line-clamp-2 px-1 h-7 font-serif">{item.name}</h4>
                                    <p className="text-xs md:text-sm font-bold text-[#5D4037] mt-1">{formatCurrency(item.price)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Total Breakdown Table */}
                        <div className="border-t border-gray-200 mx-6">
                            <div className="py-4 space-y-3 text-sm">
                                <div className="flex justify-between text-[#8D6E63]">
                                    <span>Sub total</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-red-500">
                                        <span>Discount</span>
                                        <span>- {formatCurrency(discount)}</span>
                                    </div>
                                )}
                                {giftWrapCharge > 0 && (
                                    <div className="flex justify-between text-[#8E2B45]">
                                        <span>Gift Wrap</span>
                                        <span>+ {formatCurrency(giftWrapCharge)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[#8D6E63]">
                                    <span>Shipping cost</span>
                                    <span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
                                </div>
                                {giftCardDiscount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Gift Card</span>
                                        <span>- {formatCurrency(giftCardDiscount)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Grand Total Bar */}
                <div className="bg-[#F3F4F6] border-t border-gray-200 text-black p-3.5 md:p-4 md:px-6 flex justify-between items-center text-base md:text-lg font-bold">
                    <span>Grand total</span>
                    <span>{formatCurrency(order.total)}</span>
                </div>
            </div>
        </div>
    );
};

export default OrderCard;
