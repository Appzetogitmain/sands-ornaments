import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Box,
    CheckCircle2,
    Clock,
    Image as ImageIcon,
    IndianRupee,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Truck,
    User,
    Video,
    XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';

const STATUS_STYLES = {
    Pending: 'text-amber-600 bg-amber-50 border-amber-100',
    Approved: 'text-blue-600 bg-blue-50 border-blue-100',
    Rejected: 'text-red-600 bg-red-50 border-red-100',
    'Pickup Scheduled': 'text-sky-600 bg-sky-50 border-sky-100',
    'Pickup Completed': 'text-indigo-600 bg-indigo-50 border-indigo-100',
    'Refund Initiated': 'text-violet-600 bg-violet-50 border-violet-100',
    Refunded: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    Closed: 'text-gray-700 bg-gray-100 border-gray-200'
};

const ALLOWED_TRANSITIONS = {
    Pending: ['Approved', 'Rejected'],
    Approved: ['Pickup Scheduled', 'Refund Initiated', 'Refunded', 'Closed'],
    Rejected: [],
    'Pickup Scheduled': ['Pickup Completed'],
    'Pickup Completed': ['Refund Initiated', 'Refunded', 'Closed'],
    'Refund Initiated': ['Refunded', 'Closed'],
    Refunded: ['Closed'],
    Closed: []
};

const ACTION_LABELS = {
    Approved: 'Approve Return',
    Rejected: 'Reject Return',
    'Pickup Scheduled': 'Schedule Pickup',
    'Pickup Completed': 'Mark Pickup Completed',
    'Refund Initiated': 'Initiate Refund',
    Refunded: 'Mark Refunded',
    Closed: 'Close Return'
};

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
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

const ReturnDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ret, setRet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminComment, setAdminComment] = useState('');
    const [refundAmount, setRefundAmount] = useState('');
    const [refundMethod, setRefundMethod] = useState('');
    const [refundTransactionId, setRefundTransactionId] = useState('');
    const [pickupPartner, setPickupPartner] = useState('');
    const [pickupAwb, setPickupAwb] = useState('');
    const [pickupScheduledDate, setPickupScheduledDate] = useState('');
    const [voidTagStatus, setVoidTagStatus] = useState('Pending');
    const [voidTagNotes, setVoidTagNotes] = useState('');

    const formatDateInputValue = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    };

    const fetchReturnData = async () => {
        setLoading(true);
        try {
            const data = await adminService.getReturnDetails(id);
            setRet(data);
        } catch (err) {
            toast.error('Unable to load this return request right now.');
            navigate('/admin/returns');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturnData();
    }, [id]);

    useEffect(() => {
        if (!ret) return;
        setAdminComment(ret.adminComment || '');
        setRefundAmount(ret.refundAmount ? String(ret.refundAmount) : '');
        setRefundMethod(ret.refundMethod || '');
        setRefundTransactionId(ret.refundTransactionId || '');
        setPickupPartner(ret.pickup?.partner || '');
        setPickupAwb(ret.pickup?.awb || '');
        setPickupScheduledDate(formatDateInputValue(ret.pickup?.scheduledDate));
        
        if (ret.voidTagVerification) {
            setVoidTagStatus(ret.voidTagVerification.status || 'Pending');
            setVoidTagNotes(ret.voidTagVerification.notes || '');
        }
    }, [ret]);

    const timeline = useMemo(() => {
        if (!ret) return [];
        if (Array.isArray(ret.timeline) && ret.timeline.length > 0) return ret.timeline;
        return [{
            status: ret.status,
            note: 'Return request created',
            date: ret.createdAt || ret.requestDate
        }];
    }, [ret]);

    const allowedTransitions = ret ? (ALLOWED_TRANSITIONS[ret.status] || []) : [];
    const returnHasVoidTag = Boolean((ret?.items || []).some((item) => String(item?.voidTagId || '').trim()));
    const primaryVoidTagId = (ret?.items || []).find((item) => String(item?.voidTagId || '').trim())?.voidTagId || '';

    const handleAction = async (status) => {
        if (['Refund Initiated', 'Refunded'].includes(status) && !String(refundAmount).trim()) {
            toast.error('Enter the refund amount before continuing.');
            return;
        }

        if (returnHasVoidTag && ['Approved', 'Rejected'].includes(status) && !['Intact', 'Tampered', 'Missing'].includes(voidTagStatus)) {
            toast.error('Choose a seal verification result before processing this return.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await adminService.processReturn(id, {
                status,
                note: adminComment,
                refundAmount,
                refundMethod,
                refundTransactionId,
                pickupPartner,
                pickupAwb,
                pickupScheduledDate,
                voidTagStatus,
                voidTagNotes
            });
            if (!res.success) {
                toast.error(res.message || 'Failed to update return status.');
                return;
            }
            setRet(res.returnReq || ret);
            toast.success(res.message || `Return updated to ${status}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest animate-pulse">Loading return details...</div>;
    if (!ret) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">Return request not found</div>;

    const pickupAddress = ret.pickupAddress || {};

    return (
        <div className="space-y-6 pb-20 text-left font-sans animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/admin/returns')}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#3E2723] font-bold text-xs uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Returns
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Return ID</p>
                    <p className="text-lg font-medium text-black select-all">#{ret.returnDisplayId}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                    <p
                        className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => ret.order?._id && navigate(`/admin/orders/${ret.order._id}`)}
                    >
                        #{ret.orderDisplayId}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-widest border ${STATUS_STYLES[ret.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {ret.status}
                    </span>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Refund Amount</p>
                    <p className="text-xl font-medium text-[#3E2723]">{formatCurrency(ret.refundAmount)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest flex items-center gap-2">
                                <Box size={16} /> Return Items ({ret.itemCount || ret.items?.length || 0})
                            </h3>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4 text-center">Qty</th>
                                    <th className="p-4 text-right">Price</th>
                                    <th className="p-4">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(ret.items || []).map((item, idx) => (
                                    <tr key={`${item.variantId || item.productId}-${idx}`} className="hover:bg-gray-50/50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 p-1 shrink-0 flex items-center justify-center">
                                                    <ImageIcon size={16} className="text-gray-300" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-[#3E2723]">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.sku || 'No SKU'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-bold text-gray-600">{item.qty || item.quantity || 0}</td>
                                        <td className="p-4 text-right font-bold text-[#3E2723]">{formatCurrency(item.price)}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-wider">{item.reason || ret.reason}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <MessageSquare size={16} /> Customer Evidence
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Comment</p>
                            <p className="text-xs font-bold text-[#3E2723] mt-2 italic leading-relaxed">
                                {ret.comment ? `"${ret.comment}"` : 'No comment provided.'}
                            </p>
                        </div>
                        <div className="mt-6">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Security Seal (Void Tag) Evidence</p>
                            {returnHasVoidTag && (
                                <p className="text-xs font-bold text-amber-700 mb-3">
                                    Expected Seal ID: <span className="font-black tracking-wide text-amber-900">{primaryVoidTagId}</span>
                                </p>
                            )}
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {(ret.evidence?.voidTagImages || []).map((img, index) => (
                                    <a
                                        key={index}
                                        href={img}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-32 h-32 rounded-xl border-2 border-amber-200 overflow-hidden shrink-0 relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
                                    >
                                        <img src={img} alt="Void Tag" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-amber-900/10 group-hover:bg-transparent transition-colors"></div>
                                        <div className="absolute bottom-2 left-2 bg-amber-600 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-tighter">Security Photo</div>
                                    </a>
                                ))}
                                {!ret.evidence?.voidTagImages?.length && (
                                    <div className="text-xs text-amber-600 font-bold bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 italic">
                                        {returnHasVoidTag ? 'No security seal images uploaded by customer.' : 'No security seal evidence uploaded for this return.'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Product Condition Evidence</p>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {(ret.evidenceImages || []).map((img, index) => (
                                    <a
                                        key={index}
                                        href={img}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-32 h-32 rounded-xl border border-gray-200 overflow-hidden shrink-0 relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
                                    >
                                        <img src={img} alt="Product Proof" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                                        <div className="absolute bottom-2 left-2 bg-gray-600 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-tighter">General Photo</div>
                                    </a>
                                ))}
                                {!ret.evidenceImages?.length && (
                                    <div className="text-xs text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 italic">
                                        No product condition photos uploaded by customer.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <IndianRupee size={16} /> Refund Details
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between text-gray-500">
                                <span className="font-medium">Refund Method</span>
                                <span className="font-bold text-[#3E2723]">{ret.refundMethod || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span className="font-medium">Transaction ID</span>
                                <span className="font-mono font-bold text-[#3E2723]">{ret.refundTransactionId || 'Pending'}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span className="font-medium">Refund Initiated</span>
                                <span className="font-bold text-[#3E2723]">{formatDate(ret.refundInitiatedAt)}</span>
                            </div>
                            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
                                <span className="font-black text-[#3E2723] uppercase tracking-tight">Total Refund Amount</span>
                                <span className="text-xl font-black text-emerald-600">{formatCurrency(ret.refundAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Actions</h3>
                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723] min-h-[80px] resize-none"
                            placeholder="Add internal comment..."
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                        />
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Amount</label>
                            <input
                                type="number"
                                min="0"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]"
                                placeholder="Enter refund amount"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Method</label>
                            <input
                                type="text"
                                value={refundMethod}
                                onChange={(e) => setRefundMethod(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]"
                                placeholder="UPI, Bank Transfer, Razorpay..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Transaction ID</label>
                            <input
                                type="text"
                                value={refundTransactionId}
                                onChange={(e) => setRefundTransactionId(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]"
                                placeholder="Transaction reference"
                            />
                        </div>
                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Partner</label>
                            <input
                                type="text"
                                value={pickupPartner}
                                onChange={(e) => setPickupPartner(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]"
                                placeholder="Manual / Delhivery / courier name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup AWB</label>
                            <input
                                type="text"
                                value={pickupAwb}
                                onChange={(e) => setPickupAwb(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]"
                                placeholder="Pickup tracking ID"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Scheduled Date</label>
                            <input
                                type="date"
                                value={pickupScheduledDate}
                                onChange={(e) => setPickupScheduledDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]"
                            />
                        </div>
                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest">Seal Status Verification</label>
                            <select
                                value={voidTagStatus}
                                onChange={(e) => setVoidTagStatus(e.target.value)}
                                disabled={!returnHasVoidTag}
                                className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-black uppercase outline-none focus:border-amber-500"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Intact">Intact (Valid)</option>
                                <option value="Tampered">Tampered (Invalid)</option>
                                <option value="Missing">Missing (Invalid)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest">Seal Verification Note</label>
                            <textarea
                                value={voidTagNotes}
                                onChange={(e) => setVoidTagNotes(e.target.value)}
                                disabled={!returnHasVoidTag}
                                className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-amber-500 min-h-[60px] resize-none"
                                placeholder="Describe seal condition..."
                            />
                        </div>
                        {returnHasVoidTag && (
                            <p className="text-[10px] font-bold text-amber-700">
                                Tagged-item returns require an explicit seal verdict before approval or rejection.
                            </p>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                            {allowedTransitions.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleAction(status)}
                                    disabled={isSubmitting}
                                    className="flex items-center justify-center gap-2 bg-[#3E2723] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2d1e1b] transition-all disabled:opacity-60"
                                >
                                    {status === 'Rejected' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                                    {ACTION_LABELS[status] || status}
                                </button>
                            ))}
                            {allowedTransitions.length === 0 && (
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    No more actions available for this return.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <User size={14} /> Customer
                            </h3>
                            <div className="space-y-2">
                                <p className="font-bold text-[#3E2723] text-sm">{ret.customerName}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={12} /> {ret.customerPhone || 'N/A'}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={12} /> {ret.customerEmail || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-50"></div>

                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin size={14} /> Pickup Address
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                    {pickupAddress.line1 || [pickupAddress.flatNo, pickupAddress.area].filter(Boolean).join(', ') || 'Address not available'}
                                </p>
                                <p className="text-xs font-bold text-gray-700">
                                    {[pickupAddress.city, pickupAddress.district, pickupAddress.state].filter(Boolean).join(', ')}
                                    {pickupAddress.pincode ? ` - ${pickupAddress.pincode}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Clock size={16} /> Return Timeline
                        </h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100"></div>
                            {timeline.map((step, idx) => {
                                const done = true;
                                return (
                                    <div key={`${step.status}-${idx}`} className="relative flex items-start gap-4">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 ${done ? 'bg-[#3E2723] border-[#3E2723] text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                                            {done ? <CheckCircle2 size={12} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-gray-200"></div>}
                                        </div>
                                        <div className="-mt-1">
                                            <p className="text-xs font-bold text-[#3E2723]">{step.status}</p>
                                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{formatDate(step.date)}</p>
                                            {step.note ? <p className="text-xs text-gray-500 mt-1">{step.note}</p> : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {(ret.pickup?.partner || ret.pickup?.awb || ret.pickup?.status) && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
                            <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Truck size={16} /> Pickup Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Partner</span>
                                    <span className="font-bold text-[#3E2723]">{ret.pickup?.partner || 'Manual'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Return AWB</span>
                                    <span className="font-mono font-bold text-[#3E2723]">{ret.pickup?.awb || 'Pending'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Pickup Scheduled</span>
                                    <span className="font-bold text-[#3E2723]">{formatDate(ret.pickup?.scheduledDate)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Pickup Status</span>
                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">{ret.pickup?.status || 'Pending'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReturnDetailPage;
