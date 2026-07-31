import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

import goldRingsGreen from '@assets/categories/gold_rings_green.png';
import goldEarringsGreen from '@assets/categories/gold_earrings_green.png';
import goldPendantsGreen from '@assets/categories/gold_pendants_green.png';
import goldBraceletsGreen from '@assets/categories/gold_bracelets_green.png';
import goldNosepinsGreen from '@assets/categories/gold_nosepins_green.png';
import goldMangalsutraGreen from '@assets/categories/gold_mangalsutra_green.png';
import goldBanglesGreen from '@assets/categories/gold_bangles_green.png';
import goldSetsGreen from '@assets/categories/gold_sets_green.png';
import goldNewArrivalsGreen from '@assets/categories/gold_new_arrivals_green.png';

const GOLD_CATEGORIES = [
    { id: 1, name: 'Gold Rings', image: goldRingsGreen, path: '/shop?metal=gold&category=rings', badge: '' },
    { id: 2, name: 'Gold Earrings', image: goldEarringsGreen, path: '/shop?metal=gold&category=earrings', badge: '' },
    { id: 3, name: 'Gold Pendants', image: goldPendantsGreen, path: '/shop?metal=gold&category=necklaces', badge: '' },
    { id: 4, name: 'Gold Bracelets', image: goldBraceletsGreen, path: '/shop?metal=gold&category=bracelets', badge: '' },
    { id: 5, name: 'Gold Nose Pins', image: goldNosepinsGreen, path: '/shop?metal=gold&category=nose-pins', badge: '' },
    { id: 6, name: 'Gold Mangalsutra', image: goldMangalsutraGreen, path: '/shop?metal=gold&category=mangalsutras', badge: '' },
    { id: 7, name: 'Gold Bangles', image: goldBanglesGreen, path: '/shop?metal=gold&category=bangles', badge: '' },
    { id: 8, name: 'Gold Sets', image: goldSetsGreen, path: '/shop?metal=gold&category=sets', badge: '' },
    { id: 9, name: 'New Arrivals', image: goldNewArrivalsGreen, path: '/shop?metal=gold&filter=new', badge: 'New' },
];

const GoldCategoryGrid = ({ sectionData = null }) => {
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const sectionTitle = String(sectionData?.settings?.title || sectionData?.label || 'Shop by Category').trim() || 'Shop by Category';

    const ensureGoldCategoryPath = (rawPath = '', categoryId = '') => {
        const source = String(rawPath || '').trim();
        const normalizedCategoryId = String(categoryId || '').trim();

        if (!source) {
            return normalizedCategoryId
                ? `/shop?metal=gold&category=${encodeURIComponent(normalizedCategoryId)}`
                : '/shop?metal=gold';
        }

        if (!source.startsWith('/shop')) {
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

    const categories = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        if (configuredItems.length === 0) return GOLD_CATEGORIES;

        return configuredItems.map((item, index) => ({
            id: item?.itemId || item?.id || `gold-category-${index + 1}`,
            name: item?.name || item?.label || `Category ${index + 1}`,
            image: resolveLegacyCmsAsset(item?.image, GOLD_CATEGORIES[index % GOLD_CATEGORIES.length]?.image || ''),
            path: ensureGoldCategoryPath(item?.path, item?.categoryId),
            badge: item?.tag || ''
        }));
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
            const index = Math.round(percentage * (categories.length - 1));
            setActiveIndex(Math.min(index, categories.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (categories.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    return (
        <div className="w-full bg-white py-4 md:py-10 relative group">
            <div className="max-w-[1450px] mx-auto px-4 relative">
                <div className="flex items-center justify-center gap-2.5 md:gap-4 mb-3 md:mb-8">
                    <span className="text-[#C9A84C] text-xl">*</span>
                    <div className="flex items-center gap-3">
                        <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]" />
                        <h2 className="text-[18px] md:text-[26px] font-semibold text-gray-900 tracking-tight">
                            {sectionTitle}
                        </h2>
                        <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]" />
                    </div>
                    <span className="text-[#C9A84C] text-xl">*</span>
                </div>

                {/* Overscroll Wrapper to prevent cropping elements on viewport edges */}
                <div className="-mx-4 overflow-hidden">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto scrollbar-hide gap-3 md:gap-5 pb-2 md:pb-4 px-4 md:px-12 snap-x snap-mandatory scroll-smooth"
                    >
                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                to={cat.path}
                                className="flex flex-col items-center group/item cursor-pointer shrink-0 snap-start"
                            >
                                <div className="relative w-[98px] h-[112px] md:w-[175px] md:h-[195px] mb-2 md:mb-3 overflow-hidden rounded-[12px] md:rounded-[14px] border border-[#e8d5a3] group-hover/item:border-[#C9A84C] transition-all duration-300 shadow-sm">
                                    <img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-700"
                                    />
                                    {cat.badge ? (
                                        <div className="absolute top-2 right-2 bg-[#C9A84C] text-white text-[7px] md:text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase font-bold tracking-wider z-10">
                                            <span className="text-[10px]">*</span>
                                            {cat.badge}
                                        </div>
                                    ) : null}

                                    {/* Premium Sliding Button Overlay */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#C9A84C] to-[#D4B56A] py-3 md:py-4 transform translate-y-full group-hover/item:translate-y-0 transition-transform duration-500 ease-in-out flex items-center justify-center shadow-[0_-4px_15px_rgba(0,0,0,0.1)]">
                                        <span className="text-[9px] md:text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-1.5">
                                            Shop Now <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[12px] md:text-[16px] font-bold text-gray-800 group-hover/item:text-[#A8862A] transition-colors text-center tracking-tight leading-tight">
                                    {cat.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Carousel Dots */}
                {categories.length > 1 && (
                    <div className="flex justify-center items-center gap-2 pb-6 mt-4 md:mt-2">
                        {categories.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => scrollToDot(idx)}
                                className={`transition-all duration-300 rounded-full ${
                                    activeIndex === idx 
                                    ? "w-6 h-1.5 bg-[#C9A84C]" 
                                    : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                                }`}
                                aria-label={`Go to item ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoldCategoryGrid;
