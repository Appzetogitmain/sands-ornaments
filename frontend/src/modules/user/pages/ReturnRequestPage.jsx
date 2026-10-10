import React, { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShop } from '../../../context/ShopContext';
import api from '../../../services/api';

const formatCurrency = (value) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

const resolveImageSrc = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || null;

const ProductThumb = ({ src, alt = '', className }) => {
    const imageSrc = resolveImageSrc(src);

    if (!imageSrc) {
        return (
            <div className={`${className} bg-[#FDFDFD] border border-gray-100 flex items-center justify-center text-gray-400`}>
                <Package size={18} />
            </div>
        );
    }

    return <img src={imageSrc} alt={alt} className={className} />;
};

const ReturnRequestPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user, orders, returns, refreshReturns } = useShop();
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeReturns = Array.isArray(returns) ? returns : [];
    const order = user ? safeOrders.find((item) => String(item.id || item._id) === String(orderId)) : null;
    const fileInputRef = useRef(null);

    const existingReturnedVariantIds = useMemo(() => {
        const ids = new Set();
        safeReturns
            .filter((request) => String(request.orderId?._id || request.orderId) === String(order?.id || order?._id))
            .forEach((request) => {
                (request.items || []).forEach((item) => {
                    ids.add(String(item.variantId || ''));
                });
            });
        return ids;
    }, [safeReturns, order]);

    const [selectedItemId, setSelectedItemId] = useState('');
    const [reason, setReason] = useState('');
    const [comments, setComments] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [voidTagFiles, setVoidTagFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const voidTagInputRef = useRef(null);
    const selectedOrderItem = useMemo(
        () => (order?.items || []).find((item) => String(item._id || item.id) === String(selectedItemId)) || null,
        [order, selectedItemId]
    );
    const requiresVoidTagPhoto = Boolean(String(selectedOrderItem?.voidTagId || '').trim());

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []).slice(0, 5);
        setSelectedFiles(files);
    };

    if (!order) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const reasons = [
        'Damaged / Defective Product',
        'Wrong Item Delivered',
        'Quality Issues',
        'Item Not As Described',
        'Package Tampered',
        'Changed Mind'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedItemId) {
            toast.error('Please select one item to return');
            return;
        }

        if (requiresVoidTagPhoto && voidTagFiles.length === 0) {
            toast.error('Please upload a clear photo of the intact security void tag');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('orderId', order.id || order._id);
            formData.append('itemId', selectedItemId);
            formData.append('reason', reason);
            formData.append('description', comments);
            selectedFiles.forEach((file) => formData.append('evidence', file));
            voidTagFiles.forEach((file) => formData.append('voidTagImages', file));

            await api.post('user/returns', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await refreshReturns();
            toast.success('Return request submitted');
            navigate('/returns');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit return request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#fcfcfc] min-h-screen py-12">
            <div className="container mx-auto px-4 md:px-12 max-w-3xl">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-footerBg uppercase tracking-tight">Request Return</h1>
                        <p className="text-gray-500 text-sm mt-1">Order #{order.displayId || order.orderId || order.id}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <h3 className="font-bold text-footerBg mb-4 flex items-center gap-2">
                            <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                            SELECT ITEM
                        </h3>
                        <div className="space-y-4">
                            {(order.items || []).map((item) => {
                                const itemId = item._id || item.id;
                                const alreadyReturned = existingReturnedVariantIds.has(String(item.variantId || ''));
                                const checked = selectedItemId === itemId;

                                return (
                                    <label
                                        key={itemId}
                                        className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${alreadyReturned ? 'bg-gray-50 border-gray-100 grayscale opacity-60 cursor-not-allowed' : checked ? 'border-primary bg-primary/5 cursor-pointer ring-2 ring-primary/10' : 'border-gray-100 hover:border-gray-200 cursor-pointer'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="return-item"
                                            className="mt-1 w-5 h-5 accent-primary border-gray-300"
                                            checked={checked || alreadyReturned}
                                            disabled={alreadyReturned}
                                            onChange={() => !alreadyReturned && setSelectedItemId(itemId)}
                                        />
                                        <ProductThumb
                                            src={item.image}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-contain mix-blend-multiply"
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-3">
                                                <p className="font-bold text-footerBg text-sm leading-tight max-w-[200px]">{item.name}</p>
                                                {alreadyReturned && (
                                                    <span className="text-[9px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded font-black uppercase tracking-wider">Requested</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                                Qty: {item.quantity || 1} × {formatCurrency(item.price)}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <h3 className="font-bold text-footerBg mb-4 flex items-center gap-2">
                            <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                            REASON & EVIDENCE
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-widest">Reason For Return</label>
                                <select
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-bold text-footerBg appearance-none"
                                >
                                    <option value="">Select a reason</option>
                                    {reasons.map((itemReason) => <option key={itemReason} value={itemReason}>{itemReason}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Additional Comments</label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    rows="3"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                                    placeholder="Please describe the issue in detail..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Upload Photos (Optional)</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-xs text-gray-500">Click to select up to 5 images</p>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="grid grid-cols-4 gap-4 mt-4">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={`${file.name}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                                                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm transition-all hover:shadow-md">
                        <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                            <span className="bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                            SECURITY SEAL VERIFICATION
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-amber-100">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Mandatory Security Photo</p>
                                <p className="text-xs text-amber-700 leading-relaxed mb-4">
                                    {requiresVoidTagPhoto
                                        ? <>To prevent return fraud, this item must have its <strong>Security Void Tag</strong> attached and unbroken. Please upload a clear photo of the intact tag as shown in the example.</>
                                        : <>If this item was delivered with a seller security seal, upload a clear photo of the intact tag to speed up review.</>}
                                </p>
                                {requiresVoidTagPhoto && selectedOrderItem?.voidTagId && (
                                    <p className="text-[11px] font-bold text-amber-900 mb-4">
                                        Expected Seal ID: <span className="font-black tracking-wide">{selectedOrderItem.voidTagId}</span>
                                    </p>
                                )}

                                <input
                                    type="file"
                                    ref={voidTagInputRef}
                                    onChange={(e) => setVoidTagFiles(Array.from(e.target.files || []).slice(0, 2))}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => voidTagInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${voidTagFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-amber-300 hover:bg-amber-100/50'}`}
                                >
                                    <Upload size={20} className={`mx-auto mb-2 ${voidTagFiles.length > 0 ? 'text-green-600' : 'text-amber-600'}`} />
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-900">
                                        {voidTagFiles.length > 0 ? `${voidTagFiles.length} Photo(s) Selected` : requiresVoidTagPhoto ? 'Upload Void Tag Photo' : 'Upload Seal Photo (Optional)'}
                                    </p>
                                </div>
                                {voidTagFiles.length > 0 && (
                                    <div className="flex gap-2 mt-4">
                                        {voidTagFiles.map((file, idx) => (
                                            <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-green-200">
                                                <img src={URL.createObjectURL(file)} alt="Void Tag Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-footerBg p-4 rounded-xl flex gap-3 items-start border border-gray-800">
                        <AlertCircle size={18} className="text-white mt-0.5 shrink-0" />
                        <p className="text-[10px] text-gray-300 leading-relaxed font-bold uppercase tracking-widest">
                            <strong>Policy Notice:</strong> If the physical security seal is found to be tampered, missing, or broken upon arrival, the return will be rejected and the item will be sent back to you without a refund.
                        </p>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-footerBg text-white px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg flex items-center gap-2"
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                            {!loading && <CheckCircle size={18} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReturnRequestPage;
