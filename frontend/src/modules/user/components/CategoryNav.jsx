import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useShop } from '../../../context/ShopContext';
import AllJewelleryMegaMenu from './AllJewelleryMegaMenu';
import AllJewelleryMenu from './CategoryNavComponents/AllJewelleryMenu';
import FamilyMegaMenu from './FamilyMegaMenu';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryNav = ({ showMetalToggle = true }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { activeMetal, updateActiveMetal } = useShop();
    const [hoveredItem, setHoveredItem] = useState(null);

    const navItems = [
        { id: 'cat', name: 'Shop by Category', path: '/collections', hasChevron: true },
        { id: 'all', name: 'ALL TYPE', path: '/collections', hasChevron: true },
        { id: 'him', name: 'Gifts for Him', path: '/category/men', hasChevron: false },
        { id: 'her', name: 'Gifts for Her', path: '/category/women', hasChevron: false },
        { id: 'family', name: 'Gifts for Family', path: '/category/family', hasChevron: false },
        // Legacy filter tags were removed from product placement. Keep these links functional via search.
        { id: 'card', name: 'SANDS Gift Card', path: '/gift-cards', hasChevron: false },
        { id: 'blogs', name: 'Blogs', path: '/blogs', hasChevron: false },
        { id: 'exclusive', name: 'Exclusive Collections', path: '/shop?search=exclusive', hasChevron: false },
        { id: 'more', name: 'More at SANDS', path: '/about', hasChevron: false },
    ];

    const resetMenu = () => {
        setHoveredItem(null);
    };

    // Keep the metal toggle consistent with the current route/query.
    // This prevents confusing UI states when a user lands directly on a gold page or a gold-filtered shop URL.
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

    return (
        <div className="border-b hidden md:block w-full" style={{ background: '#FFFFFF', borderColor: '#EBEBEB', fontFamily: "'Inter', 'Lato', sans-serif" }}>
            <div className="container mx-auto px-4 md:px-12 relative" onMouseLeave={resetMenu}>
                {/* Navigation Links - Centered and Spaced Out */}
                <div className="flex justify-center items-center py-0.5 w-full">
                    <ul className="flex items-center justify-between lg:justify-center w-full gap-2 lg:gap-5 xl:gap-8 flex-nowrap px-1">
                        {navItems.map((item) => (
                            <li
                                key={item.id}
                                onMouseEnter={() => {
                                    // Only 'Shop by Category' and 'ALL TYPE' show dropdowns on hover
                                    if (item.id === 'cat' || item.id === 'all') {
                                        setHoveredItem(item.id);
                                    }
                                }}
                                onMouseLeave={() => setHoveredItem(null)}
                                className="relative py-1"
                            >
                                <Link
                                    to={item.path}
                                    className="text-[9px] md:text-[10px] xl:text-[12px] font-bold uppercase tracking-tighter md:tracking-normal xl:tracking-[0.08em] font-sans text-gray-800 hover:text-[#9C3D5E] flex items-center gap-0.5 xl:gap-1 transition-all duration-300 whitespace-nowrap"
                                >
                                    {item.name}
                                    {item.hasChevron && <ChevronDown className="w-4 h-4 text-gray-500" />}
                                </Link>

                                {/* Dropdowns Mapping — Positioned to show "Pura Box" (Full width) */}
                                <AnimatePresence>
                                    {hoveredItem === item.id && (
                                        <div className="absolute top-full left-[-40px] pt-4 z-[110]">
                                            <motion.div
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="bg-white shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden"
                                            >
                                                {item.id === 'cat' && <AllJewelleryMenu resetMenu={resetMenu} />}
                                                {item.id === 'all' && <AllJewelleryMegaMenu resetMenu={resetMenu} />}
                                                {item.id === 'family' && <FamilyMegaMenu resetMenu={resetMenu} />}
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Silver / Gold Toggle - Precise SANDS Polish with Navigation logic */}
                {showMetalToggle && (
                    <div className="flex justify-center pb-0.5 pt-0.5 relative">
                        <div className="p-1 w-[600px] max-w-[95%] rounded-full border border-[#D4B390]/40 flex items-center bg-white shadow-[0_4px_25px_rgba(212,179,144,0.15)] relative">
                            {/* Animated Background Pill */}
                            <div className="absolute inset-1 flex" style={{ zIndex: 0 }}>
                                <motion.div
                                    layout
                                    initial={false}
                                    animate={{
                                        x: activeMetal === 'gold' ? '100%' : '0%',
                                        background: activeMetal === 'gold' 
                                            ? 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728)' 
                                            : 'linear-gradient(to right, #4B5563, #374151, #1F2937)',
                                        boxShadow: activeMetal === 'gold'
                                            ? '0 8px 20px rgba(191,149,63,0.35)'
                                            : '0 8px 20px rgba(0,0,0,0.25)'
                                    }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                    className="w-1/2 h-full rounded-full"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    updateActiveMetal('silver');
                                    navigate('/');
                                }}
                                className={`relative flex-1 py-1 px-8 rounded-full text-[13px] font-bold uppercase tracking-widest transition-colors duration-300 z-10 ${activeMetal === 'silver' ? 'text-white' : 'text-[#4A4A4A] hover:text-black'}`}
                            >
                                Silver
                            </button>
                            <button
                                onClick={() => {
                                    updateActiveMetal('gold');
                                    navigate('/gold-collection');
                                }}
                                className={`relative flex-1 py-1 px-8 rounded-full text-[13px] font-bold uppercase tracking-widest transition-colors duration-300 z-10 ${activeMetal === 'gold' ? 'text-[#3D2B1F]' : 'text-[#4A4A4A] hover:text-black'}`}
                            >
                                Gold
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryNav;
