import React, { useState, useEffect, useRef } from 'react';
import { 
    HelpCircle, Search, Truck, Info, Plus, Trash2, 
    MessageSquare, Globe, Ship, Heart, ShieldCheck,
    Tag as TagIcon, Link as LinkIcon, Star, TrendingUp,
    Zap, Gem, Loader2, X
} from 'lucide-react';
import { FormSection, Input } from '../../../admin/components/common/FormControls';
import api from '../../../../services/api';

const ProductAdvancedTab = ({ 
    formData, 
    setFormData, 
    errors = {},
    isViewMode, 
    addFaq, 
    removeFaq, 
    handleFaqChange 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [resolvedProducts, setResolvedProducts] = useState([]);
    const [searching, setSearching] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Resolve existing related product IDs to full product details on mount / load
    useEffect(() => {
        const ids = formData.relatedProducts || [];
        const resolvedIds = resolvedProducts.map(p => p._id);
        const needsResolving = ids.length > 0 && (
            ids.length !== resolvedProducts.length || 
            !ids.every(id => resolvedIds.includes(id))
        );

        if (!needsResolving) {
            if (ids.length === 0 && resolvedProducts.length > 0) {
                setResolvedProducts([]);
            }
            return;
        }

        const resolveExistingProducts = async () => {
            setLoadingExisting(true);
            try {
                const res = await api.get('public/products/by-ids', {
                    params: { ids: ids.join(',') }
                });
                const fetched = res.data?.data?.products || res.data?.products || [];
                setResolvedProducts(fetched);
            } catch (err) {
                console.error("Failed to resolve related products", err);
            } finally {
                setLoadingExisting(false);
            }
        };

        resolveExistingProducts();
    }, [formData.relatedProducts, resolvedProducts]);

    // Search query with 300ms debounce
    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get('public/products', {
                    params: { search: searchTerm, limit: 8 }
                });
                const productsList = res.data?.data?.products || res.data?.products || [];
                
                const currentProductId = formData._id || formData.id;
                const selectedIds = formData.relatedProducts || [];
                const filtered = productsList.filter(p => 
                    p._id !== currentProductId && 
                    !selectedIds.includes(p._id)
                );
                
                setSearchResults(filtered);
            } catch (err) {
                console.error("Failed to search products", err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, formData.relatedProducts, formData._id, formData.id]);

    const handleAddProduct = (product) => {
        if (!product || !product._id) return;
        const currentList = formData.relatedProducts || [];
        if (currentList.includes(product._id)) return;

        const updatedIds = [...currentList, product._id];
        setFormData(prev => ({
            ...prev,
            relatedProducts: updatedIds
        }));
        setResolvedProducts(prev => [...prev, product]);
        
        setSearchTerm('');
        setSearchResults([]);
        setShowDropdown(false);
    };

    const handleRemoveProduct = (productId) => {
        const currentList = formData.relatedProducts || [];
        const updatedIds = currentList.filter(id => id !== productId);
        setFormData(prev => ({
            ...prev,
            relatedProducts: updatedIds
        }));
        setResolvedProducts(prev => prev.filter(p => p._id !== productId));
    };

    const marketingTags = [
        { label: 'New Arrival', key: 'isNewArrival', icon: <Zap size={14} className="text-emerald-500" /> },
        { label: 'Trending', key: 'isTrending', icon: <TrendingUp size={14} className="text-blue-500" /> },
        { label: 'Most Gifted', key: 'isMostGifted', icon: <Heart size={14} className="text-pink-500" /> },
        { label: 'New Launch', key: 'isNewLaunch', icon: <Star size={14} className="text-amber-500" /> },
        { label: 'Premium', key: 'isPremium', icon: <Gem size={14} className="text-purple-500" /> }
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* FAQ Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                            <HelpCircle size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Global Product FAQs</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Common questions appearing across all variants</p>
                        </div>
                    </div>
                    {!isViewMode && (
                        <button
                            type="button"
                            onClick={addFaq}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm"
                        >
                            <Plus size={14} /> Add FAQ
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(formData.faqs || []).map((faq, index) => (
                        <div key={index} className="p-6 rounded-[2rem] bg-white border border-gray-100 relative group shadow-sm hover:shadow-md transition-all">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Question</label>
                                    <input
                                        value={faq.question}
                                        onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                        placeholder="e.g. Is it 925 silver?"
                                        disabled={isViewMode}
                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-200 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Answer</label>
                                    <textarea
                                        value={faq.answer}
                                        onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                        placeholder="Yes, this is 925 hallmark silver."
                                        disabled={isViewMode}
                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-200 transition-all"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            {!isViewMode && (
                                <button
                                    type="button"
                                    onClick={() => removeFaq(index)}
                                    className="absolute -top-2 -right-2 h-8 w-8 bg-white text-gray-400 hover:text-red-500 border border-gray-100 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    {(formData.faqs || []).length === 0 && (
                        <div className="col-span-full py-12 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                            <MessageSquare className="text-gray-200 mb-3" size={32} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No global FAQs defined</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Marketing & Related Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FormSection title="Marketing Attributes">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {marketingTags.map((tag) => (
                            <label 
                                key={tag.key} 
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${formData.tags?.[tag.key] ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${formData.tags?.[tag.key] ? 'bg-white' : 'bg-gray-50'}`}>
                                        {tag.icon}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.tags?.[tag.key] ? 'text-amber-900' : 'text-gray-500'}`}>
                                        {tag.label}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.tags?.[tag.key] || false}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        tags: { ...(prev.tags || {}), [tag.key]: e.target.checked }
                                    }))}
                                    disabled={isViewMode}
                                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                            </label>
                        ))}
                    </div>
                </FormSection>

                <FormSection title="Discovery Logic">
                    <div className="space-y-6">
                        <div className="space-y-2 relative" ref={dropdownRef}>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Related Products</label>
                            
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    {searching ? <Loader2 size={16} className="animate-spin text-[#3E2723]" /> : <Search size={16} />}
                                </span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder={isViewMode ? "No related products configured" : "Search products by name or SKU code..."}
                                    disabled={isViewMode}
                                    className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-5 text-sm font-bold text-gray-800 outline-none focus:border-[#3E2723] transition-all shadow-sm disabled:bg-gray-50/50 disabled:text-gray-400"
                                />
                            </div>

                            {/* Dropdown suggestions */}
                            {showDropdown && (searchTerm.trim() || searchResults.length > 0) && (
                                <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {searching ? (
                                        <div className="p-4 flex items-center justify-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <Loader2 size={14} className="animate-spin text-[#3E2723]" /> Searching catalogue...
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((product) => (
                                            <button
                                                key={product._id}
                                                type="button"
                                                onClick={() => handleAddProduct(product)}
                                                className="w-full p-3.5 flex items-center gap-4 text-left hover:bg-amber-50/40 transition-all active:bg-amber-50/70"
                                            >
                                                <img 
                                                    src={product.images?.[0] || 'https://via.placeholder.com/150'} 
                                                    alt={product.name} 
                                                    className="w-10 h-10 object-cover rounded-lg shadow-sm border border-gray-100 flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{product.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-[#3E2723] text-[8px] font-black uppercase tracking-wider">
                                                            {product.productCode || 'NO CODE'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{product.material}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            No products found
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mt-1">
                                Curates the "You May Also Like" cross-selling gallery on the product details page.
                            </p>
                        </div>

                        {/* Selected Related Products List */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                Selected Related Products ({resolvedProducts.length})
                            </label>

                            {loadingExisting ? (
                                <div className="p-6 flex items-center justify-center gap-3 bg-gray-50/50 border border-gray-100 rounded-3xl">
                                    <Loader2 size={16} className="animate-spin text-[#3E2723]" />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Resolving connections...</span>
                                </div>
                            ) : resolvedProducts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {resolvedProducts.map((product) => (
                                        <div 
                                            key={product._id} 
                                            className="p-3.5 bg-amber-50/10 border border-amber-100/50 hover:border-amber-200/60 rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300 group"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <img 
                                                    src={product.images?.[0] || 'https://via.placeholder.com/150'} 
                                                    alt={product.name} 
                                                    className="w-12 h-12 object-cover rounded-xl border border-gray-100 shadow-sm flex-shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-black text-gray-800 truncate">{product.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="px-1.5 py-0.5 rounded bg-white border border-gray-100 text-gray-600 text-[8px] font-black uppercase tracking-wider">
                                                            {product.productCode || 'NO CODE'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{product.material}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!isViewMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProduct(product._id)}
                                                    className="h-8 w-8 bg-white text-gray-400 hover:text-red-500 border border-gray-100 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 flex-shrink-0"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-center">
                                    <LinkIcon className="text-gray-200 mb-2.5" size={28} />
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No related products selected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </FormSection>
            </div>

            {/* SEO & Logistics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SEO & Marketing */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <Search size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Search Engine Optimization</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Control how search engines index this product</p>
                        </div>
                    </div>

                    <div className="bg-[#FDFBF7] rounded-[2.5rem] p-4 sm:p-8 border border-amber-100/50 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Input
                                    label="SEO Meta Title"
                                    value={formData.seo?.title || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, title: e.target.value } }))}
                                    placeholder="e.g. Pure 925 Sterling Silver Heart Pendant"
                                    disabled={isViewMode}
                                />
                                <p className="text-[9px] text-[#8D6E63] font-semibold mt-1 ml-1 leading-normal">
                                    This is the main title shown on Google search results. Keep it between 50 to 60 characters.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SEO Meta Description</label>
                                <textarea
                                    value={formData.seo?.description || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, description: e.target.value } }))}
                                    placeholder="Brief summary for Google search results..."
                                    disabled={isViewMode}
                                    className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-gray-800 outline-none focus:border-[#3E2723] focus:ring-4 focus:ring-[#3E2723]/5 transition-all shadow-sm"
                                    rows={4}
                                />
                                <div className="flex justify-between px-1">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Recommended: 150-160 characters</p>
                                    <p className={`text-[8px] font-black uppercase ${(formData.seo?.description || '').length > 160 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {(formData.seo?.description || '').length} Characters
                                    </p>
                                </div>
                                <p className="text-[9px] text-[#8D6E63] font-semibold mt-1 ml-1 leading-normal">
                                    Write a short summary to describe your product. This shows up below the title on Google results.
                                </p>
                            </div>
                            <div>
                                <Input
                                    label="Keywords (Comma separated)"
                                    value={formData.seo?.keywords || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, keywords: e.target.value } }))}
                                    placeholder="silver, jewelry, pendant, gift"
                                    disabled={isViewMode}
                                />
                                <p className="text-[9px] text-[#8D6E63] font-semibold mt-1 ml-1 leading-normal">
                                    Enter simple search terms separated by commas (e.g. silver, gift, pendant) to help people find this item.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logistics & Documentation */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <Truck size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Logistics & Compliance</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Fulfillment and documentation parameters</p>
                        </div>
                    </div>

                    <div className="bg-emerald-50/30 rounded-[2.5rem] p-4 sm:p-8 border border-emerald-100/50 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Est. Shipping Days</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        value={formData.logistics?.estimatedShippingDays ?? 3}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val !== '' && Number(val) < 0) return;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                logistics: { 
                                                    ...prev.logistics, 
                                                    estimatedShippingDays: val === '' ? '' : parseInt(val) 
                                                } 
                                            }));
                                        }}
                                        disabled={isViewMode}
                                        className={`w-full bg-white border rounded-xl py-3.5 px-5 text-sm font-bold text-gray-800 outline-none focus:ring-4 transition-all shadow-sm ${errors.estimatedShippingDays ? 'border-red-400 focus:border-red-500 focus:ring-red-200/40' : 'border-gray-200 focus:border-emerald-500'}`}
                                        min={0}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Days</span>
                                    </div>
                                </div>
                                {errors.estimatedShippingDays && <div className="text-[10px] text-red-500 mt-1 ml-1">{errors.estimatedShippingDays}</div>}
                                <p className="text-[9px] text-[#2E7D32] font-semibold mt-1 ml-1 leading-normal">
                                    How many days it takes you to prepare and ship the item. We will add 2 days for delivery transit automatically.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Input
                                    label="Registry Artifact URL"
                                    value={formData.logistics?.certificateUrl || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, logistics: { ...prev.logistics, certificateUrl: e.target.value } }))}
                                    placeholder="Cloudinary/Drive Link"
                                    disabled={isViewMode}
                                />
                                <p className="text-[9px] text-[#2E7D32] font-semibold mt-1 ml-1 leading-normal">
                                    Upload a copy of the product's certificate (to Google Drive or Cloudinary) and paste the link here.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductAdvancedTab;
