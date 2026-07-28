import React, { useState } from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useShop } from '../../../context/ShopContext';
import { useAuth } from '../../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import latestRing from '@assets/latest_drop_ring.png';
import latestBracelet from '@assets/latest_drop_bracelet.png';
import latestNecklace from '@assets/latest_drop_necklace.png';
import latestEarrings from '@assets/latest_drop_earrings.png';
import newAnklets from '@assets/new_launch_anklets.png';

// Import high-end generated product shots for missing DB images
import premiumRingProduct from '@assets/premium_ring_product.png';
import premiumBraceletProduct from '@assets/premium_bracelet_product.png';
import premiumPendantProduct from '@assets/premium_pendant_product.png';
import premiumNecklaceProduct from '@assets/premium_necklace_product.png';

const fallbackProductMap = {
    ring: premiumRingProduct,
    pendant: premiumPendantProduct,
    necklace: premiumNecklaceProduct,
    bracelet: premiumBraceletProduct
};

const fallbackModelMap = {
    ring: latestRing,
    pendant: latestNecklace,
    earring: latestEarrings,
    bracelet: latestBracelet,
    anklet: newAnklets
};

import { getProductPrice, getProductMRP, formatCurrency } from '../utils/price';
import { getProductCardUrl } from '../../../utils/imageUtils';

