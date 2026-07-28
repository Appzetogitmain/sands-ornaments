import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

import budget1000 from '../../../assets/promos/budget_1000.png';
import budget2000 from '../../../assets/promos/budget_2000.png';

const ShopByPrice = () => {
    const navigate = useNavigate();
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['luxury-within-reach'];

    const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
    const displayItems = configuredItems.length > 0
        ? configuredItems.map((item, index) => {
            const isFirst = index === 0;
            return {
                id: item.itemId || item._id || item.id || `price-${index}`,
                title: item.name || item.label || (isFirst ? 'UNDER INR 1000' : 'UNDER INR 1999'),
                image: resolveLegacyCmsAsset(item.image, isFirst ? budget1000 : budget2000),
                path: item.path || (item.priceMax ? `/shop?price_max=${item.priceMax}` : (isFirst ? '/shop?price_max=1000' : '/shop?price_max=1999'))
            };
        })
        : [
            {
                id: 'under-1000',
                title: 'UNDER INR 1000',
                image: budget1000,
                path: '/shop?price_max=1000'
            },
            {
                id: 'under-1999',
                title: 'UNDER INR 1999',
                image: budget2000,
                path: '/shop?price_max=1999'
            }
        ];

    return (
        <section className="pt-3 pb-0 md:pt-8 md:pb-0 bg-white">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="flex flex-col items-center mb-4 md:mb-6 text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block bg-[#9C5B61] text-white px-3.5 py-1 text-[9px] md:text-[10px] font-black tracking-[0.35em] uppercase mb-2 md:mb-2.5 rounded-sm shadow-sm"
                    >
                        GIFT THE EXCELLENCE
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl md:text-4xl font-serif text-gray-950 tracking-tight leading-none mb-3 md:mb-4"
                    >
                        Luxury <span className="italic font-light text-[#9C5B61]">within Reach</span>
                    </motion.h2>
                    <div className="w-12 h-[2px] bg-[#9C5B61]/30 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-[1100px] mx-auto">
                    {displayItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            whileHover={{ y: -6 }}
                            onClick={() => navigate(item.path)}
                            className="relative aspect-[16/8] md:aspect-[16/7] rounded-[24px] md:rounded-[28px] overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all duration-700"
                        >
                            <img
                                src={item.image}
                                alt={item.title}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                            />

                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-700" />
                            <div className="absolute inset-0 bg-[#9C5B61]/20 mix-blend-overlay group-hover:opacity-0 transition-opacity duration-700" />

                            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-center">
                                <div className="transform transition-transform duration-700 group-hover:translate-x-2">
                                    <h3 className="text-white font-serif text-2xl md:text-4xl tracking-tight mb-1.5 drop-shadow-lg">
                                        {item.title}
                                    </h3>
                                    <div className="h-[2.5px] w-8 bg-[#C9A24D] mb-2 group-hover:w-20 transition-all duration-700 rounded-full shadow-glow" />
                                </div>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none transform -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s]" />
                            <div className="absolute top-4 right-4 md:top-5 md:right-5 w-8 h-8 md:w-9 md:h-9 border-t-2 border-r-2 border-white/30 rounded-tr-lg group-hover:border-white/60 transition-colors duration-500" />
                        </motion.div>
                    ))}
                </div>
            </div>

        </section>
    );
};

export default ShopByPrice;
