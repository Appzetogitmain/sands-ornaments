import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { FormSection, Input } from '../common/FormControls';
import { resolveLegacyCmsAsset } from '../../../user/utils/legacyCmsAssets';
import { useDraftState } from '../../hooks/useDraftState';

const createBannerItem = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    label: '',
    subtitle: '',
    image: '',
    mobileImage: '',
    path: '/shop',
    tag: '',
    ctaLabel: 'Shop Collection',
    sortOrder: 0
});

// Banner dimensions calculated dynamically below based on sectionKey

const BannerSectionEditor = ({ sectionData, onSave, defaultItems = [] }) => {
    const sectionKey = sectionData?.sectionKey || sectionData?.id || '';
    const pageKey = sectionData?.pageKey || '';
    const isWomenPersonalizedBanner = sectionKey === 'personalized-banner' && pageKey === 'shop-women';
    const isFamilyPromoBanner = sectionKey === 'family-promo-banner' && pageKey === 'shop-family';
    const isGoldPageBanner = pageKey === 'gold-collection';
    const isSingleBannerSection = isWomenPersonalizedBanner || isFamilyPromoBanner;

    const isLandscapeBanner = sectionKey === 'hero-banners' || sectionKey === 'auto-banner-section' || sectionKey === 'hero-banners-gold';
    const isDynamicPromoBanner = sectionKey === 'dynamic-promo-banner';
    
    const bannerPreviewAspect = isDynamicPromoBanner ? 'aspect-[4/1]' : (isLandscapeBanner ? 'aspect-[4/1]' : 'aspect-[4/5]');
    const recommendedBannerSize = isDynamicPromoBanner ? '1920 x 480 px (4:1)' : (isLandscapeBanner ? '1920 x 480 px (4:1)' : '1200 x 1500 px');
    const recommendedRatioText = isDynamicPromoBanner || isLandscapeBanner
        ? 'Required ratio: 4:1 (e.g. 1920x480). Images must be exactly this ratio.'
        : 'Recommended ratio: 4:5. Upload the same size for every banner so the layouts stay aligned.';

    const initialItems = useMemo(() => {
        if (Array.isArray(sectionData?.items) && sectionData.items.length > 0) {
            const sourceItems = isSingleBannerSection ? sectionData.items.slice(0, 1) : sectionData.items;
            return sourceItems.map((item, index) => ({
                id: item.itemId || item.id || `${Date.now()}_${index}`,
                ...item,
                sortOrder: item.sortOrder ?? index,
                subtitle: item.subtitle || item.price || '',
                ctaLabel: item.ctaLabel || 'Shop Collection'
            }));
        }

        if (Array.isArray(defaultItems) && defaultItems.length > 0) {
            const sourceItems = isSingleBannerSection ? defaultItems.slice(0, 1) : defaultItems;
            return sourceItems.map((item, index) => ({
                id: item.itemId || item.id || `${Date.now()}_${index}`,
                ...item,
                sortOrder: item.sortOrder ?? index,
                subtitle: item.subtitle || item.price || '',
                ctaLabel: item.ctaLabel || 'Shop Collection'
            }));
        }

        return [createBannerItem()];
    }, [defaultItems, isSingleBannerSection, sectionData?.items]);

    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);
    const [settings, setSettings] = useState({
        autoplayMs: sectionData?.settings?.autoplayMs || 3000
    });
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);

    

    useEffect(() => {
        setSettings({
            autoplayMs: sectionData?.settings?.autoplayMs || 3000
        });
    }, [sectionData?.settings]);

    useEffect(() => {
        const loadCategories = async () => {
            const data = await adminService.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        };
        loadCategories();
    }, []);

    const buildFamilyCategoryPath = (categoryId, currentPath = '') => {
        if (categoryId) return `/shop?source=family&filter=family&category=${encodeURIComponent(categoryId)}`;
        return currentPath || '/shop?source=family&filter=family';
    };

    const ensureGoldPath = (rawPath = '') => {
        const source = String(rawPath || '').trim();
        if (!source) return '/shop?metal=gold';
        if (!source.startsWith('/shop')) return source;
        if (/([?&])metal=gold(&|$)/i.test(source)) return source;
        return `${source}${source.includes('?') ? '&' : '?'}metal=gold`;
    };

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const validateImageRatio = (file, expectedRatio, tolerance = 0.05) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                if (Math.abs(ratio - expectedRatio) > tolerance) {
                    reject(new Error(`Invalid aspect ratio. Expected ${expectedRatio.toFixed(2)}:1, got ${ratio.toFixed(2)}:1. Please use exact ${expectedRatio.toFixed(2)}:1 ratio (e.g. 1920x480 for 4:1).`));
                } else {
                    resolve();
                }
            };
            img.onerror = () => reject(new Error('Invalid image file.'));
            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageUpload = async (id, file, isMobile = false) => {
        if (!file) return;

        if (isDynamicPromoBanner || isLandscapeBanner) {
            try {
                const expectedRatio = isMobile ? 2 : 4;
                await validateImageRatio(file, expectedRatio, 0.05);
            } catch (err) {
                toast.error(err.message);
                return;
            }
        }

        const uploadedUrl = await adminService.uploadSectionImage(file);
        if (!uploadedUrl) {
            toast.error('Image upload failed. Please try again.');
            return;
        }
        updateItem(id, isMobile ? 'mobileImage' : 'image', uploadedUrl);
    };

    const addBanner = () => {
        if (isSingleBannerSection) return;
        setItems((prev) => ([
            ...prev,
            {
                ...createBannerItem(),
                sortOrder: prev.length
            }
        ]));
    };

    const removeBanner = (id) => {
        if (isSingleBannerSection) return;
        const nextItems = items
            .filter((item) => item.id !== id)
            .map((item, index) => ({ ...item, sortOrder: index }));
        setItems(nextItems.length > 0 ? nextItems : [createBannerItem()]);
    };

    const handleSave = async () => {
        const invalid = items.find((item) => !item.label?.trim() || !item.image?.trim() || !item.mobileImage?.trim());
        if (invalid) {
            toast.error('Each banner requires a title, a desktop image, and a mobile image before saving.');
            return;
        }
        if (isFamilyPromoBanner) {
            const missingSubtitle = items.find((item) => !item.subtitle?.trim());
            if (missingSubtitle) {
                toast.error('Add a subtitle before saving this banner.');
                return;
            }
            const missingCategory = items.find((item) => !item.categoryId);
            if (missingCategory) {
                toast.error('Select a category before saving this banner.');
                return;
            }
        }

        setSaving(true);
        try {
            await onSave({
                settings: {
                    autoplayMs: Number(settings.autoplayMs) || 3000
                },
                items: items.map((item, index) => ({
                    ...item,
                    itemId: item.itemId || item.id,
                    sortOrder: index,
                    subtitle: item.subtitle || '',
                    mobileImage: item.mobileImage || '',
                    ctaLabel: item.ctaLabel || 'Shop Collection',
                    price: item.price || '',
                    categoryId: isFamilyPromoBanner ? (item.categoryId || null) : item.categoryId,
                    path: isFamilyPromoBanner
                        ? buildFamilyCategoryPath(item.categoryId, item.path)
                        : (isGoldPageBanner ? ensureGoldPath(item.path) : (item.path || '/shop'))
                }))
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {!isSingleBannerSection && (
                <FormSection title="Banner Section Settings">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Autoplay Interval (ms)"
                            type="number"
                            min="1000"
                            step="500"
                            value={settings.autoplayMs}
                            onChange={(e) => setSettings((prev) => ({ ...prev, autoplayMs: e.target.value }))}
                            placeholder="3000"
                        />
                    </div>
                </FormSection>
            )}

            <div className="grid grid-cols-1 gap-6">
                {items.map((item, index) => (
                    <FormSection
                        key={item.id}
                        title={`Banner ${index + 1}`}
                    >
                        <div className="grid grid-cols-1 xl:grid-cols-[540px_minmax(0,1fr)] gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="block text-xs font-semibold text-gray-700 tracking-wide">
                                        Desktop Image
                                        <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
                                            {recommendedBannerSize}
                                        </span>
                                    </label>
                                    <div className={`relative ${bannerPreviewAspect} rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden`}>
                                        {item.image ? (
                                            <img
                                                src={resolveLegacyCmsAsset(item.image, item.image)}
                                                alt={item.label || `Desktop Banner ${index + 1}`}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                    <ImageIcon size={20} />
                                                </div>
                                                <p className="text-[11px] font-bold uppercase tracking-widest">Upload</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2">
                                        <div className="inline-block">
                                            <p className="inline-block text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200">
                                                ✨ {recommendedRatioText}
                                            </p>
                                        </div>
                                    </div>
                                    <label className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E2723] px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#2D1B18] transition-all cursor-pointer">
                                        <ImageIcon size={14} />
                                        Change Desktop
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(item.id, e.target.files?.[0], false)}
                                        />
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-xs font-semibold text-gray-700 tracking-wide">
                                        Mobile Image
                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">
                                            * REQUIRED
                                        </span>
                                    </label>
                                    <div className={`relative aspect-[4/5] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden`}>
                                        {item.mobileImage ? (
                                            <img
                                                src={resolveLegacyCmsAsset(item.mobileImage, item.mobileImage)}
                                                alt={item.label || `Mobile Banner ${index + 1}`}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                    <ImageIcon size={20} />
                                                </div>
                                                <p className="text-[11px] font-bold uppercase tracking-widest">Upload</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2">
                                        <div className="inline-block">
                                            <p className="inline-block text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200">
                                                ✨ Recommended ratio: 2:1 (e.g. 1000x500 px).
                                            </p>
                                        </div>
                                    </div>
                                    <label className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-[11px] mt-2 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-all cursor-pointer">
                                        <ImageIcon size={14} />
                                        Change Mobile
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(item.id, e.target.files?.[0], true)}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Eyebrow Label"
                                    value={item.name || ''}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    placeholder="Luxury Collection"
                                />
                                <Input
                                    label="Tag"
                                    value={item.tag || ''}
                                    onChange={(e) => updateItem(item.id, 'tag', e.target.value)}
                                    placeholder="Luxury Collection"
                                />
                                <div className="md:col-span-2">
                                    <Input
                                        label="Banner Title"
                                        value={item.label || ''}
                                        onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                                        placeholder="Eternal Diamond Brilliance"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 tracking-wide mb-1.5">
                                        Banner Subtitle
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={item.subtitle || ''}
                                        onChange={(e) => updateItem(item.id, 'subtitle', e.target.value)}
                                        placeholder="Masterfully crafted for those who demand the extraordinary."
                                        className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all shadow-sm resize-none"
                                    />
                                </div>
                                <Input
                                    label="CTA Label"
                                    value={item.ctaLabel || ''}
                                    onChange={(e) => updateItem(item.id, 'ctaLabel', e.target.value)}
                                    placeholder="Shop Collection"
                                />
                                {isFamilyPromoBanner && (
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 tracking-wide mb-1.5">
                                            Category
                                        </label>
                                        <select
                                            value={item.categoryId || ''}
                                            onChange={(e) => {
                                                const selected = categories.find((category) => String(category._id) === String(e.target.value));
                                                if (!selected) {
                                                    updateItem(item.id, 'categoryId', '');
                                                    updateItem(item.id, 'path', '/shop?source=family&filter=family');
                                                    return;
                                                }
                                                updateItem(item.id, 'categoryId', selected._id);
                                                updateItem(item.id, 'path', buildFamilyCategoryPath(selected._id, item.path));
                                            }}
                                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all shadow-sm"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((category) => (
                                                <option key={category._id} value={category._id}>
                                                    {category.name}{category.isActive === false ? ' (Inactive)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                                Banner {index + 1} of {items.length}
                            </div>
                            {!isSingleBannerSection && (
                                <button
                                    type="button"
                                    onClick={() => removeBanner(item.id)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                            )}
                        </div>
                    </FormSection>
                ))}
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {!isSingleBannerSection && (
                    <button
                        type="button"
                        onClick={addBanner}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3E2723]/15 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#3E2723] hover:bg-[#F8F5F2] transition-all"
                    >
                        <Plus size={14} />
                        Add Banner
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E2723] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#2D1B18] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save Banner Section'}
                </button>
            </div>
        </div>
    );
};

export default BannerSectionEditor;
