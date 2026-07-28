import React, { useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

// Assets
import silverChains from '@assets/categories/silverchains.png';
import menSilver from '@assets/categories/mensilver.png';
import rings from '@assets/categories/rings.png';
import earrings from '@assets/categories/earrings.png';
import brandVideo from '@assets/20260414-1037-04.7611184.mp4';

const collections = [
    {
        id: 1,
        title: "Pure Silver Essentials",
        video: brandVideo,
        link: "/shop?metal=silver",
        type: 'video'
    },
    {
        id: 2,
        title: "Elegant Silver Rings",
        image: rings,
        link: "/shop?category=Rings&metal=silver",
        type: 'image'
    },
    {
        id: 3,
        title: "Silver Chains Collection",
        image: silverChains,
        link: "/shop?category=Chains&metal=silver",
        type: 'image'
    },
    {
        id: 4,
        title: "Men's Silver Boutique",
        image: menSilver,
        link: "/shop?search=men&metal=silver",
        type: 'image'
    },
    {
        id: 5,
        title: "Dazzling Silver Earrings",
        image: earrings,
        link: "/shop?category=Earrings&metal=silver",
        type: 'image'
    },
    {
        id: 6,
        title: "Sterling Style Highlights",
        video: brandVideo,
        link: "/shop?metal=silver&sort=latest",
        type: 'video'
    }
];

const SilverCuratedShowcase = () => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['silver-curated'];

    const header = {
        title: sectionData?.settings?.title || 'Curated Highlights',
        subtitle: sectionData?.settings?.subtitle || 'Premium Silver Collections'
    };

    const items = useMemo(() => {
        const configured = Array.isArray(sectionData?.items) ? sectionData.items : [];
        if (configured.length > 0) {
            return configured.map(item => ({
                id: item.itemId || item.id,
                title: item.name || item.label,
                image: resolveLegacyCmsAsset(item.image, item.image),
                link: item.path || '/shop',
                type: item.type || (item.image?.endsWith('.mp4') ? 'video' : 'image')
            }));
        }
        return collections;
    }, [sectionData?.items]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = window.innerWidth > 768 ? 600 : 300;
            if (direction === 'left') {
                current.scrollLeft -= scrollAmount;
            } else {
                current.scrollLeft += scrollAmount;
            }
        }
    };

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll <= 0) {
                setActiveIndex(0);
                return;
            }
            const percentage = scrollLeft / maxScroll;
            const index = Math.round(percentage * (items.length - 1));
            setActiveIndex(Math.min(index, items.length - 1));
        }
    };

    const scrollToDot = (index) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (items.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    return (
        <section className="py-8 md:py-14 bg-white select-none overflow-hidden">
            <div className="w-full">

                <div className="text-center mb-8 md:mb-12 px-4">
                    <span className="inline-flex items-center rounded-none border border-pink-200/30 bg-[#FFF5F7] px-4 py-2.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-[#EC7798]">
                        {header.title}
                    </span>
                    <h2 className="mt-4 text-[26px] md:text-[36px] font-serif italic font-medium text-[#4A1015] tracking-tight">
                        {header.subtitle}
                    </h2>
                </div>

                <div className="relative group/main max-w-[1550px] mx-auto">

                    

                    

                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto gap-3 md:gap-5 pb-8 hide-scrollbar scroll-smooth snap-x snap-mandatory px-4"
                    >
                        {items.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: idx * 0.1 }}
                                onClick={() => navigate(item.link)}
                                className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] aspect-[4/5] relative group cursor-pointer overflow-hidden rounded-none bg-[#FDF4F6] snap-start shadow-md border border-gray-200"
                            >
                                {item.type === 'video' ? (
                                    <video
                                        src={item.image}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        preload="metadata"
                                        className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-110"
                                    />
                                ) : (
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="absolute inset-0 w-full h-full object-cover opacity-95 transition-transform duration-1000 group-hover:scale-110"
                                    />
                                )}

                                <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity" />

                                <div className="absolute bottom-6 left-6 right-6 text-white z-10 transition-all duration-300">
                                    <div className="flex items-center justify-between group/btn border-b border-white/20 pb-2">
                                        <h3 className="text-[11px] md:text-[13px] font-black tracking-[0.2em] uppercase leading-tight max-w-[85%]">
                                            {item.title}
                                        </h3>
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Carousel Dots */}
                    {items.length > 1 && (
                        <div className="flex justify-center items-center gap-2 pb-6 mt-2">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => scrollToDot(idx)}
                                    className={`transition-all duration-300 rounded-full ${
                                        activeIndex === idx 
                                        ? 'w-6 h-1.5 bg-[#4A1015]' 
                                        : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                                    }`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>
                {`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                `}
            </style>
        </section>
    );
};

export default SilverCuratedShowcase;