const ProductCard = ({ product, isWishlistPage = false, requireLogin = false, loginSource = 'men' }) => {
    const { addToCart, addToWishlist, removeFromWishlist, wishlist } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [flying, setFlying] = useState(false);
    const [flyingType, setFlyingType] = useState('cart'); // 'cart' or 'heart'

    const safeWishlist = Array.isArray(wishlist) ? wishlist : [];
    const isWishlisted = safeWishlist.some(item => (item.id || item._id) === (product.id || product._id));

    // Dynamic Image Resolution
    const productImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const variantImages = Array.isArray(product.variants)
        ? product.variants.flatMap((v) => (Array.isArray(v?.variantImages) ? v.variantImages : [])).filter(Boolean)
        : [];

    const dbImages = productImages.length > 0 ? productImages : variantImages;

    const resolvePrimaryImage = () => {
        if (dbImages[0]) return dbImages[0];
        const categoryData = product.category;
        const categoryName = (typeof categoryData === 'object' ? categoryData?.name : categoryData) || '';
        const searchStr = String(categoryName + ' ' + (product.name || '')).toLowerCase();
        if (searchStr.includes('ring')) return fallbackProductMap.ring;
        if (searchStr.includes('necklace') || searchStr.includes('choker') || searchStr.includes('set')) return fallbackProductMap.necklace;
        if (searchStr.includes('pendant') || searchStr.includes('chain')) return fallbackProductMap.pendant;
        if (searchStr.includes('bracelet')) return fallbackProductMap.bracelet;
        return null;
    };

    const primaryImage = resolvePrimaryImage();

    const resolveSecondaryImage = () => {
        if (productImages.length >= 2) return productImages[1];
        if (productImages.length === 0) {
            const variantHover = variantImages.find((img) => img && img !== primaryImage);
            if (variantHover) return variantHover;
        }
        if (!dbImages[0]) {
            const categoryData = product.category;
            const categoryName = (typeof categoryData === 'object' ? categoryData?.name : categoryData) || '';
            const searchStr = String(categoryName + ' ' + (product.name || '')).toLowerCase();
            if (searchStr.includes('ring')) return fallbackModelMap.ring;
            if (searchStr.includes('necklace') || searchStr.includes('choker') || searchStr.includes('set')) return fallbackModelMap.pendant;
            if (searchStr.includes('pendant') || searchStr.includes('chain')) return fallbackModelMap.pendant;
            if (searchStr.includes('earring')) return fallbackModelMap.earring;
            if (searchStr.includes('bracelet')) return fallbackModelMap.bracelet;
            if (searchStr.includes('anklet')) return fallbackModelMap.anklet;
        }
        return null;
    };
    const secondaryImage = resolveSecondaryImage();

    // Use Centralized Price Logic
    const effectivePrice = getProductPrice(product);
    const effectiveOriginalPrice = getProductMRP(product);

    const reviewCount = Number(product.reviewCount ?? product.reviews ?? 0);

    const handleProductOpen = () => {
        navigate(`/product/${product.id || product._id}`);
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (product.status === 'Draft' || product.active === false) {
            toast.error("This product is currently unavailable");
            return;
        }
        setFlyingType('cart');
        setFlying(true);
        addToCart(product);
        setTimeout(() => {
            setFlying(false);
            toast.success('Added to cart!', { icon: '🛒' });
        }, 800);
    };

    const handleWishlist = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isWishlisted) {
            setFlyingType('heart');
            setFlying(true);
            addToWishlist(product);
            setTimeout(() => setFlying(false), 800);
        } else {
            removeFromWishlist(product.id || product._id);
        }
    };

    return (
        <>
            {/* Flying Image Animation Element — keyframes are in index.css */}
            {flying && primaryImage && (
                <img
                    src={primaryImage}
                    alt=""
                    className={`fixed z-[9999] w-48 h-48 object-cover shadow-2xl pointer-events-none border-4 border-white ${flyingType === 'cart' ? 'animate-fly-cart' : 'animate-fly-heart'}`}
                    style={{ left: '50%', top: '50%' }}
                />
            )}

            <div className="group/card relative w-full flex flex-col bg-white overflow-hidden cursor-pointer" onClick={handleProductOpen}>
                <div className="relative aspect-square overflow-hidden bg-gray-50 rounded-none mb-3">
                    {primaryImage ? (
                        <>
                            <img
                                src={getProductCardUrl(primaryImage)}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover/card:scale-105"
                            />
                            {secondaryImage && (
                                <img
                                    src={getProductCardUrl(secondaryImage)}
                                    alt={`${product.name} detail`}
                                    loading="lazy"
                                    decoding="async"
                                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/card:opacity-100 transition-opacity duration-[1.2s] ease-in-out"
                                />
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 text-[10px] uppercase tracking-widest font-bold">
                            Sands Ornament
                        </div>
                    )}

                    {/* Dynamic Urgency Badges */}
                    <div className="absolute top-0 left-0 flex flex-col gap-0.5 md:gap-1 z-10">
                        {(product.isTrending || product.tags?.isTrending) && (
                            <div className="bg-[#E89BA8] text-white text-[7px] md:text-[9px] font-bold md:font-black px-1.5 md:px-2 py-0.5 md:py-1 uppercase tracking-widest shadow-sm">
                                Bestseller
                            </div>
                        )}
                        {(product.tags?.isNewArrival || product.tags?.isNewLaunch) && (
                            <div className="bg-emerald-500 text-white text-[7px] md:text-[9px] font-bold md:font-black px-1.5 md:px-2 py-0.5 md:py-1 uppercase tracking-widest shadow-sm">
                                New Arrival
                            </div>
                        )}
                        {product.tags?.isMostGifted && (
                            <div className="bg-[#3E2723] text-white text-[7px] md:text-[9px] font-bold md:font-black px-1.5 md:px-2 py-0.5 md:py-1 uppercase tracking-widest shadow-sm">
                                Most Gifted
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleWishlist}
                        className={`absolute top-1 md:top-2 right-1 md:right-2 z-20 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all transform hover:scale-110 ${isWishlisted ? 'text-[#8E2B45]' : 'text-gray-400 hover:text-rose-500'}`}
                        title="Add to Wishlist"
                    >
                        <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    </button>

                    <button
                        onClick={handleAddToCart}
                        className="absolute top-1 md:top-2 right-8 md:right-12 z-20 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all transform hover:scale-110 text-gray-400 hover:text-[#8E2B45]"
                        title="Add to Cart"
                    >
                        <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>

                    <div className="absolute bottom-2 left-2 z-10 bg-white/95 px-1.5 py-0.5 rounded-sm flex items-center gap-1 shadow-sm border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-800">{product.rating || 4.5}</span>
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                        <div className="w-px h-2.5 bg-gray-300 mx-0.5" />
                        <span className="text-[10px] text-gray-500">{reviewCount || 0}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center px-1.5 py-1.5 md:px-2 md:py-2">
                    <div className="flex items-center justify-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                        <span className="text-[14px] md:text-[17px] font-bold md:font-extrabold text-gray-900 tracking-tight font-sans">
                            {formatCurrency(effectivePrice)}
                        </span>
                        {effectiveOriginalPrice > effectivePrice && (
                            <span className="text-[11px] md:text-[13px] text-gray-400 line-through font-normal md:font-medium opacity-70">
                                {formatCurrency(effectiveOriginalPrice)}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="text-[9px] md:text-[11px] text-gray-500 line-clamp-1 group-hover/card:text-black transition-colors font-normal md:font-medium uppercase tracking-[0.05em] md:tracking-[0.08em] overflow-hidden mb-1.5 md:mb-2 text-center">
                        {product.name}
                    </h3>

                    {(product.priceDrop || (effectiveOriginalPrice > effectivePrice)) && (
                        <div className="mb-1.5 md:mb-2 flex items-center justify-center">
                            <span className="px-1.5 md:px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] md:text-[9px] font-bold md:font-black uppercase tracking-widest rounded-full border border-blue-100 shadow-sm">
                                PRICE DROP!
                            </span>
                        </div>
                    )}
                    
                    <div className="w-full mt-1 md:mt-2">
                        <button 
                            onClick={handleProductOpen}
                            className="w-full bg-[#8E2B45] text-white font-semibold md:font-bold text-[9px] md:text-[11px] py-1.5 md:py-2 rounded-none hover:bg-[#722237] transition-all duration-300 uppercase tracking-[0.1em] md:tracking-[0.15em] active:scale-[0.98] flex items-center justify-center gap-1 md:gap-2"
                        >
                            Shop Now
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProductCard;
