import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildMenShopPath } from '../../utils/menNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

// Asset imports
import edgeBanner from '@assets/explore/edge_banner.png';
import classicsBanner from '@assets/explore/classics_banner.png';
import iykykBanner from '@assets/explore/iykyk_banner.png';
import thumbRing from '@assets/explore/thumb_ring.png';
import thumbChain from '@assets/explore/thumb_chain.png';
import thumbPendant from '@assets/explore/thumb_pendant.png';

const exploreCollections = [
    {
        id: 1,
        title: "EDGE",
        description: "Sleek, silver, and made to turn heads",
        image: edgeBanner,
        link: buildMenShopPath({ search: 'edge' }),
        items: [thumbRing, thumbChain, thumbRing]
    },
    {
        id: 2,
        title: "THE CLASSICS",
        description: "Because classics never go out of style",
        image: classicsBanner,
        link: buildMenShopPath({ search: 'classic' }),
        items: [thumbPendant, thumbChain, thumbChain]
    },
    {
        id: 3,
        title: "IYKYK",
        description: "Street style that speaks for itself",
        image: iykykBanner,
        link: buildMenShopPath({ search: 'street' }),
        items: [thumbPendant, thumbRing, thumbChain]
    }
];

const MenExploreCollections = ({ sectionData }) => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const resolvedTitle = sectionData?.settings?.title || 'Explore Collections';
    const resolvedCollections = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const normalizedConfigured = configuredItems
            .filter((item) => item?.image)
            .map((item, index) => {
                const fallbackItem = exploreCollections[index];
                const baseId = item.itemId || item.id || `men-explore-${index}`;
                
                // Force correct paths for predefined components, ignoring old CMS data
                const forcedPaths = {
                    'men-explore-edge': buildMenShopPath({ search: 'edge' }),
                    'men-explore-the-classics': buildMenShopPath({ search: 'classic' }),
                    'men-explore-iykyk': buildMenShopPath({ search: 'street' })
                };

                return {
                    id: baseId,
                    title: item.name || item.label || fallbackItem?.title || '',
                    description: item.subtitle || item.description || fallbackItem?.description || '',
                    image: resolveLegacyCmsAsset(item.image, fallbackItem?.image || ''),
                    link: forcedPaths[baseId] || (item.categoryId
                        ? buildMenShopPath({ category: item.categoryId })
                        : (item.path || fallbackItem?.link || buildMenShopPath())),
                    items: (() => {
                        const configuredThumbs = Array.isArray(item.extraImages) ? item.extraImages : [];
                        if (configuredThumbs.length > 0) {
                            return configuredThumbs.map((thumb, thumbIndex) => (
                                resolveLegacyCmsAsset(thumb, fallbackItem?.items?.[thumbIndex] || '')
                            )).filter(Boolean);
                        }
                        return fallbackItem?.items || [];
                    })()
                };
            })
            .filter((item) => item.title && item.image && item.link);

        return normalizedConfigured.length > 0 ? normalizedConfigured : exploreCollections;
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
            const index = Math.round(percentage * (resolvedCollections.length - 1));
            setActiveIndex(Math.min(index, resolvedCollections.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (resolvedCollections.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    return (
        <section className="py-2 md:py-10 bg-[#FDF6F2] select-none overflow-hidden">
            <div className="container mx-auto px-0 md:px-4 max-w-[1550px]">

                {/* Header */}
                <div className="text-center mb-4 md:mb-6">
                    <h2 className="text-xl md:text-[28px] font-bold text-gray-900 tracking-tight uppercase" style={{ fontFamily: "'Lato', sans-serif" }}>
                        {resolvedTitle}
                    </h2>
                </div>

                {/* Professional Dual-Banner Carousel */}
                <div className="relative group/main">

                    {/* Navigation Arrows */}
                    
                    

                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto gap-4 md:gap-10 pb-10 md:pb-16 hide-scrollbar scroll-smooth snap-x snap-mandatory px-[7.5vw] md:px-12"
                    >
                        {resolvedCollections.map((col) => (
                            <div key={col.id} className="flex-shrink-0 w-[85vw] md:w-[650px] lg:w-[700px] snap-center relative">
                                {/* Main Banner Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.8 }}
                                    onClick={() => navigate(col.link)}
                                    className="relative h-[200px] sm:h-[230px] md:h-[350px] rounded-[26px] md:rounded-[32px] overflow-hidden cursor-pointer shadow-2xl group/card border border-white/10"
                                >
                                    <img
                                        src={col.image}
                                        alt={col.title}
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-12 flex flex-col justify-end text-white">
                                        <h3
                                            className="text-3xl md:text-7xl font-bold italic tracking-tighter mb-1"
                                            style={{ fontFamily: "'Cinzel', serif" }}
                                        >
                                            {col.title}
                                        </h3>
                                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-80 mb-4 md:mb-6">
                                            {col.description}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Item Thumbnails */}
                                <div className="absolute -bottom-5 md:-bottom-8 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0 flex gap-2 md:gap-3 z-30">
                                    {col.items.map((img, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 15 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.4, delay: 0.5 + (i * 0.1) }}
                                            className="w-12 h-12 md:w-24 md:h-24 bg-white/95 backdrop-blur-sm rounded-[14px] md:rounded-[24px] shadow-xl border border-white/50 p-1.5 md:p-3 overflow-hidden flex items-center justify-center hover:-translate-y-2 transition-transform duration-300"
                                        >
                                            <img src={img} alt="item" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Carousel Dots */}
                    {resolvedCollections.length > 1 && (
                        <div className="flex justify-center items-center gap-2 pb-6 mt-4 md:mt-0">
                            {resolvedCollections.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => scrollToDot(idx)}
                                    className={`transition-all duration-300 rounded-full ${
                                        activeIndex === idx 
                                        ? "w-6 h-1.5 bg-black" 
                                        : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                                    }`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default MenExploreCollections;
