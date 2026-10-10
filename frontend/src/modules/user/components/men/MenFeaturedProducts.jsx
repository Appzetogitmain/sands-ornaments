import React, { useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../../../../context/ShopContext';
import { useAuth } from '../../../../context/AuthContext';
import { buildMenShopPath, getMenLoginRedirect, storeMenPendingCartItem } from '../../utils/menNavigation';
import toast from 'react-hot-toast';

// Backend-driven featured products for men

const normalizeToken = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parsePositiveNumber = (value, fallback = 8) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const parseCategoryFromPath = (path = '') => {
    const source = String(path || '');
    if (!source.includes('category=')) return '';
    const raw = source.split('category=')[1]?.split('&')[0] || '';
    try {
        return decodeURIComponent(raw).trim();
    } catch {
        return raw.trim();
    }
};

const formatMoney = (value) => {
    const numeric = Math.round(Number(value || 0));
    return `\u20B9${numeric.toLocaleString('en-IN')}`;
};

const getProductPrice = (product = {}) => {
    const topLevel = [
        product.finalPrice,
        product.price,
        product.originalPrice,
        product.mrp
    ]
        .map((value) => Number(value))
        .find((value) => Number.isFinite(value) && value > 0);
    if (topLevel) return topLevel;

    const variantPrices = (product.variants || [])
        .map((variant) => Number(variant.finalPrice ?? variant.price ?? variant.mrp ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0);
    if (variantPrices.length > 0) return Math.min(...variantPrices);
    return 0;
};

const getProductOriginalPrice = (product = {}) => {
    const variantMrps = (product.variants || [])
        .map((variant) => Number(variant.mrp ?? variant.originalPrice ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0);
    if (variantMrps.length > 0) return Math.max(...variantMrps);

    const fallback = Number(product.originalPrice ?? product.mrp ?? 0);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : getProductPrice(product);
};

const productCreatedAt = (product = {}) => {
    const ts = product.createdAt || product.updatedAt || '';
    const date = ts ? new Date(ts).getTime() : 0;
    if (date) return date;
    const id = String(product._id || product.id || '');
    return id ? parseInt(id.substring(0, 8), 16) || 0 : 0;
};

const getProductAudience = (product = {}) => {
    const list = Array.isArray(product?.audience) ? product.audience : [];
    return list.length > 0 ? list.map(normalizeToken) : ['unisex'];
};

const isMenAudienceProduct = (product = {}) => {
    const audience = getProductAudience(product);
    return audience.includes('unisex') || audience.includes('men');
};

const matchesCategory = (product = {}, categoryId = '') => {
    const target = normalizeToken(categoryId);
    if (!target) return true;
    const categoryTokens = new Set([
        normalizeToken(product.categoryId),
        normalizeToken(product.category),
        normalizeToken(product.categorySlug),
        ...((product.navShopByCategory || []).map((id) => normalizeToken(id)))
    ].filter(Boolean));
    return categoryTokens.has(target);
};

const discountTextFor = (product) => {
    const price = getProductPrice(product);
    const original = getProductOriginalPrice(product);
    if (original > price && original > 0) {
        const offPct = Math.round(((original - price) / original) * 100);
        if (offPct > 0) return `${offPct}% OFF`;
    }
    return 'Best Price';
};

const MenFeaturedProducts = ({ sectionData }) => {
    const navigate = useNavigate();
    const { addToCart, products } = useContext(ShopContext);
    const { user } = useAuth();

    const redirectToLogin = () => {
        toast.error('Please login to continue');
        navigate(getMenLoginRedirect());
    };

    const resolvedSettings = useMemo(() => {
        const settings = sectionData?.settings || {};
        return {
            title: settings.title || "Men's Exclusive",
            productLimit: parsePositiveNumber(settings.productLimit, 8),
            sourceMode: settings.sourceMode === 'manual' ? 'manual' : 'category',
            categoryId: settings.categoryId || parseCategoryFromPath(sectionData?.items?.[0]?.path) || '',
            ctaLabel: 'View All Collection'
        };
    }, [sectionData]);

    const displayedProducts = useMemo(() => {
        const allProducts = Array.isArray(products) ? products : [];
        // "navGiftsFor/navOccasions" legacy placement tags are retired. Men sections are now driven by:
        // - CMS pinned products (manual), or
        // - CMS category selection (category mode).
        const sortedByLatest = [...allProducts]
            .filter(isMenAudienceProduct)
            .sort((a, b) => productCreatedAt(b) - productCreatedAt(a));

        if (resolvedSettings.sourceMode === 'manual') {
            const pinnedIds = (sectionData?.items || [])
                .flatMap((item) => {
                    const list = [];
                    if (item?.productId) list.push(String(item.productId));
                    if (Array.isArray(item?.productIds)) {
                        list.push(...item.productIds.map((id) => String(id)));
                    }
                    return list;
                })
                .filter(Boolean);

            const pinnedMap = new Map(allProducts.map((product) => [String(product.id || product._id), product]));
            return pinnedIds
                .map((id) => pinnedMap.get(String(id)))
                .filter((p) => Boolean(p) && isMenAudienceProduct(p))
                .slice(0, resolvedSettings.productLimit);
        }

        const categoryFiltered = resolvedSettings.categoryId
            ? sortedByLatest.filter((product) => matchesCategory(product, resolvedSettings.categoryId))
            : sortedByLatest;

        return categoryFiltered.slice(0, resolvedSettings.productLimit);
    }, [products, resolvedSettings, sectionData?.items]);

    const handleProductOpen = (product) => {
        navigate(`/product/${product.id || product._id}`);
    };

    const handleAddToCart = (product) => {
        addToCart(product);
        toast.success(`${product.name || 'Product'} added to cart!`);
        setTimeout(() => navigate('/cart'), 800);
    };

    if (displayedProducts.length === 0) {
        return null;
    }

    return (
        <section className="py-4 md:py-16 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1400px]">
                <div className="text-center mb-6 md:mb-12">
                    <h2 className="text-[30px] md:text-[40px] font-medium text-gray-900 tracking-tight" style={{ fontFamily: "'Lato', sans-serif" }}>
                        {resolvedSettings.title}
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-7">
                    {displayedProducts.map((product, idx) => {
                        const price = getProductPrice(product);
                        const originalPrice = getProductOriginalPrice(product);
                        return (
                            <motion.div
                                key={product.id || product._id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                                className="bg-white group cursor-pointer"
                            >
                                <div className="relative aspect-square bg-[#FBFBFB] overflow-hidden mb-3 md:mb-3.5" onClick={() => handleProductOpen(product)}>
                                    <img
                                        src={product.image || product.images?.[0] || ''}
                                        alt={product.name}
                                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <button className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-white/80 transition-all" type="button">
                                        <Heart className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                                    </button>

                                    <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-[#F3F4F6]/90 backdrop-blur-sm px-2 py-1 md:px-2.5 md:py-1 rounded flex items-center gap-1 text-[10px] md:text-xs font-medium text-gray-700 shadow-sm">
                                        {Number(product.rating || 0).toFixed(1)} <Star className="w-2 h-2 md:w-3 md:h-3 fill-amber-400 text-amber-400" />
                                        <span className="text-gray-300 mx-0.5">|</span>
                                        {Number(product.reviews || 0)}
                                    </div>
                                </div>

                                <div className="flex flex-col px-1.5">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm md:text-[18px] font-bold text-gray-900 leading-tight">{formatMoney(price)}</span>
                                        <span className="text-[11px] md:text-[13px] text-gray-400 line-through">{formatMoney(originalPrice)}</span>
                                    </div>
                                    <h3 className="text-[12px] md:text-[15px] text-gray-600 font-medium mb-1.5 line-clamp-2 leading-snug hover:text-gray-900 min-h-[34px] md:min-h-[44px]" onClick={() => handleProductOpen(product)}>
                                        {product.name}
                                    </h3>

                                    <p className="text-[10px] md:text-[11px] font-bold text-[#2B6CB0] mb-2.5 md:mb-3 uppercase tracking-tight leading-tight">
                                        {discountTextFor(product)}
                                    </p>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToCart(product);
                                        }}
                                        className="w-full py-2 md:py-3 rounded-md font-bold text-[11px] md:text-[14px] text-gray-700 transition-all duration-300 transform active:scale-95"
                                        style={{ background: '#FFE1E6' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FFD1D9'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#FFE1E6'}
                                        type="button"
                                    >
                                        {Array.isArray(product.variants) && product.variants.length > 1 ? 'Choose options' : 'Add to Cart'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="mt-8 md:mt-12 text-center">
                    <button
                        onClick={() => navigate(buildMenShopPath())}
                        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#3E2723] text-white text-xs md:text-sm font-bold uppercase tracking-[0.16em] hover:bg-[#5a3d36] transition-colors"
                        type="button"
                    >
                        {resolvedSettings.ctaLabel}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default MenFeaturedProducts;
