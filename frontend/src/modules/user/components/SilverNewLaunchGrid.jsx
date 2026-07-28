import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

import ringsImg from '@assets/categories/rings.png';
import braceletsImg from '@assets/categories/bracelets.png';
import personalisedImg from '@assets/categories/personalised.png';
import pendantsImg from '@assets/categories/pendants.png';
import earringsImg from '@assets/categories/earrings.png';
import mensilverImg from '@assets/categories/mensilver.png';
import setsImg from '@assets/categories/sets.png';
import ankletsImg from '@assets/categories/anklets.png';

const LAUNCH_CATEGORIES = [
    { id: 1, name: 'Rings', image: ringsImg, path: '/category/rings', tag: 'New' },
    { id: 2, name: 'Bracelets', image: braceletsImg, path: '/category/bracelets', tag: 'New' },
    { id: 3, name: 'Personalised', image: personalisedImg, path: '/category/personalised', tag: 'New' },
    { id: 4, name: 'Earrings', image: earringsImg, path: '/category/earrings', tag: 'New' },
    { id: 5, name: 'Pendants', image: pendantsImg, path: '/category/necklaces', tag: 'New' },
    { id: 6, name: 'Mens', image: mensilverImg, path: '/category/men', tag: 'New' },
    { id: 7, name: 'Perfumes', image: setsImg, path: '/category/perfumes', tag: 'New' },
    { id: 8, name: 'Sets', image: setsImg, path: '/category/sets', tag: 'New' },
    { id: 9, name: 'Anklets', image: ankletsImg, path: '/category/anklets', tag: 'New' }
];

const SilverNewLaunchGrid = () => {
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['silver-new-launch-grid'];
    const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];

    const cards = useMemo(() => {
        const normalizedConfigured = configuredItems
            .filter((item) => Boolean(item?.image && (item?.name || item?.label)))
            .map((item, index) => ({
                id: item.itemId || item.id || `silver-launch-${index + 1}`,
                name: item.name || item.label,
                image: resolveLegacyCmsAsset(item.image, item.image),
                path: item.path || '/shop',
                tag: item.tag || 'New'
            }));

        return normalizedConfigured.length > 0 ? normalizedConfigured : LAUNCH_CATEGORIES;
    }, [configuredItems]);

    const ribbonLabel = sectionData?.settings?.ribbonLabel || 'NEW LAUNCH';
    const offerText = sectionData?.settings?.offerText || 'Upto 15% Off';
    const ctaLabel = sectionData?.settings?.ctaLabel || 'Explore';

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll <= 0) {
                setActiveIndex(0);
                return;
            }
            const percentage = scrollLeft / maxScroll;
            const index = Math.round(percentage * (cards.length - 1));
            setActiveIndex(Math.min(index, cards.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (cards.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    return (
        <section className="w-full bg-[#D1C7CB] mt-1 md:mt-2 py-3 md:py-4 overflow-hidden font-sans">
            <div className="container mx-auto px-4 max-w-[1450px]">
                <div className="flex flex-row items-center justify-center mb-5 gap-4 md:gap-6">
                    <div className="shrink-0">
                        <div
                            className="bg-[#5C1B33] text-white px-7 md:px-10 py-2.5 md:py-3 font-bold text-base md:text-xl tracking-normal uppercase relative z-10"
                            style={{
                                clipPath: 'polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            {ribbonLabel}
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-1">
                        <h2 className="text-[#333] text-xs md:text-lg font-medium tracking-tight whitespace-nowrap">
                            {offerText}
                        </h2>

                        <Link
                            to="/new-arrivals"
                            className="flex items-center gap-2 bg-[#8C5D62] text-white px-3 md:px-4 py-1 rounded-full font-bold text-[9px] md:text-[11px] hover:bg-[#5C1B33] transition-all shadow-sm group"
                        >
                            <span className="opacity-90">{ctaLabel}</span>
                            <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-white/30 flex items-center justify-center text-white group-hover:translate-x-0.5 transition-transform">
                                <ChevronRight className="w-2 md:w-2.5 h-2 md:h-2.5" />
                            </div>
                        </Link>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto scrollbar-hide gap-2.5 md:gap-4 pb-4 px-4 snap-x snap-mandatory scroll-smooth"
                >
                    {cards.map((cat) => (
                        <Link
                            key={cat.id}
                            to={cat.path}
                            className="flex flex-col items-center group/item cursor-pointer shrink-0 snap-center"
                        >
                            <div className="relative w-[110px] h-[110px] md:w-[155px] md:h-[155px] mb-3 overflow-hidden rounded-xl shadow-md border border-gray-100">
                                <img
                                    src={cat.image}
                                    alt={cat.name}
                                    className="w-full h-full object-cover brightness-95"
                                />

                                <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />

                                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                                    <div className="bg-[#8C5D62] px-4 md:px-5 py-1 rounded-b-lg flex items-center justify-center gap-1 shadow-sm">
                                        <span className="text-white text-[9px] md:text-[10px] font-bold leading-none tracking-wider uppercase">{cat.tag || 'New'}</span>
                                    </div>
                                </div>
                            </div>

                            <span className="text-[13px] md:text-[15px] font-bold text-[#333] tracking-tight group-hover/item:text-[#8C5D62] transition-colors">
                                {cat.name}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Carousel Dots */}
                {cards.length > 1 && (
                    <div className="flex justify-center items-center gap-2 pb-4 mt-2">
                        {cards.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => scrollToDot(idx)}
                                className={`transition-all duration-300 rounded-full ${
                                    activeIndex === idx 
                                    ? 'w-6 h-1.5 bg-[#5C1B33]' 
                                    : 'w-1.5 h-1.5 bg-gray-400/50 hover:bg-gray-500'
                                }`}
                                aria-label={`Go to item ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SilverNewLaunchGrid;

