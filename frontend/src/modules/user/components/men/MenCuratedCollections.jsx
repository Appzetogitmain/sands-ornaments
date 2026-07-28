import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildMenShopPath } from '../../utils/menNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

// Import existing assets from global and local folders
import men1 from '@assets/luxury_ring_men.png';
import men2 from '@assets/luxury_pendant_men.png';
import men3 from '@assets/luxury_gifts_men.png';
import men4 from '@assets/men/style_bracelets.png';

const collections = [
    { id: 1, title: "SHOP SILVER FOR HIM", image: men1, link: buildMenShopPath({ metal: 'silver' }), type: 'image' },
    { id: 2, title: "ASTRA COLLECTION", image: men2, link: buildMenShopPath({ search: 'astra' }), type: 'image' },
    { id: 3, title: "SHOP GIFTS FOR HIM", image: men3, link: buildMenShopPath(), type: 'image' },
    { id: 4, title: "THE CLASSICS FOR HIM", image: men1, link: buildMenShopPath({ sort: 'most-sold' }), type: 'image' }, 
    { id: 5, title: "PENDANTS FOR HIM", image: men2, link: buildMenShopPath({ category: 'pendants' }), type: 'image' },
    { id: 6, title: "925 SILVER SHOP", image: men4, link: buildMenShopPath({ metal: 'silver', silverType: '925 sterling silver' }), type: 'image' }
];

const MenCuratedCollections = ({ sectionData }) => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const resolvedSettings = useMemo(() => ({
        badge: sectionData?.settings?.badge || 'More Gifts for Him',
        title: sectionData?.settings?.title || 'Curated Collections',
        subtitle: sectionData?.settings?.subtitle || 'Clean, easy-to-browse picks for gifting and everyday style.'
    }), [sectionData]);

    const resolvedCollections = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const normalizedConfigured = configuredItems
            .filter((item) => item?.image)
            .map((item, index) => {
                const fallbackCollection = collections[index];
                return {
                    id: item.itemId || item.id || `men-curated-${index}`,
                    title: item.name || item.label || fallbackCollection?.title || '',
                    image: resolveLegacyCmsAsset(item.image, fallbackCollection?.image || ''),
                    link: item.categoryId
                        ? buildMenShopPath({ category: item.categoryId })
                        : (item.path || fallbackCollection?.link || buildMenShopPath()),
                    type: 'image'
                };
            })
            .filter((item) => item.title && item.image && item.link);

        return normalizedConfigured.length > 0 ? normalizedConfigured : collections;
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
        <section className="py-2 md:py-8 bg-white select-none overflow-hidden">
            <div className="w-full">
                
                {/* Header */}
                <div className="text-center mb-3 md:mb-7 px-4">
                    <span className="inline-flex items-center rounded-full border border-black/10 bg-[#F8F3F4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/60">
                        {resolvedSettings.badge}
                    </span>
                    <h2 className="mt-2 text-xl md:text-3xl font-medium text-black tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                        {resolvedSettings.title}
                    </h2>
                    <p className="mt-1.5 text-[12px] md:text-base text-black/55 max-w-2xl mx-auto">
                        {resolvedSettings.subtitle}
                    </p>
                </div>

                {/* Horizontal Scroll Area with Arrows */}
                <div className="relative group/main">
                    
                    {/* Left Scroll Arrow */}
                    

                    {/* Right Scroll Arrow */}
                    

                    <div 
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto gap-2 md:gap-4 pb-3 md:pb-10 hide-scrollbar scroll-smooth snap-x snap-mandatory px-4"
                    >
                        {resolvedCollections.map((item, idx) => (
                            <motion.div 
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                                onClick={() => navigate(item.link)}
                                className="flex-shrink-0 w-[132px] md:w-[280px] lg:w-[320px] aspect-square relative group cursor-pointer overflow-hidden rounded-none bg-[#F5F5F5] snap-start shadow-[0_10px_25px_rgba(0,0,0,0.08)] md:shadow-[0_15px_35px_rgba(0,0,0,0.12)]"
                            >
                                <img 
                                    src={item.image} 
                                    alt={item.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                                
                                {/* Bottom Gradient - Fixed and subtle */}
                                <div className="absolute inset-x-0 bottom-0 h-[54px] md:h-[80px] bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                {/* Label at Bottom Center/Left as per screenshot */}
                                <div className="absolute bottom-2.5 md:bottom-6 left-2 md:left-4 right-2 md:right-4 text-white z-10">
                                    <div className="flex items-center gap-1 md:gap-1.5 translate-y-0 group-hover:translate-x-1 transition-transform duration-300">
                                        <span className="text-[7.5px] md:text-[13px] font-bold tracking-[0.08em] md:tracking-[0.1em] uppercase whitespace-nowrap drop-shadow-md">
                                            {item.title}
                                        </span>
                                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white/90" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Carousel Dots */}
                    {resolvedCollections.length > 1 && (
                        <div className="flex justify-center items-center gap-2 pb-6 mt-2 md:mt-[-10px]">
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

export default MenCuratedCollections;

