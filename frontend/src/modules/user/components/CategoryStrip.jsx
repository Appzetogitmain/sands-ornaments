
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import images from assets
import cashewImg from '@assets/cashew.png';
import pistaImg from '@assets/pista.png';
import walnutImg from '@assets/walnut.png';
import datesImg from '@assets/dates.png';
import almondImg from '@assets/baadaam.png';
import anjeerImg from '@assets/anjeer.png';
import raisinImg from '@assets/raisin.png';


const categories = [
    {
        name: 'Cashew (Kaju)',
        color: 'bg-[#006071]',
        image: cashewImg,
        path: '/category/cashew-(kaju)'
    },
    {
        name: 'Pista (Pistachio)',
        color: 'bg-[#67705B]',
        image: pistaImg,
        path: '/category/pistachio-(pista)'
    },
    {
        name: 'Walnut (Akhrot)',
        color: 'bg-[#902D45]',
        image: walnutImg,
        path: '/category/walnuts-(akhrot)'
    },
    {
        name: 'Dates (Khajur)',
        color: 'bg-[#7E3021]',
        image: datesImg,
        path: '/category/wet-dates-(khajur)'
    },
    {
        name: 'Badam (Almond)',
        color: 'bg-[#C08552]',
        image: almondImg,
        path: '/category/almonds-(badam)'
    },
    {
        name: 'Anjeer (Figs)',
        color: 'bg-[#7D5A5A]',
        image: anjeerImg,
        path: '/category/dried-figs-(anjeer)'
    },
    {
        name: 'Raisin (Kishmish)',
        color: 'bg-[#A68966]',
        image: raisinImg,
        path: '/category/raisins-(kishmish)'
    }
];

const CategoryStrip = () => {
    const scrollRef = useRef(null);
    const navigate = useNavigate();

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <section className="bg-white py-6 md:py-10 px-4 md:px-12 relative overflow-hidden">
            <div className="container mx-auto">
                <div className="text-center mb-4 md:mb-6 space-y-1 md:space-y-2">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-primary font-bold tracking-[0.3em] uppercase text-[10px] block opacity-80"
                    >
                        Fresh from Farm
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-['Poppins'] font-bold text-footerBg tracking-tight"
                    >
                        Shop By <span className="text-primary">Category</span>
                    </motion.h2>
                    <div className="w-12 h-1 bg-primary mx-auto rounded-full mt-1" />
                </div>

                <div className="relative flex items-center group">
                    {/* Scroll Navigation */}
                    

                    <motion.div
                        ref={scrollRef}
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="flex gap-2 md:gap-14 overflow-x-auto no-scrollbar scroll-smooth px-2 md:px-12 py-1 md:py-10 items-center w-full"
                    >
                        {categories.map((cat, index) => (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                                onClick={() => navigate(cat.path)}
                                className="relative min-w-[160px] md:min-w-[280px] h-14 md:h-24 flex items-center cursor-pointer group/item flex-shrink-0"
                            >
                                {/* Elongated Pill Background */}
                                <div className={`absolute right-0 w-[90%] md:w-[85%] h-[80%] md:h-[70%] ${cat.color} rounded-full flex items-center justify-center shadow-md border border-white/10 pl-14 md:pl-20 pr-4 md:pr-6 overflow-hidden transition-all duration-500 group-hover/item:shadow-2xl group-hover/item:border-white/30`}>
                                    <span className="text-white font-black text-[9px] md:text-[15px] tracking-widest uppercase text-center leading-tight drop-shadow-lg z-10">
                                        {cat.name}
                                    </span>
                                    {/* Reflection/Shine Effect */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-150%] group-hover/item:translate-x-[150%] transition-transform duration-1000"
                                    />
                                </div>

                                {/* Popping Product Image */}
                                <motion.div
                                    animate={{
                                        y: [0, -5, 0],
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: index * 0.2
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 md:w-32 md:h-32 z-10 flex items-center justify-center"
                                >
                                    <motion.img
                                        whileHover={{ scale: 1.15, rotate: 5 }}
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.15)] group-hover/item:drop-shadow-[0_20px_30px_rgba(0,0,0,0.25)] transition-all duration-500"
                                        onError={(e) => {
                                            e.target.src = 'https://cdn-icons-png.flaticon.com/512/3592/3592864.png';
                                        }}
                                    />
                                </motion.div>
                            </motion.div>
                        ))}
                    </motion.div>

                    
                </div>
            </div>
        </section>
    );
};

export default CategoryStrip;

