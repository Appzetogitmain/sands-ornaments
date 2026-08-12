import React, { useEffect, useState, useCallback } from 'react';
import {
    Wallet, TrendingUp, CreditCard, Clock, CheckCircle2, XCircle, RefreshCw,
    ChevronLeft, ChevronRight, Search, Filter, X, Eye, IndianRupee,
    AlertCircle, CheckCheck, Ban, ChevronDown
} from 'lucide-react';
import adminPayoutService from '../services/adminPayoutService';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatINR = (v) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return '₹0';
    return '₹' + n.toLocaleString('en-IN');
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDatetime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_CLASSES = {
    PENDING:    'bg-amber-100 text-amber-800 border border-amber-200',
    PROCESSING: 'bg-blue-100 text-blue-800 border border-blue-200',
    APPROVED:   'bg-emerald-100 text-emerald-800 border border-emerald-200',
    REJECTED:   'bg-rose-100 text-rose-800 border border-rose-200',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, accent }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 min-w-0">
        <div className={`p-3 rounded-xl shrink-0 ${accent}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    </div>
);

// ── Action Modal ──────────────────────────────────────────────────────────────
const ActionModal = ({ payout, action, onClose, onDone }) => {
    const [note,    setNote]    = useState('');
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const titles = {
        process:  { label: 'Mark as Processing', btn: 'Mark Processing', color: 'bg-blue-600 hover:bg-blue-700' },
        approve:  { label: 'Approve Payout',     btn: 'Approve',        color: 'bg-emerald-600 hover:bg-emerald-700' },
        reject:   { label: 'Reject Payout',      btn: 'Reject',         color: 'bg-rose-600 hover:bg-rose-700' },
    };
    const cfg = titles[action];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let res;
            if (action === 'process') res = await adminPayoutService.processRequest(payout._id, { adminNote: note });
            if (action === 'approve') res = await adminPayoutService.approveRequest(payout._id, { adminNote: note });
            if (action === 'reject')  res = await adminPayoutService.rejectRequest(payout._id, { adminNote: note });
            if (!res.success) { setError(res.message || 'Action failed'); return; }
            onDone();
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{cfg.label}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {payout.sellerId?.shopName} — <span className="font-semibold">{formatINR(payout.amount)}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {action === 'reject' && (
                        <div className="flex items-start gap-3 bg-rose-50 rounded-xl p-4 border border-rose-100">
                            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-rose-700">
                                Rejecting will refund <span className="font-semibold">{formatINR(payout.amount)}</span> back to the seller's wallet.
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Note <span className="text-gray-400">(optional)</span></label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder={action === 'reject' ? 'Reason for rejection…' : 'Any notes…'}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm resize-none"
                        />
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3 border border-rose-100">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-3 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${cfg.color}`}
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                            {loading ? 'Processing…' : cfg.btn}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Detail Drawer ─────────────────────────────────────────────────────────────
const DetailDrawer = ({ id, onClose, onRefresh }) => {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [modal,   setModal]   = useState(null); // 'process' | 'approve' | 'reject'

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await adminPayoutService.getRequest(id);
            if (res.success) {
                setData(res.data);
            } else {
                setData(null);
                setLoadError(res.message || 'Unable to load payout details.');
            }
        } catch (err) {
            setData(null);
            setLoadError(err.response?.data?.message || 'Unable to load payout details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleActionDone = async () => {
        setModal(null);
        await load();
        onRefresh();
    };

    const p = data?.payout;

    return (
        <>
            {modal && p && (
                <ActionModal
                    payout={p}
                    action={modal}
                    onClose={() => setModal(null)}
                    onDone={handleActionDone}
                />
            )}
            <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
                <div
                    className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                        <h2 className="text-base font-bold text-gray-900">Payout Details</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                        </div>
                    ) : loadError ? (
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-rose-600">{loadError}</p>
                            <button
                                type="button"
                                onClick={load}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Try again
                            </button>
                        </div>
                    ) : !p ? (
                        <p className="p-6 text-gray-500 text-sm">Payout request not found.</p>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* Status */}
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_CLASSES[p.status]}`}>{p.status}</span>
                                <span className="font-mono text-xs text-gray-400">{p.payoutId}</span>
                            </div>

                            {/* Amount */}
                            <div className="bg-gradient-to-br from-[#3E2723] to-[#6d4c41] rounded-2xl p-5 text-white">
                                <p className="text-sm opacity-70">Requested amount</p>
                                <p className="text-3xl font-bold mt-1 tabular-nums">{formatINR(p.amount)}</p>
                                <div className="flex gap-4 mt-3 text-xs opacity-70">
                                    <span>Before: {formatINR(p.balanceBefore)}</span>
                                    <span>After: {formatINR(p.balanceAfter)}</span>
                                </div>
                            </div>

                            {/* Seller info */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Seller</h4>
                                <div className="space-y-1.5 text-sm">
                                    <p className="font-semibold text-gray-900">{p.sellerId?.shopName}</p>
                                    <p className="text-gray-500">{p.sellerId?.fullName}</p>
                                    <p className="text-gray-500">{p.sellerId?.email}</p>
                                    <p className="text-gray-500">{p.sellerId?.mobileNumber}</p>
                                </div>
                            </div>

                            {/* Bank details */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bank Details</h4>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Account</span>
                                        <span className="font-medium text-gray-900">{p.bankDetails?.accountNumber || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">IFSC</span>
                                        <span className="font-medium text-gray-900">{p.bankDetails?.ifscCode || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {p.sellerNote && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Seller Note</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">"{p.sellerNote}"</p>
                                </div>
                            )}
                            {p.adminNote && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin Note</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{p.adminNote}</p>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="text-xs text-gray-400 space-y-1">
                                <p>Requested: {fmtDatetime(p.createdAt)}</p>
                                {p.processedAt && <p>Processed: {fmtDatetime(p.processedAt)}</p>}
                            </div>

                            {/* Wallet transactions */}
                            {data.transactions?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wallet History</h4>
                                    <div className="space-y-2">
                                        {data.transactions.map((t) => (
                                            <div key={t._id} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3 text-sm">
                                                <div>
                                                    <p className="font-medium text-gray-800 capitalize">{t.reason?.replace(/_/g, ' ')}</p>
                                                    <p className="text-xs text-gray-400">{fmtDatetime(t.createdAt)}</p>
                                                </div>
                                                <span className={`font-bold tabular-nums ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.type === 'CREDIT' ? '+' : '−'}{formatINR(t.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action buttons */}
                            {(p.status === 'PENDING' || p.status === 'PROCESSING') && (
                                <div className="space-y-2 pt-2">
                                    {p.status === 'PENDING' && (
                                        <button
                                            onClick={() => setModal('process')}
                                            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Mark as Processing
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setModal('approve')}
                                        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                        Approve Payout
                                    </button>
                                    <button
                                        onClick={() => setModal('reject')}
                                        className="w-full py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Reject &amp; Refund
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminPayouts = () => {
    const [earnings,   setEarnings]   = useState(null);
    const [requests,   setRequests]   = useState([]);
    const [page,       setPage]       = useState(1);
    const [meta,       setMeta]       = useState({});
    const [statusFilter, setStatusFilter] = useState('');
    const [loading,    setLoading]    = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(null); // request id
    const [counts,     setCounts]     = useState({ pending: 0, processing: 0 });

    const fetchEarnings = useCallback(async () => {
        const res = await adminPayoutService.getAdminEarnings();
        if (res.success) setEarnings(res.data);
    }, []);

    const fetchRequests = useCallback(async (p = 1, status = '') => {
        const params = { page: p, limit: 15 };
        if (status) params.status = status;
        const res = await adminPayoutService.getRequests(params);
        if (res.success) {
            setRequests(res.data.requests || []);
            setMeta(res.data.pagination || {});
            setCounts({
                pending:    res.data.statusCounts?.pending    || 0,
                processing: res.data.statusCounts?.processing || 0,
            });
        }
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchEarnings(), fetchRequests(1, statusFilter)]);
        setLoading(false);
    }, [fetchEarnings, fetchRequests, statusFilter]);

    useEffect(() => { loadAll(); }, [loadAll]);

    useEffect(() => {
        if (!loading) fetchRequests(page, statusFilter);
    }, [page, statusFilter]); // eslint-disable-line

    const handleRefresh = () => {
        fetchEarnings();
        fetchRequests(page, statusFilter);
    };

    const kpis = earnings ? [
        {
            icon: IndianRupee,
            label: 'Platform Earnings',
            value: formatINR(earnings.totalCommissionsEarned),
            sub: `From ${earnings.confirmedOrdersCount} confirmed orders`,
            accent: 'bg-[#3E2723]',
        },
        {
            icon: TrendingUp,
            label: 'Paid to Sellers',
            value: formatINR(earnings.totalPaidOutToSellers),
            sub: `${earnings.approvedPayoutsCount} approved payouts`,
            accent: 'bg-emerald-500',
        },
        {
            icon: Clock,
            label: 'Pending Payouts',
            value: formatINR(earnings.pendingPayoutAmount),
            sub: `${earnings.pendingPayoutsCount} requests awaiting action`,
            accent: earnings.pendingPayoutsCount > 0 ? 'bg-amber-500' : 'bg-gray-400',
        },
    ] : [];

    const STATUSES = ['', 'PENDING', 'PROCESSING', 'APPROVED', 'REJECTED'];

    return (
        <>
            {drawerOpen && (
                <DetailDrawer
                    id={drawerOpen}
                    onClose={() => setDrawerOpen(null)}
                    onRefresh={handleRefresh}
                />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Seller Payouts</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Review commission earnings and manage withdrawal requests</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors self-start sm:self-auto"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Action required banner */}
                {(counts.pending + counts.processing) > 0 && (
                    <div className="flex items-center gap-3 bg-amber-50 rounded-2xl p-4 border border-amber-200">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-800">
                            <span className="font-semibold">{counts.pending + counts.processing} payout request{counts.pending + counts.processing > 1 ? 's' : ''}</span> require your attention.
                        </p>
                        <button onClick={() => setStatusFilter('PENDING')} className="ml-auto text-xs text-amber-700 hover:underline font-medium whitespace-nowrap">
                            View all
                        </button>
                    </div>
                )}

                {/* KPI cards */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1,2,3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse h-24" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
                    </div>
                )}

                {/* Requests table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">
                        <h2 className="text-sm font-semibold text-gray-900 mr-2">Payout Requests</h2>
                        <div className="flex flex-wrap gap-1.5 ml-auto">
                            {STATUSES.map((s) => (
                                <button
                                    key={s || 'all'}
                                    onClick={() => { setStatusFilter(s); setPage(1); }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        statusFilter === s
                                            ? 'bg-[#3E2723] text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {s || 'All'}
                                    {s === 'PENDING'    && counts.pending    > 0 && ` (${counts.pending})`}
                                    {s === 'PROCESSING' && counts.processing > 0 && ` (${counts.processing})`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3E2723] rounded-full animate-spin" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No payout requests{statusFilter ? ` with status "${statusFilter}"` : ''}</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile cards */}
                            <div className="block sm:hidden divide-y divide-gray-50">
                                {requests.map((r) => (
                                    <div
                                        key={r._id}
                                        className="px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setDrawerOpen(r._id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{r.sellerId?.shopName || '—'}</p>
                                                <p className="text-xs text-gray-400">{fmtDate(r.createdAt)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900 tabular-nums">{formatINR(r.amount)}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[r.status]}`}>{r.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                            <th className="text-left px-6 py-3 font-medium">Payout ID</th>
                                            <th className="text-left px-6 py-3 font-medium">Seller</th>
                                            <th className="text-left px-6 py-3 font-medium">Requested</th>
                                            <th className="text-right px-6 py-3 font-medium">Amount</th>
                                            <th className="text-center px-4 py-3 font-medium">Status</th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {requests.map((r) => (
                                            <tr
                                                key={r._id}
                                                className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                                                onClick={() => setDrawerOpen(r._id)}
                                            >
                                                <td className="px-6 py-3.5 font-mono text-xs text-gray-400">{r.payoutId?.slice(0, 18)}…</td>
                                                <td className="px-6 py-3.5">
                                                    <p className="font-medium text-gray-900">{r.sellerId?.shopName || '—'}</p>
                                                    <p className="text-xs text-gray-400">{r.sellerId?.email}</p>
                                                </td>
                                                <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">{fmtDatetime(r.createdAt)}</td>
                                                <td className="px-6 py-3.5 text-right font-bold tabular-nums text-gray-900">{formatINR(r.amount)}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[r.status]}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors" title="View details">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {meta.pages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-400">
                                        Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs text-gray-600 px-1">{page} / {meta.pages}</span>
                                        <button
                                            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                                            disabled={page === meta.pages}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminPayouts;
