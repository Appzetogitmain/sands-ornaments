import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Eye, CheckCircle, XCircle, FileText, ShieldCheck, Search, Users, UserCheck, UserX, Clock, Package, IndianRupee } from 'lucide-react';
import AdminTable from '../components/AdminTable';
import AdminStatsCard from '../components/AdminStatsCard';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';
import { exportToExcelCSV } from '../../../utils/exportUtils';

const AdminSellersPage = () => {
    const navigate = useNavigate();
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');

    const handleExport = () => {
        const headers = [
            'fullName',
            'shopName',
            'email',
            'mobileNumber',
            'city',
            'state',
            'firmType',
            'gstNumber',
            'panNumber',
            'status',
            'createdAt'
        ];
        const columnNames = [
            'Seller Name',
            'Shop Name',
            'Email Address',
            'Mobile Number',
            'City',
            'State',
            'Firm Type',
            'GST Number',
            'PAN Number',
            'Status',
            'Registration Date'
        ];
        const formattedSellers = filteredSellers.map(seller => ({
            ...seller,
            mobileNumber: seller.mobileNumber ? `\t${seller.mobileNumber}` : '',
            createdAt: seller.registrationDate || seller.createdAt ? new Date(seller.registrationDate || seller.createdAt).toISOString().split('T')[0] : ''
        }));
        exportToExcelCSV(formattedSellers, headers, columnNames, 'Sellers_Report');
        toast.success("Sellers report exported successfully");
    };

    const fetchSellers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getSellers();
            setSellers(data || []);
        } catch (err) {
            console.error("Sellers fetch failed");
            toast.error("Failed to load sellers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    const handleAction = async (id, status, reason) => {
        const response = await adminService.updateSellerStatus(id, status, reason);
        if (response?.success) {
            toast.success(response.message || `Seller ${status.toLowerCase()}`);
            fetchSellers();
        } else {
            toast.error(response?.message || "Failed to update seller");
        }
    };

    const stats = {
        total: sellers.length,
        pending: sellers.filter(s => s.status === 'PENDING').length,
        approved: sellers.filter(s => s.status === 'APPROVED').length,
        rejected: sellers.filter(s => s.status === 'REJECTED').length,
    };

    const filteredSellers = sellers.filter(seller => {
        const matchesStatus = activeFilter === 'ALL' || seller.status === activeFilter;
        const matchesSearch = 
            (seller.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (seller.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (seller.shopName || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const statusFilters = [
        { label: 'All Sellers', value: 'ALL', count: stats.total, icon: Users },
        { label: 'Pending', value: 'PENDING', count: stats.pending, icon: Clock, color: 'text-amber-500' },
        { label: 'Approved', value: 'APPROVED', count: stats.approved, icon: UserCheck, color: 'text-emerald-500' },
        { label: 'Rejected', value: 'REJECTED', count: stats.rejected, icon: UserX, color: 'text-red-500' },
    ];

    const columns = [
        {
            header: 'SELLER NAME',
            className: 'w-[18%]',
            render: (row) => (
                <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{row.fullName}</span>
                        {row.isDuplicate && (
                            <span 
                                title={`Shares registered details with other sellers on: ${row.duplicateMatches.map(m => `${m.reasons.join(', ')} (${m.shopName})`).join(' & ')}`} 
                                className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[8px] font-black uppercase tracking-wider flex items-center shrink-0 cursor-help"
                            >
                                Duplicate
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">{row.email}</span>
                </div>
            )
        },
        {
            header: 'SHOP NAME',
            className: 'w-[14%]',
            render: (row) => (
                <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{row.shopName}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                        {row.city || 'N/A'}{row.state ? `, ${row.state}` : ''}
                    </span>
                </div>
            )
        },
        {
            header: 'MOBILE',
            accessor: 'mobileNumber',
            className: 'w-[10%]'
        },
        {
            header: 'BUSINESS',
            className: 'w-[14%]',
            render: (row) => (
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                        {row.gstNumber || 'No GST'}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        PAN: {row.panNumber || 'N/A'}
                    </p>
                </div>
            )
        },
        {
            header: 'METRICS',
            className: 'w-[15%]',
            render: (row) => (
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-1">
                        <Package size={12} className="text-gray-400" />
                        {row.metrics?.productCount || 0} Products
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {row.metrics?.stockUnits || 0} Units
                    </p>
                </div>
            )
        },
        {
            header: 'REVENUE',
            className: 'w-[12%]',
            render: (row) => (
                <div className="space-y-1 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-1">
                        <IndianRupee size={12} className="text-gray-400" />
                        {(row.metrics?.totalRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {row.metrics?.orderCount || 0} Orders
                    </p>
                </div>
            )
        },
        {
            header: 'DOCS',
            className: 'w-[10%]',
            render: (row) => (
                <div className="flex gap-1.5 items-center">
                    {row.documents?.aadharUrl ? (
                        <a 
                            href={row.documents.aadharUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            title="VIEW AADHAR CARD" 
                            className="w-7 h-7 rounded-lg flex items-center justify-center border bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                            <FileText size={14} />
                        </a>
                    ) : (
                        <div title="AADHAR CARD (NOT UPLOADED)" className="w-7 h-7 rounded-lg flex items-center justify-center border bg-gray-50 text-gray-300 border-gray-100">
                            <FileText size={14} />
                        </div>
                    )}
                    {row.documents?.shopLicenseUrl ? (
                        <a 
                            href={row.documents.shopLicenseUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            title="VIEW SHOP LICENSE" 
                            className="w-7 h-7 rounded-lg flex items-center justify-center border bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                            <ShieldCheck size={14} />
                        </a>
                    ) : (
                        <div title="SHOP LICENSE (NOT UPLOADED)" className="w-7 h-7 rounded-lg flex items-center justify-center border bg-gray-50 text-gray-300 border-gray-100">
                            <ShieldCheck size={14} />
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'DATE',
            render: (row) => (
                <span className="text-[10px] font-bold text-gray-500 uppercase">
                    {new Date(row.registrationDate || row.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            ),
            className: 'w-[10%]'
        },
        {
            header: 'STATUS',
            className: 'w-[9%]',
            render: (row) => (
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                    row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    row.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                    {row.status}
                </span>
            )
        },
        {
            header: 'ACTIONS',
            className: 'w-[15%] text-right',
            render: (row) => (
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => navigate(`/admin/seller-details/${row._id || row.id}`)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#3E2723] transition-all"
                        title="View Details"
                    >
                        <Eye size={18} />
                    </button>
                    {row.status !== 'APPROVED' && (
                        <button 
                            onClick={() => handleAction(row._id || row.id, 'APPROVED')}
                            className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-all"
                            title="Approve"
                        >
                            <CheckCircle size={18} />
                        </button>
                    )}
                    {row.status !== 'REJECTED' && (
                        <button 
                            onClick={() => navigate(`/admin/seller-details/${row._id || row.id}`)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                            title="Review / Reject"
                        >
                            <XCircle size={18} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">SELLER MANAGEMENT</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">APPROVE PARTNERS & OVERSEE MARKETPLACE SCALE</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        title="Export Sellers as Excel/CSV"
                    >
                        Export Excel
                    </button>
                    <div className="relative w-full md:w-72 group">
                        <input 
                            type="text"
                            placeholder="SEARCH SELLERS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#3E2723] focus:ring-4 focus:ring-[#3E2723]/5 transition-all outline-none"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#3E2723] transition-colors" />
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminStatsCard label="TOTAL MERCHANTS" value={stats.total} icon={Store} color="text-gray-900" bgColor="bg-white border-gray-100" />
                <AdminStatsCard label="PENDING REVIEW" value={stats.pending} icon={Clock} color="text-amber-500" bgColor="bg-amber-50/50 border-amber-100" />
                <AdminStatsCard label="ACTIVE PARTNERS" value={stats.approved} icon={UserCheck} color="text-emerald-500" bgColor="bg-emerald-50/50 border-emerald-100" />
                <AdminStatsCard label="REJECTED" value={stats.rejected} icon={UserX} color="text-red-500" bgColor="bg-red-50/50 border-red-100" />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-1">
                {statusFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setActiveFilter(filter.value)}
                        className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                            activeFilter === filter.value 
                            ? 'text-[#3E2723]' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <filter.icon className={`w-3.5 h-3.5 ${activeFilter === filter.value ? (filter.color || 'text-[#3E2723]') : 'text-gray-300'}`} />
                        {filter.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] border ${
                            activeFilter === filter.value 
                            ? 'bg-[#3E2723] text-white border-[#3E2723]' 
                            : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                            {filter.count}
                        </span>
                        {activeFilter === filter.value && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#3E2723] animate-in slide-in-from-left-full duration-300" />
                        )}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable 
                    columns={columns} 
                    data={filteredSellers} 
                    emptyMessage={loading ? "Loading sellers..." : `No ${activeFilter.toLowerCase()} sellers found matching your search.`}
                />
            </div>
        </div>
    );
};

export default AdminSellersPage;
