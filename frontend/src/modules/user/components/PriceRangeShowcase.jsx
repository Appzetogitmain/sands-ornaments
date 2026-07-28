import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { useHomepageCms } from '../hooks/useHomepageCms';

import price999 from '@assets/price_under_999.png';
import price1999 from '@assets/price_under_1999.png';
import price2999 from '@assets/price_under_2999.png';
import price3999 from '@assets/price_under_3999.png';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

const priceRanges = [
    { id: 'under-999', name: 'Under INR 999', priceMax: 999, image: price999, path: '/shop?price_max=999' },
    { id: 'under-1999', name: 'Under INR 1999', priceMax: 1999, image: price1999, path: '/shop?price_max=1999' },
    { id: 'under-2999', name: 'Under INR 2999', priceMax: 2999, image: price2999, path: '/shop?price_max=2999' },
    { id: 'under-3999', name: 'Under INR 3999', priceMax: 3999, image: price3999, path: '/shop?price_max=3999' }
];

const PriceRangeShowcase = () => {
    const { data: homepageSections = {} } = useHomepageCms();

    const sectionData = homepageSections?.['price-range-showcase'];

    const parsePriceValue = (value) => {
        if (value === undefined || value === null) return null;
        const cleaned = String(value).replace(/[^0-9]/g, '');
        if (!cleaned) return null;
        const numeric = Number(cleaned);
        return Number.isFinite(numeric) ? numeric : null;
    };

    const getPriceMaxFromItem = (item) => {
        if (!item) return null;
        if (item.priceMax !== undefined && item.priceMax !== null && item.priceMax !== '') {
            return parsePriceValue(item.priceMax);
        }
        if (item.price !== undefined && item.price !== null && item.price !== '') {
            return parsePriceValue(item.price);
        }
        if (item.path && String(item.path).includes('price_max=')) {
            const query = item.path.split('price_max=')[1]?.split('&')[0];
            const parsed = parsePriceValue(query);
            if (parsed) return parsed;
        }
        if (item.name) {
            const parsed = parsePriceValue(item.name);
            if (parsed) return parsed;
        }
        return null;
    };

    const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
    const normalizedConfiguredItems = configuredItems
        .map((item, index) => {
            const priceMax = getPriceMaxFromItem(item);
            if (!priceMax) return null;
            const itemLabel = item.name || item.label || `Under INR ${priceMax}`;
            return {
                ...item,
                id: item.itemId || item._id || item.id || `${priceMax}-${index}`,
                priceMax,
                name: itemLabel,
                image: resolveLegacyCmsAsset(item.image, price999),
                path: `/shop?price_max=${priceMax}`
            };
        })
        .filter(Boolean);

    const displayItems = normalizedConfiguredItems.length > 0 ? normalizedConfiguredItems : priceRanges;

    return (
        <section className="pt-8 pb-2 md:pt-10 md:pb-4 bg-white overflow-hidden">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-8 md:mb-10">
                    <h2 className="font-sans text-2xl md:text-3xl text-[#111111] font-semibold mb-3 tracking-wide uppercase">
                        {sectionData?.label || 'LUXURY IN RANGE'}
                    </h2>
                    <div className="w-12 h-1 bg-[#FFD6DB] mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-[1600px] mx-auto">
                    {displayItems.map((item, index) => {
                        const priceMax = getPriceMaxFromItem(item);
                        const itemLabel = priceMax ? `UNDER INR ${priceMax}` : (item.name || item.label || '');
                        const itemPath = priceMax ? `/shop?price_max=${priceMax}` : item.path;
                        const key = item.itemId || item._id || item.id || itemLabel || index;

                        // Synthetic rating and original price for visual consistency with ProductCard
                        const rating = 4.8;
                        const reviews = 500 + (index * 123);
                        const originalPrice = priceMax ? Math.round(priceMax * 1.5) : null;

                        return (
                            <motion.div
                                key={key}
                                className="w-full h-full"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Link
                                    to={itemPath || '/shop'}
                                    className="group/card relative flex flex-col h-full bg-white transition-all duration-300 overflow-hidden cursor-pointer"
                                >
                                    {/* Image Container - Square & Sharp (Mimicking ProductCard) */}
                                    <div className="relative aspect-square overflow-hidden bg-gray-50 rounded-none mb-3">
                                        <img
                                            src={resolveLegacyCmsAsset(item.image, price999)}
                                            alt={itemLabel}
                                            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover/card:scale-105"
                                        />
                                        
                                        {/* Bestseller Badge */}
                                        <div className="absolute top-0 left-0 bg-[#E89BA8] text-white text-[9px] font-bold px-2 py-1 z-10 uppercase tracking-widest">
                                            Bestseller
                                        </div>

                                        {/* Heart Icon */}
                                        <div className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm text-gray-400">
                                            <Heart className="w-4 h-4" />
                                        </div>

                                        {/* Cart Icon */}
                                        <div className="absolute top-2 right-12 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm text-gray-400">
                                            <ShoppingBag className="w-4 h-4" />
                                        </div>

                                        {/* Rating Badge Overlay */}
                                        <div className="absolute bottom-2 left-2 z-10 bg-white/95 px-1.5 py-0.5 rounded-sm flex items-center gap-1 shadow-sm border border-gray-100">
                                            <span className="text-[10px] font-bold text-gray-800">{rating}</span>
                                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                            <div className="w-px h-2.5 bg-gray-300 mx-0.5" />
                                            <span className="text-[10px] text-gray-500">{reviews}</span>
                                        </div>
                                    </div>

                                    {/* Content Container (Mimicking ProductCard) */}
                                    <div className="flex flex-col px-0 mt-2">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-[15px] font-bold text-gray-900">₹{priceMax?.toLocaleString('en-IN') || '0'}</span>
                                            {originalPrice && (
                                                <span className="text-[12px] text-gray-400 line-through font-medium">₹{originalPrice.toLocaleString('en-IN')}</span>
                                            )}
                                        </div>
                                        
                                        {/* Removed redundant itemLabel as it is already present in the image */}

                                        <div className="h-[15px] mb-1.5 md:mb-2">
                                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                                                PRICE DROP!
                                            </p>
                                        </div>
                                        
                                        {/* Action Button */}
                                        <div className="mt-1 md:mt-2 w-full">
                                            <div className="w-full bg-[#8E2B45] text-white font-bold text-[9px] md:text-[11px] py-1.5 md:py-2 rounded-none group-hover/card:bg-[#722237] transition-all duration-300 uppercase tracking-[0.15em] text-center shadow-lg">
                                                Shop Now
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default PriceRangeShowcase;


