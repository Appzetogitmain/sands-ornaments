import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHomepageCms } from '../hooks/useHomepageCms';

// Importing assets for Banners (using available hero/trending assets)
import bannerDaily from '@assets/banner_daily.png';
import bannerOffice from '@assets/banner_office.png';
import bannerParty from '@assets/banner_party.png';
import bannerCasual from '@assets/trending_heritage.png';

// Importing assets for Thumbnails (using available product assets)
import prodChain from '@assets/silver_chain_product.png';
import prodBracelet from '@assets/silver_bracelet_product.png';
import prodEarring from '@assets/silver_earrings_product.png';
import prodPendant from '@assets/cat_pendant.png';
import prodRing from '@assets/cat_ring_wine.png';
import prodAnklet from '@assets/cat_anklets.png'; // Premium Asset
import prodGift from '@assets/gift_friends_silver.png';
import prodSis from '@assets/gift_sister_silver.png';
import prodWineEar from '@assets/cat_earrings_wine.png';
import prodWineRing from '@assets/cat_ring_wine.png';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';
import { ensureSilverHomePath } from '../utils/silverHomePaths';

const StyleItYourWay = () => {
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['style-it-your-way'];

    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = current.clientWidth / 2 + 20; // Approximately one card width + gap half
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    const defaultCollections = [
        {
            id: 1,
            title: "Daily Wear",
            subtitle: "Effortless Everyday",
            image: bannerDaily,
            thumbnails: [prodPendant, prodWineEar, prodAnklet],
            path: "/shop"
        },
        {
            id: 2,
            title: "Office Wear",
            subtitle: "Professional Chic",
            image: bannerOffice,
            thumbnails: [prodEarring, prodPendant, prodRing],
            path: "/shop"
        },
        {
            id: 3,
            title: "Party Wear",
            subtitle: "Glamour & Shine",
            image: bannerParty,
            thumbnails: [prodWineEar, prodWineRing, prodAnklet],
            path: "/shop"
        },
        {
            id: 4,
            title: "Casual Wear",
            subtitle: "Relaxed Vibes",
            image: bannerCasual,
            thumbnails: [prodAnklet, prodBracelet, prodSis],
            path: "/shop"
        }
    ];

    const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
    const normalizedConfiguredItems = configuredItems.map((item, index) => {
        const fallback = defaultCollections[index] || defaultCollections[0];
        const productIds = Array.isArray(item.productIds) ? item.productIds.filter(Boolean) : [];
        const limit = item.limit ? Number(item.limit) : 12;
        const path = item.path || (
            productIds.length > 0
                ? `/shop?products=${encodeURIComponent(productIds.join(','))}&limit=${limit}&sort=random`
                : `/shop?limit=${limit}&sort=random`
        );
        const extraImages = Array.isArray(item.extraImages) ? item.extraImages.filter(Boolean) : [];
        return {
            id: item.itemId || item._id || item.id || `style-${index}`,
            title: item.name || item.label || fallback.title,
            subtitle: item.tag || fallback.subtitle,
            image: resolveLegacyCmsAsset(item.image, fallback.image),
            thumbnails: (extraImages.length > 0 ? extraImages : fallback.thumbnails).map((thumb) => resolveLegacyCmsAsset(thumb, thumb)),
            path: ensureSilverHomePath(path)
        };
    });

    const displayCollections = normalizedConfiguredItems.length > 0 ? normalizedConfiguredItems : defaultCollections;

    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll <= 0) {
                setActiveIndex(0);
                return;
            }
            const percentage = scrollLeft / maxScroll;
            const index = Math.round(percentage * (displayCollections.length - 1));
            setActiveIndex(Math.min(index, displayCollections.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (displayCollections.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    React.useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return;

        const interval = setInterval(() => {
            if (scrollRef.current) {
                const { current } = scrollRef;
                const maxScroll = current.scrollWidth - current.clientWidth;
                const isAtEnd = current.scrollLeft >= maxScroll - 10;

                if (isAtEnd) {
                    current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    current.scrollBy({ left: current.clientWidth * 0.9 + 24, behavior: 'smooth' });
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="pt-4 pb-0 md:pt-10 md:pb-2 bg-white relative">
            <div className="container mx-auto px-4 md:px-6">

                {/* Centered Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[#C9A24D] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-1 block">Curated For You</span>
                        <h3 className="font-display text-2xl md:text-3xl text-[#722F37]">
                            {sectionData?.label || "Style It Your Way"}
                        </h3>
                    </div>
                </div>

                <div className="relative group/carousel">
                    {/* Navigation Buttons - Absolute Positioned */}
                    
                    

                    {/* Carousel Container */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex gap-4 md:gap-8 overflow-x-auto pb-12 pt-2 snap-x snap-mandatory scrollbar-hide scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {displayCollections.map((detail) => (
                            <div
                                key={detail.id}
                                className={`min-w-[75vw] md:min-w-[calc(45%-20px)] h-[160px] md:h-[280px] rounded-[1.2rem] md:rounded-[2rem] relative flex-shrink-0 snap-center group overflow-visible cursor-pointer transition-all duration-500 isolate mb-6`}
                            >
                                <Link to={detail.path}>
                                    {/* Full Card Banner Image */}
                                    <div className="absolute inset-0 rounded-[1.2rem] md:rounded-[2rem] overflow-hidden">
                                        <img
                                            src={detail.image}
                                            alt={detail.title}
                                            className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                                        />
                                        {/* Gradient Overlay with Inner Shadow effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent opacity-90 shadow-inner" />
                                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />
                                    </div>

                                    {/* Content Area - Left Aligned */}
                                    <div className="absolute inset-0 flex flex-col justify-center items-start p-4 md:p-10 z-20 w-[80%] md:w-[70%]">
                                        <span className="text-[#C9A24D] text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase mb-1 md:mb-2 drop-shadow-md bg-white/10 px-2 md:px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                                            {detail.subtitle}
                                        </span>
                                        <h3 className="font-display text-xl md:text-4xl text-white mb-1 md:mb-3 leading-tight drop-shadow-lg">
                                            {detail.title}
                                        </h3>
                                        <div className="h-[1.5px] w-10 md:w-16 bg-white/50 group-hover:w-24 transition-all duration-500 shadow-sm" />
                                    </div>
                                </Link>

                                {/* Floating Product Thumbnails - Bottom Centered & Overlapping */}
                                <div className="absolute bottom-[-12%] left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 md:gap-4 z-40 w-full px-4">
                                    {detail.thumbnails.slice(0, 3).map((thumb, idx) => (
                                        <div
                                            key={idx}
                                            className="w-[28%] aspect-square md:w-28 md:h-28 bg-white rounded-xl md:rounded-[1.5rem] shadow-[0_10px_35px_rgba(0,0,0,0.15)] flex items-center justify-center border-2 md:border-[3px] border-[#C9A24D] overflow-hidden"
                                        >
                                            <img src={thumb} alt="Product" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Carousel Dots */}
                    {displayCollections.length > 1 && (
                        <div className="flex justify-center items-center gap-2 pb-2 mt-[-24px]">
                            {displayCollections.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => scrollToDot(idx)}
                                    className={`transition-all duration-300 rounded-full ${
                                        activeIndex === idx 
                                        ? 'w-6 h-1.5 bg-[#722F37]' 
                                        : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
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

export default StyleItYourWay;

