import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Sparkles, Star, Heart, CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShop } from '../../../context/ShopContext';

// Import assets for banners and purities
import goldBanner from '@assets/hero/modern_gold_fusion.png';
import silverBanner from '@assets/hero/sterling_silver_heritage.png';
import purity24k from '@assets/categories/sets.png';
import purity22k from '@assets/categories/bangle.png';
import purity18k from '@assets/categories/rings.png';
import purity14k from '@assets/categories/earrings.png';
import puritySterling from '@assets/categories/pendants.png';
import purityFine from '@assets/categories/anklets.png';

const AllJewelleryMegaMenu = ({ resetMenu, initialView = 'main' }) => {
    const [view, setView] = useState(initialView); // 'main', 'gold', 'silver'
    const { siteSettings } = useShop();
    const isGoldComingSoon = siteSettings?.goldComingSoon?.enabled !== false;
    const badgeText = siteSettings?.goldComingSoon?.badgeText || "The Grand Unveil";
    const title = siteSettings?.goldComingSoon?.title || "SANDS GOLD COLLECTION";
    const subtitle = siteSettings?.goldComingSoon?.subtitle || "Indulge in the timeless allure of 18K and 22K pure gold. Handcrafted masterpieces and bespoke designs are being perfected for your most cherished moments.";

    const [contact, setContact] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(() => {
        try {
            return Boolean(localStorage.getItem('gold_launch_notify_registered'));
        } catch {
            return false;
        }
    });

    const handleNotifySubmit = (e) => {
        e.preventDefault();
        const trimmed = contact.trim();
        if (!trimmed) {
            toast.error("Please enter your email or mobile number");
            return;
        }
        try {
            localStorage.setItem('gold_launch_notify_registered', trimmed);
        } catch (err) {
            console.error("Storage error:", err);
        }
        setIsSubmitted(true);
        toast.success("You're on the VIP list! We will notify you the moment Gold arrives.");
    };

    const goldPurities = [
        // Shop.jsx expects `metal=gold` + `karat=14|18|22|24`
        { id: '24k', name: '24K GOLD', sub: 'PURE 99.9% GOLD', image: purity24k, path: '/shop?metal=gold&karat=24' },
        { id: '22k', name: '22K GOLD', sub: 'PREMIUM HALLMARKED', image: purity22k, path: '/shop?metal=gold&karat=22' },
        { id: '18k', name: '18K GOLD', sub: 'LUXURY DESIGN', image: purity18k, path: '/shop?metal=gold&karat=18' },
        { id: '14k', name: '14K GOLD', sub: 'DAILY ELEGANCE', image: purity14k, path: '/shop?metal=gold&karat=14' },
    ];

    const silverPurities = [
        // Shop.jsx expects `metal=silver` + `silver_type=fine|sterling`
        { id: '925', name: 'STERLING SILVER', sub: '925 HALLMARKED', image: puritySterling, path: '/shop?metal=silver&silver_type=sterling' },
        { id: 'fine', name: 'FINE SILVER', sub: 'PURE & SIMPLE', image: purityFine, path: '/shop?metal=silver&silver_type=fine' },
    ];

    return (
        <div className="bg-white min-w-[800px] max-w-[1000px] shadow-2xl border border-gray-100 overflow-hidden relative min-h-[400px]">
            <AnimatePresence mode="wait">
                {view === 'main' && (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-8"
                    >
                        <h3 className="text-[#9C3D5E] text-[11px] font-black uppercase tracking-[0.3em] mb-8">
                            Explore Metal Collections
                        </h3>

                        <div className="flex flex-col gap-6">
                            {/* Gold Collection Banner */}
                            <div 
                                onClick={() => setView('gold')}
                                className="group relative h-[140px] rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-500"
                            >
                                <img src={goldBanner} alt="Gold" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                                <div className="absolute inset-y-0 left-10 flex flex-col justify-center text-white">
                                    <h2 className="text-3xl font-bold tracking-tight mb-1">GOLD COLLECTION</h2>
                                    <p className="text-[11px] font-medium opacity-80 tracking-widest uppercase">Pure 24K • 22K • 18K • 14K</p>
                                </div>
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-white/40 transition-all">
                                    <ChevronRight className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            {/* Silver Collection Banner */}
                            <div 
                                onClick={() => setView('silver')}
                                className="group relative h-[140px] rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-500"
                            >
                                <img src={silverBanner} alt="Silver" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                                <div className="absolute inset-y-0 left-10 flex flex-col justify-center text-white">
                                    <h2 className="text-3xl font-bold tracking-tight mb-1">SILVER COLLECTION</h2>
                                    <p className="text-[11px] font-medium opacity-80 tracking-widest uppercase">925 Sterling • Fine Silver</p>
                                </div>
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-white/40 transition-all">
                                    <ChevronRight className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {view === 'gold' && (
                    <motion.div
                        key="gold"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-8 bg-[#FFFDF7]"
                    >
                        <button 
                            onClick={() => setView('main')}
                            className="flex items-center gap-3 text-[#B88B4A] font-bold text-[11px] uppercase tracking-[0.2em] mb-6 hover:translate-x-[-4px] transition-transform"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#B88B4A]/10 flex items-center justify-center">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            {isGoldComingSoon ? 'Explore Collections' : 'Gold Purities'}
                        </button>

                        {isGoldComingSoon ? (
                            <div className="relative rounded-2xl bg-gradient-to-br from-[#FFFDF8] via-[#FAF4E8] to-[#F5EEDD] border border-[#E8D8A0]/60 p-6 md:p-8 shadow-sm overflow-hidden text-center max-w-[850px] mx-auto">
                                {/* Decorative background blurs */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[70px] -mr-20 -mt-20 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#AA8C2C]/10 rounded-full blur-[70px] -ml-20 -mb-20 pointer-events-none" />

                                <div className="relative z-10 max-w-2xl mx-auto">
                                    {/* Gold Emblem */}
                                    <div className="relative inline-block mb-3">
                                        <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#AA8C2C] rounded-full flex items-center justify-center shadow-lg mx-auto">
                                            <span className="text-xl font-black text-white italic">Au</span>
                                        </div>
                                        <Sparkles className="w-4 h-4 text-[#D4AF37] absolute -top-1 -right-1 animate-pulse" />
                                    </div>

                                    {/* Texts */}
                                    <h4 className="text-[#AA8C2C] font-black uppercase tracking-[0.35em] text-[10px] mb-1.5">
                                        {badgeText}
                                    </h4>
                                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 leading-tight uppercase tracking-wide mb-2">
                                        {title}
                                    </h2>
                                    <p className="text-gray-600 font-serif italic text-xs md:text-sm max-w-xl mx-auto leading-relaxed mb-5">
                                        "{subtitle}"
                                    </p>

                                    {/* Badges */}
                                    <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
                                        {[
                                            { icon: Star, text: "Bespoke Craftsmanship" },
                                            { icon: Heart, text: "Hallmarked Purity" },
                                            { icon: Sparkles, text: "Exclusive Designs" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="bg-white/70 backdrop-blur-sm border border-[#D4AF37]/25 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                                                <item.icon className="text-[#D4AF37] w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-700">{item.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action row */}
                                    {isSubmitted ? (
                                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-widest shadow-xs">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            You're on the exclusive VIP launch list ✨
                                        </div>
                                    ) : (
                                        <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                                            <div className="relative w-full sm:flex-1">
                                                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    placeholder="Enter email or mobile number"
                                                    value={contact}
                                                    onChange={(e) => setContact(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#AA8C2C]/30 rounded-full text-xs font-medium text-gray-800 focus:outline-none focus:border-[#AA8C2C] shadow-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                                <button
                                                    type="submit"
                                                    className="flex-1 sm:flex-none px-5 py-2 bg-[#AA8C2C] text-white rounded-full text-[11px] font-black uppercase tracking-wider shadow-md hover:bg-[#8B7324] transition-all"
                                                >
                                                    Notify Me
                                                </button>
                                                <Link
                                                    to="/gold-collection"
                                                    onClick={resetMenu}
                                                    className="flex-1 sm:flex-none px-4 py-2 border border-[#AA8C2C]/40 text-[#8B7324] hover:bg-[#AA8C2C]/10 rounded-full text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                                                >
                                                    VIP Preview <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-4 max-w-[800px] mx-auto">
                                {goldPurities.map((item) => (
                                    <Link 
                                        key={item.id} 
                                        to={item.path} 
                                        onClick={resetMenu}
                                        className="group flex flex-col bg-white overflow-hidden transition-all duration-300 shadow-sm border border-gray-50 h-full"
                                    >
                                        <div className="w-full aspect-square overflow-hidden bg-[#FAF3F0]">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        </div>
                                        <div className="p-3 mt-auto">
                                            <div className="w-full bg-[#B88B4A] text-white py-2 text-center text-[9px] font-bold uppercase tracking-widest transition-colors group-hover:bg-[#96713A]">
                                                {item.name}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {view === 'silver' && (
                    <motion.div
                        key="silver"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-8 bg-[#F9FAFB]"
                    >
                        <button 
                            onClick={() => setView('main')}
                            className="flex items-center gap-3 text-[#64748B] font-bold text-[11px] uppercase tracking-[0.2em] mb-8 hover:translate-x-[-4px] transition-transform"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            Silver Purities
                        </button>

                        <div className="grid grid-cols-2 gap-6 max-w-[440px] mx-auto">
                            {silverPurities.map((item) => (
                                <Link 
                                    key={item.id} 
                                    to={item.path} 
                                    onClick={resetMenu}
                                    className="group flex flex-col bg-white overflow-hidden transition-all duration-300 shadow-sm border border-gray-50 h-full"
                                >
                                    <div className="w-full aspect-square overflow-hidden bg-[#F3F4F6]">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                    <div className="p-4 mt-auto">
                                        <div className="w-full bg-[#64748B] text-white py-3 text-center text-[11px] font-bold uppercase tracking-widest transition-colors group-hover:bg-[#475569]">
                                            {item.name}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AllJewelleryMegaMenu;

