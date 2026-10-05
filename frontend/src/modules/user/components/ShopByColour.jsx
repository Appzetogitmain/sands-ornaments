import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { resolveLegacyCmsAsset } from '../utils/legacyCmsAssets';

import silverHeartImg from '@assets/categories/gold_pendants.png';
import goldRingImg from '@assets/categories/rings.png';
import roseGoldBraceletImg from '@assets/categories/gold_bracelet.png';
import oxidisedRingsImg from '@assets/categories/earrings.png';

const METAL_STYLES = {
    silver: {
        color: 'bg-gradient-to-br from-[#E2E8F0] to-[#94A3B8]',
        badgeBg: 'bg-gradient-to-r from-gray-200 to-gray-400',
        path: '/shop?metal=silver'
    },
    gold: {
        color: 'bg-gradient-to-br from-[#FDE68A] to-[#D97706]',
        badgeBg: 'bg-gradient-to-r from-[#FDE68A] to-[#D97706]',
        path: '/shop?metal=gold'
    },
    'rose-gold': {
        color: 'bg-gradient-to-br from-[#FFD1DA] to-[#EE9CA7]',
        badgeBg: 'bg-gradient-to-r from-[#FFD1DA] to-[#EE9CA7]',
        path: '/shop?metal=rose-gold'
    },
    oxidised: {
        color: 'bg-gradient-to-br from-[#94A3B8] to-[#475569]',
        badgeBg: 'bg-gradient-to-r from-gray-300 to-gray-600',
        path: '/shop?metal=oxidised'
    }
};

const DEFAULT_COLOUR_CATEGORIES = [
    {
        id: 1,
        name: 'Pure 925 Silver',
        tag: 'Pure 925 Silver',
        image: silverHeartImg,
        metalKey: 'silver'
    },
    {
        id: 2,
        name: 'Gold Plated',
        tag: '18KT Gold Plated',
        image: goldRingImg,
        metalKey: 'gold'
    },
    {
        id: 3,
        name: 'Rose Gold Plated',
        tag: '18KT Rose Gold Plated',
        image: roseGoldBraceletImg,
        metalKey: 'rose-gold'
    },
    {
        id: 4,
        name: 'Oxidised Silver',
        tag: 'Pure 925 Silver',
        image: oxidisedRingsImg,
        metalKey: 'oxidised'
    }
];

const ShopByColour = () => {
    const { data: homepageSections = {} } = useHomepageCms();
    const sectionData = homepageSections?.['shop-by-colour'];

    const cards = useMemo(() => {
        const configuredItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const normalizedConfigured = configuredItems
            .filter((item) => Boolean(item?.image))
            .map((item, index) => {
                const defaultFallback = DEFAULT_COLOUR_CATEGORIES[index % DEFAULT_COLOUR_CATEGORIES.length];
                const metalKey = item.metalKey || item.metal || defaultFallback.metalKey;
                const metalStyle = METAL_STYLES[metalKey] || METAL_STYLES.silver;

                return {
                    id: item.itemId || item.id || `shop-by-colour-${index + 1}`,
                    name: item.name || item.label || defaultFallback.name,
                    tag: item.tag || '',
                    image: resolveLegacyCmsAsset(item.image, defaultFallback.image),
                    ...metalStyle
                };
            });

        if (normalizedConfigured.length > 0) return normalizedConfigured;

        return DEFAULT_COLOUR_CATEGORIES.map((item) => ({
            ...item,
            image: resolveLegacyCmsAsset(item.image, item.image),
            ...METAL_STYLES[item.metalKey]
        }));
    }, [sectionData?.items]);

    const sectionTitle = sectionData?.settings?.title || 'Shop by Colour';

    return (
        <section className="py-8 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1400px]">
                <div className="text-center mb-8">
                    <h2 className="font-serif text-2xl md:text-[30px] text-[#111] tracking-tight font-medium">
                        {sectionTitle}
                    </h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 lg:gap-14">
                    {cards.map((item) => (
                        <div key={item.id} className="group cursor-pointer">
                            <Link to={item.path} className="flex flex-col items-center">
                                <div className="relative w-full mb-8 group-hover:-translate-y-1 transition-transform duration-500">
                                    <div
                                        className="relative w-full aspect-[1.2/1] bg-[#F5E6D3] rounded-[24px] overflow-hidden"
                                        style={{
                                            WebkitMaskImage: 'radial-gradient(circle at 50% 100%, transparent 32px, black 32px)',
                                            maskImage: 'radial-gradient(circle at 50% 100%, transparent 32px, black 32px)'
                                        }}
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </div>

                                    {item.tag && (
                                        <div className="absolute top-0 left-5 z-20">
                                            <div className={`${item.badgeBg} backdrop-blur-sm px-3 py-1 rounded-b-xl flex items-center gap-1 shadow-sm border-x border-b border-black/5`}>
                                                <span className="text-[8px] md:text-[10px] font-bold text-gray-800 tracking-tight whitespace-nowrap">
                                                    {item.tag}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-30">
                                        <div className="w-14 h-14 md:w-[64px] md:h-[64px] rounded-full bg-white p-1.5 shadow-[0_8px_25px_rgba(0,0,0,0.1)] flex items-center justify-center">
                                            <div className={`w-full h-full rounded-full ${item.color} shadow-inner shadow-black/20`} />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-[15px] md:text-[18px] font-bold text-gray-900 tracking-tight text-center group-hover:text-black transition-colors">
                                    {item.name}
                                </h3>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ShopByColour;
