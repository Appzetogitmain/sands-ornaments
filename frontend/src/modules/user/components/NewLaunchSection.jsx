import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHomepageCms } from '../hooks/useHomepageCms';

// Import images
import newEarrings from '@assets/new_launch_earrings.png';
import newChains from '@assets/new_launch_chains.png';
import newStuds from '@assets/new_launch_studs.png';
import newBracelets from '@assets/new_launch_bracelets.png';
import newAnklets from '@assets/new_launch_anklets.png';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';
import { ensureSilverHomePath } from '../utils/silverHomePaths';

const newLaunches = [
    { id: 'earrings', name: "Earrings", image: newEarrings, path: "/shop" },
    { id: 'chains', name: "Chains", image: newChains, path: "/shop" },
    { id: 'studs', name: "Studs", image: newStuds, path: "/shop" },
    { id: 'bracelets', name: "Bracelets", image: newBracelets, path: "/shop" },
    { id: 'anklets', name: "Anklets", image: newAnklets, path: "/shop" }
];

const resolveLaunchPath = (item, fallbackPath = '/shop') => {
    const categoryId = item?.categoryId;
    if (categoryId) {
        return ensureSilverHomePath(`/shop?category=${categoryId}`);
    }
    if (item?.path) return ensureSilverHomePath(item.path);
    return ensureSilverHomePath(fallbackPath);
};

const NewLaunchSection = () => {
    const { data: homepageSections = {} } = useHomepageCms();

    const sectionData = homepageSections?.['new-launch'];
    const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
    const normalizedConfiguredItems = configuredItems.map((item, index) => {
        return {
            ...item,
            id: item.itemId || item._id || item.id || `launch-${index}`,
            name: item.name || item.label || newLaunches[index]?.name || 'Limited Edition',
            image: resolveLegacyCmsAsset(item.image, newLaunches[index]?.image || newEarrings),
            path: resolveLaunchPath(item, newLaunches[index]?.path || '/shop'),
            categoryId: item.categoryId || null
        };
    });
    const baseItems = normalizedConfiguredItems.length > 0 ? normalizedConfiguredItems : newLaunches;

    // We want exactly 20 items for a smooth curved 3D arc with large radius
    const cylinderItems = useMemo(() => {
        const items = [];
        while(items.length < 20) {
            items.push(...baseItems);
        }
        return items.slice(0, 20);
    }, [baseItems]);

    // Responsive measurements for the wide shallow curve
    const [radius, setRadius] = useState(1200);
    const [cardWidth, setCardWidth] = useState(300);
    const [cardHeight, setCardHeight] = useState(420);

    useEffect(() => {
        const updateDims = () => {
            if (window.innerWidth < 480) {
                setRadius(450);
                setCardWidth(130);
                setCardHeight(185);
            } else if (window.innerWidth < 768) {
                setRadius(600);
                setCardWidth(160);
                setCardHeight(225);
            } else if (window.innerWidth < 1024) {
                setRadius(800);
                setCardWidth(190);
                setCardHeight(270);
            } else {
                setRadius(1000);
                setCardWidth(235);
                setCardHeight(330);
            }
        };
        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    return (
        <section 
            className="pt-6 pb-2 md:pt-8 md:pb-3 bg-[#F4D3DB] relative overflow-hidden"
            style={{
                '--radius': `${radius}px`,
                '--cardW': `${cardWidth}px`,
                '--cardH': `${cardHeight}px`
            }}
        >
            {/* Inline styles for the SHALLOW 3D Curve Animation */}
            <style>
                {`
                @keyframes spinShallowCylinder {
                    0% { transform: translateZ(calc(var(--radius) * -1)) rotateY(0deg); }
                    100% { transform: translateZ(calc(var(--radius) * -1)) rotateY(-360deg); }
                }
                .scene {
                    perspective: 4000px;
                    width: 100%;
                    height: var(--cardH);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 1rem;
                }
                .rotator {
                    width: var(--cardW);
                    height: var(--cardH);
                    position: relative;
                    transform-style: preserve-3d;
                    animation: spinShallowCylinder 80s infinite linear;
                }
                .rotator:hover {
                    animation-play-state: paused;
                }
                .cylinder-card {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    border-radius: 1.25rem;
                }
                `}
            </style>

            <div className="container mx-auto px-4 md:px-6 relative z-10 overflow-visible">

                {/* Header Area */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative flex flex-col items-center justify-center text-center"
                >
                    <div className="inline-block bg-[#8E2B45]/12 border border-[#8E2B45]/25 text-[#8E2B45] px-4 py-0.5 font-serif tracking-[0.2em] text-[9px] uppercase rounded-full shadow-sm mb-2 md:mb-3">
                        New Launch
                    </div>
                    <h3 className="font-serif text-[#4A0E1C] text-2xl md:text-4xl font-light tracking-tight uppercase drop-shadow-sm">
                        {sectionData?.label || "Limited Edition"}
                    </h3>
                </motion.div>

                {/* 3D Curved Carousel Area */}
                <div className="scene">
                    <div className="rotator">
                        {cylinderItems.map((item, index) => {
                            const itemLabel = item.name || item.label;
                            const itemPath = item.path || '/shop';
                            // Calculate proper angle for 20 items (360 / 20 = 18)
                            const angle = index * 18;

                            return (
                                <div
                                    key={`cyl-${index}`}
                                    className="cylinder-card shadow-xl hover:shadow-2xl group transition-shadow duration-500"
                                    style={{
                                        transform: `rotateY(${angle}deg) translateZ(var(--radius))`,
                                    }}
                                >
                                    <Link to={itemPath} className="block w-full h-full relative isolate rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer bg-white border border-black/5">
                                        {/* Image */}
                                        <div className="absolute inset-0 bg-[#FCD8D8]/50">
                                            <img
                                                src={item.image}
                                                alt={itemLabel}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                            />
                                        </div>

                                        {/* Classic Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-75"></div>

                                        {/* Text Section overlay at bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5 flex flex-col items-center justify-end text-center z-10">
                                            <h4 className="font-serif font-medium text-base md:text-xl text-white tracking-[0.15em] mb-1.5 md:mb-2 drop-shadow-lg uppercase">
                                                {itemLabel}
                                            </h4>
                                            
                                            {/* Discover/Animated Arrow */}
                                            <div className="flex items-center gap-2 text-[#FFD9E0] transition-all duration-500">
                                                <div className="h-[1px] w-4 bg-[#FFD9E0]/40 group-hover:w-6 transition-all"></div>
                                                <span className="text-[9px] font-black uppercase tracking-[0.35em] drop-shadow-md">
                                                    EXPLORE
                                                </span>
                                                <div className="h-[1px] w-4 bg-[#FFD9E0]/40 group-hover:w-6 transition-all"></div>
                                            </div>
                                        </div>

                                        {/* Border Glow on Hover */}
                                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FFD9E0]/30 rounded-2xl md:rounded-3xl transition-colors duration-500 pointer-events-none"></div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default NewLaunchSection;

