import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { buildMenShopPath } from '../../utils/menNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

// Import image
import personalizedImg from '@assets/men/personalized_full_banner.png';

const MenPersonalizedBanner = ({ sectionData }) => {

    const resolvedItem = useMemo(() => {
        const configured = Array.isArray(sectionData?.items) ? sectionData.items[0] : null;
        if (!configured) {
            return {
                name: 'Personalised',
                subtitle: 'Flawless Gifting, Tailored to You',
                ctaLabel: 'Customise Now',
                image: personalizedImg,
                path: buildMenShopPath({ category: 'personalised' })
            };
        }

        return {
            name: configured.name !== undefined ? String(configured.name).trim() : (configured.label || ''),
            subtitle: configured.subtitle !== undefined ? String(configured.subtitle).trim() : (configured.description || ''),
            ctaLabel: configured.ctaLabel !== undefined ? String(configured.ctaLabel).trim() : '',
            image: resolveLegacyCmsAsset(configured.image, personalizedImg),
            path: configured.categoryId
                ? buildMenShopPath({ category: configured.categoryId })
                : (configured.path || buildMenShopPath({ category: 'personalised' }))
        };
    }, [sectionData]);

    const hasContent = Boolean(resolvedItem.name || resolvedItem.subtitle || resolvedItem.ctaLabel);

    return (
        <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-[#FDF5F6] py-0 overflow-hidden">
            <Link to={resolvedItem.path} className="block w-full">
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="relative w-full h-[220px] md:h-[400px] group cursor-pointer"
                >
                    {/* Background Image - Full Width Edge to Edge */}
                    <img 
                        src={resolvedItem.image}
                        alt={resolvedItem.name || "Personalised Men's Jewellery"}
                        className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-105"
                    />

                    {hasContent && (
                        <>
                            {/* Dark Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

                            {/* Content Section - Contained in the center but banner is full width */}
                            <div className="absolute inset-0 z-10">
                                <div className="container mx-auto h-full px-8 md:px-16 flex flex-col justify-center items-start text-left">
                                    <motion.div
                                        initial={{ opacity: 0, x: -50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                        viewport={{ once: true }}
                                        className="max-w-2xl"
                                    >
                                        {resolvedItem.name && (
                                            <h2 className="text-3xl md:text-6xl font-display text-white leading-none mb-3 md:mb-4" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
                                                {resolvedItem.name}
                                            </h2>
                                        )}
                                        {resolvedItem.subtitle && (
                                            <p className="text-xs md:text-lg text-[#D9C4B1] font-light tracking-[0.15em] uppercase mb-5 md:mb-7">
                                                {resolvedItem.subtitle}
                                            </p>
                                        )}
                                        
                                        {resolvedItem.ctaLabel && (
                                            <div className="inline-block">
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="bg-gradient-to-r from-[#D9C4B1] to-[#C9A24D] text-[#3B2516] px-8 md:px-11 py-3 md:py-4 rounded-full font-bold text-[11px] md:text-base tracking-[0.2em] uppercase shadow-2xl transition-all border border-white/30"
                                                >
                                                    {resolvedItem.ctaLabel}
                                                </motion.div>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Decorative Elements - Floating Accent Line */}
                            <div className="absolute bottom-8 right-10 hidden md:block">
                                <motion.div 
                                    animate={{ width: [40, 120, 40] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="h-[2px] bg-[#D9C4B1]/40 rounded-full"
                                />
                            </div>
                        </>
                    )}
                </motion.div>
            </Link>
        </section>
    );
};

export default MenPersonalizedBanner;
