import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { adminService } from '../../services/adminService';
import { buildMenShopPath } from '../../../user/utils/menNavigation';
import { useDraftState } from '../../hooks/useDraftState';

const createItemId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeLabel = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseCategoryHint = (item = {}) => {
    const categoryFromPath = String(item.path || '').includes('category=')
        ? String(item.path).split('category=')[1]?.split('&')[0] || ''
        : '';
    return categoryFromPath || item.categoryId || item.name || '';
};

const resolveCategoryId = (hint, categories = []) => {
    const raw = String(hint || '').trim();
    if (!raw || categories.length === 0) return '';

    const byId = categories.find((category) => String(category._id) === raw);
    if (byId) return String(byId._id);

    const normalizedHint = normalizeLabel(raw);
    const bySlugOrName = categories.find((category) => (
        normalizeLabel(category.slug || '') === normalizedHint ||
        normalizeLabel(category.name || '') === normalizedHint
    ));
    if (bySlugOrName) return String(bySlugOrName._id);

    if (normalizedHint.endsWith('s')) {
        const singular = normalizedHint.replace(/s$/, '');
        const bySingular = categories.find((category) => {
            const slug = normalizeLabel(category.slug || '');
            const name = normalizeLabel(category.name || '');
            return slug === singular || name === singular;
        });
        if (bySingular) return String(bySingular._id);
    }

    return '';
};

const normalizeInitialItems = (items = []) => (
    items.map((item, index) => ({
        id: item.itemId || item.id || createItemId(),
        name: item.name || item.label || `Collection ${index + 1}`,
        subtitle: item.subtitle || item.description || '',
        image: item.image || '',
        categoryId: item.categoryId || '',
        categoryHint: parseCategoryHint(item),
        extraImages: Array.isArray(item.extraImages) ? item.extraImages : ['', '', '']
    }))
);

const MenExploreCollectionsEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);

    const initialSettings = useMemo(() => {
        const defaultSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};
        return {
            title: currentSettings.title || defaultSettings.title || 'Explore Collections'
        };
    }, [defaultSection?.settings, sectionData?.settings]);

    const initialItems = useMemo(() => {
        const source = Array.isArray(sectionData?.items) && sectionData.items.length > 0
            ? sectionData.items
            : (defaultSection?.items || []);
        return normalizeInitialItems(source);
    }, [defaultSection?.items, sectionData?.items]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);
    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await adminService.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (categories.length === 0) return;
        setItems((prev) => prev.map((item) => {
            if (item.categoryId && categories.some((category) => String(category._id) === String(item.categoryId))) {
                return item;
            }
            const resolved = resolveCategoryId(item.categoryHint || item.name, categories);
            if (!resolved) return item;
            return { ...item, categoryId: resolved };
        }));
    }, [categories]);

    const handleItemChange = (id, field, value) => {
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const handleThumbnailUpload = async (id, index, file) => {
        if (!file) return;
        const uploadedUrl = await adminService.uploadSectionImage(file);
        if (!uploadedUrl) {
            toast.error('Thumbnail upload failed. Please try again.');
            return;
        }
        setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const nextThumbs = [...(Array.isArray(item.extraImages) ? item.extraImages : ['', '', ''])];
            nextThumbs[index] = uploadedUrl;
            return { ...item, extraImages: nextThumbs };
        }));
    };

    const handleImageUpload = async (id, file) => {
        if (!file) return;
        const uploadedUrl = await adminService.uploadSectionImage(file);
        if (!uploadedUrl) {
            toast.error('Image upload failed. Please try again.');
            return;
        }
        handleItemChange(id, 'image', uploadedUrl);
    };

    const addItem = () => {
        setItems((prev) => [
            ...prev,
                {
                    id: createItemId(),
                    name: 'NEW COLLECTION',
                    subtitle: 'Collection subtitle',
                    image: '',
                    categoryId: '',
                    categoryHint: '',
                    extraImages: ['', '', '']
                }
            ]);
    };

    const removeItem = (id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSave = async () => {
        const invalid = items.find((item) => (
            !String(item.name || '').trim() ||
            !String(item.subtitle || '').trim() ||
            !String(item.image || '').trim() ||
            !item.categoryId
        ));

        if (invalid) {
            toast.error(`Each card needs title, subtitle, image, and category before saving. Missing: ${invalid.name || 'New Collection'}`);
            return;
        }

        setSaving(true);
        try {
            await onSave({
                settings: {
                    title: settings.title?.trim() || 'Explore Collections'
                },
                items: items.map((item, index) => ({
                    itemId: item.itemId || item.id,
                    name: item.name?.trim() || `Collection ${index + 1}`,
                    label: item.name?.trim() || `Collection ${index + 1}`,
                    subtitle: item.subtitle?.trim() || '',
                    image: item.image,
                    extraImages: Array.isArray(item.extraImages) ? item.extraImages.map((img) => String(img || '').trim()).filter(Boolean) : [],
                    categoryId: item.categoryId,
                    path: buildMenShopPath({ category: item.categoryId }),
                    sortOrder: index
                }))
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Explore Collections</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Each card routes to selected category products for Shop for Men.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#3E2723]/20 text-[#3E2723] font-semibold text-sm hover:bg-[#3E2723]/5 transition-colors"
                    >
                        <Plus size={16} />
                        Add Card
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white font-semibold text-sm hover:bg-[#5a3d36] transition-colors disabled:opacity-60"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Section'}
                    </button>
                </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
                <Input
                    label="Section Title"
                    value={settings.title}
                    onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Explore Collections"
                />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {items.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                                    Card {index + 1}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    title="Remove card"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
                                <div className="space-y-3">
                                    <div className="relative aspect-[16/9] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name || `Explore card ${index + 1}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                    <ImageIcon size={20} />
                                                </div>
                                                <p className="text-[11px] font-bold uppercase tracking-widest">Upload Image</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E2723] px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#2D1B18] transition-all cursor-pointer">
                                            <ImageIcon size={14} />
                                            Change Image
                                            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(item.id, event.target.files?.[0])} />
                                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                                        </label>
                                        <div className="text-center">
                                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block w-full">
                                                ✨ Recommended: 1920x1080px (16:9 Ratio)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <Input
                                        label="Card Title"
                                        value={item.name}
                                        onChange={(event) => handleItemChange(item.id, 'name', event.target.value)}
                                        placeholder="EDGE"
                                    />
                                    <Input
                                        label="Card Subtitle"
                                        value={item.subtitle}
                                        onChange={(event) => handleItemChange(item.id, 'subtitle', event.target.value)}
                                        placeholder="Sleek, silver, and made to turn heads"
                                    />

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                                        <select
                                            value={item.categoryId || ''}
                                            onChange={(event) => handleItemChange(item.id, 'categoryId', event.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((category) => (
                                                <option key={category._id} value={category._id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Mini Thumbnails</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[0, 1, 2].map((thumbIndex) => {
                                                const thumbSrc = item.extraImages?.[thumbIndex] || '';
                                                return (
                                                    <div key={`${item.id}-thumb-${thumbIndex}`} className="relative aspect-square rounded-lg border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden group/mini">
                                                        {thumbSrc ? (
                                                            <>
                                                                <img src={thumbSrc} alt={`Thumbnail ${thumbIndex + 1}`} className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = [...(item.extraImages || ['', '', ''])];
                                                                        next[thumbIndex] = '';
                                                                        handleItemChange(item.id, 'extraImages', next);
                                                                    }}
                                                                    className="absolute inset-0 bg-black/35 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center"
                                                                    title="Remove thumbnail"
                                                                >
                                                                    <Trash2 size={14} className="text-white" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-[#EFE9E6] transition-colors">
                                                                <Plus size={14} className="text-gray-500" />
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(event) => handleThumbnailUpload(item.id, thumbIndex, event.target.files?.[0])}
                                                                />
                                                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                                                            </label>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MenExploreCollectionsEditor;
