import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildWomenShopPath } from '../../utils/womenNavigation';
import { resolveLegacyCmsAsset } from '../../utils/legacyCmsAssets';

// Import local images
import TempleDateImg from '@assets/occasions/TempleDate.png';
import GirlOutingImg from '@assets/occasions/GirlOuting.png';
import DateNightImg from '@assets/occasions/DateNight.png';
import PartyGlamImg from '@assets/occasions/PartyGlam.png';
import GotHitchedImg from '@assets/occasions/GotHitched.png';

const fallbackOccasions = [
    {
        id: 'women-occasion-1',
        title: "Temple Date",
        image: TempleDateImg,
        path: buildWomenShopPath({ filter: 'womens', category: 'pendants' })
    },
    {
        id: 'women-occasion-2',
        title: "Girl Outing",
        image: GirlOutingImg,
        path: buildWomenShopPath({ filter: 'womens', category: 'earrings' })
    },
    {
        id: 'women-occasion-3',
        title: "Date Night",
        image: DateNightImg,
        path: buildWomenShopPath({ filter: 'womens', category: 'sets' })
    },
    {
        id: 'women-occasion-4',
        title: "Party Glam",
        image: PartyGlamImg,
        path: buildWomenShopPath({ filter: 'womens', category: 'chains' })
    },
    {
        id: 'women-occasion-5',
        title: "Got Hitched",
        image: GotHitchedImg,
        path: buildWomenShopPath({ filter: 'womens', category: 'anklets' })
    }
];

const WomenOccasionCarousel = ({ sectionData }) => {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);
    const occasions = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const normalized = configuredItems
            .map((item, index) => ({
                id: item.itemId || item.id || `women-occasion-${index + 1}`,
                title: item.name || item.label || `Occasion ${index + 1}`,
                image: resolveLegacyCmsAsset(item.image, fallbackOccasions[index]?.image || ''),
                path: item.path || fallbackOccasions[index]?.path || buildWomenShopPath({ filter: 'womens' })
            }))
            .filter((item) => Boolean(item.title) && Boolean(item.image) && Boolean(item.path));
        return normalized.length > 0 ? normalized : fallbackOccasions;
    }, [sectionData]);
    const focusIndex = useMemo(() => Math.floor((Math.max(occasions.length, 1) - 1) / 2), [occasions.length]);
    const [activeIndex, setActiveIndex] = useState(focusIndex);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setActiveIndex((prev) => {
            if (occasions.length <= 0) return 0;
            if (prev >= occasions.length) return focusIndex;
            return prev;
        });
    }, [focusIndex, occasions.length]);

    const cardWidth = isMobile ? 120 : 180;
    const gap = isMobile ? 8 : 12;

    const next = () => setActiveIndex((prev) => (prev + 1) % occasions.length);
    const prev = () => setActiveIndex((prev) => (prev - 1 + occasions.length) % occasions.length);

    if (occasions.length === 0) return null;

    return (
        <section className="py-6 md:py-10 bg-[#FBF0F2] overflow-hidden select-none">
            <div className="container mx-auto px-4 max-w-[1200px]">
                <div className="text-center mb-6 md:mb-10">
                    <h3 className="text-2xl md:text-3xl font-bold text-[#333] tracking-tight font-serif italic" style={{ fontFamily: "'Cinzel', serif" }}>
                        {sectionData?.label || 'Shop by Occasion'}
                    </h3>
                </div>

                <div className="relative flex items-center justify-center">
                    {/* Navigation - Compact Style */}
                    
                    

                    <div className="w-full flex justify-center">
                        <motion.div
                            className="flex items-center gap-2 md:gap-3"
                            animate={{ x: (focusIndex - activeIndex) * (cardWidth + gap) }}
                            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                        >
                            {occasions.map((item, idx) => {
                                const isActive = idx === activeIndex;
                                return (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        animate={{
                                            opacity: isActive ? 1 : 0.4,
                                            scale: isActive ? 1.05 : 0.85,
                                            zIndex: isActive ? 20 : 10,
                                            filter: isActive ? 'none' : 'grayscale(60%)',
                                        }}
                                        transition={{ duration: 0.5 }}
                                        className={`relative flex-shrink-0 cursor-pointer overflow-hidden rounded-[20px] md:rounded-[32px] border-[4px] md:border-[6px] border-white shadow-xl ${
                                            isActive ? 'w-[180px] h-[280px] md:w-[260px] md:h-[400px]' : 'w-[120px] h-[200px] md:w-[180px] md:h-[300px]'
                                        }`}
                                        onClick={() => {
                                            if (isActive) navigate(item.path);
                                            else setActiveIndex(idx);
                                        }}
                                    >
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
                                            <div className={`py-1.5 md:py-2.5 rounded-full bg-white/95 text-center shadow-md transition-all duration-500 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                                <span className="text-[10px] md:text-[14px] font-bold text-gray-800 tracking-tight uppercase whitespace-nowrap px-3">
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

export default WomenOccasionCarousel;
