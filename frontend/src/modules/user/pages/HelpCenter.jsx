import React, { useState } from 'react';
import { Search, HelpCircle, ShoppingBag, Truck, CreditCard, RefreshCw, MessageCircle, ChevronRight, Phone, Mail, Clock, Send, Ticket, ArrowLeft, History, User } from 'lucide-react';
import { useShop } from '../../../context/ShopContext';
import { Link, useNavigate } from 'react-router-dom';
import { useResetScroll } from '../../../hooks/useResetScroll';

const SupportForm = ({ onCancel, initialOrder = '' }) => {
    const { createTicket, user } = useShop();
    const [formData, setFormData] = useState({
        subject: '',
        orderId: initialOrder,
        category: 'General Inquiry',
        message: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createTicket({
            ...formData,
            userEmail: user?.email,
            userName: user?.name
        });
        onCancel(); // Return to FAQ/Main view
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl md:text-2xl font-display font-bold text-black mb-4 md:mb-6">Create Support Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Subject</label>
                        <input
                            required
                            type="text"
                            placeholder="Brief description of issue"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Order ID (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. 1735123456"
                            value={formData.orderId}
                            onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    >
                        <option value="General Inquiry">General Enquiry</option>
                        <option value="Order Tracking">Order Tracking</option>
                        <option value="Payment Issue">Payment Issue</option>
                        <option value="Return/Refund">Returns & Refunds</option>
                        <option value="Product Feedback">Product Feedback</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 md:mb-2">Detailed Message</label>
                    <textarea
                        required
                        rows="4"
                        placeholder="Please describe your problem in detail..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none transition-all"
                    ></textarea>
                </div>
                <div className="flex gap-3 md:gap-4">
                    <button
                        type="submit"
                        className="flex-grow bg-[#EBCDD0] text-black py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#D39A9F] hover:text-white transition-all shadow-sm text-sm md:text-base"
                    >
                        <Send className="w-4 h-4" />
                        Submit Request
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 md:px-8 py-3 md:py-4 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm md:text-base"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

const HelpCenter = () => {
    useResetScroll();
    const { user, orders, showNotification } = useShop();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [view, setView] = useState('home'); // home, contact
    const [prefilledOrder, setPrefilledOrder] = useState('');

    const categories = [
        { id: 'orders', icon: <ShoppingBag className="w-6 h-6" />, title: 'Orders', description: 'Tracking, shipping, and delivery details' },
        { id: 'payments', icon: <CreditCard className="w-6 h-6" />, title: 'Payments', description: 'Pricing, billing, and payment methods' },
        { id: 'returns', icon: <RefreshCw className="w-6 h-6" />, title: 'Returns & Refunds', description: 'Policies and process for returns' },
        { id: 'shopping', icon: <Truck className="w-6 h-6" />, title: 'Shopping', description: 'Product info, stock, and sizing' },
    ];

    const faqs = [
        {
            category: 'orders',
            question: 'How can I track my order?',
            answer: 'You can track your order by visiting the "My Orders" section in your profile or by using the tracking link sent to your email.'
        },
        {
            category: 'returns',
            question: 'What is your return policy?',
            answer: 'We offer a 7-day easy return policy for most items. The product must be unused and in its original packaging.'
        },
        {
            category: 'payments',
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit/debit cards, UPI, Wallets, and Net Banking. Cash on Delivery is also available for selected locations.'
        },
        {
            category: 'shopping',
            question: 'Are your silver ornaments hallmarked?',
            answer: 'Yes, all our 925 Silver ornaments are hallmarked and come with an authenticity certificate.'
        }
    ];

    const filteredFaqs = searchQuery
        ? faqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()))
        : activeCategory === 'all'
            ? faqs
            : faqs.filter(f => f.category === activeCategory);

    const handleNeedHelpWithOrder = (orderId) => {
        if (!user) {
            showNotification("Please login to create a support ticket.");
            return;
        }
        setPrefilledOrder(orderId.split('-')[1]);
        setView('contact');
    };

    return (
        <div className="min-h-screen bg-white font-body pb-10 md:pb-20 selection:bg-[#D39A9F] selection:text-white">
            {/* Back Button */}
            <div className="container mx-auto px-4 pt-4 mb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-black hover:text-[#D39A9F] transition-all group font-bold uppercase tracking-widest text-[10px]"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back
                </button>
            </div>
            {/* Hero Section */}
            <div className="bg-white border-b border-gray-100 py-6 md:py-10 px-4 relative overflow-hidden">
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#EBCDD0]/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D39A9F]/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <span className="text-[#D39A9F] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2 block">Support Center</span>
                    <h1 className="text-2xl md:text-4xl font-display font-bold mb-4 text-black">How can we help you?</h1>
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search for topics, questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full py-2.5 px-10 md:py-3 md:px-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#D39A9F] focus:border-transparent shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 md:-mt-8 relative z-20">
                {/* Category Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setView('home');
                            }}
                            className={`bg-white p-3 md:p-6 rounded-2xl shadow-sm border transition-all text-left group hover:shadow-lg hover:-translate-y-1 ${activeCategory === cat.id && view === 'home' ? 'border-black ring-1 ring-black' : 'border-gray-100'}`}
                        >
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-4 transition-colors ${activeCategory === cat.id && view === 'home' ? 'bg-black text-white' : 'bg-gray-50 text-black group-hover:bg-[#EBCDD0] group-hover:text-black'}`}>
                                {cat.icon}
                            </div>
                            <h3 className="text-sm md:text-base font-bold text-black mb-1 font-display">{cat.title}</h3>
                            <p className="text-xs text-gray-500 leading-relaxed hidden md:block font-serif">{cat.description}</p>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2">
                        {view === 'home' ? (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="flex justify-between items-center mb-4 md:mb-6">
                                    <h2 className="text-lg md:text-xl font-display font-bold text-black">Frequently Asked Questions</h2>
                                    {activeCategory !== 'all' && (
                                        <button onClick={() => setActiveCategory('all')} className="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-widest hover:text-black transition-colors">Clear Filter</button>
                                    )}
                                </div>
                                <div className="space-y-3 md:space-y-4">
                                    {filteredFaqs.length > 0 ? (
                                        filteredFaqs.map((faq, idx) => (
                                            <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:bg-gray-50/50 hover:border-gray-200">
                                                <details className="group">
                                                    <summary className="flex items-center justify-between p-4 md:p-6 cursor-pointer list-none">
                                                        <h4 className="text-sm md:text-base font-bold text-black pr-4">{faq.question}</h4>
                                                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-transform group-open:rotate-90" />
                                                    </summary>
                                                    <div className="px-4 pb-4 md:px-6 md:pb-6 text-xs md:text-sm text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-2 font-serif">
                                                        {faq.answer}
                                                    </div>
                                                </details>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 md:py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                                            <HelpCircle className="w-8 h-8 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-sm md:text-base text-gray-500">No results found for your search.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <SupportForm
                                onCancel={() => {
                                    setView('home');
                                    setPrefilledOrder('');
                                }}
                                initialOrder={prefilledOrder}
                            />
                        )}
                    </div>

                    {/* Support Sidebar */}
                    <div className="space-y-6 md:space-y-8">
                        {/* Contact Card */}
                        <div className="bg-black text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-xl md:text-2xl font-display font-bold mb-2 md:mb-4">Still need help?</h3>
                                <p className="text-white/80 mb-6 md:mb-8 text-xs md:text-sm leading-relaxed font-serif">Our support team is available from 10 AM to 7 PM to help you.</p>

                                <div className="space-y-4 md:space-y-6">
                                    <button
                                        onClick={() => {
                                            if (!user) return showNotification("Please login to contact support.");
                                            setView('contact');
                                        }}
                                        className="w-full bg-white text-black py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 hover:bg-[#EBCDD0] transition-all shadow-lg active:scale-95 text-sm md:text-base"
                                    >
                                        <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                        Contact Support
                                    </button>

                                    <div className="pt-4 space-y-4">
                                        <div className="flex items-center gap-4 text-xs md:text-sm font-medium">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center">
                                                <Phone className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest font-bold">Call us</p>
                                                <p>+91 91 1334 4051</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs md:text-sm font-medium">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center">
                                                <Mail className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest font-bold">Email us</p>
                                                <p>care@sandsjewels.com</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#D39A9F]/20 rounded-full blur-3xl"></div>
                        </div>

                        {/* Order Help Card */}
                        {user && orders.length > 0 && (
                            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-base md:text-lg font-bold text-black mb-4 md:mb-6 flex items-center gap-2 font-display">
                                    <Clock className="w-4 h-4 md:w-5 md:h-5" />
                                    Recent Orders
                                </h3>
                                <div className="space-y-4">
                                    {orders.slice(0, 2).map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => handleNeedHelpWithOrder(order.id)}
                                            className="p-3 md:p-4 rounded-xl bg-gray-50 border border-gray-100 group cursor-pointer hover:border-black transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-black">#{order.id.split('-')[1]}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{new Date(order.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-gray-600 line-clamp-1 mb-2 md:mb-3">{order.items[0].name}</p>
                                            <button className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#D39A9F] group-hover:underline group-hover:text-black">Need help?</button>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/profile/orders" className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4 md:mt-6 block text-center hover:text-black transition-colors">View all orders</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
