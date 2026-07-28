import React from 'react';
import ProductCard from '../components/ProductCard';
import { useShop } from '../../../context/ShopContext';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResetScroll } from '../../../hooks/useResetScroll';

const Wishlist = () => {
    useResetScroll();
    const { wishlist } = useShop();
    const safeWishlist = Array.isArray(wishlist) ? wishlist : [];
    const navigate = useNavigate();

    return (
        <div className="bg-white min-h-screen">
            {/* Back Button */}
            <div className="container mx-auto px-4 pt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[#D39A9F] hover:text-black transition-all group font-bold uppercase tracking-widest text-[10px]"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back
                </button>
            </div>
            {/* Page Header Removed as per request */}

            <div className="container mx-auto px-4 py-12">
                {safeWishlist.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center py-20 bg-[#FDF5F6] rounded-3xl border border-[#EBCDD0] shadow-sm"
                    >
                        <div className="w-24 h-24 bg-[#EBCDD0]/20 rounded-full flex items-center justify-center mb-8 shadow-inner border border-[#EBCDD0]">
                            <Heart className="w-10 h-10 text-[#D39A9F]" fill="none" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-4">Your Wishlist is Empty</h2>
                        <p className="text-gray-500 mb-10 max-w-sm leading-relaxed text-sm md:text-base">
                            Explore our collection and tap the heart icon to save the pieces you want to revisit here.
                        </p>
                        <Link
                            to="/shop"
                            className="bg-black text-white px-10 py-4 rounded-full hover:bg-[#D39A9F] transition-all duration-300 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs shadow-lg shadow-black/10 flex items-center gap-3 hover:-translate-y-1 active:scale-95"
                        >
                            <ArrowLeft className="w-4 h-4" /> Start Shopping
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 lg:gap-10">
                        <AnimatePresence mode="popLayout">
                            {safeWishlist.map((product, idx) => (
                                <motion.div
                                    key={product.id || product._id || product.slug || idx}
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    transition={{
                                        type: "spring",
                                        damping: 25,
                                        stiffness: 200,
                                        delay: idx * 0.05
                                    }}
                                    className="relative flex justify-center"
                                >
                                    <ProductCard product={product} isWishlistPage />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Aesthetic Footer Note */}
            {safeWishlist.length > 0 && (
                <div className="container mx-auto px-4 pb-20">
                    <div className="text-center pt-12 border-t border-gray-100">
                        <p className="text-[#D39A9F] text-xs font-semibold uppercase tracking-widest opacity-60">
                            Sands Jewels • Handcrafted Elegance
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wishlist;
