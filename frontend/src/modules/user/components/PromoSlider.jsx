import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHomepageCms } from '../hooks/useHomepageCms';

// Hero Banner Fallback Images (AI-generated premium jewellery scenes)
import heroDiamondBrilliance from '@assets/hero/eternal_diamond_brilliance.png';
import heroGoldFusion from '@assets/hero/modern_gold_fusion.png';
import heroSilverHeritage from '@assets/hero/sterling_silver_heritage.png';

const SLIDES = [
    {
        id: 1,
        image: heroDiamondBrilliance,
        title: "Eternal Diamond Brilliance",
        subtitle: "Masterfully crafted for those who demand the extraordinary.",
        tag: "Luxury Collection",
        ctaLabel: "Shop Collection",
        link: "/shop"
    },
    {
        id: 2,
        image: heroGoldFusion,
        title: "Modern Gold Fusion",
        subtitle: "Minimalist silhouettes elegantly refined in pure 18K gold.",
        tag: "Contemporary Luxe",
        ctaLabel: "Shop Collection",
        link: "/shop"
    },
    {
        id: 3,
        image: heroSilverHeritage,
        title: "Sterling Silver Heritage",
        subtitle: "Timeless craftsmanship meets modern architectural design.",
        tag: "Handcrafted Silver",
        ctaLabel: "Explore Now",
        link: "/shop"
    }
];

