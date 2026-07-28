import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, UserX, UserCheck, Shield, Users, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import AdminStatsCard from '../components/AdminStatsCard';
import { adminService } from '../services/adminService';
import { toast } from 'react-hot-toast';
import { exportToExcelCSV } from '../../../utils/exportUtils';

const UserManagement = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('customers');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async (term = '') => {
        setLoading(true);
        try {
            const role = activeTab === 'admins' ? 'admin' : 'user';
            const data = await adminService.getUsers({ role, search: term || undefined });
            setUsers(data || []);
        } catch (err) {
            console.error("Users fetch failed");
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const handle = setTimeout(() => {
            fetchUsers(searchTerm);
        }, 300);
        return () => clearTimeout(handle);
    }, [activeTab, searchTerm]);

    const toggleUserStatus = async (id) => {
        const response = await adminService.toggleUserStatus(id);
        if (response?.success) {
            toast.success(response.message || "Status updated");
            fetchUsers();
        } else {
            toast.error(response?.message || "Failed to update status");
        }
    };

    const tabs = [
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'admins', label: 'Admins', icon: Shield }
    ];

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.fullName || user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleExport = () => {
        const headers = [
            'fullName',
            'email',
            'phone',
            'isBlocked',
            'role',
            'createdAt'
        ];
        const columnNames = [
            'Name',
            'Email Address',
            'Phone Number',
            'Account Blocked',
            'Role',
            'Created At'
        ];
        const formattedUsers = filteredUsers.map(u => ({
            ...u,
            fullName: u.fullName || u.name || '',
            phone: u.phone ? `\t${u.phone}` : '',
            createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : ''
        }));
        const filename = activeTab === 'admins' ? 'Admins_Report' : 'Customers_Report';
        exportToExcelCSV(formattedUsers, headers, columnNames, filename);
        toast.success(`${activeTab === 'admins' ? 'Admins' : 'Customers'} report exported successfully`);
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-3 md:space-y-4 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <PageHeader
                    title="User Management"
                    subtitle={`Manage ${activeTab} & access control`}
                />
                <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap self-start md:self-auto"
                    title={`Export ${activeTab} as Excel/CSV`}
                >
                    <Download size={14} /> Export {activeTab}
                </button>
            </div>

            {/* Tabs Row */}
            <div className="flex gap-2 border-b border-gray-100 px-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                            activeTab === tab.id ? 'text-[#3E2723]' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#3E2723] rounded-full" />}
                    </button>
                ))}
            </div>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminStatsCard
                    label={`Total ${activeTab}`}
                    value={users.length}
                    icon={activeTab === 'customers' ? Users : Shield}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <AdminStatsCard
                    label="Active"
                    value={users.filter(u => !u.isBlocked).length}
                    icon={ShieldCheck}
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                />
                <AdminStatsCard
                    label="Blocked"
                    value={users.filter(u => u.isBlocked).length}
                    icon={AlertCircle}
                    color="text-orange-600"
                    bgColor="bg-orange-50"
                />
            </div>

            {/* Filters Row */}
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-200">
                            <tr>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs">
                                    {activeTab === 'customers' ? 'Customer' : 'Business Name'}
                                </th>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs">Joined On</th>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs">Orders</th>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs">Total Volume</th>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs">Wishlist / Addresses</th>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs">Status</th>
                                <th className="px-4 md:px-6 py-4 text-gray-800 font-bold uppercase tracking-widest text-[10px] md:text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 uppercase tracking-tighter text-[10px] md:text-[11px] text-gray-900">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr key={user._id || user.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-4 md:px-6 py-3 md:py-4">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200 shadow-sm shrink-0 text-[10px] md:text-sm">
                                                {(user.fullName || user.name || 'U').charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-black truncate">{user.fullName || user.name}</p>
                                                <p className="text-[9px] md:text-[11px] text-gray-400 font-bold truncate lowercase">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-gray-600 font-bold">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '--'}
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 font-bold text-gray-700">
                                        {typeof user.ordersCount === 'number' ? user.ordersCount : '--'}
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 font-bold text-gray-900">
                                        {typeof user.spentAmount === 'number' ? `INR ${user.spentAmount.toLocaleString()}` : '--'}
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 font-bold text-gray-600">
                                        <div className="space-y-1">
                                            <p>{user.wishlistCount || 0} wishlist</p>
                                            <p className="text-gray-400">{user.addressCount || 0} addresses</p>
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4">
                                        <span className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded text-[9px] md:text-[11px] font-bold border ${user.isBlocked
                                            ? 'bg-red-50 text-red-600 border-red-100'
                                            : 'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                            {user.isBlocked ? 'Blocked' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 md:gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/users/view/${user._id || user.id}`)}
                                                className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#3E2723] transition-all"
                                                title="View Profile"
                                            >
                                                <Eye className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                            <button
                                                onClick={() => toggleUserStatus(user._id || user.id)}
                                                className={`p-1.5 md:p-2 rounded-lg transition-all ${!user.isBlocked
                                                    ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                                                    : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                                                    }`}
                                                title={user.isBlocked ? 'Enable Account' : 'Disable Account'}
                                            >
                                                {user.isBlocked ? <UserCheck className="w-4 h-4 md:w-5 md:h-5" /> : <UserX className="w-4 h-4 md:w-5 md:h-5" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                        No {activeTab} found matching your criteria
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

export default UserManagement;
