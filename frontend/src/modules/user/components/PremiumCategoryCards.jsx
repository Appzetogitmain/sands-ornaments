import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import menImg from '@assets/collections/cat_men_nobg.png';
import womenImg from '@assets/collections/cat_women_nobg.png';

const PremiumCategoryCards = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, margin: '-100px' });

    const RECIPIENTS = [
        {
            id: 'him',
            title: 'For Him',
            image: menImg,
            path: '/category/men',
            layout: 'left',
        },
        {
            id: 'her',
            title: 'For Her',
            image: '/Gemini_Generated_Image_42n9yj42n9yj42n9-removebg-preview.png',
            path: '/category/women',
            layout: 'right',
        }
    ];

    return (
        <section
            ref={containerRef}
            className="mt-12 md:mt-20 pt-0 pb-2 md:pt-2 md:pb-6 bg-white overflow-visible"
        >
            <div className="container mx-auto px-4 max-w-[1100px]">
                {/* Header */}
                <div className="flex flex-col items-center mb-6 md:mb-20 relative z-50">
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-[#C9A24D] mb-1.5 md:mb-3">Gift the Excellence</span>
                    <h2 className="text-2xl md:text-4xl font-serif text-gray-950 tracking-tight leading-none text-center">
                        Shop by <span className="italic font-light text-[#8E2B45]">Recipient</span>
                    </h2>
                    <div className="w-8 h-[1px] md:w-10 md:h-[2px] bg-[#C9A24D]/60 mt-3 md:mt-5" />
                </div>

                {/* Cards Grid - Tightened gap for mobile */}
                <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-16 relative">
                    {RECIPIENTS.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.8, delay: idx * 0.2 }}
                            onClick={() => navigate(item.path)}
                            className="relative h-[115px] md:h-[180px] bg-[#FDF8F8] rounded-[24px] md:rounded-[48px] cursor-pointer group shadow-sm flex items-center border border-[#F3E0E2]/50"
                        >
                            {/* Maroon Inset Box - More Compact */}
                            <div
                                className={`absolute top-[6%] bottom-[6%] w-[75%] bg-gradient-to-br from-[#8E2B45] via-[#5C1625] to-[#2D060F] rounded-[20px] md:rounded-[44px] flex items-center justify-center p-3 md:p-8 z-10 transition-all duration-500 group-hover:shadow-[0_15px_30px_rgba(74,16,21,0.2)] 
                                ${item.layout === 'left' ? 'left-[2%]' : 'right-[2%]'}`}
                            >
                                {/* Shop Now Button inside maroon box */}
                                <div className={`flex items-center gap-3 md:gap-4 ${item.layout === 'right' ? 'flex-row-reverse translate-x-[25px] md:translate-x-[50px]' : '-translate-x-[25px] md:-translate-x-[50px]'}`}>
                                    <span className="text-white text-[15px] md:text-[22px] font-semibold tracking-[0.1em] font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] group-hover:tracking-[0.15em] transition-all duration-700">
                                        {item.title}
                                    </span>
                                    <div className="w-6 h-6 md:w-9 md:h-9 rounded-full bg-white flex items-center justify-center text-[#9C5B61] group-hover:bg-[#C9A24D] group-hover:text-white transition-all duration-500 shadow-lg border border-white/10">
                                        {item.layout === 'left' ? (
                                            <ChevronRight className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                        ) : (
                                            <ChevronLeft className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Model Image - Scaled for Compactness */}
                            <div className={`absolute ${item.layout === 'right' ? '-bottom-[28px] md:-bottom-[45px] h-[155%] md:h-[182%]' : 'bottom-0 h-[130%] md:h-[150%]'} z-30 pointer-events-none transition-all duration-1000 group-hover:scale-[1.03] ${item.layout === 'left' ? 'right-0' : 'left-0'}`}>
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    loading="lazy"
                                    decoding="async"
                                    className={`h-full w-auto object-contain drop-shadow-[10px_15px_30px_rgba(0,0,0,0.2)] transition-all duration-700 ${item.layout === 'left' ? 'translate-x-[5%] group-hover:translate-x-[8%]' : 'scale-x-[-1] -translate-x-[5%] group-hover:-translate-x-[8%]'}`}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PremiumCategoryCards;

