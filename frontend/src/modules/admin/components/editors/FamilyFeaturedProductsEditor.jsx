import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { adminService } from '../../services/adminService';
import ProductBrowserModal from './ProductBrowserModal';
import { useDraftState } from '../../hooks/useDraftState';

const FAMILY_TABS = [
    { key: 'all', label: 'All Family Collections' },
    { key: 'mother', label: 'Mother Collections' },
    { key: 'father', label: 'Father Collections' },
    { key: 'brother', label: 'Brother Collections' },
    { key: 'sister', label: 'Sister Collections' },
    { key: 'husband', label: 'Husband Collections' },
    { key: 'wife', label: 'Wife Collections' }
];

const parsePositiveNumber = (value, fallback = 8) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const uniqueIds = (values = []) => [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];

const normalizeTabConfig = (input = {}, fallbackLabel = '') => ({
    tabLabel: String(input.tabLabel || fallbackLabel || '').trim() || fallbackLabel,
    productLimit: String(parsePositiveNumber(input.productLimit, 8)),
    sourceMode: input.sourceMode === 'manual' ? 'manual' : 'category',
    categoryId: String(input.categoryId || '').trim(),
    productIds: uniqueIds(input.productIds || [])
});

const FamilyFeaturedProductsEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [productPickerTab, setProductPickerTab] = useState('all');

    const initialSettings = useMemo(() => {
        const fallback = defaultSection?.settings || {};
        const current = sectionData?.settings || {};

        const sourceSettingsTabs = current.tabConfigs || fallback.tabConfigs || {};
        const manualIdsByTabFromItems = {};
        (Array.isArray(sectionData?.items) ? sectionData.items : []).forEach((item) => {
            const tabKey = String(item?.recipient || item?.relationKey || 'all').trim().toLowerCase();
            if (!FAMILY_TABS.some((tab) => tab.key === tabKey)) return;
            const ids = [];
            if (item?.productId) ids.push(String(item.productId));
            if (Array.isArray(item?.productIds)) ids.push(...item.productIds.map((id) => String(id)));
            if (ids.length === 0) return;
            manualIdsByTabFromItems[tabKey] = uniqueIds([...(manualIdsByTabFromItems[tabKey] || []), ...ids]);
        });

        const tabConfigs = FAMILY_TABS.reduce((acc, tab) => {
            const source = normalizeTabConfig(sourceSettingsTabs[tab.key] || {}, tab.label);
            acc[tab.key] = {
                ...source,
                productIds: source.sourceMode === 'manual'
                    ? uniqueIds([...(source.productIds || []), ...(manualIdsByTabFromItems[tab.key] || [])])
                    : source.productIds
            };
            return acc;
        }, {});

        return {
            title: String(current.title || fallback.title || 'All Family Collections').trim() || 'All Family Collections',
            highlightWord: String(current.highlightWord || fallback.highlightWord || 'Edit').trim() || 'Edit',
            subtitle: String(current.subtitle || fallback.subtitle || '"Curated boutique jewellery picks for every family member."').trim()
                || '"Curated boutique jewellery picks for every family member."',
            ctaLabel: String(current.ctaLabel || fallback.ctaLabel || 'View All Collections').trim() || 'View All Collections',
            tabConfigs
        };
    }, [defaultSection?.settings, sectionData?.items, sectionData?.settings]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);

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

    const updateTabConfig = (tabKey, field, value) => {
        setSettings((prev) => ({
            ...prev,
            tabConfigs: {
                ...prev.tabConfigs,
                [tabKey]: {
                    ...prev.tabConfigs[tabKey],
                    [field]: value
                }
            }
        }));
    };

    const openProductPicker = (tabKey) => {
        setProductPickerTab(tabKey);
        setIsProductPickerOpen(true);
    };

    const handleProductSelect = (selectedItems = []) => {
        const ids = uniqueIds(selectedItems.map((item) => item.id || item._id));
        updateTabConfig(productPickerTab, 'productIds', ids);
    };

    const handleSave = async () => {
        const normalizedTabs = FAMILY_TABS.reduce((acc, tab) => {
            const current = normalizeTabConfig(settings.tabConfigs?.[tab.key] || {}, tab.label);
            acc[tab.key] = {
                ...current,
                productLimit: parsePositiveNumber(current.productLimit, 8)
            };
            return acc;
        }, {});

        const invalidManualTabs = FAMILY_TABS.filter((tab) => (
            normalizedTabs[tab.key].sourceMode === 'manual' && normalizedTabs[tab.key].productIds.length === 0
        ));
        if (invalidManualTabs.length > 0) {
            toast.error(`Select products for: ${invalidManualTabs.map((tab) => tab.label).join(', ')}`);
            return;
        }

        const manualItems = FAMILY_TABS.flatMap((tab) => {
            const config = normalizedTabs[tab.key];
            if (config.sourceMode !== 'manual') return [];
            return config.productIds.map((productId, index) => ({
                itemId: `family-featured-${tab.key}-${index + 1}`,
                type: 'product',
                productId,
                recipient: tab.key,
                sortOrder: index
            }));
        });

        setSaving(true);
        try {
            await onSave({
                settings: {
                    title: settings.title,
                    highlightWord: settings.highlightWord,
                    subtitle: settings.subtitle,
                    ctaLabel: settings.ctaLabel,
                    tabConfigs: normalizedTabs
                },
                items: manualItems
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">All Family Collections</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Hybrid mode: each fixed tab can be category-based or manually pinned.
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

            <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Section Title"
                        value={settings.title}
                        onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="All Family Collections"
                    />
                    <Input
                        label="Highlighted Word"
                        value={settings.highlightWord}
                        onChange={(event) => setSettings((prev) => ({ ...prev, highlightWord: event.target.value }))}
                        placeholder="Edit"
                    />
                    <Input
                        label="Section Subtitle"
                        value={settings.subtitle}
                        onChange={(event) => setSettings((prev) => ({ ...prev, subtitle: event.target.value }))}
                        placeholder='"Curated boutique jewellery picks for every family member."'
                    />
                </div>

                <Input
                    label="CTA Button Label"
                    value={settings.ctaLabel}
                    onChange={(event) => setSettings((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                    placeholder="View All Collections"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {FAMILY_TABS.map((tab) => {
                        const config = settings.tabConfigs?.[tab.key] || normalizeTabConfig({}, tab.label);
                        return (
                            <div key={tab.key} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-4 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#B28A8A]">{tab.label}</p>
                                <Input
                                    label="Tab Name"
                                    value={config.tabLabel || tab.label}
                                    onChange={(event) => updateTabConfig(tab.key, 'tabLabel', event.target.value)}
                                    placeholder={tab.label}
                                />
                                <Input
                                    label="Product Count"
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={config.productLimit || '8'}
                                    onChange={(event) => updateTabConfig(tab.key, 'productLimit', event.target.value)}
                                    placeholder="8"
                                />

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Source Mode</label>
                                    <select
                                        value={config.sourceMode}
                                        onChange={(event) => updateTabConfig(tab.key, 'sourceMode', event.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                                    >
                                        <option value="category">Category Based</option>
                                        <option value="manual">Manually Pinned Products</option>
                                    </select>
                                </div>

                                {config.sourceMode === 'category' ? (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                                        <select
                                            value={config.categoryId || ''}
                                            onChange={(event) => updateTabConfig(tab.key, 'categoryId', event.target.value)}
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
                                    <div className="rounded-xl border border-[#EFE3DF] bg-white p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B28A8A]">Pinned Products</p>
                                        <p className="mt-1 text-sm font-semibold text-[#3E2723]">
                                            {config.productIds.length > 0 ? `${config.productIds.length} selected` : 'No products selected'}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openProductPicker(tab.key)}
                                                className="px-3 py-2 rounded-lg bg-[#3E2723] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5a3d36] transition-colors"
                                            >
                                                Select Products
                                            </button>
                                            {config.productIds.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateTabConfig(tab.key, 'productIds', [])}
                                                    className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <ProductBrowserModal
                isOpen={isProductPickerOpen}
                onClose={() => setIsProductPickerOpen(false)}
                onSelect={handleProductSelect}
                selectedIds={settings.tabConfigs?.[productPickerTab]?.productIds || []}
                maxSelection={24}
            />
        </div>
    );
};

export default FamilyFeaturedProductsEditor;
