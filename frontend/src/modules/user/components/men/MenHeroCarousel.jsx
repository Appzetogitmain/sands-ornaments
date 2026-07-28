import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { buildMenShopPath } from '../../utils/menNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

import heroMenBold from '@assets/men_hero_bold.png';
import heroMenStyle from '@assets/men_hero_style.png';
import heroMenElite from '@assets/men_hero_elite.png';

const slides = [
    {
        id: 1,
        brandTitle: "SANDS BRINGS TO YOU",
        mainTitle: "MEN",
        scriptTitle: "Silver",
        rightTitle: "Modern Silver for\nthe Bold Man",
        cta: "SHOP NOW",
        link: buildMenShopPath(),
        image: heroMenBold,
    },
    {
        id: 2,
        brandTitle: "TIMELESS CRAFTSMANSHIP",
        mainTitle: "BOLD",
        scriptTitle: "Style",
        rightTitle: "Classic Designs,\nContemporary Edge",
        cta: "DISCOVER",
        link: buildMenShopPath({ sort: 'most-sold' }),
        image: heroMenStyle,
    },
    {
        id: 3,
        brandTitle: "THE LUXURY COLLECTION",
        mainTitle: "ELITE",
        scriptTitle: "Look",
        rightTitle: "Signature Pieces for\nEvery Occasion",
        cta: "EXPLORE",
        link: buildMenShopPath(),
        image: heroMenElite,
    }
];

const defaultSlides = slides.map((slide) => ({
    ...slide,
    image: resolveLegacyCmsAsset(slide.image, slide.image)
}));

const MenHeroCarousel = ({ sectionData }) => {
    const [current, setCurrent] = useState(0);

    const resolvedSlides = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const normalizedConfigured = configuredItems
            .filter((item) => item?.image)
            .map((item, index) => ({
                id: item.itemId || item.id || `men-hero-${index}`,
                brandTitle: item.name || '',
                mainTitle: item.label || '',
                scriptTitle: item.tag || '',
                rightTitle: item.subtitle || '',
                cta: item.ctaLabel || 'SHOP NOW',
                link: item.path || buildMenShopPath(),
                image: resolveLegacyCmsAsset(item.image, defaultSlides[index]?.image || heroMenBold),
                mobileImage: item.mobileImage ? resolveLegacyCmsAsset(item.mobileImage, defaultSlides[index]?.image || heroMenBold) : null
            }))
            .filter((item) => item.mainTitle && item.image);

        return normalizedConfigured.length > 0 ? normalizedConfigured : defaultSlides;
    }, [sectionData]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % resolvedSlides.length);
        }, Number(sectionData?.settings?.autoplayMs) || 5000);
        return () => clearInterval(timer);
    }, [resolvedSlides.length, sectionData?.settings?.autoplayMs]);

    useEffect(() => {
        if (current >= resolvedSlides.length) {
            setCurrent(0);
        }
    }, [current, resolvedSlides.length]);

    const activeSlide = resolvedSlides[current];
    const sliderAspect = activeSlide?.mobileImage ? 'aspect-[2/1] md:aspect-[4/1]' : 'aspect-[4/1]';

    return (
        <section className={`relative w-full overflow-hidden bg-[#111111] transition-all duration-300 ${sliderAspect}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 1.0 }}
                    className="absolute inset-0"
                >
                    {/* Full-width Background Image */}
                    {resolvedSlides[current].mobileImage && (
                        <img
                            src={resolvedSlides[current].mobileImage}
                            alt="Men Jewelry Model"
                            className="absolute inset-0 w-full h-full object-cover object-center block md:hidden"
                        />
                    )}
                    <img
                        src={resolvedSlides[current].image}
                        alt="Men Jewelry Model"
                        className={`absolute inset-0 w-full h-full object-cover object-center ${resolvedSlides[current].mobileImage ? 'hidden md:block' : 'block'}`}
                    />

                    {/* Dark gradient overlays for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                </motion.div>
            </AnimatePresence>

            {/* Text Content */}
            <div className="absolute inset-0 z-10 flex items-center">
                <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-6 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4 items-center">

                    {/* Left: Brand & Main Title */}
                    <div className="text-white flex flex-col justify-center">
                        <motion.p
                            key={`brand-${current}`}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="text-[5px] sm:text-[6px] md:text-[11px] font-medium tracking-[0.4em] uppercase mb-0 md:mb-4 opacity-70"
                        >
                            {resolvedSlides[current].brandTitle}
                        </motion.p>

                        <div className="leading-none select-none">
                            <motion.h1
                                key={`title-${current}`}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                                className="text-xl sm:text-3xl md:text-9xl font-black tracking-tighter"
                            >
                                {resolvedSlides[current].mainTitle}
                            </motion.h1>
                            <div className="flex items-center gap-1.5 md:gap-3 -mt-1 md:-mt-4">
                                <motion.span
                                    key={`in-${current}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="text-[6px] sm:text-[8px] md:text-xl font-light uppercase tracking-widest"
                                >
                                    IN
                                </motion.span>
                                <motion.span
                                    key={`script-${current}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8, type: "spring" }}
                                    className="text-lg sm:text-2xl md:text-7xl italic font-serif"
                                    style={{ fontFamily: "'Dancing Script', 'Playball', cursive" }}
                                >
                                    {resolvedSlides[current].scriptTitle}
                                </motion.span>
                            </div>
                        </div>
                    </div>

                    {/* Center: empty on mobile, spacer on desktop */}
                    <div className="hidden md:block" />

                    {/* Right: Quote & CTA */}
                    <div className="text-white flex flex-col items-start md:items-end md:text-right justify-center mt-3 md:mt-0">
                        <motion.h2
                            key={`right-${current}`}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                            className="text-[6px] sm:text-[10px] md:text-4xl font-medium mb-0.5 md:mb-8 leading-[1.2] md:leading-[1.25] max-w-[240px] md:max-w-[300px] whitespace-pre-line"
                        >
                            {resolvedSlides[current].rightTitle}
                        </motion.h2>

                        <motion.div
                            key={`cta-${current}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.9 }}
                        >
                            <Link
                                to={resolvedSlides[current].link}
                                className="px-2 py-0.5 md:px-12 md:py-3 bg-white text-black text-[5px] md:text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-100 transition-colors inline-block"
                            >
                                {resolvedSlides[current].cta}
                            </Link>
                        </motion.div>
                    </div>

                </div>
            </div>

            {/* Navigation Dots */}
            <div className="absolute bottom-3 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-30">
                {resolvedSlides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`transition-all duration-500 rounded-full ${
                            current === idx
                                ? 'w-8 md:w-10 h-1 bg-white'
                                : 'w-3 md:w-4 h-1 bg-white/30 hover:bg-white/60'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default MenHeroCarousel;
