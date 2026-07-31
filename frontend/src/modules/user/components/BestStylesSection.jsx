import React, { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../../context/ShopContext';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { getProductPrice, getProductMRP } from '../utils/price';

import ProductCard from './ProductCard';

const ensureGoldPath = (rawPath = '') => {
    const source = String(rawPath || '').trim();
    if (!source) return '/shop?metal=gold';
    if (!source.startsWith('/shop')) return source;
    if (/([?&])metal=gold(&|$)/i.test(source)) return source;
    return `${source}${source.includes('?') ? '&' : '?'}metal=gold`;
};

const BestStylesSection = ({ sectionData = null }) => {
    const scrollRef = useRef(null);
    const { products, activeMetal } = useShop();
    const { data: homepageSections = {} } = useHomepageCms();
    const section = sectionData || homepageSections?.['best-styles'];
    const settings = section?.settings || {};
    const isGoldSection = section?.pageKey === 'gold-collection' || String(section?.sectionId || '').startsWith('gold-collection:');
    const sectionTitle = settings.title || 'Best styles, now for less!';
    const sectionSubtitle = settings.subtitle || '';
    const ctaLabel = settings.ctaLabel || 'View All Collection';
    const ctaPath = isGoldSection
        ? ensureGoldPath(settings.ctaPath || '/shop?metal=gold')
        : (settings.ctaPath || '/shop');
    const productLimit = Math.max(1, Number(settings.productLimit) || 6);

    const dynamicProducts = useMemo(() => {
        const getDiscountAmount = (product) => {
            const originalPrice = getProductMRP(product);
            const effectivePrice = getProductPrice(product);
            return Math.max(0, originalPrice - effectivePrice);
        };

        const getProductMetal = (product) => {
            const explicitMetal = String(product?.metal || product?.material || '').trim().toLowerCase();
            if (explicitMetal) return explicitMetal;
            if (product?.goldCategory) return 'gold';
            return 'silver';
        };

        const matchingMetalProducts = products.filter((product) => {
            if (isGoldSection || activeMetal === 'gold') {
                return getProductMetal(product) === 'gold';
            }
            return getProductMetal(product) !== 'gold';
        });

        return matchingMetalProducts
            .map((product) => {
                const price = getProductPrice(product);
                const originalPrice = getProductMRP(product);
                const discountAmount = getDiscountAmount(product);
                return {
                    ...product,
                    id: product.id || product._id,
                    price,
                    originalPrice,
                    rating: Number(product.rating || 4.5),
                    reviewCount: Number(product.reviewCount ?? product.reviews ?? 0),
                    priceDrop: discountAmount > 0,
                    isTrending: Boolean(product.isTrending || product.tags?.isTrending),
                    discountAmount,
                    soldCount: Number(product.sold || 0)
                };
            })
            .filter((product) => product.price > 0 && product.originalPrice > product.price)
            .sort((a, b) => {
                if (Boolean(b.isTrending) !== Boolean(a.isTrending)) {
                    return b.isTrending ? 1 : -1;
                }
                if (b.discountAmount !== a.discountAmount) {
                    return b.discountAmount - a.discountAmount;
                }
                if (b.soldCount !== a.soldCount) {
                    return b.soldCount - a.soldCount;
                }
                return b.originalPrice - a.originalPrice;
            })
            .slice(0, productLimit);
    }, [activeMetal, isGoldSection, productLimit, products]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft } = scrollRef.current;
            const scrollAmount = window.innerWidth > 768 ? 400 : 250;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const displayItems = dynamicProducts;

    if (displayItems.length === 0) return null;

    return (
        <section className="pt-2 pb-2 md:pt-4 md:pb-4 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1450px]">
                <div className="relative mb-3 md:mb-5 flex flex-col items-center">
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[20px] md:text-[32px] font-cinzel text-gray-900 tracking-wide font-medium leading-tight mb-1">
                            {sectionTitle}
                        </h2>
                        {sectionSubtitle ? (
                            <p className="text-[10px] md:text-[11px] font-lato font-bold uppercase tracking-[0.25em] text-gray-400 mb-2">{sectionSubtitle}</p>
                        ) : null}
                        <Link to={ctaPath} className="text-[9px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E4A50] hover:text-[#5B1E26] transition-all flex items-center gap-1.5 group">
                            {ctaLabel}
                            <div className="w-3.5 h-3.5 rounded-full bg-[#8E4A50]/10 flex items-center justify-center group-hover:bg-[#8E4A50] group-hover:text-white transition-all">
                                <ChevronRight className="w-2 h-2" />
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Arrows - Visible on both mobile and desktop */}
                    <div className="md:flex gap-2 absolute right-0 bottom-0 hidden">
                        <button onClick={() => scroll('left')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <button onClick={() => scroll('right')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Mobile Left Arrow */}
                    {dynamicProducts.length > 1 && (
                        <button
                            onClick={() => scroll('left')}
                            className="md:hidden flex-shrink-0 w-8 h-8 bg-gray-900 hover:bg-[#D4AF37] rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                    )}

                    <div ref={scrollRef} className={`flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-4 md:pb-8 snap-x snap-mandatory px-1 flex-1 ${dynamicProducts.length === 1 ? 'justify-center' : ''}`}>
                        {dynamicProducts.map((product) => (
                            <div key={product.id} className="min-w-[180px] md:min-w-[280px] w-[180px] md:w-[280px] snap-start">
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>

                    {/* Mobile Right Arrow */}
                    {dynamicProducts.length > 1 && (
                        <button
                            onClick={() => scroll('right')}
                            className="md:hidden flex-shrink-0 w-8 h-8 bg-gray-900 hover:bg-[#D4AF37] rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>
            </div>

            <style>
                {`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                `}
            </style>
        </section>
    );
};

export default BestStylesSection;
