import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { buildWomenShopPath } from '../../utils/womenNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

import PersonalisedImg from '@assets/promos/PersonalisedBannerWine.png';

const WomenPersonalisedBanner = ({ sectionData }) => {
    const navigate = useNavigate();
    const banner = useMemo(() => {
        const configured = Array.isArray(sectionData?.items) ? sectionData.items[0] : null;
        const fallback = {
            name: 'Exclusive Edit',
            label: 'Personalised',
            subtitle: 'Silver that feels like you',
            image: PersonalisedImg,
            path: buildWomenShopPath({ filter: 'womens', category: 'personalised' })
        };

        if (!configured) return fallback;

        return {
            name: configured.name !== undefined ? String(configured.name).trim() : (configured.tag || ''),
            label: configured.label !== undefined ? String(configured.label).trim() : '',
            subtitle: configured.subtitle !== undefined ? String(configured.subtitle).trim() : (configured.description || ''),
            image: resolveLegacyCmsAsset(configured.image, fallback.image),
            path: configured.path || fallback.path
        };
    }, [sectionData]);

    const hasText = Boolean(banner.label || banner.subtitle || banner.name);

    return (
        <section className="bg-white w-full py-0">
            <div 
                className="w-full overflow-hidden relative h-[250px] md:h-[350px] group cursor-pointer shadow-none rounded-none" 
                onClick={() => navigate(banner.path)}
                style={{ background: 'linear-gradient(to right, #4A0E0E, #2D0505)' }}
            >
                {/* Decorative Background Pattern (Subtle waves/blobs on the left) */}
                {hasText && (
                    <div className="absolute top-0 left-0 w-1/2 h-full opacity-20 pointer-events-none">
                        <div className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-[#5E1212] rounded-full mix-blend-screen blur-3xl opacity-40 animate-pulse" />
                        <div className="absolute -bottom-1/4 -left-1/4 w-[120%] h-[120%] bg-[#3D0A0A] rounded-full mix-blend-screen blur-3xl opacity-30" />
                    </div>
                )}

                {/* Main Product Image (Right half if text exists, else full width) */}
                <div className={`absolute right-0 top-0 ${hasText ? 'w-full md:w-[60%]' : 'w-full'} h-full`}>
                    <img 
                        src={banner.image} 
                        alt={banner.label || "Women's Banner"}
                        className="w-full h-full object-cover transition-transform duration-[8s] group-hover:scale-105"
                    />
                    {hasText && (
                        <>
                            {/* Seamless Gradient from Wine to Image */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#4A0E0E] via-[#4A0E0E]/60 to-transparent block md:hidden" />
                            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#4A0E0E] to-transparent hidden md:block" />
                        </>
                    )}
                </div>
                
                {/* Content Section (Left side focused) */}
                {hasText && (
                    <div className="relative h-full flex items-center z-10">
                        <div className="px-8 sm:px-12 md:px-20 lg:px-24 w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                viewport={{ once: true }}
                                className="space-y-4 md:space-y-6"
                            >
                                {banner.label && (
                                    <h2 
                                        className="text-4xl sm:text-5xl md:text-7xl font-display text-white tracking-wide"
                                        style={{ fontFamily: "'Cinzel', serif", fontWeight: 400 }}
                                    >
                                        {banner.label}
                                    </h2>
                                )}
                                {banner.subtitle && (
                                    <p 
                                        className="text-sm sm:text-lg md:text-xl font-light text-rose-100/90 tracking-[0.1em] uppercase"
                                        style={{ fontFamily: "'Lato', sans-serif" }}
                                    >
                                        {banner.subtitle}
                                    </p>
                                )}
                            </motion.div>
                            
                            {/* Subtle Floating Animation for the text */}
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="mt-8 md:mt-12 w-12 h-px bg-white/40 hidden md:block"
                            />
                        </div>
                    </div>
                )}

                {/* Hover Border Accent */}
                <div className="absolute inset-0 border border-white/0 transition-all duration-700 group-hover:border-white/10 m-1 md:m-3 pointer-events-none" />
                
                {/* Custom Label Animation on Hover */}
                {banner.name && (
                    <div className="absolute top-6 right-6 overflow-hidden hidden md:block">
                        <motion.span 
                            className="text-[10px] text-white/50 uppercase tracking-[0.3em] block origin-right -rotate-90 translate-y-24 group-hover:translate-y-0 transition-transform duration-700"
                        >
                            {banner.name}
                        </motion.span>
                    </div>
                )}
            </div>
        </section>
    );
};

export default WomenPersonalisedBanner;
