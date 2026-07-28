import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, ArrowUpRight, ArrowDownLeft, RefreshCcw, FileText, Package } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const StockHistoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All'); // All, Adjustment, Order, Return
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                const logs = await adminService.getStockHistory();
                const normalized = (logs || []).map(log => ({
                    id: log._id,
                    date: log.createdAt,
                    product: {
                        name: log.productId?.name || 'Unknown',
                        image: log.productId?.images?.[0] || ''
                    },
                    type: log.changeType === 'adjustment'
                        ? 'Manual Adjustment'
                        : (log.changeType === 'return' ? 'Return Restock' : (log.changeType === 'sale' ? 'Order Fulfilled' : 'Stock In')),
                    change: log.change,
                    effect: { from: log.previousStock, to: log.newStock },
                    user: log.adminId?.name
                        ? `Admin (${log.adminId.name})`
                        : (log.sellerId?.shopName || log.sellerId?.fullName
                            ? `Seller (${log.sellerId.shopName || log.sellerId.fullName})`
                            : (log.userId?.name ? `Customer (${log.userId.name})` : 'System')),
                    reason: log.reason || ''
                }));
                setHistory(normalized);
            } catch (err) {
                toast.error("Failed to load stock history");
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, []);

    const getTypeStyle = (type) => {
        switch (type) {
            case 'Manual Adjustment': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'Order Fulfilled': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Return Restock': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Manual Adjustment': return <RefreshCcw size={12} />;
            case 'Order Fulfilled': return <ArrowUpRight size={12} />;
            case 'Return Restock': return <ArrowDownLeft size={12} />;
            default: return <FileText size={12} />;
        }
    };

    const filteredHistory = useMemo(() => history.filter(item => {
        const matchesSearch = item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.reason.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterType === 'All' ||
            (filterType === 'Adjustment' && item.type === 'Manual Adjustment') ||
            (filterType === 'Order' && item.type === 'Order Fulfilled') ||
            (filterType === 'Return' && item.type === 'Return Restock');

        return matchesSearch && matchesFilter;
    }), [history, searchTerm, filterType]);

    const exportCsv = () => {
        if (filteredHistory.length === 0) {
            toast.error("No stock history available to export");
            return;
        }

        const rows = [
            ['Date', 'Time', 'Product', 'Transaction Type', 'Change', 'Previous Stock', 'New Stock', 'Actor', 'Reason'],
            ...filteredHistory.map((item) => {
                const date = new Date(item.date);
                return [
                    date.toLocaleDateString(),
                    date.toLocaleTimeString(),
                    item.product.name,
                    item.type,
                    item.change,
                    item.effect.from,
                    item.effect.to,
                    item.user,
                    item.reason
                ];
            })
        ];

        const csv = rows
            .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `stock-history-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
        toast.success("Stock history exported");
    };

    return (
        <div className="space-y-6 font-sans animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Stock History</h1>
                    <p className="text-xs md:text-sm font-medium text-gray-500 mt-1">Audit trail of all inventory movements.</p>
                </div>
                <button
                    onClick={exportCsv}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full ml-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Product or Reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none text-xs font-bold text-gray-900 focus:ring-0 placeholder:text-gray-400"
                    />
                </div>
                <div className="flex bg-gray-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    {['All', 'Adjustment', 'Order', 'Return'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilterType(tab)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterType === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-[#F8FAFC] border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock Change</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Effect</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">User / Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Loading History...</td></tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">No movements found</td></tr>
                            ) : (
                                filteredHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-gray-900 font-mono">
                                                {new Date(item.date).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400">
                                                {new Date(item.date).toLocaleTimeString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-50 rounded border border-gray-100 p-0.5 flex-shrink-0">
                                                    {item.product.image ? (
                                                        <img src={item.product.image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                                    ) : (
                                                        <Package size={16} className="text-gray-300 m-auto" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 line-clamp-1">{item.product.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getTypeStyle(item.type)}`}>
                                                {getIcon(item.type)} {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-black ${item.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {item.change > 0 ? '+' : ''}{item.change}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-gray-600">
                                                <span className="opacity-50">{item.effect.from}</span>
                                                <span className="text-gray-300">-&gt;</span>
                                                <span className="text-gray-900">{item.effect.to}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-xs font-black text-gray-900">{item.user}</p>
                                            <p className="text-[10px] font-bold text-gray-400 italic">{item.reason}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StockHistoryPage;
