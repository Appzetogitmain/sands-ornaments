import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Eye, RefreshCcw, RefreshCw, Search, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminStatsCard from '../components/AdminStatsCard';
import { adminService } from '../services/adminService';

const STATUS_STYLES = {
    Pending: 'bg-amber-50 text-amber-600 border border-amber-100',
    Approved: 'bg-blue-50 text-blue-600 border border-blue-100',
    Rejected: 'bg-red-50 text-red-600 border border-red-100',
    'Pickup Scheduled': 'bg-sky-50 text-sky-600 border border-sky-100',
    'Pickup Completed': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    'Replacement Shipped': 'bg-violet-50 text-violet-600 border border-violet-100',
    Delivered: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    Closed: 'bg-gray-100 text-gray-700 border border-gray-200'
};

const ReplacementsPage = () => {
    const navigate = useNavigate();
    const [replacements, setReplacements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        const fetchReplacements = async () => {
            try {
                const data = await adminService.getReplacements();
                setReplacements(data);
            } catch (err) {
                toast.error('Unable to load replacements right now.');
            } finally {
                setLoading(false);
            }
        };

        fetchReplacements();
    }, []);

    const filteredReplacements = useMemo(() => replacements.filter((item) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !search ||
            String(item.replacementDisplayId || '').toLowerCase().includes(search) ||
            String(item.orderDisplayId || '').toLowerCase().includes(search) ||
            String(item.customerName || '').toLowerCase().includes(search) ||
            String(item.reason || '').toLowerCase().includes(search);

        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [replacements, searchTerm, statusFilter]);

    const stats = useMemo(() => ({
        total: replacements.length,
        pending: replacements.filter((item) => item.status === 'Pending').length,
        shipped: replacements.filter((item) => item.status === 'Replacement Shipped').length
    }), [replacements]);

    return (
        <div className="space-y-8 font-sans animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-medium text-gray-900 tracking-tight">Replacement Management</h1>
                <p className="text-xs font-semibold text-gray-500 tracking-wide mt-1">Manage replacement requests, pickups and outbound shipment progress</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminStatsCard label="Total Requests" value={stats.total} icon={RefreshCw} color="text-blue-600" bgColor="bg-blue-50" />
                <AdminStatsCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-600" bgColor="bg-amber-50" />
                <AdminStatsCard label="Replacement Shipped" value={stats.shipped} icon={Truck} color="text-violet-600" bgColor="bg-violet-50" />
            </div>

            <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full ml-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search by replacement ID, order ID, customer or reason..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none text-xs font-medium text-gray-900 focus:ring-0 placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-1 p-1 bg-gray-50 rounded-xl overflow-x-auto max-w-full">
                    {['ALL', 'Pending', 'Approved', 'Pickup Scheduled', 'Pickup Completed', 'Replacement Shipped', 'Delivered', 'Rejected', 'Closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-medium tracking-wide transition-all whitespace-nowrap ${statusFilter === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide">Replacement ID</th>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide">Order ID</th>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide">Customer</th>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide">Reason</th>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide">Date</th>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide">Status</th>
                                <th className="px-6 py-4 text-[10px] md:text-xs font-medium text-gray-800 tracking-wide text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 tracking-wide text-[10px] md:text-[11px] text-gray-900">
                            {loading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-60">
                                            <RefreshCcw size={40} className="text-gray-300 mb-4 animate-spin" />
                                            <p className="text-sm font-medium text-gray-400 tracking-wide">Loading replacement requests...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredReplacements.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-medium text-black">{item.replacementDisplayId}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{item.orderDisplayId}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-medium text-black">{item.customerName}</div>
                                        <div className="text-[10px] font-medium text-gray-400 mt-1">{item.customerPhone || item.customerEmail || 'No contact saved'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{item.reason}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                        {new Date(item.createdAt || item.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-medium tracking-wide ${STATUS_STYLES[item.status] || 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/admin/replacements/${item.id}`)}
                                            className="inline-flex items-center gap-2 bg-[#0f172a] text-white px-4 py-1.5 rounded-lg text-[10px] font-medium tracking-wide hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredReplacements.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <RefreshCcw size={48} className="text-gray-300 mb-4" />
                                            <p className="text-sm font-medium text-gray-400 tracking-wide">No replacement requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReplacementsPage;
