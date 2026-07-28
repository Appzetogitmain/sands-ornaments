import React from 'react';
import { Link } from 'react-router-dom';
import { useHomepageCms } from '../hooks/useHomepageCms';
import haldiImgDefault from '@assets/home_occasions/home_haldi.png';
import sangeetImgDefault from '@assets/home_occasions/home_sangeet.png';
import receptionImgDefault from '@assets/home_occasions/home_reception.png';
import bridalImgDefault from '@assets/home_occasions/home_gift_for_bride.png';
import bridesmaidImgDefault from '@assets/home_occasions/home_gift_for_bridesmaid.png';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';
import { ensureSilverHomePath } from '../utils/silverHomePaths';

const OccasionalSpecial = () => {
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['curated-for-you'];

    // Default categories if none managed
    const defaultCategories = [
        // Legacy "?occasion=" filtering has been retired. Fall back to safe search-based links.
        { id: 'haldi', name: 'Haldi', image: haldiImgDefault, path: '/shop?search=haldi' },
        { id: 'sangeet', name: 'Sangeet', image: sangeetImgDefault, path: '/shop?search=sangeet' },
        { id: 'reception', name: 'Reception', image: receptionImgDefault, path: '/shop?search=reception' },
        { id: 'bridal', name: 'Gift for Bride', image: bridalImgDefault, path: '/shop?search=bride' },
        { id: 'bridesmaids', name: 'Gift for Bridesmaid', image: bridesmaidImgDefault, path: '/shop?search=bridesmaid' },
    ];

    const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];

    const buildPath = (item, fallback) => {
        if (!item) return fallback?.path || '/shop';
        if (typeof item.path === 'string' && item.path.trim()) return ensureSilverHomePath(item.path);
        const productIds = Array.isArray(item.productIds) ? item.productIds : [];
        const limit = item.limit ? Number(item.limit) : 12;
        if (productIds.length > 0) {
            return ensureSilverHomePath(`/shop?products=${encodeURIComponent(productIds.join(','))}&limit=${limit}&sort=random`);
        }
        return ensureSilverHomePath(fallback?.path || `/shop?limit=${limit}&sort=random`);
    };

    const normalizedConfiguredItems = configuredItems.map((item, index) => {
        const fallback = defaultCategories[index] || defaultCategories[0];
        return {
            ...item,
            id: item.itemId || item._id || item.id || `curated-${index}`,
            name: item?.name || item?.label || fallback.name,
            image: resolveLegacyCmsAsset(item?.image, fallback.image),
            path: buildPath(item, fallback),
            limit: item.limit ? Number(item.limit) : 12,
            productIds: Array.isArray(item.productIds) ? item.productIds.filter(Boolean) : []
        };
    });

    const displayItems = normalizedConfiguredItems.length > 0 ? normalizedConfiguredItems : defaultCategories;

    // Helper to get item safe
    const getItem = (index) => {
        const item = displayItems[index];
        if (!item) return null;
        return {
            name: item?.name || item?.label || 'Curated Pick',
            image: resolveLegacyCmsAsset(item?.image, defaultCategories[0].image),
            path: buildPath(item, defaultCategories[0])
        };
    };

    // Extract first 5 for the main layout
    const heroItems = displayItems.slice(0, 5).map((_, index) => getItem(index)).filter(Boolean);
    const [item1, item2, item3, item4, item5] = heroItems;

    return (
        <section className="pt-2 pb-6 md:pt-4 md:pb-8 bg-white">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-5 md:mb-6">
                    <h2 className="font-display text-2xl md:text-4xl text-[#2F0A0F] mb-1 md:mb-3">
                        {sectionData?.label || "Curated For You"}
                    </h2>
                    <div className="h-1 w-14 md:w-20 bg-[#C9A24D] mx-auto rounded-full mb-3 md:mb-4"></div>
                    <p className="font-serif italic text-gray-600 text-base md:text-lg">Occasional Specials</p>
                </div>

                {/* Mobile View: 2-Column Grid */}
                <div className="grid grid-cols-2 md:hidden gap-3 px-2 mb-8">
                    {displayItems.map((cat, index) => {
                        const label = cat.name || cat.label;
                        const path = buildPath(cat, defaultCategories[index] || defaultCategories[0]);
                        return (
                            <Link
                                key={cat.itemId || cat._id || cat.id || index}
                                to={path}
                                className="relative group overflow-hidden rounded-xl flex-shrink-0 w-full aspect-[4/5] cursor-pointer shadow-sm active:scale-95 transition-transform"
                            >
                                <img src={resolveLegacyCmsAsset(cat.image, (defaultCategories[index] || defaultCategories[0]).image)} alt={label} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/90 via-transparent to-transparent"></div>
                                <span className="absolute bottom-3 left-0 right-0 text-white font-display text-lg tracking-wide text-center px-1">
                                    {label}
                                </span>
                            </Link>
                        )
                    })}
                </div>

                {/* Desktop View: Grid Layout (Existing) */}
                {heroItems.length >= 5 && (
                    <div className="hidden md:grid grid-cols-3 gap-4 auto-rows-[210px]">
                        {/* Column 1 - Stacked */}
                        <div className="flex flex-col gap-4 h-full md:row-span-2">
                            <Link to={item1.path} className="relative group overflow-hidden rounded-2xl flex-1 cursor-pointer shadow-md hover:shadow-xl transition-all duration-300">
                                <img src={item1.image} alt={item1.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/80 via-transparent to-transparent"></div>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-display text-2xl tracking-wide w-full text-center">{item1.name}</span>
                            </Link>
                            <Link to={item2.path} className="relative group overflow-hidden rounded-2xl flex-1 cursor-pointer shadow-md hover:shadow-xl transition-all duration-300">
                                <img src={item2.image} alt={item2.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/80 via-transparent to-transparent"></div>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-display text-2xl tracking-wide w-full text-center">{item2.name}</span>
                            </Link>
                        </div>

                        {/* Column 2 - Tall Centerpiece */}
                        <Link to={item3.path} className="relative group overflow-hidden rounded-2xl md:row-span-2 shadow-lg hover:shadow-2xl transition-all duration-300">
                            <img src={item3.image} alt={item3.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/80 via-transparent to-transparent"></div>
                            <span className="absolute bottom-7 left-1/2 -translate-x-1/2 text-white font-display text-3xl tracking-wide w-full text-center drop-shadow-md">{item3.name}</span>
                        </Link>

                        {/* Column 3 - Stacked */}
                        <div className="flex flex-col gap-4 h-full md:row-span-2">
                            <Link to={item4.path} className="relative group overflow-hidden rounded-2xl flex-[1.3] cursor-pointer shadow-md hover:shadow-xl transition-all duration-300">
                                <img src={item4.image} alt={item4.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/80 via-transparent to-transparent"></div>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-display text-2xl tracking-wide whitespace-nowrap drop-shadow-sm w-full text-center">
                                    {item4.name}
                                </span>
                            </Link>
                            <Link to={item5.path} className="relative group overflow-hidden rounded-2xl flex-[0.7] cursor-pointer shadow-md hover:shadow-xl transition-all duration-300">
                                <img src={item5.image} alt={item5.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/80 via-transparent to-transparent"></div>
                                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-display text-2xl tracking-wide whitespace-nowrap drop-shadow-sm w-full text-center">
                                    {item5.name}
                                </span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Additional Items Grid */}
                {displayItems.length > 5 && (
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {displayItems.slice(5).map((item, index) => {
                            const label = item.name || item.label;
                            const path = buildPath(item, defaultCategories[0]);
                            return (
                                <Link
                                    key={item.itemId || item._id || item.id || index + 5}
                                    to={path}
                                    className="group relative rounded-2xl overflow-hidden aspect-square border border-gray-100 shadow-md"
                                >
                                    <img
                                        src={resolveLegacyCmsAsset(item.image, defaultCategories[0].image)}
                                        alt={label}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#2F0A0F]/80 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-4 left-0 right-0 text-center">
                                        <h4 className="text-white font-display text-lg tracking-wide uppercase">{label}</h4>
                                        <div className="w-8 h-[1px] bg-[#C9A24D] mx-auto mt-1 group-hover:w-16 transition-all duration-500"></div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default OccasionalSpecial;

