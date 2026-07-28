import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ScanLine, Search, AlertCircle, CheckCircle2, Box, ArrowLeft,
    ChevronLeft, ChevronRight, Filter, X, Eye, IndianRupee, Ban, Trash2
} from 'lucide-react';
import { adminDirectSaleService } from '../services/adminDirectSaleService';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';

const formatINR = (v) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return '₹0';
    return '₹' + n.toLocaleString('en-IN');
};

const fmtDatetime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const statusBadge = (status) => {
    const map = {
        completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        voided:    'bg-rose-100 text-rose-800 border border-rose-200',
    };
    return map[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
};

const AdminDirectSales = () => {
    const navigate = useNavigate();
    
    // Terminal States
    const [scannedCode, setScannedCode] = useState('');
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [confirming, setConfirming] = useState(false);
    
    // Logs States
    const [sales, setSales] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    
    // Void Modal State
    const [voidSale, setVoidSale] = useState(null);
    const [voidReason, setVoidReason] = useState('');
    const [voiding, setVoiding] = useState(false);

    // Fetch Direct Sales Logs
    const fetchSalesLogs = useCallback(async () => {
        setLoadingSales(true);
        try {
            const params = {
                page,
                limit: 10,
                search: searchTerm,
                status: selectedStatus
            };
            const res = await adminDirectSaleService.list(params);
            if (res?.success) {
                setSales(res.data?.directSales || res.directSales || []);
                setTotalItems(res.data?.pagination?.totalItems || res.pagination?.totalItems || 0);
                setTotalPages(res.data?.pagination?.totalPages || res.pagination?.totalPages || 1);
            } else {
                toast.error(res?.message || 'Failed to fetch direct sales logs');
            }
        } catch (err) {
            toast.error(err.message || 'Error fetching direct sales logs');
        } finally {
            setLoadingSales(false);
        }
    }, [page, searchTerm, selectedStatus]);

    // Refresh logs on page / filter changes
    useEffect(() => {
        fetchSalesLogs();
    }, [fetchSalesLogs]);

    // Handle terminal preview lookup
    const handlePreviewSearch = async (e) => {
        if (e) e.preventDefault();
        if (!scannedCode.trim()) return;

        setLoadingPreview(true);
        setPreview(null);

        try {
            const res = await adminDirectSaleService.preview({ serialCode: scannedCode.trim().toUpperCase() });
            if (res?.success) {
                setPreview(res.data || res);
            } else {
                toast.error(res?.message || 'Serial code not found or belongs to a seller');
            }
        } catch (err) {
            toast.error(err.message || 'Lookup failed');
        } finally {
            setLoadingPreview(false);
        }
    };

    // Handle terminal confirm sale
    const handleConfirmSale = async () => {
        if (!preview) return;
        setConfirming(true);
        try {
            const res = await adminDirectSaleService.confirm({ serialCode: preview.serialCode });
            if (res?.success) {
                toast.success('Offline sale registered successfully!');
                setScannedCode('');
                setPreview(null);
                setPage(1); // Reset page to 1 to show the new sale
                fetchSalesLogs();
            } else {
                toast.error(res?.message || 'Failed to record direct sale');
            }
        } catch (err) {
            toast.error(err.message || 'Error confirming sale');
        } finally {
            setConfirming(false);
        }
    };

    // Handle void sale action
    const handleVoidSale = async (e) => {
        if (e) e.preventDefault();
        if (!voidSale) return;

        setVoiding(true);
        try {
            const res = await adminDirectSaleService.void(voidSale._id, { reason: voidReason });
            if (res?.success) {
                toast.success('Sale voided and inventory restored successfully!');
                setVoidSale(null);
                setVoidReason('');
                fetchSalesLogs();
            } else {
                toast.error(res?.message || 'Failed to void sale');
            }
        } catch (err) {
            toast.error(err.message || 'Error voiding sale');
        } finally {
            setVoiding(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2.5 hover:bg-white rounded-xl border border-gray-100 shadow-sm transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Direct Client Acquisitions</p>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Admin Terminal Interface</h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Terminal Panel (1 column) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#0F172A] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden border border-white/5 text-white">
                        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                                <ScanLine className="w-8 h-8 text-blue-500" />
                            </div>
                            
                            <div>
                                <h2 className="text-base font-black uppercase tracking-[0.2em]">Fulfillment Terminal</h2>
                                <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60">Record admin-owned product offline sales</p>
                            </div>

                            <form onSubmit={handlePreviewSearch} className="w-full space-y-4">
                                <div className="relative group">
                                    <input
                                        value={scannedCode}
                                        onChange={(e) => setScannedCode(e.target.value)}
                                        placeholder="ENTER SERIAL CODE"
                                        className="w-full bg-[#1E293B]/50 border border-white/10 rounded-xl py-4 px-10 text-white text-base font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-center tracking-widest shadow-inner placeholder:text-gray-600"
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loadingPreview}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black uppercase tracking-[0.25em] text-[10px] transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loadingPreview ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        <>Search & Verify</>
                                    )}
                                </button>
                            </form>

                            {/* Preview Result */}
                            {preview && (
                                <div className="w-full p-4 rounded-xl flex flex-col gap-4 border animate-in zoom-in-95 duration-300 bg-white/5 border-white/10 text-white text-left">
                                    <div className="flex items-center gap-3">
                                        {preview.product?.image ? (
                                            <img
                                                src={preview.product.image}
                                                alt={preview.product.name}
                                                className="w-12 h-12 object-cover rounded-lg border border-white/10 flex-shrink-0"
                                            />
                                        ) : (
                                            <Box className="w-8 h-8 text-blue-300 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                                {preview.available ? 'AVAILABLE' : 'NOT SERVICEABLE'}
                                            </p>
                                            <p className="text-xs font-bold truncate">
                                                {preview.product?.name}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {preview.variant?.name || 'Standard'} • {formatINR(preview.variant?.price || 0)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleConfirmSale}
                                        disabled={confirming || !preview.available}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {confirming ? 'Saving...' : 'Confirm Sale'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Logs & History Panel (2 columns) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
                            <div>
                                <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Reconciliation Ledger</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase mt-0.5">Monitoring all offline direct sales transactions</p>
                            </div>
                            
                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                        placeholder="Search code..."
                                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black transition-colors w-36"
                                    />
                                </div>



                                <select
                                    value={selectedStatus}
                                    onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black bg-white"
                                >
                                    <option value="">All Status</option>
                                    <option value="completed">Completed</option>
                                    <option value="voided">Voided</option>
                                </select>
                            </div>
                        </div>

                        {loadingSales ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Loading ledger logs...</p>
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center">
                                <Box className="text-gray-200 mb-3" size={32} />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No direct sales records found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-6 sm:-mx-8">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Product / Code</th>

                                            <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                            <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date / Time</th>
                                            <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sales.map((sale) => (
                                            <tr key={sale._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        {sale.productImage ? (
                                                            <img
                                                                src={sale.productImage}
                                                                alt={sale.productName}
                                                                className="w-10 h-10 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <Box className="w-8 h-8 text-gray-300 flex-shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-gray-800 truncate">{sale.productName}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{sale.serialCode}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-6 text-xs font-bold text-gray-800 tabular-nums">
                                                    {formatINR(sale.amount)}
                                                </td>
                                                <td className="py-4 px-6 text-xs text-gray-500">
                                                    {fmtDatetime(sale.createdAt)}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${statusBadge(sale.status)}`}>
                                                        {sale.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    {sale.status === 'completed' && (
                                                        <button
                                                            onClick={() => setVoidSale(sale)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Void Sale"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-6 mt-6">
                                <span className="text-xs text-gray-500">
                                    Showing page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Void Confirmation Modal */}
            {voidSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Void Direct Sale</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Serial: <span className="font-mono font-bold text-[#8E2B45]">{voidSale.serialCode}</span>
                                </p>
                            </div>
                            <button onClick={() => { setVoidSale(null); setVoidReason(''); }} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleVoidSale} className="p-6 space-y-4">
                            <div className="flex items-start gap-3 bg-red-50 rounded-xl p-4 border border-red-100">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-700 leading-relaxed font-medium">
                                    Voiding this sale will restore the item stock back to **AVAILABLE** state in the catalog.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">Void Reason</label>
                                <textarea
                                    required
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    rows={3}
                                    placeholder="Enter reason for voiding this transaction..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-sm resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={voiding}
                                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                            >
                                {voiding ? 'Processing Rejection...' : 'Void Sale Record'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDirectSales;
