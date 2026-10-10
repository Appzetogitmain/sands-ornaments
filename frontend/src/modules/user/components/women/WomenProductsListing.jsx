import React, { useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../../../../context/ShopContext';
import { useAuth } from '../../../../context/AuthContext';
import { buildWomenShopPath, getWomenLoginRedirect, storeWomenPendingCartItem } from '../../utils/womenNavigation';
import toast from 'react-hot-toast';

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

const formatMoney = (value) => {
    const numeric = Math.round(Number(value || 0));
    return `\u20B9${numeric.toLocaleString('en-IN')}`;
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

const isWomenAudienceProduct = (product = {}) => {
    const audience = getProductAudience(product);
    return audience.includes('unisex') || audience.includes('women');
};

const normalizeIdValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
        return String(value._id || value.id || '').trim();
    }
    return String(value).trim();
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

const PINK = '#E8638A';
const PINK_BG = '#FFF0F4';

const WomenProductsListing = ({ sectionData = null }) => {
    const navigate = useNavigate();
    const { addToCart, products } = useContext(ShopContext);
    const { user } = useAuth();

    const resolvedSettings = useMemo(() => {
        const settings = sectionData?.settings || {};
        const sourceMode = settings.sourceMode === 'manual' ? 'manual' : 'category';
        const categoryFromPath = parseCategoryFromPath(sectionData?.items?.[0]?.path);
        const categoryId = String(settings.categoryId || categoryFromPath || '').trim();

        return {
            title: String(settings.title || "Women's Exclusives").trim() || "Women's Exclusives",
            productLimit: parsePositiveNumber(settings.productLimit, 8),
            sourceMode,
            categoryId,
            ctaLabel: String(settings.ctaLabel || "Explore All Women's Jewellery").trim() || "Explore All Women's Jewellery"
        };
    }, [sectionData]);

    const displayedProducts = useMemo(() => {
        const allProducts = Array.isArray(products) ? products : [];
        const sortedByLatest = [...allProducts]
            .filter(isWomenAudienceProduct)
            .sort((a, b) => productCreatedAt(b) - productCreatedAt(a));

        if (resolvedSettings.sourceMode === 'manual') {
            const pinnedIds = (sectionData?.items || [])
                .flatMap((item) => {
                    const list = [];
                    const primaryId = normalizeIdValue(item?.productId);
                    if (primaryId) list.push(primaryId);
                    if (Array.isArray(item?.productIds)) {
                        list.push(...item.productIds.map((id) => normalizeIdValue(id)).filter(Boolean));
                    }
                    return list;
                })
                .filter(Boolean);

            const pinnedMap = new Map(allProducts.map((product) => [String(product.id || product._id), product]));
            return pinnedIds
                .map((id) => pinnedMap.get(String(id)))
                .filter((p) => Boolean(p) && isWomenAudienceProduct(p))
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
        toast.success(`${product.name || 'Product'} added to your bag!`, {
            style: { background: PINK, color: '#fff', fontSize: '12px' },
            icon: '💖'
        });
        setTimeout(() => navigate('/cart'), 800);
    };

    if (displayedProducts.length === 0) return null;

    const ctaPath = buildWomenShopPath({
        filter: 'womens',
        category: resolvedSettings.sourceMode === 'category' ? resolvedSettings.categoryId : undefined
    });

    return (
        <section className="py-6 md:py-10" style={{ background: PINK_BG }}>
            <div className="container mx-auto px-4 md:px-8 max-w-[1500px]">
                <div className="text-center mb-6 md:mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                        style={{ background: `${PINK}22`, border: `1px solid ${PINK}44` }}
                    >
                        <Sparkles className="w-3.5 h-3.5" style={{ color: PINK }} />
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: PINK }}>For Her</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-serif text-zinc-900 tracking-tight mb-3"
                    >
                        {resolvedSettings.title}
                    </motion.h2>
                    <div className="w-20 h-1 mx-auto rounded-full" style={{ background: PINK }} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
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
                                <div className="relative aspect-square bg-[#F9F9F9] overflow-hidden mb-3" onClick={() => handleProductOpen(product)}>
                                    {idx < 3 && (
                                        <div className="absolute top-0 left-0 z-20">
                                            <div className="bg-[#E8638A] text-white text-[10px] font-bold px-3 py-1 flex items-center relative overflow-visible">
                                                Bestseller
                                                <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[10px] border-[#E8638A]" />
                                            </div>
                                        </div>
                                    )}

                                    <img
                                        src={product.image || product.images?.[0] || ''}
                                        alt={product.name || 'Product'}
                                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                    />

                                    <button className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-white/80 transition-all" type="button">
                                        <Heart className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                                    </button>

                                    <div className="absolute bottom-3 left-3 bg-[#F3F4F6]/90 backdrop-blur-sm px-2 py-0.5 rounded flex items-center gap-1 text-[10px] md:text-xs font-medium text-gray-700 shadow-sm">
                                        {Number(product.rating || 0).toFixed(1)} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span className="text-gray-300 mx-0.5">|</span>
                                        {Number(product.reviews || product.reviewCount || 0)}
                                    </div>
                                </div>

                                <div className="flex flex-col px-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base md:text-lg font-bold text-gray-900">{formatMoney(price)}</span>
                                        <span className="text-[10px] md:text-xs text-gray-400 line-through">{formatMoney(originalPrice)}</span>
                                    </div>
                                    <h3
                                        className="text-[12px] md:text-[14px] text-gray-600 font-medium mb-1.5 line-clamp-1 leading-tight hover:text-gray-900"
                                        onClick={() => handleProductOpen(product)}
                                    >
                                        {product.name}
                                    </h3>

                                    <p className="text-[10px] md:text-[11px] font-bold text-[#1E3A8A] mb-3 uppercase tracking-tight">
                                        {idx % 2 === 0 ? 'PRICE DROP!' : 'EXTRA 15% OFF with coupon'}
                                    </p>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToCart(product);
                                        }}
                                        className="w-full py-2.5 rounded-md font-bold text-[11px] md:text-[13px] text-gray-700 transition-all duration-300 transform active:scale-95 shadow-sm"
                                        style={{ background: '#FFE1E6' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD1D9'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#FFE1E6'; }}
                                        type="button"
                                    >
                                        {Array.isArray(product.variants) && product.variants.length > 1 ? 'Choose options' : 'Add to Cart'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="mt-10 md:mt-16 text-center">
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        onClick={() => navigate(ctaPath)}
                        className="px-12 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all shadow-lg hover:shadow-xl text-white"
                        style={{ background: PINK }}
                        type="button"
                    >
                        {resolvedSettings.ctaLabel}
                    </motion.button>
                </div>
            </div>
        </section>
    );
};

export default WomenProductsListing;
