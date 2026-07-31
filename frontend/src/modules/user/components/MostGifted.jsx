import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../../context/ShopContext';
import { useHomepageCms } from '../hooks/useHomepageCms';
import ProductCard from './ProductCard';
import { matchesRequestedMetal } from '../utils/productMetal';
import bannerModel from '@assets/gift_wife_silver.png';

const defaultHeroItem = {
    id: 'hero',
    type: 'hero',
    name: 'Most Gifted Items',
    label: 'Most Gifted Items',
    image: bannerModel,
    path: '/shop?sort=most-sold',
    tag: 'Collection Focus',
    ctaLabel: 'Explore Collection'
};

const MostGifted = () => {
    const { products } = useShop();
    const { data: homepageSections = {} } = useHomepageCms();
    const scrollRef = React.useRef(null);

    const sectionData = homepageSections?.['most-gifted'];

    // Normalize products for display
    const displayProducts = React.useMemo(() => {
        const list = Array.isArray(products) ? products : [];
        const valid = list.filter((p) => (p?.id || p?._id) && p?.name);

        // Home (/) is the Silver landing page. Keep this section silver-safe.
        const silverOnly = valid.filter((product) => matchesRequestedMetal(product, 'silver'));

        return [...silverOnly]
            .sort((a, b) => {
                const aScore = Number(a?.reviewCount || a?.reviews || 0) + (Number(a?.rating || 0) * 10);
                const bScore = Number(b?.reviewCount || b?.reviews || 0) + (Number(b?.rating || 0) * 10);
                return bScore - aScore;
            })
            .slice(0, 12);
    }, [products]);

    const heroItem = {
        ...defaultHeroItem,
        image: bannerModel,
        tag: "Bestseller Focus",
        label: sectionData?.label || "Most Gifted Items",
        ctaLabel: "Shop All Gifts"
    };

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft } = scrollRef.current;
            const scrollAmount = window.innerWidth > 768 ? 400 : 250;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };
    return (


        <section className="py-12 bg-white relative overflow-hidden">



            {/* Live Floating Particles Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -50, 0],
                            opacity: [0.1, 0.2, 0.1],
                        }}
                        transition={{
                            duration: 15,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 2
                        }}
                        className="absolute w-64 h-64 bg-pink-100/30 blur-[100px] rounded-full"
                        style={{
                            left: `${Math.random() * 80}%`,
                            top: `${Math.random() * 80}%`
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="flex flex-col lg:flex-row gap-8 lg:h-[550px]">

                    {/* Cinematic Feature Banner */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.2 }}
                        className="w-full lg:w-[35%] relative rounded-[2.5rem] overflow-hidden group shadow-2xl h-[320px] lg:h-full cursor-pointer isolate shrink-0"
                    >
                        <motion.img
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 10, repeat: Infinity }}
                            src={heroItem.image}
                            alt="Most Gifted"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

                        <div className="absolute inset-0 flex flex-col justify-end p-8 z-30 pb-12">
                            <span className="text-[#C9A24D] text-[10px] font-bold tracking-[0.4em] uppercase mb-2 block">{heroItem.tag}</span>
                            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-6 leading-tight uppercase tracking-wider">
                                {heroItem.label}
                            </h2>
                            <Link
                                to="/shop?sort=most-sold"
                                className="inline-flex items-center gap-3 bg-white text-black px-6 py-3 rounded-none hover:bg-[#8E2B45] hover:text-white transition-all duration-500 w-fit text-[10px] font-bold tracking-widest uppercase shadow-lg"
                            >
                                {heroItem.ctaLabel}
                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </motion.div>

                    {/* Product Showcase */}
                    <div className="w-full lg:w-[65%] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4">
                                <h2 className="text-[20px] md:text-[24px] font-sans font-medium text-gray-900 tracking-tight">
                                    Our Most Gifted
                                </h2>
                                <Link to="/shop?sort=most-sold" className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E4A50] hover:underline transition-all">
                                    View All Gifts
                                </Link>
                            </div>
                            <div className="hidden md:flex gap-2">
                                <button onClick={() => scroll('left')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <button onClick={() => scroll('right')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div ref={scrollRef} className={`flex gap-6 overflow-x-auto no-scrollbar pb-6 snap-x snap-mandatory ${displayProducts.length === 1 ? 'justify-center' : ''}`}>
                            {displayProducts.map((product) => (
                                <div key={product.id} className="min-w-[180px] md:min-w-[280px] w-[180px] md:w-[280px] snap-start">
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </section>
    );
};

export default MostGifted;

