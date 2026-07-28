import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { FormSection, Input } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const normalizeLabel = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const expandCategoryTokens = (value) => {
    const normalized = normalizeLabel(value);
    const tokens = new Set();
    if (!normalized) return tokens;

    tokens.add(normalized);

    if (normalized.endsWith('ies')) tokens.add(`${normalized.slice(0, -3)}y`);
    if (normalized.endsWith('es')) tokens.add(normalized.slice(0, -2));
    if (normalized.endsWith('s')) tokens.add(normalized.slice(0, -1));

    return new Set(Array.from(tokens).filter(Boolean));
};

const resolveCategoryFromItem = (item, categories) => {
    if (!item || categories.length === 0) return null;
    if (item.categoryId) {
        return categories.find((category) => String(category._id) === String(item.categoryId)) || null;
    }

    const path = String(item.path || '');
    const nameTokens = expandCategoryTokens(item.name || '');
    const pathMatch = path.startsWith('/category/') ? path.replace('/category/', '').split('?')[0] : '';
    const pathTokens = expandCategoryTokens(pathMatch);

    return categories.find((category) => {
        const categoryTokens = new Set([
            ...expandCategoryTokens(category.name || ''),
            ...expandCategoryTokens(category.slug || category.path || '')
        ]);

        return Array.from(nameTokens).some((token) => categoryTokens.has(token))
            || Array.from(pathTokens).some((token) => categoryTokens.has(token));
    }) || null;
};

const createItem = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    image: '',
    path: '',
    tag: 'New',
    categoryId: ''
});

const canPreserveLegacyLaunchCard = (item) => {
    if (!item) return false;
    const hasLegacyCategoryPath = typeof item.path === 'string'
        && (item.path.startsWith('/category/') || item.path.includes('category='));
    const hasUsableContent = Boolean((item.name || item.label || '').trim()) && Boolean(item.image?.trim());
    return hasLegacyCategoryPath && hasUsableContent;
};

const RECOMMENDED_IMAGE_SIZE = '1000 x 1000 px';

const SilverNewLaunchGridEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await adminService.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        };
        fetchCategories();
    }, []);

    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};
        return {
            ribbonLabel: currentSettings.ribbonLabel || fallbackSettings.ribbonLabel || 'NEW LAUNCH',
            offerText: currentSettings.offerText || fallbackSettings.offerText || 'Upto 15% Off',
            ctaLabel: currentSettings.ctaLabel || fallbackSettings.ctaLabel || 'Explore'
        };
    }, [defaultSection?.settings, sectionData?.settings]);

    const initialItems = useMemo(() => {
        const sourceItems = Array.isArray(sectionData?.items) && sectionData.items.length > 0
            ? sectionData.items
            : (defaultSection?.items || []);

        if (!Array.isArray(sourceItems) || sourceItems.length === 0) return [createItem()];

        return sourceItems.map((item, index) => ({
            id: item.itemId || item.id || `${Date.now()}_${index}`,
            ...item,
            tag: item.tag || 'New',
            categoryId: item.categoryId || ''
        }));
    }, [defaultSection?.items, sectionData?.items]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);
    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    

    useEffect(() => {
        if (categories.length === 0) return;
        setItems((prev) => prev.map((item) => {
            if (item.categoryId) return item;
            const category = resolveCategoryFromItem(item, categories);
            if (!category) return item;
            return {
                ...item,
                categoryId: category._id,
                name: item.name || category.name,
                path: `/shop?category=${category._id}`
            };
        }));
    }, [categories]);

    const updateSetting = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const handleCategoryChange = (id, categoryId) => {
        const selected = categories.find((category) => String(category._id) === String(categoryId));
        if (!selected) {
            updateItem(id, 'categoryId', '');
            return;
        }

        setItems((prev) => prev.map((item) => (
            item.id === id
                ? {
                    ...item,
                    categoryId: selected._id,
                    name: selected.name,
                    path: `/shop?category=${selected._id}`
                }
                : item
        )));
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

    const addItem = () => {
        setItems((prev) => [...prev, createItem()]);
    };

    const removeItem = (id) => {
        const nextItems = items.filter((item) => item.id !== id);
        setItems(nextItems.length > 0 ? nextItems : [createItem()]);
    };

    const handleSave = async () => {
        const invalid = items.find((item) => {
            const hasCategory = Boolean(item.categoryId);
            const hasImage = Boolean(item.image?.trim());
            if (hasCategory && hasImage) return false;
            if (!hasCategory && hasImage && canPreserveLegacyLaunchCard(item)) return false;
            return true;
        });
        if (invalid) {
            toast.error(`Each card needs a category and image before saving. Missing: ${invalid.name || 'New Item'}`);
            return;
        }

        setSaving(true);
        try {
            await onSave({
                settings: {
                    ribbonLabel: settings.ribbonLabel?.trim() || 'NEW LAUNCH',
                    offerText: settings.offerText?.trim() || 'Upto 15% Off',
                    ctaLabel: settings.ctaLabel?.trim() || 'Explore'
                },
                items: items.map((item, index) => ({
                    ...item,
                    itemId: item.itemId || item.id,
                    tag: item.tag || 'New',
                    categoryId: item.categoryId || undefined,
                    sortOrder: index
                }))
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <FormSection title="Silver New Launch Settings">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Ribbon Label" value={settings.ribbonLabel} onChange={(event) => updateSetting('ribbonLabel', event.target.value)} placeholder="NEW LAUNCH" />
                    <Input label="Offer Text" value={settings.offerText} onChange={(event) => updateSetting('offerText', event.target.value)} placeholder="Upto 15% Off" />
                    <Input label="CTA Label" value={settings.ctaLabel} onChange={(event) => updateSetting('ctaLabel', event.target.value)} placeholder="Explore" />
                </div>
                <div className="mt-4 rounded-xl border border-[#EFE3DF] bg-[#FFFCFB] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#B28A8A]">CTA Destination</p>
                    <p className="mt-2 text-sm font-semibold text-[#3E2723]">Latest Arrivals Page</p>
                    <p className="mt-1 text-xs text-gray-500">/new-arrivals</p>
                </div>
            </FormSection>

            <div className="grid grid-cols-1 gap-6">
                {items.map((item, index) => (
                    <FormSection key={item.id} title={`Card ${index + 1}`}>
                        <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6">
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-gray-700 tracking-wide">Card Image</label>
                                <div className="relative aspect-square rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name || `Card ${index + 1}`} className="w-full h-full object-cover" />
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
                                                ✨ Recommended: 1080x1080px (1:1)
                                            </p>
                                        </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                                    <select
                                        value={item.categoryId || ''}
                                        onChange={(event) => handleCategoryChange(item.id, event.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
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
                                    label="Badge"
                                    value={item.tag || ''}
                                    onChange={(event) => updateItem(item.id, 'tag', event.target.value)}
                                    placeholder="New"
                                />
                                <Input
                                    label="Display Name"
                                    value={item.name || ''}
                                    readOnly
                                    placeholder="Select a category"
                                    className="bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                                Card {index + 1} of {items.length}
                            </div>
                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                            >
                                <Trash2 size={14} />
                                Remove
                            </button>
                        </div>
                    </FormSection>
                ))}
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3E2723]/15 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#3E2723] hover:bg-[#F8F5F2] transition-all"
                >
                    <Plus size={14} />
                    Add Card
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E2723] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#2D1B18] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save Section'}
                </button>
            </div>
        </div>
    );
};

export default SilverNewLaunchGridEditor;
