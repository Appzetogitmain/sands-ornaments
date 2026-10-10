import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Mail, User, Clock, Calendar, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../services/api';

const GiftCardsTab = () => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchGiftCards = async () => {
        setLoading(true);
        try {
            const res = await api.get('user/gift-cards/my-cards');
            if (res.data.success) {
                setCards(res.data.data.giftCards || []);
            } else {
                toast.error(res.data.message || 'Failed to load gift cards');
            }
        } catch (err) {
            console.error('Error fetching gift cards:', err);
            toast.error(err.response?.data?.message || 'Error fetching gift cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGiftCards();
    }, []);

    const handleCopy = (code) => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(code);
            toast.success(`Copied code: ${code}`);
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            toast.success(`Copied code: ${code}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Invalid Date';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'partially_used':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'used':
                return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'expired':
                return 'bg-red-50 text-red-600 border-red-200';
            case 'disabled':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return 'Active';
            case 'partially_used': return 'Partially Used';
            case 'used': return 'Redeemed';
            case 'expired': return 'Expired';
            case 'disabled': return 'Disabled';
            default: return status || 'Unknown';
        }
    };

    const filteredCards = cards.filter(card => 
        card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#EBCDD0] shadow-sm flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#8E2B45] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 font-medium">Retrieving your gift cards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#EBCDD0] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBCDD0] pb-6">
                <div>
                    <h2 className="font-display font-bold text-lg md:text-xl text-black uppercase tracking-wider">My Gift Cards</h2>
                    <p className="text-xs text-gray-500 mt-1">Manage and track the E-Gift Cards you have purchased for friends and family.</p>
                </div>
                {cards.length > 0 && (
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search code or recipient..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs w-full sm:w-60 outline-none focus:ring-2 focus:ring-[#8E2B45]/20 focus:bg-white transition-all"
                        />
                        <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    </div>
                )}
            </div>

            {cards.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-6 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-[#8E2B45]/5 flex items-center justify-center mx-auto border border-[#8E2B45]/15">
                        <Gift className="w-8 h-8 text-[#8E2B45]" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-base font-bold text-gray-900">No Gift Cards Purchased Yet</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">Spread love and sparkles by gifting your loved ones a Sands E-Gift Card. Let them pick their favorite silver jewelry.</p>
                    </div>
                    <a
                        href="/gift-cards"
                        className="inline-block bg-[#8E2B45] text-white px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#5B1E26] shadow-lg shadow-[#8E2B45]/10 hover:-translate-y-0.5 transition-all"
                    >
                        Buy Gift Card
                    </a>
                </div>
            ) : filteredCards.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    No gift cards match your search query.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCards.map((card) => (
                        <div 
                            key={card._id}
                            className="relative overflow-hidden rounded-2xl border border-gray-150 bg-white hover:border-[#8E2B45]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                        >
                            {/* Card Header Background Block */}
                            <div className="p-5 bg-gradient-to-br from-[#8E2B45] to-[#5B1E26] text-white space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Gift className="w-5 h-5 opacity-90 text-[#EBCDD0]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#EBCDD0]">Sands Gift Voucher</span>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(card.status)}`}>
                                        {getStatusLabel(card.status)}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[9px] uppercase tracking-widest opacity-70">Card Balance / Value</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black font-sans">₹{Math.round(card.balance || 0).toLocaleString('en-IN')}</span>
                                        {card.balance < card.value && (
                                            <span className="text-xs line-through opacity-50">₹{Math.round(card.value || 0).toLocaleString('en-IN')}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 border border-white/10">
                                    <span className="font-mono text-sm tracking-wider font-bold">{card.code}</span>
                                    <button 
                                        onClick={() => handleCopy(card.code)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                                        title="Copy Code"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Card Body Details */}
                            <div className="p-5 space-y-4 flex-grow text-xs text-gray-650 bg-gray-50/50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <User className="w-3 h-3" /> Recipient
                                        </span>
                                        <p className="font-bold text-gray-800 line-clamp-1">{card.recipientName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> Sent To
                                        </span>
                                        <p className="font-medium text-gray-800 line-clamp-1" title={card.recipientEmail}>{card.recipientEmail}</p>
                                    </div>
                                </div>

                                {card.personalMessage && (
                                    <div className="p-3 bg-white rounded-xl border border-gray-100 italic text-[11px] text-gray-500 leading-relaxed">
                                        "{card.personalMessage}"
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 text-[10px] font-medium text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Purchased: {formatDate(card.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{card.expiresAt ? `Expires: ${formatDate(card.expiresAt)}` : 'Lifetime Validity'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GiftCardsTab;
