import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/price';

const RecentlyViewed = () => {
    const [items, setItems] = useState([]);
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        setItems(recentlyViewed);
    }, []);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
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
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const percentage = index / (items.length - 1 || 1);
            container.scrollTo({
                left: percentage * maxScroll,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="mt-8 px-4 max-w-7xl mx-auto mb-20">
            <div className="flex items-end justify-between mb-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-[#D39A9F] uppercase tracking-[0.4em] mb-2">Continue Exploring</span>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-black tracking-tight">Recently Viewed</h2>
                </div>
                <button
                    onClick={() => navigate('/shop')}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#9C5B61] transition-colors group"
                >
                    View All Designs <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto gap-4 md:gap-8 pb-4 no-scrollbar snap-x scroll-smooth"
            >
                {items.map((item, idx) => (
                    <div
                        key={`${item.id}-${idx}`}
                        onClick={() => {
                            navigate(`/product/${item.id}`);
                            window.scrollTo(0, 0);
                        }}
                        className="w-[100px] md:w-[140px] shrink-0 group cursor-pointer snap-start"
                    >
                        <div className="aspect-square rounded-[1rem] md:rounded-[1.5rem] overflow-hidden bg-[#FDF5F6] border border-gray-100 relative shadow-sm group-hover:shadow-xl transition-all duration-700">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                            {/* Quick Action Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-500">
                                    <Sparkles className="w-4 h-4 text-[#D39A9F]" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 px-2">
                            <h3 className="text-[10px] md:text-xs font-bold text-gray-900 uppercase tracking-widest line-clamp-1 group-hover:text-[#9C5B61] transition-colors">
                                {item.name}
                            </h3>
                            <p className="text-[10px] md:text-sm font-black text-[#8E2B45] mt-1">
                                {formatCurrency(item.price)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Carousel Dots */}
            {items.length > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    {items.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => scrollToDot(idx)}
                            className={`transition-all duration-300 rounded-full ${
                                activeIndex === idx 
                                ? 'w-6 h-1.5 bg-[#8E2B45]' 
                                : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-400'
                            }`}
                            aria-label={`Go to item ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentlyViewed;
