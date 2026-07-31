import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart, User, Users, BookOpen, Menu, X, ChevronDown, ChevronRight, Bell, Sparkles, Coins, Gem, Droplet, LifeBuoy, Sun, Hexagon, Gift, MoreHorizontal, ShoppingBag } from 'lucide-react';
import { useShop } from '../../../context/ShopContext';
import { useNotification } from '../../../context/NotificationContext';
import logo from '@assets/logooo.jpg';
import api from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductPrice, formatCurrency } from '../utils/price';
import { getSearchThumbUrl } from '../../../utils/imageUtils';

const Navbar = () => {
    const {
        cart,
        wishlist,
        user,
        pincode,
        setIsPincodeModalOpen,
        activeMetal,
        updateActiveMetal
    } = useShop();

    const { unreadCount } = useNotification();

    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Reset search term when navigating away from the shop search route or if query is empty
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlSearch = params.get('search') || '';
        if (location.pathname !== '/shop' || !urlSearch) {
            setSearchTerm('');
        } else {
            setSearchTerm(urlSearch);
        }
    }, [location.pathname, location.search]);

    // Prevent background scrolling on mobile when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    // Sync the header toggle state with the current route/query
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const metalParam = String(params.get('metal') || '').trim().toLowerCase();
        const karatParam = String(params.get('karat') || params.get('purity') || '').trim();
        const silverTypeParam = String(params.get('silver_type') || '').trim();
        const isGoldRoute = location.pathname.startsWith('/gold');
        const desiredMetal = (
            metalParam === 'gold'
            || isGoldRoute
            || (!metalParam && Boolean(karatParam))
        ) ? 'gold' : (
            metalParam === 'silver'
            || (!metalParam && Boolean(silverTypeParam))
        ) ? 'silver' : 'silver';

        if (desiredMetal && desiredMetal !== activeMetal) {
            updateActiveMetal(desiredMetal);
        }
    }, [activeMetal, location.pathname, location.search, updateActiveMetal]);

    const placeholders = useMemo(() => [
        "Search 'Rings'",
        "Search 'Pendants'",
        "Search 'Earrings'",
        "Search 'Bracelets'"
    ], []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [placeholders]);

    // Predictive Search Logic
    useEffect(() => {
        const fetchResults = async () => {
            if (searchTerm.trim().length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const response = await api.get(`/public/products?search=${searchTerm}&limit=6`);
                setSearchResults(response.data.products || []);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const submitSearch = useCallback(() => {
        const query = searchTerm.trim();
        if (query) {
            navigate(`/shop?search=${encodeURIComponent(query)}`);
            setShowResults(false);
            setShowMobileSearch(false);
        }
    }, [searchTerm, navigate]);

    const handleSearchKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitSearch();
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    return (
        <nav
            className={`w-full transition-all duration-300 ${isScrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.07)] border-b border-gray-100' : 'border-b border-gray-100'}`}
            style={{ background: '#FFFFFF', fontFamily: "'Inter', 'Lato', sans-serif" }}
        >

            {/* Desktop Header */}
            <div className="hidden lg:block">
                <div className="container mx-auto px-4 lg:px-12 py-2 flex items-center justify-between gap-10">

                    {/* Left Section: Logo & Delivery Box */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                        <Link to="/" className="block">
                            <img
                                src={logo}
                                alt="Sands Jewels"
                                className="h-[75px] w-auto object-contain transform scale-[1.25] origin-left -translate-x-3"
                            />
                        </Link>

                        <div
                            onClick={() => setIsPincodeModalOpen(true)}
                            className="flex items-center gap-2.5 px-3.5 h-[48px] rounded-xl cursor-pointer transition-all duration-200 group"
                            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid #EBEBEB' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(156,61,80,0.05)'; e.currentTarget.style.borderColor = 'rgba(156,61,80,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#EBEBEB'; }}
                        >
                            <div
                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #9C3D50 0%, #C05B72 100%)' }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <path d="M1 3H16V17H1V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16 8L20 8L23 11V17H16V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                                    <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#9C3D50', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>Where to Deliver?</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', fontFamily: "'Inter', sans-serif" }}>
                                        {pincode ? `Deliver to ${pincode}` : 'Enter Pincode'}
                                    </span>
                                    <ChevronDown className="w-3 h-3" style={{ color: '#9C3D50' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Section: Wide Search Bar with Dropdown */}
                    <div className="flex-1 max-w-3xl relative">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={placeholders[placeholderIdx]}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowResults(true);
                                }}
                                onKeyDown={handleSearchKeyDown}
                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                onFocus={() => setShowResults(true)}
                                style={{
                                    width: '100%',
                                    background: '#F8F8F8',
                                    border: '1.5px solid #E5E5E5',
                                    borderRadius: 12,
                                    padding: '8px 50px 8px 20px',
                                    fontSize: 14,
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 400,
                                    color: '#1A1A1A',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}
                                onFocusCapture={e => { e.target.style.borderColor = '#9C3D50'; e.target.style.background = '#FFFFFF'; e.target.style.boxShadow = '0 0 0 3px rgba(156,61,80,0.08)'; }}
                                onBlurCapture={e => { e.target.style.borderColor = '#E5E5E5'; e.target.style.background = '#F8F8F8'; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
                            />
                            <button
                                onClick={submitSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                style={{ color: '#9C3D50' }}
                            >
                                <Search className="w-[18px] h-[18px]" strokeWidth={2.2} />
                            </button>
                        </div>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {showResults && (searchTerm.length >= 2) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-[200] overflow-hidden"
                                >
                                    {isSearching ? (
                                        <div className="p-8 text-center">
                                            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Searching...</span>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="p-2">
                                            <div className="px-4 py-2 mb-1">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Suggested Products</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1">
                                                {searchResults.map((product) => (
                                                    <div
                                                        key={product._id}
                                                        onClick={() => {
                                                            navigate(`/product/${product._id}`);
                                                            setSearchTerm('');
                                                            setShowResults(false);
                                                        }}
                                                        className="flex items-center gap-4 p-3 hover:bg-pink-50/50 rounded-lg cursor-pointer transition-colors group"
                                                    >
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                                            <img
                                                                src={getSearchThumbUrl(product.images?.[0] || product.primaryImage)}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest line-clamp-1">{product.name}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-black text-pink-600">{formatCurrency(getProductPrice(product))}</span>
                                                                <span className="text-[9px] font-medium text-gray-400">{product.category?.name || product.category}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={submitSearch}
                                                className="w-full mt-2 py-3 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:bg-pink-50 hover:text-pink-600 transition-colors border-t border-gray-100"
                                            >
                                                View all results for "{searchTerm}"
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center">
                                            <p className="text-sm font-medium text-gray-400 italic">No products found for "{searchTerm}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Section: Animated Icons */}
                    <div className="flex items-center gap-5 flex-shrink-0">

                        {/* ── Account ── */}
                        {(() => {
                            const isActive = location.pathname.startsWith('/profile') || location.pathname === '/login';
                            return (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                                    <Link to={user ? "/profile" : "/login"} className="flex flex-col items-center justify-center gap-0.5 px-3 rounded-2xl group relative"
                                        style={{ minWidth: 58, height: 48 }}
                                    >
                                        {/* Hover glow bg */}
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl"
                                            initial={{ opacity: 0 }}
                                            whileHover={{ opacity: 1 }}
                                            style={{ background: 'linear-gradient(135deg,rgba(156,61,80,0.06) 0%,rgba(192,91,114,0.06) 100%)' }}
                                        />
                                        {/* Icon chip */}
                                        <motion.div
                                            className="w-7.5 h-7.5 rounded-xl flex items-center justify-center relative z-10"
                                            style={{ background: isActive ? 'linear-gradient(135deg,#9C3D50,#C05B72)' : 'rgba(0,0,0,0.045)' }}
                                            whileHover={!isActive ? { background: 'linear-gradient(135deg,#9C3D50,#C05B72)', scale: 1.08 } : {}}
                                            transition={{ duration: 0.22 }}
                                        >
                                            <motion.div
                                                animate={isActive ? { rotate: [0, -8, 8, 0] } : {}}
                                                transition={{ duration: 0.5, delay: 0.1 }}
                                                whileHover={{ rotate: [0, -10, 10, -6, 0] }}
                                            >
                                                <User className="w-[17px] h-[17px]" style={{ color: isActive ? '#fff' : '#4B4B4B' }} strokeWidth={2.1} />
                                            </motion.div>
                                        </motion.div>
                                        {/* Label */}
                                        <motion.span
                                            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif", color: isActive ? '#9C3D50' : '#888', position: 'relative', zIndex: 10 }}
                                            whileHover={{ color: '#9C3D50' }}
                                        >ACCOUNT</motion.span>
                                        {/* Active dot */}
                                        {isActive && (
                                            <motion.div
                                                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                                style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 16, height: 2.5, borderRadius: 4, background: 'linear-gradient(90deg,#9C3D50,#C05B72)', zIndex: 10 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })()}

                        {/* ── Wishlist ── */}
                        {(() => {
                            const isActive = location.pathname === '/wishlist';
                            return (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                                    <Link to="/wishlist" className="flex flex-col items-center justify-center gap-0.5 px-3 rounded-2xl group relative"
                                        style={{ minWidth: 64, height: 48 }}
                                    >
                                        <motion.div className="absolute inset-0 rounded-2xl" initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}
                                            style={{ background: 'linear-gradient(135deg,rgba(232,67,147,0.06) 0%,rgba(156,61,80,0.06) 100%)' }}
                                        />
                                        <motion.div
                                            className="w-7.5 h-7.5 rounded-xl flex items-center justify-center relative z-10"
                                            style={{ background: isActive ? 'linear-gradient(135deg,#9C3D50,#C05B72)' : 'rgba(0,0,0,0.045)' }}
                                            whileHover={!isActive ? { background: 'linear-gradient(135deg,#E84393,#C0184C)', scale: 1.08 } : {}}
                                            transition={{ duration: 0.22 }}
                                        >
                                            {/* Badge */}
                                            {wishlist?.length > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                                    className="absolute -top-1.5 -right-1.5 text-white flex items-center justify-center rounded-full z-20"
                                                    style={{ width: 15, height: 15, fontSize: 8, fontWeight: 800, background: 'linear-gradient(135deg,#E84393,#C0184C)', boxShadow: '0 2px 6px rgba(232,67,147,0.5)' }}
                                                >{wishlist.length}</motion.span>
                                            )}
                                            <motion.div
                                                whileHover={{ scale: [1, 1.35, 1.15, 1.25, 1] }}
                                                transition={{ duration: 0.45, ease: 'easeInOut' }}
                                            >
                                                <Heart
                                                    className="w-[17px] h-[17px]"
                                                    style={{ color: isActive ? '#fff' : '#4B4B4B' }}
                                                    strokeWidth={2.1}
                                                />
                                            </motion.div>
                                        </motion.div>
                                        <motion.span
                                            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif", color: isActive ? '#9C3D50' : '#888', position: 'relative', zIndex: 10 }}
                                            whileHover={{ color: '#E84393' }}
                                        >WISHLIST</motion.span>
                                        {isActive && (
                                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                                style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2.5, borderRadius: 4, background: 'linear-gradient(90deg,#E84393,#C0184C)', zIndex: 10 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })()}

                        {/* ── Inbox / Bell ── */}
                        {(() => {
                            const isActive = location.pathname === '/notifications';
                            return (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                                    <Link to="/notifications" className="flex flex-col items-center justify-center gap-0.5 px-3 rounded-2xl group relative"
                                        style={{ minWidth: 58, height: 48 }}
                                    >
                                        <motion.div className="absolute inset-0 rounded-2xl" initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}
                                            style={{ background: 'linear-gradient(135deg,rgba(156,61,80,0.06) 0%,rgba(192,91,114,0.06) 100%)' }}
                                        />
                                        <motion.div
                                            className="w-7.5 h-7.5 rounded-xl flex items-center justify-center relative z-10"
                                            style={{ background: isActive ? 'linear-gradient(135deg,#9C3D50,#C05B72)' : 'rgba(0,0,0,0.045)' }}
                                            whileHover={!isActive ? { background: 'linear-gradient(135deg,#9C3D50,#C05B72)', scale: 1.08 } : {}}
                                            transition={{ duration: 0.22 }}
                                        >
                                            {/* Unread badge */}
                                            {unreadCount > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.4 }}
                                                    className="absolute -top-1.5 -right-1.5 text-white flex items-center justify-center rounded-full z-20"
                                                    style={{ width: 15, height: 15, fontSize: 8, fontWeight: 800, background: 'linear-gradient(135deg,#E84393,#C0184C)', boxShadow: '0 2px 6px rgba(232,67,147,0.5)' }}
                                                >{unreadCount}</motion.span>
                                            )}
                                            {/* Bell shake on hover */}
                                            <motion.div
                                                whileHover={{ rotate: [0, -18, 18, -12, 12, -6, 6, 0], transformOrigin: 'top center' }}
                                                transition={{ duration: 0.55, ease: 'easeInOut' }}
                                            >
                                                <Bell className="w-[17px] h-[17px]" style={{ color: isActive ? '#fff' : '#4B4B4B' }} strokeWidth={2.1} />
                                            </motion.div>
                                        </motion.div>
                                        <motion.span
                                            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif", color: isActive ? '#9C3D50' : '#888', position: 'relative', zIndex: 10 }}
                                            whileHover={{ color: '#9C3D50' }}
                                        >INBOX</motion.span>
                                        {isActive && (
                                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                                style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 14, height: 2.5, borderRadius: 4, background: 'linear-gradient(90deg,#9C3D50,#C05B72)', zIndex: 10 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })()}

                        {/* ── Cart ── */}
                        {(() => {
                            const isActive = location.pathname === '/cart';
                            return (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                                    <Link to="/cart" className="flex flex-col items-center justify-center gap-0.5 px-3 rounded-2xl group relative"
                                        style={{ minWidth: 58, height: 48 }}
                                    >
                                        <motion.div className="absolute inset-0 rounded-2xl" initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}
                                            style={{ background: 'linear-gradient(135deg,rgba(156,61,80,0.06) 0%,rgba(192,91,114,0.06) 100%)' }}
                                        />
                                        <motion.div
                                            className="w-7.5 h-7.5 rounded-xl flex items-center justify-center relative z-10"
                                            style={{ background: isActive ? 'linear-gradient(135deg,#9C3D50,#C05B72)' : 'rgba(0,0,0,0.045)' }}
                                            whileHover={!isActive ? { background: 'linear-gradient(135deg,#9C3D50,#C05B72)', scale: 1.08 } : {}}
                                            transition={{ duration: 0.22 }}
                                        >
                                            {cart?.length > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                                    className="absolute -top-1.5 -right-1.5 text-white flex items-center justify-center rounded-full z-20"
                                                    style={{ width: 15, height: 15, fontSize: 8, fontWeight: 800, background: 'linear-gradient(135deg,#E84393,#C0184C)', boxShadow: '0 2px 6px rgba(232,67,147,0.5)' }}
                                                >{cart.length}</motion.span>
                                            )}
                                            {/* Cart bounce on hover */}
                                            <motion.div
                                                whileHover={{ x: [0, -3, 3, -2, 2, 0], y: [0, -2, 0] }}
                                                transition={{ duration: 0.45, ease: 'easeInOut' }}
                                            >
                                                <ShoppingCart className="w-[17px] h-[17px]" style={{ color: isActive ? '#fff' : '#4B4B4B' }} strokeWidth={2.1} />
                                            </motion.div>
                                        </motion.div>
                                        <motion.span
                                            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif", color: isActive ? '#9C3D50' : '#888', position: 'relative', zIndex: 10 }}
                                            whileHover={{ color: '#9C3D50' }}
                                        >CART</motion.span>
                                        {isActive && (
                                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                                style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 14, height: 2.5, borderRadius: 4, background: 'linear-gradient(90deg,#9C3D50,#C05B72)', zIndex: 10 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })()}

                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="lg:hidden flex flex-col w-full relative">
                <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                        background: '#FFFFFF',
                        borderBottom: '1px solid #F0F0F0',
                        boxShadow: isScrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
                        transition: 'box-shadow 0.3s ease',
                    }}
                >
                    {/* Logo with entrance animation */}
                    <motion.div
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                    >
                        <Link to="/" className="block">
                            <img
                                src={logo}
                                alt="Sands Jewels"
                                className="h-[52px] w-auto object-contain transform scale-[1.6] origin-left"
                            />
                        </Link>
                    </motion.div>

                    {/* Right Icons */}
                    <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
                    >
                        {/* Search */}
                        <motion.button
                            whileTap={{ scale: 0.82 }}
                            onClick={() => setShowMobileSearch(!showMobileSearch)}
                            className="relative p-1.5 rounded-lg transition-colors"
                            style={{
                                background: showMobileSearch ? 'rgba(156,61,80,0.08)' : 'rgba(0,0,0,0.04)',
                            }}
                        >
                            <motion.div
                                animate={{ rotate: showMobileSearch ? 90 : 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                {showMobileSearch
                                    ? <X className="w-4.5 h-4.5" style={{ color: '#9C3D50' }} strokeWidth={2.2} />
                                    : <Search className="w-4.5 h-4.5" style={{ color: '#2C2C2C' }} strokeWidth={2} />}
                            </motion.div>
                        </motion.button>

                        {/* Wishlist (tablet+) */}
                        <motion.div whileTap={{ scale: 0.82 }} className="hidden sm:block">
                            <Link to="/wishlist" className="relative p-1.5 rounded-lg block" style={{ background: 'rgba(0,0,0,0.04)' }}>
                                <Heart className="w-4.5 h-4.5" style={{ color: '#2C2C2C' }} strokeWidth={2} />
                            </Link>
                        </motion.div>

                        {/* Bell */}
                        <motion.div whileTap={{ scale: 0.82 }} className="relative">
                            <Link to="/notifications" className="relative p-1.5 rounded-lg block" style={{ background: 'rgba(0,0,0,0.04)' }}>
                                <Bell className="w-4.5 h-4.5" style={{ color: '#2C2C2C' }} strokeWidth={2} />
                                {unreadCount > 0 && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 text-white flex items-center justify-center rounded-full animate-pulse"
                                        style={{ width: 13, height: 13, fontSize: 7, fontWeight: 800, background: 'linear-gradient(135deg,#E84393,#C0184C)' }}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        </motion.div>

                        {/* Cart */}
                        <motion.div whileTap={{ scale: 0.82 }} className="relative">
                            <Link to="/cart" className="relative p-1.5 rounded-lg block" style={{ background: 'rgba(0,0,0,0.04)' }}>
                                <ShoppingCart className="w-4.5 h-4.5" style={{ color: '#2C2C2C' }} strokeWidth={2} />
                                {cart?.length > 0 && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 text-white flex items-center justify-center rounded-full"
                                        style={{ width: 13, height: 13, fontSize: 7, fontWeight: 800, background: 'linear-gradient(135deg,#E84393,#C0184C)' }}
                                    >
                                        {cart.length}
                                    </span>
                                )}
                            </Link>
                        </motion.div>

                        {/* Hamburger */}
                        <motion.button
                            whileTap={{ scale: 0.82 }}
                            onClick={() => setIsMenuOpen(true)}
                            className="p-1.5 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.04)' }}
                        >
                            <Menu className="w-4.5 h-4.5" style={{ color: '#2C2C2C' }} strokeWidth={2} />
                        </motion.button>
                    </motion.div>
                </div>

                {/* Mobile Search Bar — animated slide-down */}
                <AnimatePresence>
                    {showMobileSearch && (
                        <motion.div
                            key="mobile-search"
                            initial={{ height: 0, opacity: 0, y: -8 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -8 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="w-full overflow-hidden"
                            style={{
                                background: '#FFFFFF',
                                borderBottom: '1px solid #F0F0F0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                            }}
                        >
                            <div className="px-4 py-3 relative">
                                <input
                                    type="text"
                                    placeholder={placeholders[placeholderIdx]}
                                    value={searchTerm}
                                    autoFocus
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onKeyDown={handleSearchKeyDown}
                                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                    onFocus={() => setShowResults(true)}
                                    style={{
                                        width: '100%',
                                        background: '#F7F7F7',
                                        border: '1.5px solid #E8D5DA',
                                        borderRadius: 12,
                                        padding: '10px 44px 10px 16px',
                                        fontSize: 14,
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 400,
                                        color: '#1A1A1A',
                                        outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={submitSearch}
                                    className="absolute right-7 top-1/2 -translate-y-1/2"
                                    style={{ color: '#9C3D50' }}
                                >
                                    <Search className="w-[17px] h-[17px]" strokeWidth={2.2} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Swipe-in sidebar */}
            {createPortal(
                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 bg-black/40 z-[9998]"
                            />
                            <motion.div
                                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                                transition={{ type: 'tween', duration: 0.3 }}
                                className="fixed top-0 left-0 h-full w-full bg-[#FDF5F6] z-[9999] flex flex-col"
                            >
                                {/* Top Header */}
                                <div className="flex justify-end items-center px-6 pt-6 pb-4">
                                    <button onClick={() => setIsMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-gray-900 font-bold" strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Banner/Coupon */}
                                <div className="px-5 mb-6 mt-2">
                                    <div className="relative bg-white border border-[#EBCDD0] rounded-lg p-5 flex items-center justify-between shadow-sm">
                                        {/* Ticket Cutouts */}
                                        <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FDF5F6] rounded-full border-r border-[#EBCDD0]"></div>
                                        <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FDF5F6] rounded-full border-l border-[#EBCDD0]"></div>

                                        <div className="flex items-center gap-5 w-full">
                                            <div className="flex-shrink-0 relative">
                                                <ShoppingBag className="w-10 h-10 text-[#8E2B45] opacity-80" strokeWidth={1.2} />
                                                <ShoppingBag className="w-7 h-7 text-[#8E2B45] absolute -bottom-1 -right-2 bg-white" strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-[17px] font-serif font-bold text-[#8E2B45] leading-tight mb-2 tracking-wide">Welcome to Sands Jewels</h3>
                                                <div className="flex items-center gap-2">
                                                    <Link to="/login" className="text-[11px] font-bold text-[#8E2B45] hover:underline uppercase tracking-wider" onClick={() => setIsMenuOpen(false)}>LOGIN</Link>
                                                    <span className="text-gray-300">|</span>
                                                    <Link to="/login" className="text-[11px] font-bold text-[#8E2B45] hover:underline uppercase tracking-wider" onClick={() => setIsMenuOpen(false)}>SIGN UP</Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Links */}
                                <nav className="flex-1 flex flex-col overflow-y-auto no-scrollbar px-3 pb-8">
                                    {[
                                        { label: 'All Jewellery', path: '/shop', icon: Sparkles },
                                        { label: 'Gold', path: '/gold-collection', icon: Coins },
                                        { label: 'Silver', path: '/', icon: Gem },
                                        { label: 'Rings', path: '/shop?category=rings', icon: LifeBuoy },
                                        { label: 'Daily Wear', path: '/shop?category=daily-wear', icon: Sun },
                                        { label: 'Wedding', path: '/shop?category=wedding', icon: Heart },
                                        { label: 'Gifts for Him', path: '/category/men', icon: Gift },
                                        { label: 'Gifts for Her', path: '/category/women', icon: Gift },
                                        { label: 'Gifts for Family', path: '/category/family', icon: Users },
                                        { label: 'Blogs', path: '/blogs', icon: BookOpen },
                                        { label: 'More', path: '/shop', icon: MoreHorizontal }
                                    ].map((item, index) => (
                                        <Link
                                            key={index}
                                            to={item.path}
                                            onClick={() => setIsMenuOpen(false)}
                                            className={`flex items-center justify-between py-4 px-4 hover:shadow-sm rounded-xl transition-all group border-b border-[#F0DFE2] last:border-0 relative overflow-hidden ${
                                                item.label === 'Gold' ? 'bg-gradient-to-r from-amber-50 to-white hover:from-amber-100 border-amber-200' :
                                                item.label === 'Silver' ? 'bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 border-slate-200' :
                                                'text-gray-800 hover:bg-white hover:text-[#8E2B45]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-5 relative z-10">
                                                <item.icon className={`w-5 h-5 transition-colors ${
                                                    item.label === 'Gold' ? 'text-amber-500 group-hover:text-amber-600 animate-pulse' :
                                                    item.label === 'Silver' ? 'text-slate-400 group-hover:text-slate-600 animate-pulse' :
                                                    'text-gray-600 group-hover:text-[#8E2B45]'
                                                }`} strokeWidth={1.5} />
                                                <span className={`text-[15px] tracking-wide ${
                                                    item.label === 'Gold' ? 'text-amber-700 font-bold group-hover:text-amber-800' :
                                                    item.label === 'Silver' ? 'text-slate-600 font-bold group-hover:text-slate-800' :
                                                    'font-medium text-gray-800 group-hover:font-semibold group-hover:text-[#8E2B45]'
                                                }`}>{item.label}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-900 group-hover:text-[#8E2B45] transition-colors relative z-10" strokeWidth={2.5} />
                                        </Link>
                                    ))}
                                </nav>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </nav>
    );
};

export default Navbar;
