import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useShop } from '../../../context/ShopContext';
import { Package, ArrowLeft, RefreshCw, Check, Clock } from 'lucide-react';
import FAQSection from '../components/FAQSection';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDateTime = (dateTimestamp) => {
    if (!dateTimestamp) return 'Pending';
    return new Date(dateTimestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const resolveImageSrc = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || null;

const ProductThumb = ({ src, alt = '', className, fallbackIconClassName = 'w-4 h-4', fallbackClassName = '' }) => {
    const imageSrc = resolveImageSrc(src);

    if (!imageSrc) {
        return (
            <div className={`${className} ${fallbackClassName} bg-[#FAFAFA] text-gray-400 flex items-center justify-center`}>
                <Package className={fallbackIconClassName} />
            </div>
        );
    }

    return <img src={imageSrc} className={className} alt={alt} />;
};

const OrderTracking = () => {
    const { orderId, view } = useParams();
    const { orders, returns, replacements } = useShop();
    const navigate = useNavigate();
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeReturns = Array.isArray(returns) ? returns : [];
    const safeReplacements = Array.isArray(replacements) ? replacements : [];

    // Normalize IDs for comparison
    const order = safeOrders.find(o => {
        const id = String(o.id || o._id || '');
        const displayId = String(o.displayId || o.orderId || '');
        return id === orderId || displayId === orderId || displayId.replace('ORD-', '') === orderId;
    });

    const returnRecord = safeReturns.find(r => String(r.orderId?._id || r.orderId) === String(order?.id || order?._id));
    const replacementRecord = safeReplacements.find(r => String(r.orderId?._id || r.orderId) === String(order?.id || order?._id));
    const activeRequest = returnRecord || replacementRecord;
    const requestType = returnRecord ? 'return' : replacementRecord ? 'exchange' : null;
    const returnRequest = activeRequest ? {
        ...activeRequest,
        type: requestType,
        date: activeRequest.createdAt || activeRequest.date,
        id: activeRequest.returnId || activeRequest.replacementId || activeRequest._id,
        items: activeRequest.items || activeRequest.originalItems || activeRequest.replacementItems || []
    } : null;

    const returnStatusMap = {
        "Pending Approval": 1,
        "Approved": 2,
        "Pickup Scheduled": 3,
        "Pickup Completed": 3,
        "Replacement Shipped": 3,
        "Delivered": 4,
        "Closed": 4,
        "Rejected": 4
    };
    const returnStep = returnRequest ? (returnStatusMap[returnRequest.status] || 1) : 0;

    if (!order) {
        return (
            <div className="min-h-screen pt-32 pb-12 px-4 flex flex-col items-center justify-center bg-white">
                <h2 className="text-2xl font-display text-black mb-4">Order Not Found</h2>
                <Link to="/profile/orders" className="text-black underline hover:text-[#D39A9F]">Back to Orders</Link>
            </div>
        );
    }

    // --- DELIVERY TIMELINE CALCULATION ---
    const deliveryStepsRaw = (order.timeline && order.timeline.length > 0)
        ? order.timeline.map(step => ({
            status: step.status || order.status || 'Processing',
            date: formatDateTime(step.date || step.createdAt || order.createdAt || order.date)
        }))
        : [{ status: order.status || 'Processing', date: formatDateTime(order.createdAt || order.date) }];

    const deliverySteps = deliveryStepsRaw.map((step, index, arr) => ({
        ...step,
        completed: true,
        current: index === arr.length - 1
    }));
    const currentDeliveryStatus = deliverySteps[deliverySteps.length - 1];

    // --- RETURN / EXCHANGE TIMELINE CALCULATION ---
    const returnBaseDate = returnRequest ? new Date(returnRequest.date).getTime() : Date.now();

    // Distinct paths for Return vs Exchange
    let returnStepsRaw = [];

    if (returnRequest && returnRequest.type === 'exchange') {
        // Exchange Flow: Application -> Pickup -> Dispatch Replacement -> Deliver Replacement
        returnStepsRaw = [
            { status: 'Exchange Requested', date: formatDateTime(returnBaseDate) },
            { status: 'Pickup Scheduled', date: formatDateTime(returnBaseDate + 86400000) },
            { status: 'Picked Up', date: 'Pending', isFuture: true },
            { status: 'Replacement Dispatched', date: 'Pending', isFuture: true },
            { status: 'Exchange Completed', date: 'Pending', isFuture: true, isLast: true }
        ];
    } else {
        // Return Flow: Application -> Pickup -> Refund
        returnStepsRaw = [
            { status: 'Return Requested', date: formatDateTime(returnBaseDate) },
            { status: 'Pickup Scheduled', date: formatDateTime(returnBaseDate + 86400000) },
            { status: 'Picked Up', date: 'Pending', isFuture: true },
            { status: 'Refund Processed', date: 'Pending', isFuture: true, isLast: true }
        ];
    }

    const returnSteps = returnStepsRaw.map((step, index) => {
        const isCompleted = index <= returnStep;

        let displayDate = step.date;
        if (step.isFuture && isCompleted) {
            displayDate = formatDateTime(returnBaseDate + (index * 86400000));
        }

        return {
            ...step,
            completed: isCompleted,
            current: index === returnStep,
            date: displayDate
        };
    });
    const currentReturnStatus = returnSteps[Math.min(returnStep, returnSteps.length - 1)] || returnSteps[0];


    // --- VIEW LOGIC ---
    const isReturnView = view === 'return';
    const backTarget = isReturnView ? `/order-tracking/${orderId}` : "/profile/orders";
    const activeTimelineSteps = isReturnView ? returnSteps : deliverySteps;
    const activeTitle = isReturnView ? (returnRequest?.type === 'exchange' ? 'Exchange Status' : 'Return Status') : 'Tracking Details';
    const activeStatusObj = isReturnView ? currentReturnStatus : currentDeliveryStatus;

    // --- RENDER HELPERS ---
    const RenderTimeline = ({ steps }) => (
        <div className="space-y-0 relative pl-2 md:pl-0">
            {steps.map((step, index) => (
                <div key={index} className="flex gap-4 md:gap-6 relative pb-8 last:pb-0">
                    {/* Connecting Line */}
                    {index !== steps.length - 1 && (
                        <div className={`absolute left-[5px] md:left-[11px] top-4 md:top-6 bottom-0 w-0.5 z-0 transition-colors duration-500 ${step.completed && steps[index + 1]?.completed ? 'bg-black' : 'bg-gray-200'}`}></div>
                    )}

                    {/* Dot/Icon */}
                    <div className="relative z-10 flex-shrink-0 mt-0.5 md:mt-1">
                        <div className={`w-3 h-3 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-all duration-500 ${step.completed ? 'bg-black md:shadow-md' : 'bg-gray-200'} ${step.current ? 'ring-4 ring-black/10 scale-110' : ''}`}>
                            <span className="hidden md:block">
                                {step.completed && <Check className="w-3.5 h-3.5 text-white" />}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 -mt-1 md:mt-0">
                        <h4 className={`text-xs md:text-lg font-display font-bold transition-colors duration-500 ${step.completed || step.current ? 'text-black' : 'text-gray-400'}`}>
                            {step.status}
                        </h4>
                        {step.date && <p className="text-[10px] md:text-sm text-gray-500 font-medium mt-0.5 md:mt-1 font-serif">{step.date}</p>}
                    </div>
                </div>
            ))}
        </div>
    );

    // --- SUMMARY VIEW ---
    return (
        <div className="min-h-screen bg-white font-sans pt-0 md:pt-12 pb-12 selection:bg-[#D39A9F] selection:text-white">
            <div className="md:hidden bg-white shadow-sm p-4 sticky top-0 z-20 flex items-center gap-4">
                <Link to={backTarget} className="p-2 -ml-2 text-black">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-lg font-bold font-display text-black">Order #{(order.displayId || order.orderId || order.id || '').toString().replace('ORD-', '')}</h1>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-0">
                <div className="hidden md:block mb-6">
                    <Link to={backTarget} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors group uppercase tracking-widest font-bold text-[10px]">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        {isReturnView ? 'Back to Order Journey' : 'Back to Orders'}
                    </Link>
                </div>

                <h2 className="text-xl md:text-2xl font-display font-bold text-black mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#D39A9F]" />
                    Order Journey
                </h2>

                <div className="space-y-8">
                    {/* 1. Return/Exchange Request Card (Latest Activity First) */}
                    {returnRequest && (
                        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow relative z-10">
                            <div className="p-3 md:p-5 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    {/* Icon Logic: Spin if processing, Green Check if complete */}
                                    {returnStep >= (returnRequest?.type === 'exchange' ? 4 : 3) ? (
                                        <div className="bg-green-50 text-green-600 p-1.5 rounded-full">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-full">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                                            {returnRequest.type === 'exchange' ? 'Exchange Request' : 'Return Request'}
                                        </span>
                                        <h3 className="text-xs md:text-sm font-bold text-black mt-0.5">{currentReturnStatus.status}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 md:p-5 bg-white space-y-6">
                                <div className="flex gap-3 items-center">
                                    {returnRequest.items.map((item, idx) => (
                                        <div key={idx} className="relative">
                                            <ProductThumb
                                                src={item.image}
                                                alt={item.name}
                                                className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-gray-100 grayscale-[0.2]"
                                                fallbackClassName="border-gray-100"
                                                fallbackIconClassName="w-4 h-4"
                                            />
                                        </div>
                                    ))}

                                    <div className="flex flex-col justify-center pl-1">
                                        <p className="text-xs font-bold text-black">ID: {returnRequest.id}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
                                            {returnRequest.type} request • {returnRequest.status}
                                        </p>
                                    </div>
                                </div>

                                {/* Inline Return Timeline */}
                                <div className="border-t border-gray-100 pt-5">
                                    <h4 className="text-[10px] font-bold text-[#D39A9F] uppercase tracking-widest mb-4">Return Journey</h4>
                                    <RenderTimeline steps={returnSteps} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Original Order Card */}
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow relative">
                        {/* Connecting line to show flow (Upwards to Return if exists) */}
                        {returnRequest && <div className="absolute top-[-24px] left-8 w-0.5 h-6 bg-gray-100 z-0"></div>}

                        <div className="p-3 md:p-5 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                            <div>
                                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Original Delivery</span>
                                <h3 className="text-xs md:text-sm font-bold text-black mt-0.5">{currentDeliveryStatus.status}</h3>
                            </div>
                        </div>
                        <div className="p-3 md:p-5 space-y-6">
                            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex-shrink-0 w-12 md:w-14">
                                        <ProductThumb
                                            src={item.image}
                                            alt={item.name}
                                            className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-gray-100"
                                            fallbackClassName="border-gray-100"
                                            fallbackIconClassName="w-4 h-4"
                                        />
                                    </div>
                                ))}
                                <div className="flex flex-col justify-center pl-1">
                                    <p className="text-xs font-bold text-black">{order.items.length} Items</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Total: {formatCurrency(order.total)}</p>
                                </div>
                            </div>

                            {/* Inline Original Delivery Timeline */}
                            <div className="border-t border-gray-100 pt-5">
                                <h4 className="text-[10px] font-bold text-[#D39A9F] uppercase tracking-widest mb-4">Delivery Journey</h4>
                                <RenderTimeline steps={deliverySteps} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section Integrated at the bottom */}
                <div className="mt-20 border-t border-gray-100 pt-16">
                    <FAQSection />
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
