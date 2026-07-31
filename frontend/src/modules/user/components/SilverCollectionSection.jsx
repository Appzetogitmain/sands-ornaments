import React, { useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

// Import thematic assets
import bannerImg from '@assets/banner_elegant_silver.png';
import themeInfinity from '@assets/theme_infinity.png';
import themeKnots from '@assets/theme_knots.png';
import themeDrops from '@assets/theme_drops.png';
import themeLeaves from '@assets/theme_leaves.png';
import themeBubbles from '@assets/theme_bubbles.png';
import themeMoon from '@assets/theme_moon.png';

const SILVER_STYLE_CATEGORIES = [
    {
        id: 1,
        name: 'Infinity',
        image: themeInfinity,
        path: '/shop?search=Infinity&metal=silver',
        badgeIcon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M18.18 17.77C17.71 19.12 16.03 20 14.18 20c-1.85 0-3.53-.88-4-2.23L10 17.5c-.17-.18-.32-.38-.45-.6-.13-.22-.24-.45-.33-.7L9 15.5c-1.12-2.12-2.88-3.5-5-3.5-1.1 0-2 .9-2 2s.9 2 2 2c.55 0 1 .45 1 1s-.45 1-1 1c-2.21 0-4-1.79-4-4s1.79-4 4-4c3.08 0 5.62 1.94 6.67 4.5.31.75.76 1.41 1.33 1.93.57.52 1.25.91 2 1.13.75.22 1.5.34 2.25.34 3.31 0 6-2.69 6-6s-2.69-6-6-6c-.75 0-1.5.12-2.25.34-.75.22-1.43.61-2 1.13-.57.52-1.02 1.18-1.33 1.93-.31.75-.85 1.5-1.5 2.13-.65.63-1.45 1.25-2.5 1.87L9.42 16.5C8.97 17.85 7.29 18.73 5.34 18.73c-.55 0-1-.45-1-1s.45-1 1-1c1.1 0 2-.9 2-2s-.9-2-2-2c-2.21 0-4-1.79-4-4s1.79-4 4-4c3.08 0 5.62 1.94 6.67 4.5.31.75.76 1.41 1.33 1.93.57.52 1.25.91 2 1.13.75.22 1.5.34 2.25.34 3.31 0 6-2.69 6-6s-2.69-6-6-6c-.75 0-1.5.12-2.25.34-.75.22-1.43.61-2 1.13-.57.52-1.02 1.18-1.33 1.93" />
            </svg>
        )
    },
    {
        id: 2,
        name: 'Knots',
        image: themeKnots,
        path: '/shop?search=Knot&metal=silver',
        badgeIcon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M10.23,1.75c-0.59-0.59-1.54-0.59-2.12,0L1.75,8.11c-0.59,0.59-0.59,1.54,0,2.12l6.36,6.36 c0.59,0.59,1.54,0.59,2.12,0l6.36-6.36c0.59-0.59,0.59-1.54,0-2.12L10.23,1.75z M13.41,9.17L9.17,13.41L4.93,9.17l4.24-4.24 L13.41,9.17z" />
                <path d="M15.77,5.39c-0.59-0.59-1.54-0.59-2.12,0l-1.06,1.06l2.12,2.12l1.06-1.06C16.35,6.93,16.35,5.97,15.77,5.39z" />
                <path d="M8.23,18.61c0.59,0.59,1.54,0.59,2.12,0l1.06-1.06l-2.12-2.12-1.06,1.06C7.65,17.07,7.65,18.03,8.23,18.61z" />
            </svg>
        )
    },
    {
        id: 3,
        name: 'Water Drops',
        image: themeDrops,
        path: '/shop?search=Drop&metal=silver',
        badgeIcon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M12,2.5C12,2.5,4,10.6,4,16c0,4.4,3.6,8,8,8s8-3.6,8-8C20,10.6,12,2.5,12,2.5z M12,21c-2.8,0-5-2.2-5-5c0-2,1.5-4.8,5-8.5 c3.5,3.7,5,6.5,5,8.5C17,18.8,14.8,21,12,21z" />
            </svg>
        )
    },
    {
        id: 4,
        name: 'Leaves',
        image: themeLeaves,
        path: '/shop?search=Leaf&metal=silver',
        badgeIcon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M17,8l-1.4,1.4C14.1,8.1,12.3,7,10,7C6.1,7,3,10.1,3,14c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7c0-2.3-1.1-4.1-2.4-5.6L16,7 L17,8z M10,19c-2.8,0-5-2.2-5-5c0-2.8,2.2-5,5-5c2.8,0,5,2.2,5,5C15,16.8,12.8,19,10,19z" />
                <path d="M21,3c-2.2,0-4,1.8-4,4c0,0.7,0.2,1.4,0.5,2l-2,2c-0.3-0.1-0.7-0.1-1-0.1c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4c2.2,0,4-1.8,4-4 c0-0.3,0-0.7-0.1-1l2-2c0.6,0.3,1.3,0.5,2,0.5c2.2,0,4-1.8,4-4C25,4.8,23.2,3,21,3z M14.5,14.9c-1,0-1.9-0.8-1.9-1.9 c0-1,0.8-1.9,1.9-1.9s1.9,0.8,1.9,1.9C16.4,14.1,15.5,14.9,14.5,14.9z" />
            </svg>
        )
    },
    {
        id: 5,
        name: 'Bubbles',
        image: themeBubbles,
        path: '/shop?search=Bubble&metal=silver',
        badgeIcon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <circle cx="16" cy="8" r="4" />
                <circle cx="9" cy="18" r="3" />
                <circle cx="8" cy="7" r="2" />
            </svg>
        )
    },
    {
        id: 6,
        name: 'Moon & Stars',
        image: themeMoon,
        path: '/shop?search=Moon&metal=silver',
        badgeIcon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M12.1,3c-0.1,0-0.2,0-0.3,0c4.5,1.1,7.8,5.2,7.8,10c0,5.7-4.6,10.3-10.3,10.3c-1.2,0-2.4-0.2-3.4-0.6 c1.6,1.4,3.7,2.3,6,2.3c5,0,9-4,9-9C21.1,9.8,17.4,4.9,12.1,3z" />
                <path d="M19,3l0.3,1l1,0.3l-1,0.3l-0.3,1L18.7,4.7l-1-0.3l1-0.3L19,3z" />
            </svg>
        )
    }
];

