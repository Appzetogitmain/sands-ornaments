import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, RefreshCw, Truck, XCircle, AlertCircle, Package } from 'lucide-react';
import { useShop } from '../../../context/ShopContext';

const formatCurrency = (value) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

const resolveImageSrc = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || null;

const ProductThumb = ({ src, alt = '', className }) => {
    const imageSrc = resolveImageSrc(src);

    if (!imageSrc) {
        return (
            <div className={`${className} bg-slate-50 border border-gray-100 flex items-center justify-center text-slate-400`}>
                <Package size={18} />
            </div>
        );
    }

    return <img src={imageSrc} alt={alt} className={className} />;
};

const ReturnDetailPage = () => {
    const { returnId } = useParams();
    const navigate = useNavigate();
    const { returns } = useShop();
    const safeReturns = Array.isArray(returns) ? returns : [];
    const returnRequest = safeReturns.find((item) => String(item.id || item._id) === String(returnId));

    if (!returnRequest) {
        return <div className="min-h-screen flex items-center justify-center">Return request not found</div>;
    }

    const timelineFromRequest = Array.isArray(returnRequest.timeline) && returnRequest.timeline.length > 0
        ? returnRequest.timeline
        : [{ status: returnRequest.status || 'Pending', note: 'Return request is being reviewed.' }];

    const iconForStatus = (status) => {
        const normalized = String(status || '').toLowerCase();
        if (normalized.includes('reject')) return XCircle;
        if (normalized.includes('approve')) return CheckCircle;
        if (normalized.includes('pickup')) return Truck;
        if (normalized.includes('close') || normalized.includes('refund')) return RefreshCw;
        return Clock;
    };

    const timeline = timelineFromRequest.map((step, index) => ({
        ...step,
        icon: iconForStatus(step.status),
        completed: index < timelineFromRequest.length - 1,
        current: index === timelineFromRequest.length - 1
    }));

    const refundAmount = (returnRequest.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.qty || item.quantity || 0)), 0);
    const evidenceImages = Array.isArray(returnRequest.images) ? returnRequest.images : [];

    return (
        <div className="bg-[#fcfcfc] min-h-screen py-4 md:py-12">
            <div className="container mx-auto px-3 md:px-12 max-w-4xl">
                <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-10">
                    <button onClick={() => navigate('/returns')} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors text-footerBg/70">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black text-footerBg uppercase tracking-tighter md:tracking-tight leading-none">Return Status</h1>
                        <p className="text-[10px] md:text-sm font-mono text-slate-400 mt-1">#{returnRequest.displayId || returnRequest.id}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
                    <div className="lg:col-span-12 xl:col-span-8 space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Request Timeline</h3>

                            <div className="flex flex-col gap-5">
                                {timeline.map((step, index) => {
                                    const Icon = step.icon;
                                    return (
                                        <div key={`${step.status}-${index}`} className="flex gap-4 items-start">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 shrink-0 ${step.current ? 'border-primary text-primary bg-primary/5 shadow-lg shadow-primary/10' : 'bg-primary/5 border-primary/20 text-primary'}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-footerBg">
                                                    {step.status}
                                                </p>
                                                {step.note && (
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{step.note}</p>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-medium mt-1">
                                                    {step.date || step.createdAt ? new Date(step.date || step.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending update'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Returned Item(s)</h3>
                                <div className="text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-primary/10">
                                    {formatCurrency(refundAmount)}
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {(returnRequest.items || []).map((item, i) => (
                                    <div key={i} className="p-4 flex gap-4 items-center">
                                        <div className="relative shrink-0">
                                            <ProductThumb
                                                src={item.image}
                                                alt={item.name}
                                                className="w-14 h-14 rounded-xl object-cover"
                                            />
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-footerBg text-white text-[9px] font-black rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                                                {item.qty || item.quantity || 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[13px] md:text-sm font-black text-footerBg truncate mb-0.5">{item.name}</h4>
                                            <p className="text-[11px] font-bold text-slate-400 tracking-tight">
                                                Qty: {item.qty || item.quantity || 1} <span className="mx-1 opacity-20">×</span> {formatCurrency(item.price)}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[13px] md:text-sm font-black text-footerBg">
                                                {formatCurrency((item.price || 0) * (item.qty || item.quantity || 1))}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-12 xl:col-span-4 space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">
                                    Refund
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Reason</p>
                                    <p className="text-sm font-black text-footerBg leading-snug">{returnRequest.reason || 'Reason shared with support'}</p>
                                </div>

                                {returnRequest.comments && (
                                    <div>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Comments</p>
                                        <p className="text-[11px] font-medium text-slate-400 italic leading-relaxed border-l-2 border-slate-100 pl-3">
                                            "{returnRequest.comments}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {evidenceImages.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Evidence Images</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {evidenceImages.map((image, index) => (
                                            <ProductThumb
                                                key={`${image}-${index}`}
                                                src={image}
                                                alt={`Evidence ${index + 1}`}
                                                className="w-full aspect-square rounded-xl object-cover"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-5 border-t border-gray-50 flex items-center gap-3 bg-blue-50/50 p-4 -m-5 mt-5">
                                <AlertCircle size={16} className="text-blue-600 shrink-0" />
                                <p className="text-[10px] font-bold text-blue-700 leading-snug">
                                    Keep tags and packaging intact. Our executive will contact you before pickup.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnDetailPage;
