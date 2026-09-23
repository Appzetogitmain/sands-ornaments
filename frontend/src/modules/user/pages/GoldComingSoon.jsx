import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Star, Heart, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const GoldComingSoon = ({ config }) => {
    const badgeText = config?.badgeText || "The Grand Unveil";
    const title = config?.title || "SANDS GOLD COLLECTION";
    const subtitle = config?.subtitle || "Indulge in the timeless allure of 18K and 22K pure gold. Handcrafted masterpieces and bespoke designs are being perfected for your most cherished moments.";

    const [isInputOpen, setIsInputOpen] = useState(false);
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
        setIsInputOpen(false);
        toast.success("You're on the VIP list! We will notify you the moment Gold arrives.");
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center bg-[#FDFBF7] px-4 py-20 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#AA8C2C]/5 rounded-full blur-[100px] -ml-48 -mb-48" />

            <div className="max-w-4xl w-full relative z-10">
                <div className="text-center space-y-12">
                    {/* Icon Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#AA8C2C] rounded-full flex items-center justify-center shadow-2xl relative z-10">
                                <span className="text-4xl font-black text-white italic">Au</span>
                            </div>
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute -top-4 -right-4 text-[#D4AF37]"
                            >
                                <Sparkles size={32} />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Text Section */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h4 className="text-[#AA8C2C] font-black uppercase tracking-[0.4em] text-xs mb-4">
                                {badgeText}
                            </h4>
                            <h1 className="text-4xl md:text-7xl font-serif font-bold text-black leading-tight tracking-tight uppercase">
                                {title}
                            </h1>
                        </motion.div>

                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-600 font-serif italic text-base md:text-xl max-w-2xl mx-auto leading-relaxed"
                        >
                            "{subtitle}"
                        </motion.p>
                    </div>

                    {/* Features/Teaser Grid */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-16"
                    >
                        {[
                            { icon: Star, text: "Bespoke Craftsmanship" },
                            { icon: Heart, text: "Hallmarked Purity" },
                            { icon: Sparkles, text: "Exclusive Designs" }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white/60 backdrop-blur-sm border border-[#D4AF37]/20 p-6 rounded-2xl flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 shadow-sm">
                                <item.icon className="text-[#D4AF37] w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#333]">{item.text}</span>
                            </div>
                        ))}
                    </motion.div>

                    {/* CTA Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="pt-8 flex flex-col items-center justify-center gap-6"
                    >
                        {isSubmitted ? (
                            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-widest shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                You're on the exclusive VIP launch list ✨
                            </div>
                        ) : isInputOpen ? (
                            <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                                <div className="relative w-full">
                                    <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Enter email or mobile number"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#AA8C2C]/30 rounded-full text-xs font-bold text-gray-800 focus:outline-none focus:border-[#AA8C2C] shadow-lg shadow-[#D4AF37]/10"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto px-8 py-3.5 bg-[#AA8C2C] text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-[#AA8C2C]/30 hover:bg-[#8B7324] transition-all shrink-0"
                                >
                                    Join VIP List
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsInputOpen(true)}
                                className="px-10 py-4 bg-[#AA8C2C] text-white rounded-full text-xs font-black uppercase tracking-widest shadow-2xl shadow-[#AA8C2C]/30 hover:bg-[#8B7324] transition-all group flex items-center gap-3"
                            >
                                Notify Me Arrival <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        <Link to="/shop" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors border-b-2 border-transparent hover:border-black pb-1">
                            Explore Silver Collection
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default GoldComingSoon;