const SilverCollectionSection = () => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['silver-collection'];

    const bannerData = {
        image: resolveLegacyCmsAsset(sectionData?.settings?.bannerImage, bannerImg),
        title: sectionData?.settings?.title || 'All yours',
        subtitle: sectionData?.settings?.subtitle || 'Collection',
        footerText: sectionData?.settings?.footerText || 'Emotion, made real'
    };

    const items = useMemo(() => {
        const configured = Array.isArray(sectionData?.items) ? sectionData.items : [];
        if (configured.length > 0) {
            return configured.map(item => {
                const defaultMatch = SILVER_STYLE_CATEGORIES.find(d => d.name === item.name || d.id === item.itemId);
                return {
                    id: item.itemId || item.id,
                    name: item.name || item.label || defaultMatch?.name,
                    image: resolveLegacyCmsAsset(item.image, defaultMatch?.image),
                    path: item.path || defaultMatch?.path || '/shop',
                    badgeIcon: defaultMatch?.badgeIcon
                };
            });
        }
        return SILVER_STYLE_CATEGORIES;
    }, [sectionData?.items]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll <= 0) {
                setActiveIndex(0);
                return;
            }
            const percentage = scrollLeft / maxScroll;
            const index = Math.round(percentage * (items.length - 1));
            setActiveIndex(Math.min(index, items.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (items.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    return (
        <section className="w-full bg-[#FFF5F7] pt-6 pb-12 md:pt-12 md:pb-20 overflow-hidden font-sans">
            <div className="max-w-[1450px] mx-auto px-4">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative w-full h-[170px] md:h-[320px] rounded-[32px] md:rounded-[40px] overflow-hidden mb-6 md:mb-12 shadow-2xl group border border-white/20 cursor-pointer"
                    onClick={() => navigate('/shop')}
                >
                    <div className="flex h-full w-full">
                        <div className="relative w-[50%] md:w-[60%] h-full overflow-hidden">
                            <img
                                src={bannerData.image}
                                alt="Silver Collection Banner"
                                className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-105"
                            />
                            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#EC7798] to-transparent pointer-events-none" />
                        </div>

                        <div className="w-[50%] md:w-[40%] h-full flex flex-col items-center justify-center p-4 md:p-12 relative"
                            style={{ background: 'linear-gradient(135deg, #EC7798 0%, #FA89A9 100%)' }}>
                            <div className="text-center relative z-10">
                                <span className="font-serif italic text-white text-2xl md:text-5xl block mb-2 drop-shadow-md">
                                    {bannerData.title}
                                </span>
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <div className="h-[1.5px] w-8 md:w-16 bg-white/60" />
                                    <h2 className="text-white font-bold text-xs md:text-2xl uppercase tracking-[0.3em] whitespace-nowrap">
                                        {bannerData.subtitle}
                                    </h2>
                                    <div className="h-[1.5px] w-8 md:w-16 bg-white/60" />
                                </div>
                                <p className="text-white/95 font-black text-[11px] md:text-2xl tracking-wide uppercase mt-4">
                                    {bannerData.footerText}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="relative group/scroll px-2">

                    
                    

                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-4 md:gap-12 pb-6 md:pb-10 px-4 snap-x snap-mandatory scroll-smooth"
                    >
                        {items.map((cat, idx) => (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.08 }}
                                className="flex flex-col items-center group/item cursor-pointer shrink-0 snap-center"
                                onClick={() => navigate(cat.path)}
                            >
                                <div className="relative w-[105px] h-[105px] sm:w-[130px] sm:h-[130px] md:w-[185px] md:h-[185px] mb-4 overflow-hidden rounded-[32px] sm:rounded-[40px] md:rounded-[55px] shadow-[0_15px_35px_rgba(180,30,80,0.18)] border-2 border-white transition-all duration-500 group-hover/item:-translate-y-3 group-hover/item:shadow-[0_25px_50px_rgba(180,30,80,0.25)]">
                                    <img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110"
                                    />
                                    {cat.badgeIcon && (
                                        <div className="absolute top-1.5 right-1.5 md:top-3 md:right-3 w-6.5 h-6.5 md:w-11 md:h-11 bg-[#FADADD]/85 backdrop-blur-sm rounded-full flex items-center justify-center text-[#B44C63] shadow-inner z-10 border border-white/40">
                                            {cat.badgeIcon}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
                                </div>

                                <span className="text-[12px] sm:text-[15px] md:text-[19px] font-bold text-gray-800 tracking-tight group-hover/item:text-[#EC7798] transition-colors text-center w-full max-w-[105px] truncate">
                                    {cat.name}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Carousel Dots */}
                    {items.length > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-[-10px]">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => scrollToDot(idx)}
                                    className={`transition-all duration-300 rounded-full ${
                                        activeIndex === idx 
                                        ? 'w-6 h-1.5 bg-[#EC7798]' 
                                        : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                                    }`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </section>
    );
};

export default SilverCollectionSection;

