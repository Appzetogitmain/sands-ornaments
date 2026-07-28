import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Save } from 'lucide-react';
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

const categoryHintFromPath = (path = '') => {
    const source = String(path || '');
    if (!source.includes('category=')) return '';
    const raw = source.split('category=')[1]?.split('&')[0] || '';
    try {
        return decodeURIComponent(raw).trim();
    } catch {
        return raw.trim();
    }
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

    return '';
};

const splitLabelToLines = (label = '') => {
    const clean = String(label || '').trim();
    if (!clean) return { line1: '', line2: '' };
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { line1: parts[0], line2: 'Style' };
    return {
        line1: parts[0],
        line2: parts.slice(1).join(' ')
    };
};

const normalizeItems = (items = []) => (
    items.map((item, index) => {
        const fallbackName = item.name || item.label || `Trend ${index + 1}`;
        const fromName = splitLabelToLines(fallbackName);
        return {
            id: item.itemId || item.id || createItemId(),
            name: fallbackName,
            line1: String(item.line1 || '').trim() || fromName.line1,
            line2: String(item.line2 || '').trim() || fromName.line2,
            image: item.image || '',
            categoryId: item.categoryId || '',
            categoryHint: categoryHintFromPath(item.path) || item.categoryId || item.name || ''
        };
    })
);

const ensureMinimumCards = (baseItems = [], fallbackItems = [], minCount = 4) => {
    const normalizedBase = normalizeItems(baseItems).slice(0, minCount);
    if (normalizedBase.length >= minCount) return normalizedBase;

    const normalizedFallback = normalizeItems(fallbackItems);
    const merged = [...normalizedBase];

    for (const fallbackItem of normalizedFallback) {
        if (merged.length >= minCount) break;
        merged.push({
            ...fallbackItem,
            id: createItemId()
        });
    }

    return merged;
};

const RECOMMENDED_IMAGE_SIZE = '900 x 1300 px';

const MenStyleTrendsEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const loadedSignatureRef = useRef('');

    const initialItems = useMemo(() => {
        const sectionItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const fallbackItems = Array.isArray(defaultSection?.items) ? defaultSection.items : [];
        return sectionItems.length > 0
            ? ensureMinimumCards(sectionItems, fallbackItems, 4)
            : normalizeItems(fallbackItems);
    }, [defaultSection?.items, sectionData?.items]);

    const sourceSignature = useMemo(() => {
        const sectionItems = Array.isArray(sectionData?.items) ? sectionData.items : [];
        const fallbackItems = Array.isArray(defaultSection?.items) ? defaultSection.items : [];
        return JSON.stringify({
            sectionKey: sectionData?.sectionKey || '',
            sectionItems,
            fallbackItems
        });
    }, [defaultSection?.items, sectionData?.items, sectionData?.sectionKey]);

    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);

    useEffect(() => {
        if (loadedSignatureRef.current === sourceSignature) return;
        if (isDirty) return;
        setItems(initialItems);
        loadedSignatureRef.current = sourceSignature;
    }, [initialItems, isDirty, sourceSignature]);

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
        setIsDirty(true);
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
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

    const validateItem = (item) => (
        String(item.line1 || '').trim() &&
        String(item.line2 || '').trim() &&
        String(item.image || '').trim() &&
        String(item.categoryId || '').trim()
    );

    const handleSave = async () => {
        const invalid = items.find((item) => !validateItem(item));
        if (invalid) {
            toast.error(`Each card needs line1, line2, image, and category. Missing: ${invalid.name || 'New Card'}`);
            return;
        }

        setSaving(true);
        try {
            await onSave({
                settings: sectionData?.settings || {},
                items: items.slice(0, 4).map((item, index) => ({
                    itemId: item.itemId || item.id,
                    name: item.name?.trim() || `${item.line1} ${item.line2}`.trim(),
                    label: item.name?.trim() || `${item.line1} ${item.line2}`.trim(),
                    line1: item.line1?.trim() || '',
                    line2: item.line2?.trim() || '',
                    image: item.image,
                    categoryId: item.categoryId,
                    path: buildMenShopPath({ category: item.categoryId }),
                    sortOrder: index
                }))
            });
            loadedSignatureRef.current = sourceSignature;
            setIsDirty(false);
            toast.success('Style Trends updated');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Style Trends</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Fixed 4 cards. Edit images/text/category, then save section.
                    </p>
                </div>
                <div className="flex items-center gap-2">
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

            <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {items.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 space-y-4">
                            <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                                Card {index + 1}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
                                <div className="space-y-3">
                                    <div className="relative aspect-[9/13] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name || `Style Trend ${index + 1}`} className="w-full h-full object-cover" />
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
                                                ✨ Recommended: 1080x1350px (4:5)
                                            </p>
                                        </div>
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        label="Display Name"
                                        value={item.name}
                                        onChange={(event) => handleItemChange(item.id, 'name', event.target.value)}
                                        placeholder="Rings Stacking"
                                    />
                                    <Input
                                        label="Line 1"
                                        value={item.line1}
                                        onChange={(event) => handleItemChange(item.id, 'line1', event.target.value)}
                                        placeholder="Rings"
                                    />
                                    <Input
                                        label="Line 2"
                                        value={item.line2}
                                        onChange={(event) => handleItemChange(item.id, 'line2', event.target.value)}
                                        placeholder="Stacking"
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
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MenStyleTrendsEditor;
