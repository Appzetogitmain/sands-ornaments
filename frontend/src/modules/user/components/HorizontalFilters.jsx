import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const useDragScroll = () => {
    const ref = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const onMouseDown = (e) => {
        if (!ref.current) return;
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setStartY(e.pageY - ref.current.offsetTop);
        setScrollLeft(ref.current.scrollLeft);
        setScrollTop(ref.current.scrollTop);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const y = e.pageY - ref.current.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        ref.current.scrollLeft = scrollLeft - walkX;
        ref.current.scrollTop = scrollTop - walkY;
    };

    return {
        ref,
        events: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
        },
        isDragging
    };
};

const HorizontalFilters = ({
    categories = [],
    selectedCategory = 'All',
    onCategoryChange,
    priceRange = 50000,
    onPriceChange,
    audience = 'All',
    onAudienceChange,
    metal = 'All',
    onMetalChange,
    diamondType = 'All',
    onDiamondTypeChange,
    tags = [],
    onTagsChange,
    sortBy = 'Newest',
    onSortChange,
    clearAll
}) => {
    const [activeDropdown, setActiveDropdown] = useState(null);
    const filterScroll = useDragScroll();
    const dropdownScroll = useDragScroll();

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterScroll.ref.current && !filterScroll.ref.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [filterScroll.ref]);

    const filterGroups = [
        {
            id: 'product-type',
            label: 'Product type',
            value: selectedCategory,
            options: ['All', ...categories.map(c => c.name)],
            onChange: onCategoryChange
        },
        {
            id: 'price',
            label: 'Price',
            value: priceRange >= 50000 ? 'All' : `Under ₹${priceRange.toLocaleString()}`,
            isSlider: true,
            min: 1000,
            max: 50000,
            step: 500,
            current: priceRange,
            onChange: onPriceChange
        },
        {
            id: 'shop-for',
            label: 'Shop For',
            value: audience === 'All' ? 'All' : audience.charAt(0).toUpperCase() + audience.slice(1),
            options: ['All', 'Women', 'Men', 'Family'],
            onChange: (val) => onAudienceChange(val.toLowerCase())
        },
        {
            id: 'metal',
            label: 'Metal',
            value: metal,
            options: ['All', 'Silver', 'Gold'],
            onChange: onMetalChange
        },
        {
            id: 'stone',
            label: 'Stone',
            value: diamondType === 'All' ? 'All' : diamondType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            options: [
                { label: 'All', value: 'All' },
                { label: 'Natural Diamond', value: 'natural' },
                { label: 'Lab Grown Diamond', value: 'lab_grown' },
                { label: 'No Stone', value: 'none' }
            ],
            onChange: onDiamondTypeChange
        },
        {
            id: 'style',
            label: 'Style',
            value: tags.length > 0 ? `${tags.length} Selected` : 'All',
            options: [
                { label: 'Trending', value: 'isTrending' },
                { label: 'New Arrival', value: 'isNewArrival' },
                { label: 'Best Selling', value: 'isMostGifted' },
                { label: 'Premium', value: 'isPremium' }
            ],
            isMulti: true,
            onChange: onTagsChange
        }
    ];

    const toggleDropdown = (id) => {
        setActiveDropdown(activeDropdown === id ? null : id);
    };

    return (
        <div className="hidden md:block w-full border-b border-[#EBCDD0] bg-white">
            <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
                <div 
                    {...filterScroll.events}
                    ref={filterScroll.ref}
                    className={`flex items-center gap-2 flex-wrap ${filterScroll.isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    {filterGroups.map((group) => (
                        <div key={group.id} className="relative">
                            <button
                                onClick={() => toggleDropdown(group.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[13px] font-medium ${
                                    activeDropdown === group.id || (group.value !== 'All' && group.value !== 50000)
                                        ? 'border-[#8E2B45] bg-[#FDF5F6] text-[#8E2B45]'
                                        : 'border-gray-200 hover:border-[#8E2B45] text-gray-700'
                                }`}
                            >
                                <span>{group.label}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeDropdown === group.id ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {activeDropdown === group.id && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        {...dropdownScroll.events}
                                        ref={dropdownScroll.ref}
                                        className={`absolute left-0 mt-2 ${group.isSlider ? 'w-64' : 'w-56 py-2 max-h-[350px] overflow-y-auto'} bg-white border border-[#EBCDD0] rounded-xl shadow-2xl z-[110] custom-scrollbar overscroll-contain ${dropdownScroll.isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                                    >
                                        {group.isSlider ? (
                                            <div className="px-5 py-4 w-full">
                                                <div className="flex justify-between text-xs text-gray-700 font-bold mb-4 tracking-wide">
                                                    <span>₹0</span>
                                                    <span className="text-[#8E2B45]">₹{group.current >= group.max ? `${group.max.toLocaleString()}+` : group.current.toLocaleString()}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={group.min}
                                                    max={group.max}
                                                    step={group.step}
                                                    value={group.current}
                                                    onChange={(e) => group.onChange(Number(e.target.value))}
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8E2B45]"
                                                />
                                                <div className="flex justify-between items-center mt-5">
                                                    <button 
                                                        onClick={() => group.onChange(group.max)}
                                                        className="text-[11px] font-bold text-gray-500 hover:text-gray-800 uppercase tracking-widest transition-colors"
                                                    >
                                                        Reset
                                                    </button>
                                                    <button 
                                                        onClick={() => setActiveDropdown(null)}
                                                        className="px-4 py-1.5 bg-[#8E2B45] hover:bg-[#7a243b] text-white text-[11px] font-bold uppercase tracking-widest rounded-full transition-colors shadow-sm"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            group.options.map((option) => {
                                                const label = typeof option === 'string' ? option : option.label;
                                                const val = typeof option === 'string' ? option : option.value;
                                                const isSelected = group.isMulti 
                                                    ? tags.includes(val)
                                                    : group.value === label || (group.id === 'shop-for' && audience === val.toLowerCase());

                                                return (
                                                    <button
                                                        key={label}
                                                        onClick={() => {
                                                            group.onChange(val);
                                                            if (!group.isMulti) setActiveDropdown(null);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#FDF5F6] transition-colors flex items-center justify-between group ${
                                                            isSelected ? 'text-[#8E2B45] font-bold bg-[#FDF5F6]' : 'text-gray-600'
                                                        }`}
                                                    >
                                                        {label}
                                                        {isSelected && <Check className="w-4 h-4" />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                    
                    {/* Clear All Button */}
                    {(selectedCategory !== 'All' || priceRange < 50000 || audience !== 'All' || metal !== 'All' || diamondType !== 'All' || tags.length > 0) && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-[#8E2B45] hover:bg-[#FDF5F6] rounded-full transition-colors ml-2"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear All
                        </button>
                    )}
                </div>

                {/* Sort is handled separately or can be integrated */}
                <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-400 font-medium uppercase tracking-widest mr-2">Sort By:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="bg-transparent text-[13px] font-bold text-gray-800 outline-none cursor-pointer border-b border-transparent hover:border-[#8E2B45] transition-all"
                    >
                        <option value="Newest">Newest</option>
                        <option value="Price: Low to High">Price: Low to High</option>
                        <option value="Price: High to Low">Price: High to Low</option>
                        <option value="Best Selling">Best Selling</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default HorizontalFilters;
