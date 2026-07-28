import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MousePointer2, ChevronRight } from 'lucide-react';
import heerCustomRing from '@assets/heer_custom_ring.png';

const HeerCustomisationBanner = () => {
    return (
        <section className="py-4 md:py-10 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1150px]">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative w-full rounded-[1.2rem] md:rounded-[2.5rem] bg-gradient-to-br from-[#0D261A] via-[#081F14] to-[#04120B] p-5 md:p-8 flex flex-col lg:flex-row items-center gap-4 md:gap-12 shadow-2xl"
                >
                    {/* Left Branding Content */}
                    <div className="flex-1 text-white z-10 text-center lg:text-left">
                        <div className="flex flex-col gap-0.5 mb-3 md:mb-6">
                            <h2 className="text-2xl md:text-5xl font-serif leading-tight tracking-tight">
                                Colour • Size • Metal
                            </h2>
                        </div>
                        
                        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse"></span>
                            <span className="text-[9px] md:text-[11px] font-bold tracking-widest uppercase opacity-70">
                                Takes 18 days to deliver
                            </span>
                        </div>
                    </div>

                    {/* Center Interactive Ring Visual */}
                    <div className="relative w-full lg:w-[40%] h-[180px] md:h-[280px] flex items-center justify-center">
                        {/* Decorative Outlined Rings - Hidden on very small screens or made subtle */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <div className="w-[80%] h-[80%] rounded-full border border-white/5 animate-[spin_20s_linear_infinite]" />
                        </div>

                        {/* Labels / Callouts - Reduced for mobile */}
                        <div className="absolute inset-0 z-20 pointer-events-none scale-[0.7] md:scale-100">
                            <div className="absolute top-[10%] left-[-5%] flex flex-col items-center lg:items-start">
                                <span className="text-[8px] text-white/40 uppercase tracking-[0.2em] mb-0.5">Size</span>
                                <span className="text-sm font-bold text-white">11</span>
                            </div>

                            <div className="absolute top-[0%] right-[10%] flex flex-col items-center">
                                <span className="text-[8px] text-white/40 uppercase tracking-[0.2em] mb-0.5">Metal</span>
                                <span className="text-sm font-bold text-white">14K</span>
                            </div>

                            <div className="absolute bottom-[20%] right-[-5%] flex flex-col items-center lg:items-end">
                                <span className="text-[8px] text-white/40 uppercase tracking-[0.2em] mb-0.5">Colour</span>
                                <span className="text-sm font-bold text-[#D4AF37]">Yellow Gold</span>
                            </div>
                        </div>

                        {/* The Ring Image */}
                        <div className="relative z-10 w-[60%] h-[60%] md:w-[70%] md:h-[70%] flex items-center justify-center">
                            <img 
                                src={heerCustomRing} 
                                alt="Customisable Ring" 
                                className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                            />
                        </div>

                        {/* Purity Toggles */}
                        <div className="absolute -bottom-1 md:-bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-xl p-0.5 rounded-lg border border-white/10 shadow-lg scale-90 md:scale-100">
                            {['9kt', '14kt', '18kt'].map((k) => (
                                <button 
                                    key={k}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all duration-300 ${k === '14kt' ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/60'}`}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Action Content */}
                    <div className="flex-1 flex flex-col items-center lg:items-end text-center lg:text-right z-10">
                        <div className="relative mb-2 md:mb-4">
                            <h3 className="hidden md:block text-[75px] font-black text-transparent stroke-white/5 tracking-tighter leading-none select-none" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.08)' }}>
                                CHOOSE
                            </h3>
                            <div className="static md:absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col items-center lg:items-end mt-2 md:mt-0">
                                <Link to="/customization" className="inline-block">
                                    <button className="group relative flex items-center gap-2 bg-[#D4AF37] hover:bg-white text-black px-5 py-2.5 rounded-full font-black uppercase tracking-[0.1em] text-[10px] transition-all duration-500 shadow-lg cursor-pointer">
                                        Customise Now
                                        <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                                    </button>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-1 flex flex-col items-center lg:items-end">
                             <div className="flex items-center gap-1.5">
                                <span className="h-[1px] w-4 bg-[#D4AF37]/30" />
                                <span className="font-serif italic text-lg text-white leading-none">Heer</span>
                                <span className="h-[1px] w-4 bg-[#D4AF37]/30" />
                             </div>
                             <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mt-0.5">by you</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default HeerCustomisationBanner;
