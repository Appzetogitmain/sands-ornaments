import React, { useState, useEffect } from 'react';
import {
    HelpCircle, Plus, Search, Filter,
    Edit3, Trash2, ChevronDown, ChevronUp,
    Save, X, GripVertical, CheckCircle2,
    LayoutGrid, List, MessageSquare, AlertCircle
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import AdminStatsCard from '../components/AdminStatsCard';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';

const FAQManagement = () => {
    const [faqs, setFaqs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    const [formData, setFormData] = useState({
        category: 'Orders',
        question: '',
        answer: '',
        status: 'Active'
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['Orders', 'Returns', 'Payments', 'Shopping', 'General', 'Seller'];

    const fetchFaqs = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getFAQs();
            setFaqs(data);
        } catch (err) {
            console.error('Failed to load FAQs:', err);
            toast.error('Failed to load FAQs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const handleOpenModal = (faq = null) => {
        if (faq) {
            setEditingFaq(faq);
            setFormData({
                ...faq,
                status: faq.isActive ? 'Active' : 'Inactive'
            });
        } else {
            setEditingFaq(null);
            setFormData({
                category: 'Orders',
                question: '',
                answer: '',
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                category: formData.category,
                question: formData.question,
                answer: formData.answer,
                isActive: formData.status === 'Active'
            };

            if (editingFaq) {
                const res = await adminService.updateFAQ(editingFaq._id, payload);
                if (res.success) {
                    toast.success('FAQ updated successfully');
                    fetchFaqs();
                } else {
                    toast.error(res.message);
                }
            } else {
                const res = await adminService.createFAQ(payload);
                if (res.success) {
                    toast.success('FAQ created successfully');
                    fetchFaqs();
                } else {
                    toast.error(res.message);
                }
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to save FAQ:', err);
            toast.error('Failed to save FAQ');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this FAQ?')) {
            try {
                const res = await adminService.deleteFAQ(id);
                if (res.success) {
                    toast.success('FAQ deleted successfully');
                    fetchFaqs();
                } else {
                    toast.error(res.message || 'Failed to delete FAQ');
                }
            } catch (err) {
                console.error('Failed to delete FAQ:', err);
                toast.error('Failed to delete FAQ');
            }
        }
    };

    const mappedFaqs = faqs.map(faq => ({
        ...faq,
        status: faq.isActive ? 'Active' : 'Inactive',
        id: faq._id
    }));

    const filteredFaqs = mappedFaqs.filter(f => {
        const matchesSearch = f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || f.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Stats
    const statsData = [
        { label: 'Total FAQs', value: mappedFaqs.length, icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { label: 'Active', value: mappedFaqs.filter(f => f.status === 'Active').length, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { label: 'Categories', value: categories.length, icon: LayoutGrid, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header & Stats */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageHeader
                        title="FAQ Management"
                        subtitle="Create and manage help center questions"
                    />
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#3E2723] text-white rounded-xl text-sm font-bold hover:bg-[#5D4037] transition-all shadow-lg shadow-[#3E2723]/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add New FAQ
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsData.map((stat, index) => (
                        <AdminStatsCard
                            key={index}
                            label={stat.label}
                            value={stat.value}
                            icon={stat.icon}
                            color={stat.color}
                            bgColor={stat.bgColor}
                        />
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                {/* Search & Filter Bar */}
                <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search questions or answers..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {['All', ...categories].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat
                                ? 'bg-[#3E2723] text-white shadow-lg shadow-[#3E2723]/20'
                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* FAQ List Cards */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredFaqs.map((faq) => (
                        <div key={faq.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-6">
                                {/* Drag Handle & Icon */}
                                <div className="hidden md:flex flex-col items-center text-gray-300">
                                    <div className="p-1.5 hover:bg-gray-50 rounded-lg cursor-grab active:cursor-grabbing transition-colors">
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-2.5">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${faq.status === 'Active'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                                            }`}>
                                            {faq.status}
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[8px] font-bold uppercase tracking-widest">
                                            {faq.category}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-black leading-tight">
                                        {faq.question}
                                    </h3>

                                    <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-100/50">
                                        <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row md:flex-col items-center md:items-start gap-1.5 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5">
                                    <button
                                        onClick={() => handleOpenModal(faq)}
                                        className="flex-1 md:flex-none w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-[#3E2723] hover:text-white rounded-lg transition-all"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(faq.id)}
                                        className="flex-1 md:flex-none w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredFaqs.length === 0 && (
                        <div className="py-24 text-center bg-white rounded-xl border border-dashed border-gray-200">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-black mb-2">No results found</h3>
                            <p className="text-sm text-gray-500">
                                We couldn't find any FAQs matching your search criteria.
                            </p>
                            <button
                                onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                                className="mt-6 text-[#3E2723] font-bold text-sm hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className="bg-[#3E2723] p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                                </h3>
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Fill in the details below</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-md"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block">Category</label>
                                    <div className="relative">
                                        <select
                                            className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-black focus:border-[#3E2723] focus:ring-0 outline-none appearance-none transition-all cursor-pointer"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block">Status</label>
                                    <div className="relative">
                                        <select
                                            className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-black focus:border-[#3E2723] focus:ring-0 outline-none appearance-none transition-all cursor-pointer"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block">Question</label>
                                <input
                                    type="text"
                                    placeholder="e.g., How do I track my order?"
                                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-black placeholder:text-gray-400 focus:border-[#3E2723] focus:ring-0 outline-none transition-all"
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Answer</label>
                                <textarea
                                    placeholder="Write a clear and helpful answer..."
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#3E2723] focus:ring-0 outline-none transition-all h-32 resize-none leading-relaxed"
                                    value={formData.answer}
                                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-[#3E2723] hover:bg-[#5D4037] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#3E2723]/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingFaq ? 'Update FAQ' : 'Save FAQ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FAQManagement;
