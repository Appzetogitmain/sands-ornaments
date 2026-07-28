import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
    Plus, Ticket, Clock, RotateCcw, AlertTriangle,
    Users, IndianRupee, ShoppingBag,
    Store, Activity, Wallet, AlertCircle
} from 'lucide-react';
import AdminStatsCard from '../components/AdminStatsCard';
import AdminTable from '../components/AdminTable';
import adminCommissionService, { formatINR } from '../services/adminCommissionService';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString()}`;
    const getStatusTone = (status) => {
        switch (String(status || 'Processing')) {
            case 'Delivered':
                return 'text-emerald-600 bg-emerald-50';
            case 'Cancelled':
                return 'text-red-600 bg-red-50';
            case 'Shipped':
            case 'Out for Delivery':
                return 'text-blue-600 bg-blue-50';
            default:
                return 'text-orange-500 bg-orange-50';
        }
    };

    const [statsData, setStatsData] = React.useState({
        users: 0,
        orders: 0,
        pendingOrders: 0,
        sellers: 0,
        revenue: 0,
        recent: [],
        commissionEarnings: 0,
        pendingPayoutRequests: 0,
    });
    const [loading, setLoading] = React.useState(true);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [commissionTotals, setCommissionTotals] = React.useState({
        confirmed: 0,
        pending: 0,
        reversed: 0,
        net: 0,
        gross: 0,
    });
    const [commissionLoading, setCommissionLoading] = React.useState(true);

    const fetchStats = React.useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const res = await api.get('admin/stats');
            if (!res.data.success) {
                setErrorMessage('Unable to load dashboard stats.');
                return;
            }
            const payload = res.data.data || {};
            const summary = payload.summary || {};
            const pendingFromDistribution = (payload.statusDistribution || []).reduce((sum, item) => (
                ['Processing', 'Confirmed', 'Packed'].includes(item?._id) ? sum + Number(item.count || 0) : sum
            ), 0);
            const recentOrders = Array.isArray(payload.recentOrders) ? payload.recentOrders : [];

            setStatsData({
                users: Number(summary.totalUsers || 0),
                orders: Number(summary.totalOrders || 0),
                pendingOrders: Number(payload.pendingOrders ?? pendingFromDistribution ?? 0),
                sellers: Number(summary.totalSellers || 0),
                revenue: Number(summary.totalRevenue || 0),
                commissionEarnings:     Number(payload.totalCommissionsEarned || 0),
                pendingPayoutRequests:  Number(payload.pendingPayoutRequests  || 0),
                recent: recentOrders.map((order) => ({
                    id: order.orderId || order._id || 'N/A',
                    date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
                    customer: order.customerName || order.userId?.name || order.user?.name || order.shippingAddress?.firstName || 'Customer',
                    amount: formatCurrency(order.total || order.totalAmount || 0),
                    status: order.status || order.orderStatus || 'Processing'
                }))
            });
        } catch (err) {
            console.error('Failed to fetch admin stats:', err);
            setErrorMessage('Unable to load dashboard stats. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    React.useEffect(() => {
        const fetchCommission = async () => {
            setCommissionLoading(true);
            try {
                const res = await adminCommissionService.getSummary();
                if (res?.success) {
                    const t = res.data?.totals || {};
                    setCommissionTotals({
                        confirmed: Number(t.confirmed) || 0,
                        pending:   Number(t.pending)   || 0,
                        reversed:  Number(t.reversed)  || 0,
                        gross:     Number(t.gross)     || 0,
                        net:       Number(t.net)       || 0,
                    });
                }
            } catch (e) {
                console.error('Failed to fetch commission summary:', e);
            } finally {
                setCommissionLoading(false);
            }
        };
        fetchCommission();
    }, []);

    const quickActions = [
        { label: 'VISITOR ANALYTICS', icon: Activity, bg: 'bg-blue-50', text: 'text-blue-500', path: '/admin/analytics' },
        { label: 'ADD PRODUCT', icon: Plus, bg: 'bg-[#F0FDF4]', text: 'text-emerald-500', path: '/admin/products/new' },
        { label: 'CREATE COUPON', icon: Ticket, bg: 'bg-[#FDF2F8]', text: 'text-pink-500', path: '/admin/coupons/add' },
        { label: 'PENDING ORDERS', icon: Clock, bg: 'bg-[#FFF7ED]', text: 'text-orange-500', path: '/admin/orders?status=pending' },
        { label: 'CHECK RETURNS', icon: RotateCcw, bg: 'bg-[#FFF1F2]', text: 'text-rose-500', path: '/admin/returns' },
        { label: 'STOCK ALERTS', icon: AlertTriangle, bg: 'bg-[#FEF2F2]', text: 'text-red-500', path: '/admin/inventory/alerts' },
        { label: 'MANAGE SELLERS', icon: Store, bg: 'bg-[#EFF6FF]', text: 'text-blue-500', path: '/admin/sellers' },
    ];

    const stats = [
        { label: 'TOTAL USERS', value: statsData.users, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-50' },
        { label: 'TOTAL REVENUE', value: formatCurrency(statsData.revenue), icon: IndianRupee, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
        { label: 'TOTAL SELLERS', value: statsData.sellers, icon: Store, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
        { label: 'TOTAL ORDERS', value: statsData.orders, icon: ShoppingBag, color: 'text-blue-500', bgColor: 'bg-blue-50' },
        { label: 'PENDING ORDERS', value: statsData.pendingOrders, icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-50', badge: statsData.pendingOrders > 0 ? 'ACTION REQUIRED' : '', badgeColor: 'text-red-500' },
        { label: 'COMMISSION EARNED', value: formatINR(statsData.commissionEarnings), icon: Wallet, color: 'text-violet-500', bgColor: 'bg-violet-50' },
    ];

    const orderColumns = [
        {
            header: 'ORDER',
            className: 'w-[30%]',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-black">{row.id}</span>
                    <span className="text-[10px] font-medium text-gray-400 mt-1">{row.date}</span>
                </div>
            )
        },
        {
            header: 'CUSTOMER',
            className: 'w-[30%]',
            render: (row) => (
                <span className="text-xs font-semibold text-gray-600 group-hover:text-black transition-colors">{row.customer}</span>
            )
        },
        {
            header: 'AMOUNT',
            className: 'w-[20%] text-right',
            render: (row) => (
                <span className="text-xs font-semibold text-black">{row.amount}</span>
            )
        },
        {
            header: 'STATUS',
            className: 'w-[20%] text-right',
            render: (row) => (
                <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${getStatusTone(row.status)}`}>
                    {row.status}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">ADMIN DASHBOARD</h1>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">PLATFORM ANALYTICS & QUICK CONTROLS</p>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
                    <button
                        onClick={fetchStats}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-wide hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Pending payout requests alert */}
            {statsData.pendingPayoutRequests > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 rounded-2xl p-4 border border-amber-200">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm font-semibold text-amber-800">
                            {statsData.pendingPayoutRequests} seller payout request{statsData.pendingPayoutRequests > 1 ? 's' : ''} require your review
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/payout')}
                        className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
                    >
                        REVIEW NOW
                    </button>
                </div>
            )}

            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-left">QUICK MANAGEMENT</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {quickActions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(action.path)}
                            className={`${action.bg} py-3 px-3 rounded-lg flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-black/5 group h-full`}
                        >
                            <div className="p-2 bg-white/60 rounded-full group-hover:scale-110 transition-transform">
                                <action.icon className={`w-4 h-4 ${action.text}`} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-900 text-center leading-tight">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.map((stat, idx) => (
                    <AdminStatsCard
                        key={idx}
                        label={stat.label}
                        value={stat.value}
                        icon={stat.icon}
                        color={stat.color}
                        bgColor={stat.bgColor}
                        badge={stat.badge}
                        badgeColor={stat.badgeColor}
                    />
                ))}
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-left">PLATFORM COMMISSION</p>
                    <button
                        onClick={() => navigate('/admin/commission/report')}
                        className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700"
                    >
                        VIEW REPORT
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Confirmed (Net)</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-emerald-700 mt-2 break-all sm:break-words">
                            {commissionLoading ? '…' : formatINR(commissionTotals.net)}
                        </p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pending Pipeline</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-amber-700 mt-2 break-all sm:break-words">
                            {commissionLoading ? '…' : formatINR(commissionTotals.pending)}
                        </p>
                    </div>
                    <div className="bg-rose-50 rounded-2xl border border-rose-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Reversed</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-rose-700 mt-2 break-all sm:break-words">
                            {commissionLoading ? '…' : formatINR(commissionTotals.reversed)}
                        </p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Gross Accrued</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-blue-700 mt-2 break-all sm:break-words">
                            {commissionLoading ? '…' : formatINR(commissionTotals.gross)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <button
                    onClick={() => navigate('/admin/sellers')}
                    className="flex flex-col items-center justify-center p-6 bg-sky-50 rounded-2xl border border-sky-100 hover:shadow-md transition-all group lg:col-span-1 h-full"
                >
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-6 h-6 text-sky-500" />
                    </div>
                    <span className="text-[10px] font-black text-sky-900 uppercase tracking-widest text-center">Manage Sellers</span>
                </button>

                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-left">
                            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">RECENT ORDERS</h2>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">QUEUE OF LATEST CUSTOMER ORDERS</p>
                        </div>
                        <button onClick={() => navigate('/admin/orders')} className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700">VIEW ALL</button>
                    </div>
                    <AdminTable
                        columns={orderColumns}
                        data={statsData.recent}
                        emptyMessage={loading ? 'Loading recent orders...' : 'No Data Available'}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
