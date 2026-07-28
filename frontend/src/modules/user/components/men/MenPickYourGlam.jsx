import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildMenShopPath } from '../../utils/menNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

// Asset imports
import partySparkImg from '@assets/glam/party_spark.png';
import weddingJewelsImg from '@assets/glam/wedding_jewels.png';
import ritualRangeImg from '@assets/glam/ritual_range.png';
import dailyWearImg from '@assets/glam/daily_wear.png';
import officeWearImg from '@assets/glam/office_wear.png';

const glamItems = [
    { id: 1, title: 'Party Spark', image: partySparkImg, path: buildMenShopPath({ category: 'party-spark' }) },
    { id: 2, title: 'Wedding Jewels', image: weddingJewelsImg, path: buildMenShopPath({ category: 'wedding-jewels' }) },
    { id: 3, title: 'Ritual Range', image: ritualRangeImg, path: buildMenShopPath({ category: 'ritual-range' }) },
    { id: 4, title: 'Daily Wear', image: dailyWearImg, path: buildMenShopPath({ category: 'daily-wear' }) },
    { id: 5, title: 'Office Wear', image: officeWearImg, path: buildMenShopPath({ category: 'office-wear' }) },
];

const MenPickYourGlam = ({ sectionData }) => {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(2);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const resolvedItems = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const normalized = configuredItems
            .filter((item) => item?.image)
            .map((item, index) => {
                const fallback = glamItems[index];
                const baseId = item.itemId || item.id || `men-glam-${index}`;
                
                // Force correct paths for predefined components, ignoring old CMS data
                const forcedPaths = {
                    'men-glam-party-spark': buildMenShopPath({ category: 'party-spark' }),
                    'men-glam-wedding-jewels': buildMenShopPath({ category: 'wedding-jewels' }),
                    'men-glam-ritual-range': buildMenShopPath({ category: 'ritual-range' }),
                    'men-glam-daily-wear': buildMenShopPath({ category: 'daily-wear' }),
                    'men-glam-office-wear': buildMenShopPath({ category: 'office-wear' })
                };

                return {
                    id: baseId,
                    title: item.name || item.label || fallback?.title || '',
                    image: resolveLegacyCmsAsset(item.image, fallback?.image || ''),
                    path: forcedPaths[baseId] || (item.categoryId
                        ? buildMenShopPath({ category: item.categoryId })
                        : (item.path || fallback?.path || buildMenShopPath()))
                };
            })
            .filter((item) => item.title && item.image && item.path);

        return normalized.length > 0 ? normalized : glamItems;
    }, [sectionData]);

    const resolvedTitle = sectionData?.settings?.title || 'Pick Your Glam';

    useEffect(() => {
        if (resolvedItems.length === 0) return;
        if (activeIndex > resolvedItems.length - 1) {
            setActiveIndex(Math.floor((resolvedItems.length - 1) / 2));
        }
    }, [resolvedItems, activeIndex]);

    const next = () => setActiveIndex((prev) => (prev + 1) % resolvedItems.length);
    const prev = () => setActiveIndex((prev) => (prev - 1 + resolvedItems.length) % resolvedItems.length);

    const cardWidth = isMobile ? 110 : 170;
    const gap = isMobile ? 8 : 12;

    return (
        <section className="py-2 md:py-8 bg-[#F9FAFB] overflow-hidden select-none">
            <div className="container mx-auto px-4 max-w-[1200px]">
                {/* Header */}
                <div className="text-center mb-4 md:mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight font-serif italic" style={{ fontFamily: "'Cinzel', serif" }}>
                        {resolvedTitle}
                    </h2>
                </div>

                {/* Carousel Container */}
                <div className="relative flex items-center justify-center">

                    {/* Navigation Arrows */}
                    

                    

                    <div className="w-full flex justify-center">
                        <motion.div
                            className="flex items-center gap-2 md:gap-3"
                            animate={{ x: (Math.floor(resolvedItems.length / 2) - activeIndex) * (cardWidth + gap) }}
                            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                        >
                            {resolvedItems.map((item, idx) => {
                                const isActive = idx === activeIndex;
                                return (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        animate={{
                                            opacity: isActive ? 1 : 0.4,
                                            scale: isActive ? 1.05 : 0.85,
                                            zIndex: isActive ? 20 : 10,
                                            filter: isActive ? 'grayscale(0%)' : 'grayscale(80%)',
                                        }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                        className={`relative flex-shrink-0 cursor-pointer overflow-hidden rounded-[16px] md:rounded-[24px] border-[4px] md:border-[6px] border-white shadow-xl ${
                                            isActive ? 'w-[160px] h-[280px] md:w-[240px] md:h-[400px]' : 'w-[110px] h-[200px] md:w-[170px] md:h-[300px]'
                                        }`}
                                        onClick={() => {
                                            if (!isActive) {
                                                setActiveIndex(idx);
                                                return;
                                            }
                                            navigate(item.path);
                                        }}
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />

                                        {/* Pill Label */}
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
                                            <div className={`py-1.5 md:py-2 rounded-full bg-white/95 text-center shadow-md transition-all duration-500 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
                                                <span className="text-[9px] md:text-[12px] font-bold text-gray-800 tracking-tight whitespace-nowrap px-3 uppercase">
                                                    {item.title}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MenPickYourGlam;
