import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { Input } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const createInitialItems = (sectionData, defaultSection) => {
    const sourceItems = Array.isArray(sectionData?.items) && sectionData.items.length > 0
        ? sectionData.items
        : (defaultSection?.items || []);

    return sourceItems.map((item, index) => ({
        id: item.itemId || item.id || `men-luxury-${index + 1}`,
        name: item.name || '',
        image: item.image || '',
        path: item.path || '',
        priceMax: item.priceMax || '',
        categoryId: item.categoryId || '',
        label: item.label || ''
    }));
};

const createNewItem = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    image: '',
    path: '',
    priceMax: '',
    categoryId: '',
    label: ''
});

const normalizeValue = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getDisplayLabel = (priceMax) => {
    const numeric = Number(priceMax);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    return `Under INR ${numeric}`;
};

const RECOMMENDED_IMAGE_SIZE = '920 x 1000 px';

const MenLuxurySectionEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};

        return {
            title: currentSettings.title || fallbackSettings.title || 'Luxury Within Reach'
        };
    }, [defaultSection?.settings, sectionData?.settings]);

    const initialItems = useMemo(
        () => createInitialItems(sectionData, defaultSection),
        [defaultSection, sectionData]
    );

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);
    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await adminService.getCategories();
            setCategories(data || []);
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        if (categories.length === 0) return;

        setItems((prev) => prev.map((item, index) => {
            if (item.categoryId) return item;
            const fallbackItem = (defaultSection?.items || [])[index] || {};

            const categoryFromPath = (() => {
                const pathCandidates = [item.path, fallbackItem.path].filter(Boolean);
                const queryValue = pathCandidates
                    .map((path) => String(path))
                    .find((path) => path.includes('category='))
                    ?.split('category=')[1]
                    ?.split('&')[0];
                if (!queryValue) return null;

                return categories.find((category) => {
                    const candidates = [
                        normalizeValue(category._id),
                        normalizeValue(category.slug),
                        normalizeValue(category.name)
                    ];
                    return candidates.includes(normalizeValue(queryValue));
                }) || null;
            })();

            const nameCandidates = [
                item.name,
                item.label,
                fallbackItem.name,
                fallbackItem.label
            ].filter(Boolean);

            const categoryFromName = categoryFromPath || categories.find((category) => (
                nameCandidates.some((candidate) => (
                    normalizeValue(category.name) === normalizeValue(candidate)
                    || normalizeValue(category.slug) === normalizeValue(candidate)
                ))
            ));

            if (!categoryFromName) return item;

            return {
                ...item,
                categoryId: categoryFromName._id,
                name: categoryFromName.name
            };
        }));
    }, [categories, defaultSection?.items]);

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;

            if (field === 'priceMax') {
                const numeric = value === '' ? '' : Number(value);
                return {
                    ...item,
                    priceMax: numeric
                };
            }

            if (field === 'categoryId') {
                const selectedCategory = categories.find((category) => String(category._id) === String(value));
                return {
                    ...item,
                    categoryId: value,
                    name: selectedCategory?.name || item.name,
                    label: selectedCategory?.name || item.label
                };
            }

            return { ...item, [field]: value };
        }));
    };

    const handleImageUpload = async (id, file) => {
        if (!file) return;
        const uploadedUrl = await adminService.uploadSectionImage(file);
        if (!uploadedUrl) {
            toast.error('Image upload failed. Please try again.');
            return;
        }
        updateItem(id, 'image', uploadedUrl);
    };

    const handleAddItem = () => {
        setItems((prev) => [...prev, createNewItem()]);
    };

    const handleRemoveItem = (id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSave = async () => {
        if (items.length === 0) {
            toast.error('Add at least one card before saving.');
            return;
        }

        const missingImage = items.find((item) => !String(item.image || '').trim());
        if (missingImage) {
            toast.error(`Each card needs an image before saving. Missing: ${missingImage.name || 'Card'}`);
            return;
        }

        const missingCategory = items.find((item) => !String(item.categoryId || '').trim());
        if (missingCategory) {
            toast.error(`Select a category for each card before saving. Missing: ${missingCategory.name || 'Card'}`);
            return;
        }

        const invalidPrice = items.find((item) => !Number.isFinite(Number(item.priceMax)) || Number(item.priceMax) <= 0);
        if (invalidPrice) {
            toast.error(`Enter a valid max price for ${invalidPrice.name || 'each card'} before saving.`);
            return;
        }

        setSaving(true);
        try {
            await onSave({
                settings: {
                    title: settings.title?.trim() || 'Luxury Within Reach'
                },
                items: items.map((item, index) => {
                    const selectedCategory = categories.find((category) => String(category._id) === String(item.categoryId));
                    const priceMax = Number(item.priceMax);

                    return {
                        ...item,
                        itemId: item.itemId || item.id,
                        categoryId: item.categoryId,
                        name: selectedCategory?.name || item.name,
                        label: getDisplayLabel(priceMax),
                        priceMax,
                        path: `/shop?source=men&filter=men&category=${item.categoryId}&price_max=${priceMax}`,
                        sortOrder: index
                    };
                })
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Luxury Within Reach</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage Men luxury cards safely. Each card uses a category plus max price, and the route is generated automatically for Men-only results.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#3E2723]/15 text-[#3E2723] font-semibold text-sm hover:bg-[#FFF8F6] transition-colors"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Section Title"
                        value={settings.title}
                        onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Luxury Within Reach"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {items.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                                    Card {index + 1}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                                >
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
                                <div className="space-y-3">
                                    <div className="relative aspect-[0.92/1] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name || `Luxury card ${index + 1}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                    <ImageIcon size={20} />
                                                </div>
                                                <p className="text-[11px] font-bold uppercase tracking-widest">Upload Image</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] leading-4 text-gray-500">
                                        Recommended size: {RECOMMENDED_IMAGE_SIZE}
                                    </p>

                                    <label className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E2723] px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#2D1B18] transition-all cursor-pointer">
                                        <ImageIcon size={14} />
                                        Change Image
                                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(item.id, event.target.files?.[0])} />
                                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                                    </label>
                                        <div className="text-center mt-2 w-full">
                                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block w-full">
                                                ✨ Recommended: 1920x1080px (16:9)
                                            </p>
                                        </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                                        <select
                                            value={item.categoryId || ''}
                                            onChange={(event) => updateItem(item.id, 'categoryId', event.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((category) => (
                                                <option key={category._id} value={category._id}>
                                                    {category.name}{category.isActive === false ? ' (Inactive)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Input
                                        label="Max Price (INR)"
                                        type="number"
                                        min="1"
                                        value={item.priceMax ?? ''}
                                        onChange={(event) => updateItem(item.id, 'priceMax', event.target.value)}
                                        placeholder="2999"
                                    />

                                    <Input
                                        label="Display Label"
                                        value={getDisplayLabel(item.priceMax)}
                                        readOnly
                                        className="bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MenLuxurySectionEditor;
