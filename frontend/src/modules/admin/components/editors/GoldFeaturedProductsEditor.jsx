import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { adminService } from '../../services/adminService';
import ProductBrowserModal from './ProductBrowserModal';
import { useDraftState } from '../../hooks/useDraftState';

const normalizeLabel = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parsePositiveNumber = (value, fallback = 4) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const parseCategoryFromPath = (path = '') => {
    const source = String(path || '');
    if (!source.includes('category=')) return '';
    const raw = source.split('category=')[1]?.split('&')[0] || '';
    try {
        return decodeURIComponent(raw).trim();
    } catch {
        return raw.trim();
    }
};

const parseProductIdsFromPath = (path = '') => {
    const source = String(path || '');
    if (!source.includes('products=')) return [];
    const raw = source.split('products=')[1]?.split('&')[0] || '';
    const decoded = decodeURIComponent(raw);
    return decoded.split(',').map((id) => String(id || '').trim()).filter(Boolean);
};

const resolveCategoryId = (hint, categories = []) => {
    const raw = String(hint || '').trim();
    if (!raw || categories.length === 0) return '';

    const byId = categories.find((category) => String(category._id) === raw);
    if (byId) return String(byId._id);

    const normalizedHint = normalizeLabel(raw);
    const bySlugOrName = categories.find((category) => (
        normalizeLabel(category.slug || '') === normalizedHint
        || normalizeLabel(category.name || '') === normalizedHint
    ));
    if (bySlugOrName) return String(bySlugOrName._id);

    return '';
};

const uniqueIds = (values = []) => [
    ...new Set(
        (values || [])
            .map((value) => String(value || '').trim())
            .filter((value) => Boolean(value) && value !== '[object Object]')
    )
];

const normalizeProductId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') return String(value._id || value.id || '').trim();
    return String(value).trim();
};

const initialSelectedIds = (sectionData) => {
    const directProductIds = (Array.isArray(sectionData?.items) ? sectionData.items : [])
        .flatMap((item) => {
            const ids = [];
            if (item?.productId) ids.push(normalizeProductId(item.productId));
            if (Array.isArray(item?.productIds)) ids.push(...item.productIds.map((id) => normalizeProductId(id)));
            if (item?.path) ids.push(...parseProductIdsFromPath(item.path));
            return ids;
        });
    return uniqueIds(directProductIds);
};

const GoldFeaturedProductsEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

    const initialSettings = useMemo(() => {
        const fallback = defaultSection?.settings || {};
        const current = sectionData?.settings || {};
        const mergedSourceMode = current.sourceMode || fallback.sourceMode || 'category';
        const categoryHint = current.categoryId
            || fallback.categoryId
            || parseCategoryFromPath(sectionData?.items?.[0]?.path)
            || sectionData?.items?.[0]?.categoryId
            || '';

        return {
            title: current.title || fallback.title || 'All Jewellery',
            eyebrow: current.eyebrow || fallback.eyebrow || 'Our Collection',
            productLimit: String(parsePositiveNumber(current.productLimit || fallback.productLimit, 4)),
            sourceMode: mergedSourceMode === 'manual' ? 'manual' : 'category',
            categoryId: String(categoryHint || ''),
        };
    }, [defaultSection?.settings, sectionData?.items, sectionData?.settings]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);
    const [selectedProductIds, setSelectedProductIds] = useState(initialSelectedIds(sectionData));

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    useEffect(() => {
        setSelectedProductIds(initialSelectedIds(sectionData));
    }, [sectionData]);

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await adminService.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!settings.categoryId || categories.length === 0) return;
        if (categories.some((category) => String(category._id) === String(settings.categoryId))) return;
        const resolved = resolveCategoryId(settings.categoryId, categories);
        if (resolved) {
            setSettings((prev) => ({ ...prev, categoryId: resolved }));
        }
    }, [categories, settings.categoryId]);

    const handleSettingChange = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleProductSelect = (selectedItems = []) => {
        const ids = uniqueIds((selectedItems || []).map((item) => item.id || item._id));
        setSelectedProductIds(ids);
    };

    const handleSave = async () => {
        const productLimit = parsePositiveNumber(settings.productLimit, 4);
        const sourceMode = settings.sourceMode === 'manual' ? 'manual' : 'category';

        if (sourceMode === 'category' && !String(settings.categoryId || '').trim()) {
            toast.error('Select a category for category-based mode before saving.');
            return;
        }

        if (sourceMode === 'manual' && selectedProductIds.length === 0) {
            toast.error('Select at least one product for manual mode before saving.');
            return;
        }

        const payloadItems = sourceMode === 'manual'
            ? selectedProductIds.map((productId, index) => ({
                itemId: `gold-featured-${index + 1}`,
                type: 'product',
                productId,
                sortOrder: index
            }))
            : [];

        setSaving(true);
        try {
            await onSave({
                settings: {
                    title: String(settings.title || '').trim() || 'All Jewellery',
                    eyebrow: String(settings.eyebrow || '').trim() || 'Our Collection',
                    productLimit,
                    sourceMode,
                    categoryId: sourceMode === 'category' ? String(settings.categoryId || '').trim() : '',
                },
                items: payloadItems
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Gold Collection Products</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure this section from CMS. Products are rendered gold-focused on user side.
                    </p>
                </div>
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

            <div className="p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Section Title"
                        value={settings.title}
                        onChange={(event) => handleSettingChange('title', event.target.value)}
                        placeholder="All Jewellery"
                    />
                    <Input
                        label="Section Eyebrow"
                        value={settings.eyebrow}
                        onChange={(event) => handleSettingChange('eyebrow', event.target.value)}
                        placeholder="Our Collection"
                    />
                    <Input
                        label="Product Count"
                        type="number"
                        min="1"
                        max="24"
                        value={settings.productLimit}
                        onChange={(event) => handleSettingChange('productLimit', event.target.value)}
                        placeholder="4"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Source Mode</label>
                        <select
                            value={settings.sourceMode}
                            onChange={(event) => handleSettingChange('sourceMode', event.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                            <option value="category">Category Based</option>
                            <option value="manual">Manually Pinned Products</option>
                        </select>
                    </div>

                    {settings.sourceMode === 'category' ? (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                            <select
                                value={settings.categoryId || ''}
                                onChange={(event) => handleSettingChange('categoryId', event.target.value)}
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
                    ) : (
                        <div className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B28A8A]">Pinned Products</p>
                            <p className="mt-1 text-sm font-semibold text-[#3E2723]">
                                {selectedProductIds.length > 0 ? `${selectedProductIds.length} selected` : 'No products selected'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsProductPickerOpen(true)}
                                    className="px-3 py-2 rounded-lg bg-[#3E2723] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5a3d36] transition-colors"
                                >
                                    Select Products
                                </button>
                                {selectedProductIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProductIds([])}
                                        className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ProductBrowserModal
                isOpen={isProductPickerOpen}
                onClose={() => setIsProductPickerOpen(false)}
                onSelect={handleProductSelect}
                selectedIds={selectedProductIds}
                maxSelection={24}
            />
        </div>
    );
};

export default GoldFeaturedProductsEditor;
