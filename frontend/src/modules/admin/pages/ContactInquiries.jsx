import React, { useState, useEffect } from 'react';
import { Eye, Trash2, Mail, MessageSquare, Calendar, CheckCircle, Clock, Inbox, AlertCircle, CheckCircle2, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const ContactInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedInquiry, setSelectedInquiry] = useState(null); // For Modal
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const fetchInquiries = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('admin/support/inquiries');
            if (res.data.success) {
                setInquiries(res.data.data?.inquiries || res.data.inquiries || []);
            }
        } catch (err) {
            console.error('Failed to fetch contact inquiries:', err);
            toast.error('Failed to load inquiries');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    const handleConfirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            const res = await api.delete(`admin/support/inquiries/${deleteConfirmId}`);
            if (res.data.success) {
                setInquiries(prev => prev.filter(i => (i._id || i.id) !== deleteConfirmId));
                toast.success('Inquiry deleted successfully');
            }
        } catch (err) {
            console.error('Failed to delete inquiry:', err);
            toast.error('Failed to delete inquiry');
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await api.put(`admin/support/inquiries/${id}`, { status: newStatus });
            if (res.data.success) {
                setInquiries(prev => prev.map(i => (i._id || i.id) === id ? { ...i, status: newStatus } : i));
                toast.success(`Inquiry marked as ${newStatus}`);
            }
        } catch (err) {
            console.error('Failed to update status:', err);
            toast.error('Failed to update status');
        }
    };

    const filteredInquiries = inquiries.filter(i => {
        const matchesSearch = (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.message || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalInquiries = inquiries.length;
    const unreadInquiries = inquiries.filter(i => i.status === 'Unread').length;
    const readInquiries = inquiries.filter(i => i.status === 'Read').length;

    const columns = [
        {
            header: 'Date',
            render: (item) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-black font-bold text-xs">
                        <Calendar className="w-3.5 h-3.5 text-[#3E2723]" />
                        <span>{new Date(item.createdAt || item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'User',
            render: (item) => (
                <div>
                    <span className="text-sm font-bold text-black block">{item.name}</span>
                    <span className="text-xs text-gray-500 font-medium block">{item.email}</span>
                </div>
            )
        },
        {
            header: 'Status',
            align: 'center',
            render: (item) => (
                <select
                    value={item.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(item._id || item.id, e.target.value)}
                    className={`text-[10px] font-bold uppercase tracking-wider bg-transparent border-none focus:ring-0 cursor-pointer ${item.status === 'Unread' ? 'text-red-700' : 'text-green-700'
                        }`}
                >
                    <option value="Unread">Unread</option>
                    <option value="Read">Read</option>
                </select>
            )
        },
        {
            header: 'Actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => setSelectedInquiry(item)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#3E2723] hover:bg-[#3E2723]/5 rounded-lg transition-all"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteConfirmId(item._id || item.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Inquiry"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    const filters = [
        {
            options: [
                { label: 'All', value: 'All' },
                { label: 'Unread', value: 'Unread' },
                { label: 'Read', value: 'Read' }
            ],
            onChange: (val) => setStatusFilter(val)
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans">
            <div className="max-w-[1400px] mx-auto w-full flex flex-col animate-in fade-in duration-500 pb-20">
            <PageHeader
                title="Contact Inquiries"
                subtitle="Manage messages from your website visitors"
            />

            {/* 3 Stats Cards: All, Unread, Read */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-8">
                {/* All */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-[#3E2723]/20 transition-all">
                    <div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Total Messages</p>
                        <h3 className="text-3xl font-bold text-gray-900">{totalInquiries}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#3E2723] group-hover:text-white transition-colors">
                        <Inbox size={24} />
                    </div>
                </div>

                {/* Unread */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
                    <div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Unread</p>
                        <h3 className="text-3xl font-bold text-gray-900">{unreadInquiries}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <AlertCircle size={24} />
                    </div>
                </div>

                {/* Read */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-green-200 transition-all">
                    <div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Read</p>
                        <h3 className="text-3xl font-bold text-gray-900">{readInquiries}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-500 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredInquiries}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchPlaceholder="Search name, email, or message..."
                filters={filters}
            />

            {/* Inquiry View Modal */}
            {selectedInquiry && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5 duration-300">
                        {/* Header */}
                        <div className="bg-[#3E2723] px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-white text-lg">Inquiry Details</h3>
                            </div>
                            <button
                                onClick={() => setSelectedInquiry(null)}
                                className="text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* User Info */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#3E2723] flex items-center justify-center text-white text-lg font-bold shadow-md">
                                        {selectedInquiry.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selectedInquiry.name}</h2>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{selectedInquiry.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${selectedInquiry.status === 'Unread' ? 'text-red-700 bg-red-50 border-red-100' :
                                    'text-green-700 bg-green-50 border-green-100'
                                    }`}>
                                    {selectedInquiry.status}
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message Content</label>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-sm text-gray-700 font-medium leading-relaxed">
                                    {selectedInquiry.message}
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 pt-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Received on {new Date(selectedInquiry.createdAt || selectedInquiry.date).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedInquiry(null)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all w-full md:w-auto"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Inquiry?</h3>
                            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to delete this inquiry? This action cannot be undone.</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-5 py-2.5 bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors w-full"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-700 transition-colors shadow-sm w-full"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default ContactInquiries;
