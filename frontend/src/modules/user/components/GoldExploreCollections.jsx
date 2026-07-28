import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

import dailyWearBanner from '@assets/explore/gold_daily_wear_banner_1775911015640.png';
import officeWearBanner from '@assets/explore/gold_office_wear_banner_1775911038204.png';
import thumb1 from '@assets/categories/gold_rings_green.png';
import thumb2 from '@assets/categories/gold_earrings_green.png';
import thumb3 from '@assets/categories/gold_pendants_green.png';
import thumb4 from '@assets/categories/gold_bracelets_green.png';

const fallbackCollections = [
    {
        id: 1,
        label: 'EFFORTLESS EVERYDAY',
        title: 'DAILY WEAR',
        description: 'Minimalist gold pieces for your everyday sparkle',
        image: dailyWearBanner,
        path: '/shop?metal=gold',
        extraImages: [thumb1, thumb2, thumb3]
    },
    {
        id: 2,
        label: 'PROFESSIONAL CHIC',
        title: 'OFFICE WEAR',
        description: 'Sophisticated designs for the modern workplace',
        image: officeWearBanner,
        path: '/shop?metal=gold',
        extraImages: [thumb4, thumb1, thumb2]
    },
    {
        id: 3,
        label: 'CELEBRATION READY',
        title: 'PARTY WEAR',
        description: 'Extravagant gold jewelry for those special moments',
        image: dailyWearBanner,
        path: '/shop?metal=gold',
        extraImages: [thumb3, thumb4, thumb1]
    }
];

const GoldExploreCollections = ({ sectionData = null }) => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const ensureGoldCategoryPath = (rawPath = '', categoryId = '') => {
        const source = String(rawPath || '').trim();
        const normalizedCategoryId = String(categoryId || '').trim();

        if (!source || !source.startsWith('/shop')) {
            return normalizedCategoryId
                ? `/shop?metal=gold&category=${encodeURIComponent(normalizedCategoryId)}`
                : '/shop?metal=gold';
        }

        const params = new URLSearchParams(source.includes('?') ? source.split('?')[1] : '');
        params.set('metal', 'gold');
        if (normalizedCategoryId) {
            params.set('category', normalizedCategoryId);
        }
        const query = params.toString();
        return `/shop${query ? `?${query}` : ''}`;
    };

    const collections = useMemo(() => {
        const configured = Array.isArray(sectionData?.items) ? sectionData.items : [];
        if (configured.length === 0) return fallbackCollections;

        return configured.map((item, idx) => {
            const thumbDefaults = fallbackCollections[idx % fallbackCollections.length]?.extraImages || [thumb1, thumb2, thumb3];
            const extraImages = Array.isArray(item?.extraImages)
                ? item.extraImages.map((img, i) => resolveLegacyCmsAsset(img, thumbDefaults[i % thumbDefaults.length])).slice(0, 3)
                : [];

            return {
                id: item?.itemId || item?.id || `gold-explore-${idx + 1}`,
                label: String(item?.tag || '').trim() || fallbackCollections[idx % fallbackCollections.length].label,
                title: String(item?.name || item?.label || '').trim() || fallbackCollections[idx % fallbackCollections.length].title,
                description: String(item?.subtitle || item?.description || '').trim() || fallbackCollections[idx % fallbackCollections.length].description,
                image: resolveLegacyCmsAsset(item?.image, fallbackCollections[idx % fallbackCollections.length].image),
                path: ensureGoldCategoryPath(item?.path, item?.categoryId),
                extraImages: extraImages.length > 0 ? extraImages : thumbDefaults
            };
        });
    }, [sectionData]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll <= 0) {
                setActiveIndex(0);
                return;
            }
            const percentage = scrollLeft / maxScroll;
            const index = Math.round(percentage * (collections.length - 1));
            setActiveIndex(Math.min(index, collections.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (collections.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    return (
        <section className="py-4 md:py-16 bg-white select-none overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1450px]">
                <div className="relative group/main">
                    

                    

                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto gap-3 md:gap-8 pb-10 md:pb-16 hide-scrollbar scroll-smooth snap-x snap-mandatory"
                    >
                        {collections.map((col, idx) => (
                            <div key={col.id} className="flex-shrink-0 w-[88vw] md:w-[680px] snap-start relative px-1">
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                    onClick={() => navigate(col.path)}
                                    className="relative h-[200px] sm:h-[220px] md:h-[340px] rounded-[24px] md:rounded-[32px] overflow-hidden cursor-pointer shadow-2xl group/card border border-gray-100"
                                >
                                    <img
                                        src={col.image}
                                        alt={col.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover/card:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

                                    <div className="absolute inset-y-0 left-5 md:left-14 flex flex-col justify-center max-w-[78%] md:max-w-[70%] text-white">
                                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 md:px-4 py-0.5 md:py-1 self-start mb-2.5 md:mb-4">
                                            <span className="text-[9px] md:text-[12px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                                                {col.label}
                                            </span>
                                        </div>
                                        <h3 className="text-[26px] sm:text-[34px] md:text-7xl font-serif font-medium tracking-tight leading-none mb-2.5 md:mb-4 drop-shadow-lg">
                                            {col.title}
                                        </h3>
                                        <div className="h-0.5 w-12 md:w-16 bg-[#D4AF37] mb-2.5 md:mb-4 opacity-0 group-hover/card:opacity-100 transition-all duration-500 group-hover/card:w-20 md:group-hover/card:w-24" />
                                        <p className="text-[11px] sm:text-xs md:text-base font-medium tracking-wide opacity-90 leading-relaxed font-body italic max-w-[260px] md:max-w-sm">
                                            {col.description}
                                        </p>
                                    </div>
                                </motion.div>

                                <div className="absolute -bottom-6 md:-bottom-10 left-6 md:left-16 flex gap-2.5 md:gap-5 z-20">
                                    {(col.extraImages || []).slice(0, 3).map((img, i) => (
                                        <motion.div
                                            key={`${col.id}-${i}`}
                                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.5 + (i * 0.1) }}
                                            className="w-14 h-14 sm:w-16 sm:h-16 md:w-32 md:h-32 bg-white rounded-[16px] sm:rounded-[18px] md:rounded-[32px] shadow-[0_15px_30px_rgba(0,0,0,0.12)] border-2 md:border-4 border-white overflow-hidden flex items-center justify-center md:hover:-translate-y-4 transition-all duration-500 cursor-pointer group/thumb"
                                        >
                                            <img src={img} alt="item" className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110" />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Carousel Dots */}
                    {collections.length > 1 && (
                        <div className="flex justify-center items-center gap-2 pb-6 mt-6 md:mt-2">
                            {collections.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => scrollToDot(idx)}
                                    className={`transition-all duration-300 rounded-full ${
                                        activeIndex === idx 
                                        ? "w-6 h-1.5 bg-[#D4AF37]" 
                                        : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                                    }`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>
                {`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                `}
            </style>
        </section>
    );
};

export default GoldExploreCollections;
