import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

const DynamicPromoBanner = () => {
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['dynamic-promo-banner'];

    const bannerItems = useMemo(() => {
        const items = Array.isArray(sectionData?.items) ? sectionData.items : [];
        return items
            .filter((item) => Boolean(item?.image)) // image is required
            .filter((item) => {
                const label = String(item.label || item.title || '').toLowerCase();
                return !label.includes('unique story in golds') && !label.includes('unique story in gold');
            })
            .map((item, index) => ({
                id: item.itemId || item.id || `dynamic-promo-${index + 1}`,
                image: resolveLegacyCmsAsset(item.image, item.image),
                mobileImage: item.mobileImage ? resolveLegacyCmsAsset(item.mobileImage, item.mobileImage) : null,
                link: item.path || '/shop',
                title: item.label || 'Promo Banner',
                name: item.name || '',
                tag: item.tag || '',
                subtitle: item.subtitle || '',
                ctaLabel: item.ctaLabel || 'Shop Collection'
            }));
    }, [sectionData?.items]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const autoplayMs = Number(sectionData?.settings?.autoplayMs) || 3000;

    useEffect(() => {
        if (bannerItems.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
        }, autoplayMs);
        return () => clearInterval(timer);
    }, [autoplayMs, bannerItems.length]);

    useEffect(() => {
        if (currentIndex >= bannerItems.length) {
            setCurrentIndex(0);
        }
    }, [currentIndex, bannerItems.length]);

    if (bannerItems.length === 0) {
        return null;
    }

    const renderBannerItem = (banner, idx) => {
        const aspectClass = banner.mobileImage ? 'aspect-[2/1] md:aspect-[3.5/1] md:min-h-[350px]' : 'aspect-[4/1] md:aspect-[3.5/1] md:min-h-[350px]';
        return (
            <Link to={banner.link} className="block w-full">
                <div className={`w-full relative rounded-none md:rounded-2xl overflow-hidden shadow-sm group ${aspectClass}`}>
                    
                    {/* Mobile Image */}
                    {banner.mobileImage && (
                        <img
                            src={banner.mobileImage}
                            alt={banner.title}
                            className="absolute inset-0 w-full h-full object-cover block md:hidden"
                            loading={idx === 0 ? "eager" : "lazy"}
                            decoding="async"
                        />
                    )}

                    {/* Desktop Image */}
                    <img
                        src={banner.image}
                        alt={banner.title}
                        className={`absolute inset-0 w-full h-full object-cover ${banner.mobileImage ? 'hidden md:block' : 'block'}`}
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                    />

                    {/* Professional Gradient Overlay for Left-aligned Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent pointer-events-none z-[5]" />

                    {/* Text Overlay - Left-aligned and Mobile Scale Friendly */}
                    <div className="absolute inset-y-0 left-0 w-full md:w-[65%] flex flex-col justify-center px-6 md:px-20 z-10 text-white text-left">
                        {banner.tag && (
                            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-4">
                                <div className="w-4 md:w-8 h-[1px] md:h-[2px] bg-[#9C5B61]"></div>
                                <span className="text-[8px] sm:text-[10px] md:text-sm text-[#9C5B61] font-bold uppercase tracking-[0.3em]">
                                    {banner.tag}
                                </span>
                            </div>
                        )}

                        {banner.title && (
                            <h2 className="font-serif text-sm sm:text-2xl md:text-5xl font-bold leading-normal md:leading-tight mb-1 md:mb-3 drop-shadow-lg max-w-[95%] md:max-w-xl text-left">
                                {banner.title}
                            </h2>
                        )}

                        {banner.subtitle && (
                            <p className="text-white/80 text-[8px] sm:text-xs md:text-base font-light leading-relaxed mb-2 md:mb-6 max-w-[90%] md:max-w-md tracking-wide line-clamp-2 md:line-clamp-none text-left">
                                {banner.subtitle}
                            </p>
                        )}

                        <span
                            className="relative group inline-flex items-center justify-center bg-[#9C5B61] text-white hover:bg-white hover:text-[#9C5B61] font-bold text-[8px] sm:text-xs md:text-sm uppercase tracking-[0.2em] px-4 py-1.5 md:px-12 md:py-4 transition-all duration-300 overflow-hidden shadow-xl w-max"
                        >
                            <span className="relative z-10">{banner.ctaLabel}</span>
                        </span>
                    </div>
                </div>
            </Link>
        );
    };

    if (bannerItems.length === 1) {
        return (
            <section className="w-full bg-white">
                <div className="container mx-auto px-0 md:px-4">
                    {renderBannerItem(bannerItems[0], 0)}
                </div>
            </section>
        );
    }

    const activeBanner = bannerItems[currentIndex];
    const bannerContainerAspect = activeBanner.mobileImage ? 'aspect-[2/1] md:aspect-[3.5/1] md:min-h-[350px]' : 'aspect-[4/1] md:aspect-[3.5/1] md:min-h-[350px]';

    return (
        <section className="w-full bg-white relative">
            <div className="container mx-auto px-0 md:px-4">
                <div className={`w-full relative ${bannerContainerAspect}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 w-full h-full"
                        >
                            {renderBannerItem(activeBanner, currentIndex)}
                        </motion.div>
                    </AnimatePresence>

                    {/* Sliding Line Indicators */}
                    <div className="absolute bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 md:gap-3 z-30">
                        {bannerItems.map((_, i) => {
                            const isActive = i === currentIndex;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`h-[2px] md:h-1 transition-all duration-500 rounded-full ${
                                        isActive ? 'w-6 md:w-10 bg-white' : 'w-2 md:w-4 bg-white/40 hover:bg-white/70'
                                    }`}
                                    aria-label={`Go to slide ${i + 1}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DynamicPromoBanner;
