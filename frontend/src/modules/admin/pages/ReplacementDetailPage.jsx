import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Box,
    CheckCircle2,
    Clock,
    Image as ImageIcon,
    Mail,
    MapPin,
    MessageSquare,
    Package,
    Phone,
    RefreshCcw,
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
    'Replacement Shipped': 'text-violet-600 bg-violet-50 border-violet-100',
    Delivered: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    Closed: 'text-gray-700 bg-gray-100 border-gray-200'
};

const ALLOWED_TRANSITIONS_AFTER_PICKUP = {
    Pending: ['Approved', 'Rejected'],
    Approved: ['Pickup Scheduled', 'Pickup Completed', 'Closed'],
    Rejected: [],
    'Pickup Scheduled': ['Pickup Completed'],
    'Pickup Completed': ['Replacement Shipped', 'Closed'],
    'Replacement Shipped': ['Delivered', 'Closed'],
    Delivered: ['Closed'],
    Closed: []
};

const ALLOWED_TRANSITIONS_IMMEDIATE = {
    Pending: ['Approved', 'Rejected'],
    Approved: ['Replacement Shipped', 'Closed'],
    Rejected: [],
    'Replacement Shipped': ['Pickup Scheduled', 'Pickup Completed', 'Delivered', 'Closed'],
    'Pickup Scheduled': ['Pickup Completed'],
    'Pickup Completed': ['Delivered', 'Closed'],
    Delivered: ['Closed'],
    Closed: []
};

const ACTION_LABELS = {
    Approved: 'Approve Replacement',
    Rejected: 'Reject Replacement',
    'Pickup Scheduled': 'Schedule Pickup',
    'Pickup Completed': 'Mark Pickup Completed',
    'Replacement Shipped': 'Mark Replacement Shipped',
    Delivered: 'Mark Delivered',
    Closed: 'Close Replacement'
};

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

const formatDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const ItemTable = ({ title, icon: Icon, items = [] }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest flex items-center gap-2">
                <Icon size={16} /> {title} ({items.length})
            </h3>
        </div>
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-gray-100 text-xs font-black text-gray-400 uppercase tracking-widest">
                    <th className="p-4">Item Details</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4">SKU</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                    <tr key={`${item.variantId || item.productId}-${idx}`} className="hover:bg-gray-50/50">
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 p-1 shrink-0 flex items-center justify-center">
                                    <ImageIcon size={16} className="text-gray-300" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#3E2723]">{item.name}</p>
                                </div>
                            </div>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-600">{item.qty || item.quantity || 0}</td>
                        <td className="p-4 text-xs font-bold text-gray-500">{item.sku || 'No SKU'}</td>
                    </tr>
                ))}
                {items.length === 0 && (
                    <tr>
                        <td colSpan="3" className="p-6 text-center text-xs font-bold text-gray-400">No items recorded.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const ReplacementDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [replacement, setReplacement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminComment, setAdminComment] = useState('');
    const [replacementMode, setReplacementMode] = useState('after_pickup');
    const [itemCondition, setItemCondition] = useState('');
    const [stockAction, setStockAction] = useState('');
    const [pickupPartner, setPickupPartner] = useState('');
    const [pickupAwb, setPickupAwb] = useState('');
    const [pickupScheduledDate, setPickupScheduledDate] = useState('');
    const [shipmentPartner, setShipmentPartner] = useState('');
    const [shipmentAwb, setShipmentAwb] = useState('');
    const [shipmentStatus, setShipmentStatus] = useState('');
    const [shipmentTrackingLink, setShipmentTrackingLink] = useState('');

    useEffect(() => {
        const fetchReplacement = async () => {
            try {
                setLoading(true);
                const data = await adminService.getReplacementDetails(id);
                setReplacement(data);
            } catch (err) {
                toast.error('Unable to load this replacement right now.');
                navigate('/admin/replacements');
            } finally {
                setLoading(false);
            }
        };

        fetchReplacement();
    }, [id, navigate]);

    useEffect(() => {
        if (!replacement) return;
        setAdminComment(replacement.adminComment || '');
        setReplacementMode(replacement.replacementMode || 'after_pickup');
        setItemCondition(replacement.itemCondition || '');
        setStockAction(replacement.stockAction || '');
        setPickupPartner(replacement.pickup?.partner || '');
        setPickupAwb(replacement.pickup?.awb || '');
        setPickupScheduledDate(formatDateInputValue(replacement.pickup?.scheduledDate));
        setShipmentPartner(replacement.shipment?.partner || '');
        setShipmentAwb(replacement.shipment?.awb || '');
        setShipmentStatus(replacement.shipment?.status || '');
        setShipmentTrackingLink(replacement.shipment?.trackingLink || '');
    }, [replacement]);

    const timeline = useMemo(() => {
        if (!replacement) return [];
        if (Array.isArray(replacement.timeline) && replacement.timeline.length > 0) return replacement.timeline;
        return [{
            status: replacement.status,
            note: 'Replacement request created',
            date: replacement.createdAt
        }];
    }, [replacement]);

    const allowedTransitions = useMemo(() => {
        if (!replacement) return [];
        const transitions = replacement.replacementMode === 'immediate'
            ? ALLOWED_TRANSITIONS_IMMEDIATE
            : ALLOWED_TRANSITIONS_AFTER_PICKUP;
        return transitions[replacement.status] || [];
    }, [replacement]);

    const handleAction = async (status) => {
        if (status === 'Pickup Completed') {
            if (!String(itemCondition).trim()) {
                toast.error('Set the returned item condition before completing pickup.');
                return;
            }
            if (!String(stockAction).trim()) {
                toast.error('Choose the stock action before completing pickup.');
                return;
            }
        }

        if (status === 'Replacement Shipped' && !String(shipmentPartner).trim()) {
            toast.error('Enter the shipment partner before marking the replacement shipped.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await adminService.processReplacement(id, {
                status,
                note: adminComment,
                replacementMode,
                itemCondition,
                stockAction,
                pickupPartner,
                pickupAwb,
                pickupScheduledDate,
                shipmentPartner,
                shipmentAwb,
                shipmentStatus,
                shipmentTrackingLink
            });

            if (!res.success) {
                toast.error(res.message || 'Failed to update replacement status.');
                return;
            }

            setReplacement(res.repl || replacement);
            toast.success(res.message || `Replacement updated to ${status}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest animate-pulse">Loading replacement details...</div>;
    if (!replacement) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">Replacement request not found</div>;

    const pickupAddress = replacement.pickupAddress || {};

    return (
        <div className="space-y-6 pb-20 text-left font-sans animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/admin/replacements')}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#3E2723] font-bold text-xs uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Replacements
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Replacement ID</p>
                    <p className="text-lg font-medium text-black select-all">#{replacement.replacementDisplayId}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                    <p className="text-sm font-medium text-blue-600">{replacement.orderDisplayId}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-widest border ${STATUS_STYLES[replacement.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {replacement.status}
                    </span>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Replacement Mode</p>
                    <p className="text-sm font-bold text-[#3E2723] uppercase">{replacement.replacementMode || 'after_pickup'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ItemTable title="Original Items" icon={RefreshCcw} items={replacement.originalItems} />
                    <ItemTable title="Replacement Items" icon={Box} items={replacement.replacementItems} />

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <MessageSquare size={16} /> Customer Evidence
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Comment</p>
                            <p className="text-xs font-bold text-[#3E2723] mt-2 italic leading-relaxed">
                                {replacement.comment ? `"${replacement.comment}"` : 'No comment provided.'}
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reason</p>
                                <p className="text-sm font-bold text-[#3E2723]">{replacement.reason}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Proof Uploads</p>
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {(replacement.evidenceImages || []).map((img, index) => (
                                        <a key={`${img}-${index}`} href={img} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-xl border border-gray-200 overflow-hidden shrink-0 relative group cursor-pointer shadow-sm hover:shadow-md transition-all">
                                            <img src={img} alt="Proof" className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                    {replacement.evidenceVideo && (
                                        <a href={replacement.evidenceVideo} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0 cursor-pointer shadow-sm hover:shadow-md transition-all">
                                            <Video className="text-gray-400" size={20} />
                                        </a>
                                    )}
                                    {!replacement.evidenceImages?.length && !replacement.evidenceVideo && (
                                        <div className="text-xs text-gray-400 font-bold">No evidence uploaded.</div>
                                    )}
                                </div>
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
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Replacement Mode</label>
                            <select value={replacementMode} onChange={(e) => setReplacementMode(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]">
                                <option value="after_pickup">After Pickup</option>
                                <option value="immediate">Immediate</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Condition</label>
                                <select value={itemCondition} onChange={(e) => setItemCondition(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]">
                                    <option value="">Not set</option>
                                    <option value="Good">Good</option>
                                    <option value="Damaged">Damaged</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Action</label>
                                <select value={stockAction} onChange={(e) => setStockAction(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]">
                                    <option value="">Not set</option>
                                    <option value="Restock">Restock</option>
                                    <option value="Discard">Discard</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Partner</label>
                            <input type="text" value={pickupPartner} onChange={(e) => setPickupPartner(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" placeholder="Manual / Delhivery / courier name" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" value={pickupAwb} onChange={(e) => setPickupAwb(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" placeholder="Pickup AWB" />
                            <input type="date" value={pickupScheduledDate} onChange={(e) => setPickupScheduledDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" />
                        </div>
                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Shipment Partner</label>
                            <input type="text" value={shipmentPartner} onChange={(e) => setShipmentPartner(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" placeholder="Outbound courier partner" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <input type="text" value={shipmentAwb} onChange={(e) => setShipmentAwb(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" placeholder="Shipment AWB / tracking ID" />
                            <input type="text" value={shipmentStatus} onChange={(e) => setShipmentStatus(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" placeholder="Shipment status" />
                            <input type="text" value={shipmentTrackingLink} onChange={(e) => setShipmentTrackingLink(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#3E2723]" placeholder="Shipment tracking link" />
                        </div>
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
                                    No more actions available for this replacement.
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
                                <p className="font-bold text-[#3E2723] text-sm">{replacement.customerName}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={12} /> {replacement.customerPhone || 'N/A'}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={12} /> {replacement.customerEmail || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-50"></div>

                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin size={14} /> Pickup Address
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                    {[pickupAddress.flatNo, pickupAddress.area, pickupAddress.line1].filter(Boolean).join(', ') || 'Address not available'}
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
                            <Clock size={16} /> Replacement Timeline
                        </h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100"></div>
                            {timeline.map((step, idx) => (
                                <div key={`${step.status}-${idx}`} className="relative flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 bg-[#3E2723] border-[#3E2723] text-white">
                                        <CheckCircle2 size={12} strokeWidth={3} />
                                    </div>
                                    <div className="-mt-1">
                                        <p className="text-xs font-bold text-[#3E2723]">{step.status}</p>
                                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{formatDate(step.date)}</p>
                                        {step.note ? <p className="text-xs text-gray-500 mt-1">{step.note}</p> : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {(replacement.pickup?.partner || replacement.pickup?.awb || replacement.pickup?.status) && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
                            <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Truck size={16} /> Pickup Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Partner</span><span className="font-bold text-[#3E2723]">{replacement.pickup?.partner || 'Manual'}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Return AWB</span><span className="font-mono font-bold text-[#3E2723]">{replacement.pickup?.awb || 'Pending'}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Pickup Scheduled</span><span className="font-bold text-[#3E2723]">{formatDate(replacement.pickup?.scheduledDate)}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Pickup Status</span><span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">{replacement.pickup?.status || 'Pending'}</span></div>
                            </div>
                        </div>
                    )}

                    {(replacement.shipment?.partner || replacement.shipment?.awb || replacement.shipment?.status) && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-violet-500">
                            <h3 className="text-xs font-black text-[#3E2723] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package size={16} /> Replacement Shipment
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Partner</span><span className="font-bold text-[#3E2723]">{replacement.shipment?.partner || 'Manual'}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Shipment AWB</span><span className="font-mono font-bold text-[#3E2723]">{replacement.shipment?.awb || 'Pending'}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Shipment Status</span><span className="font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">{replacement.shipment?.status || 'Pending'}</span></div>
                                {replacement.shipment?.trackingLink ? (
                                    <a href={replacement.shipment.trackingLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Open Tracking Link</a>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReplacementDetailPage;