const PromoSlider = ({ externalSlides, autoplayInterval }) => {
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['hero-banners'];
    const dynamicSlides = Array.isArray(sectionData?.items)
        ? sectionData.items
            .filter((item) => Boolean(item?.image && item?.label))
            .map((item, index) => ({
                id: item.itemId || item.id || `hero-slide-${index + 1}`,
                image: item.image,
                mobileImage: item.mobileImage || null,
                title: item.label,
                subtitle: item.subtitle || '',
                tag: item.tag || item.name || '',
                link: item.path || '/shop',
                ctaLabel: item.ctaLabel || 'Shop Collection'
            }))
        : [];
    const slides = (externalSlides && externalSlides.length > 0) ? externalSlides : (dynamicSlides.length > 0 ? dynamicSlides : SLIDES);
    const autoplayMs = autoplayInterval || Number(sectionData?.settings?.autoplayMs) || 4000;
    const extendedSlides = [slides[slides.length - 1], ...slides, slides[0]];
    const [currentIndex, setCurrentIndex] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isSuspended, setIsSuspended] = useState(false);
    const autoPlayRef = useRef();

    const handleTransitionEnd = () => {
        if (currentIndex === 0) {
            setIsTransitioning(false);
            setCurrentIndex(slides.length);
        } else if (currentIndex === slides.length + 1) {
            setIsTransitioning(false);
            setCurrentIndex(1);
        } else {
            setIsTransitioning(false);
        }
    };

    const nextSlide = useCallback(() => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev + 1);
    }, [isTransitioning]);

    const prevSlide = useCallback(() => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev - 1);
    }, [isTransitioning]);

    useEffect(() => {
        if (!isSuspended) {
            autoPlayRef.current = setInterval(nextSlide, autoplayMs);
        }
        return () => clearInterval(autoPlayRef.current);
    }, [nextSlide, isSuspended, autoplayMs]);

    useEffect(() => {
        setCurrentIndex(1);
        setIsTransitioning(false);
    }, [slides.length]);

    return (
        <section
            className="w-full bg-white pt-4 md:pt-6 pb-6 md:pb-8 overflow-hidden select-none"
            onMouseEnter={() => setIsSuspended(true)}
            onMouseLeave={() => setIsSuspended(false)}
        >
            <div className={`relative w-full overflow-hidden group transition-all duration-300 ${extendedSlides[currentIndex]?.mobileImage ? 'aspect-[2/1] md:aspect-[3.5/1] md:min-h-[350px]' : 'aspect-[4/1] md:aspect-[3.5/1] md:min-h-[350px]'}`}>
                <motion.div
                    className="absolute inset-0 flex h-full w-full"
                    animate={{
                        x: `-${currentIndex * 100}%`
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 30,
                        mass: 0.8
                    }}
                    onAnimationComplete={handleTransitionEnd}
                >
                    {extendedSlides.map((slide, idx) => (
                        <div
                            key={`${idx}-${slide.id}`}
                            className="relative flex-shrink-0 w-full h-full overflow-hidden bg-gray-50 group"
                        >
                            {/* Professional Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent pointer-events-none z-[5]" />

                            {slide.mobileImage && (
                                <img
                                    src={slide.mobileImage}
                                    alt={`${slide.title} Mobile`}
                                    loading={idx === 1 ? 'eager' : 'lazy'}
                                    fetchPriority={idx === 1 ? 'high' : 'low'}
                                    decoding={idx === 1 ? 'sync' : 'async'}
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none group-hover:scale-110 transition-transform duration-[4000ms] ease-out block md:hidden"
                                />
                            )}
                            <img
                                src={slide.image}
                                alt={slide.title}
                                loading={idx === 1 ? 'eager' : 'lazy'}
                                fetchPriority={idx === 1 ? 'high' : 'low'}
                                decoding={idx === 1 ? 'sync' : 'async'}
                                className={`absolute inset-0 w-full h-full object-cover pointer-events-none group-hover:scale-110 transition-transform duration-[4000ms] ease-out ${slide.mobileImage ? 'hidden md:block' : 'block'}`}
                            />

                            {/* Subtle Brand Watermark */}
                            <div className="absolute top-1 left-2 md:top-8 md:left-12 z-20">
                                <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[4px] sm:text-[6px] md:text-[10px] font-bold uppercase tracking-[0.3em] px-1 py-0.5 md:px-3 md:py-1.5 rounded-sm">
                                    A SANDS PRODUCT
                                </span>
                            </div>

                            {/* Refined Content Overlay - Left-aligned for high-end professional look */}
                            <div className="absolute inset-y-0 left-0 w-full md:w-[65%] flex flex-col justify-center px-6 md:px-20 z-10 text-white text-left">
                                <motion.div
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={currentIndex === idx ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="text-white flex flex-col items-start text-left"
                                >
                                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-4">
                                        <div className="w-4 md:w-8 h-[1px] md:h-[2px] bg-[#9C5B61]"></div>
                                        <span className="text-[8px] sm:text-[10px] md:text-sm text-[#9C5B61] font-bold uppercase tracking-[0.3em]">
                                            {slide.tag}
                                        </span>
                                    </div>

                                    <h2 className="font-serif text-sm sm:text-2xl md:text-5xl font-bold leading-normal md:leading-tight mb-1 md:mb-3 drop-shadow-lg max-w-[95%] md:max-w-xl text-left">
                                        {slide.title}
                                    </h2>

                                    <p className="text-white/80 text-[8px] sm:text-xs md:text-base font-light leading-relaxed mb-2 md:mb-6 max-w-[90%] md:max-w-md tracking-wide line-clamp-2 md:line-clamp-none text-left">
                                        {slide.subtitle}
                                    </p>

                                    <Link
                                        to={slide.link}
                                        className="relative group inline-flex items-center justify-center bg-[#9C5B61] text-white hover:bg-white hover:text-[#9C5B61] font-bold text-[8px] sm:text-xs md:text-sm uppercase tracking-[0.2em] px-4 py-1.5 md:px-12 md:py-4 transition-all duration-300 overflow-hidden shadow-xl"
                                    >
                                        <span className="relative z-10">{slide.ctaLabel || 'Shop Collection'}</span>
                                    </Link>
                                </motion.div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Arrow Controls Removed */}

                {/* Sliding Line Indicators - Inside Carousel Bottom Center */}
                {slides.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 md:gap-3 z-30">
                        {slides.map((_, i) => {
                            const isActive = (currentIndex - 1 + slides.length) % slides.length === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => !isTransitioning && setCurrentIndex(i + 1)}
                                    className={`transition-all duration-500 rounded-full ${isActive
                                            ? 'w-10 md:w-12 h-1 bg-white'
                                            : 'w-4 md:w-5 h-1 bg-white/40 hover:bg-white/70'
                                        }`}
                                    aria-label={`Go to slide ${i + 1}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

        </section>
    );
};

export default PromoSlider;

