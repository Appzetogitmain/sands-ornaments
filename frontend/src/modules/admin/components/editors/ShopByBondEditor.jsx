import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Edit2, Image as ImageIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { Input } from '../common/FormControls';
import { resolveLegacyCmsAsset } from '../../../user/utils/legacyCmsAssets';
import { useDraftState } from '../../hooks/useDraftState';

const HOME_BOND_OPTIONS = [
    { value: 'wife', label: 'Wife' },
    { value: 'husband', label: 'Husband' },
    { value: 'mother', label: 'Mother' },
    { value: 'brothers', label: 'Brothers' },
    { value: 'sister', label: 'Sister' },
    { value: 'friends', label: 'Friends' }
];

const FAMILY_RELATION_OPTIONS = [
    { value: 'all', label: 'All', defaultTitle: 'ALL', defaultSubtitle: 'Every loved one' },
    { value: 'mother', label: 'Mother', defaultTitle: 'MOTHER', defaultSubtitle: 'Graceful keepsakes' },
    { value: 'father', label: 'Father', defaultTitle: 'FATHER', defaultSubtitle: 'Classic silver picks' },
    { value: 'brother', label: 'Brother', defaultTitle: 'BROTHER', defaultSubtitle: 'Bold everyday styles' },
    { value: 'sister', label: 'Sister', defaultTitle: 'SISTER', defaultSubtitle: 'Delicate favourites' },
    { value: 'husband', label: 'Husband', defaultTitle: 'HUSBAND', defaultSubtitle: 'Signature essentials' },
    { value: 'wife', label: 'Wife', defaultTitle: 'WIFE', defaultSubtitle: 'Elegant gifting edits' }
];

const normalizeKey = (value = '') => String(value || '').trim().toLowerCase();

const buildFamilyRelationPath = (relationKey) => {
    const normalized = normalizeKey(relationKey);
    return normalized === 'all' ? '/category/family' : `/category/family/${normalized}`;
};

const RECOMMENDED_IMAGE_SIZE = '1200 x 1500 px';

const resolveRelationKey = (item = {}) => {
    const candidates = [item.relationKey, item.recipient, item.bondKey, item.id, item.itemId];
    for (const value of candidates) {
        const normalized = normalizeKey(value);
        if (FAMILY_RELATION_OPTIONS.some((option) => option.value === normalized)) return normalized;
        const relationSuffix = normalized.match(/(?:^|-)relation-(all|mother|father|brother|sister|husband|wife)$/)?.[1];
        if (relationSuffix && FAMILY_RELATION_OPTIONS.some((option) => option.value === relationSuffix)) return relationSuffix;
        const relationTail = normalized.match(/(?:^|[^a-z])(all|mother|father|brother|sister|husband|wife)$/)?.[1];
        if (relationTail && FAMILY_RELATION_OPTIONS.some((option) => option.value === relationTail)) return relationTail;
    }
    return '';
};

const ShopByBondEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const isFamilyRelationEditor = (sectionData?.pageKey === 'shop-family')
        && (sectionData?.sectionKey === 'shop-by-relation');

    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};

        if (isFamilyRelationEditor) {
            return {
                eyebrow: currentSettings.eyebrow || fallbackSettings.eyebrow || 'Family Edit',
                title: currentSettings.title || fallbackSettings.title || 'SHOP BY RELATION',
                subtitle: currentSettings.subtitle || fallbackSettings.subtitle || 'Explore curated gifting jewellery designed for every bond.'
            };
        }

        return {
            title: currentSettings.title || fallbackSettings.title || 'Shop by Bond',
            subtitle: currentSettings.subtitle || fallbackSettings.subtitle || 'Curated for your loved ones'
        };
    }, [defaultSection?.settings, isFamilyRelationEditor, sectionData?.settings]);

    const initialItems = useMemo(() => {
        const sourceItems = Array.isArray(sectionData?.items) && sectionData.items.length > 0
            ? sectionData.items
            : (defaultSection?.items || []);

        if (isFamilyRelationEditor) {
            return FAMILY_RELATION_OPTIONS.map((option) => {
                const match = sourceItems.find((item) => resolveRelationKey(item) === option.value) || {};
                return {
                    id: match.itemId || match.id || `shop-by-relation-${option.value}`,
                    relationKey: option.value,
                    name: match.name || match.label || option.defaultTitle,
                    subtitle: match.subtitle || match.description || option.defaultSubtitle,
                    image: match.image || ''
                };
            });
        }

        return sourceItems.map((item, index) => ({
            id: item.itemId || item.id || `shop-by-bond-${index + 1}`,
            name: item.name || '',
            image: item.image || '',
            bondKey: item.bondKey || ''
        }));
    }, [defaultSection?.items, isFamilyRelationEditor, sectionData?.items]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);
    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);
    const [saving, setSaving] = useState(false);
    const [editingCardId, setEditingCardId] = useState(null);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    useEffect(() => {
        setItems(initialItems);
        setEditingCardId(null);
    }, [initialItems]);

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;

            if (!isFamilyRelationEditor && field === 'bondKey') {
                const selectedBond = HOME_BOND_OPTIONS.find((option) => option.value === value);
                return {
                    ...item,
                    bondKey: value,
                    name: selectedBond?.label || item.name
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

    const buildNormalizedFamilyItems = () => (
        FAMILY_RELATION_OPTIONS.map((option, index) => {
            const current = items.find((entry) => normalizeKey(entry.relationKey) === option.value) || {};
            const title = (current.name || option.defaultTitle).trim();
            const subtitle = (current.subtitle || option.defaultSubtitle).trim();
            return {
                id: current.id || `shop-by-relation-${option.value}`,
                itemId: current.itemId || current.id || `shop-by-relation-${option.value}`,
                relationKey: option.value,
                recipient: option.value,
                name: title,
                label: title,
                subtitle,
                description: subtitle,
                image: current.image,
                path: buildFamilyRelationPath(option.value),
                sortOrder: index
            };
        })
    );

    const handleSave = async ({ cardId = null, settingsOnly = false } = {}) => {
        if (isFamilyRelationEditor) {
            if (!settingsOnly) {
                if (cardId) {
                    const target = items.find((item) => item.id === cardId);
                    if (!target || !target.image?.trim() || !target.relationKey || !target.name?.trim() || !target.subtitle?.trim()) {
                        toast.error('Validation Error: This card needs title, subtitle, and image before saving.');
                        return { success: false };
                    }
                } else {
                    const missingImageItem = items.find((item) => !item.image?.trim());
                    if (missingImageItem) {
                        toast.error(`Validation Error: Please upload an image for the "${missingImageItem.name || 'Unnamed'}" relation card.`);
                        return { success: false };
                    }

                    const missingTextItem = items.find((item) => !item.name?.trim() || !item.subtitle?.trim());
                    if (missingTextItem) {
                        toast.error(`Validation Error: Please provide a Title and Subtitle for the "${missingTextItem.name || 'Unnamed'}" relation card.`);
                        return { success: false };
                    }
                }
            }
            const normalizedItems = buildNormalizedFamilyItems();

            setSaving(true);
            try {
                const result = await onSave({
                    settings: {
                        eyebrow: settings.eyebrow?.trim() || 'Family Edit',
                        title: settings.title?.trim() || 'SHOP BY RELATION',
                        subtitle: settings.subtitle?.trim() || 'Explore curated gifting jewellery designed for every bond.'
                    },
                    items: normalizedItems
                });
                return result || { success: true };
            } finally {
                setSaving(false);
            }
        }

        const missingImageItem = items.find((item) => !item.image?.trim());
        if (missingImageItem) {
            toast.error(`Validation Error: Please upload an image for the "${missingImageItem.name || 'Unnamed'}" card.`);
            return;
        }

        const missingBondItem = items.find((item) => !item.bondKey);
        if (missingBondItem) {
            toast.error(`Validation Error: Please select a Bond Type for the "${missingBondItem.name || 'Unnamed'}" card.`);
            return;
        }

        setSaving(true);
        try {
            const result = await onSave({
                settings: {
                    title: settings.title?.trim() || 'Shop by Bond',
                    subtitle: settings.subtitle?.trim() || 'Curated for your loved ones'
                },
                items: items.map((item, index) => ({
                    ...item,
                    itemId: item.itemId || item.id,
                    sortOrder: index
                }))
            });
            return result || { success: true };
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">{isFamilyRelationEditor ? 'Shop by Relation' : 'Shop by Bond'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {isFamilyRelationEditor
                            ? 'Manage the seven fixed relation cards safely. Route mapping is locked so navigation stays stable.'
                            : 'Manage the six bond cards safely. The destination is generated automatically from the selected bond, so admin cannot break navigation with a custom link.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => handleSave({ settingsOnly: isFamilyRelationEditor })}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white font-semibold text-sm hover:bg-[#5a3d36] transition-colors disabled:opacity-60"
                >
                    <Save size={16} />
                    {saving ? 'Saving...' : (isFamilyRelationEditor ? 'Save Header' : 'Save Section')}
                </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isFamilyRelationEditor && (
                        <Input
                            label="Eyebrow"
                            value={settings.eyebrow}
                            onChange={(event) => setSettings((prev) => ({ ...prev, eyebrow: event.target.value }))}
                            placeholder="Family Edit"
                        />
                    )}
                    <Input
                        label="Section Title"
                        value={settings.title}
                        onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder={isFamilyRelationEditor ? 'SHOP BY RELATION' : 'Shop by Bond'}
                    />
                    <Input
                        label="Section Subtitle"
                        value={settings.subtitle}
                        onChange={(event) => setSettings((prev) => ({ ...prev, subtitle: event.target.value }))}
                        placeholder={isFamilyRelationEditor ? 'Explore curated gifting jewellery designed for every bond.' : 'Curated for your loved ones'}
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {items.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                                    Card {index + 1}
                                </div>
                                {isFamilyRelationEditor ? (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const isEditing = editingCardId === item.id;
                                            if (!isEditing) {
                                                setEditingCardId(item.id);
                                                return;
                                            }
                                            const result = await handleSave({ cardId: item.id });
                                            if (result?.success !== false) {
                                                setEditingCardId(null);
                                            }
                                        }}
                                        disabled={saving}
                                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                            editingCardId === item.id
                                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {editingCardId === item.id ? <CheckCircle size={14} /> : <Edit2 size={14} />}
                                        {editingCardId === item.id ? 'Save Card' : 'Edit Card'}
                                    </button>
                                ) : (
                                    <div className="text-[11px] font-semibold text-gray-400">
                                        Route auto-generated from relation
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
                                <div className="space-y-3">
                                    <div className="relative aspect-[4/5] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                                        {item.image ? (
                                            <img src={resolveLegacyCmsAsset(item.image, item.image)} alt={item.name || `Card ${index + 1}`} className="w-full h-full object-cover" />
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
                                    <label className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                                        isFamilyRelationEditor && editingCardId !== item.id
                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            : 'bg-[#3E2723] text-white hover:bg-[#2D1B18] cursor-pointer'
                                    }`}>
                                        <ImageIcon size={14} />
                                        Change Image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isFamilyRelationEditor && editingCardId !== item.id}
                                            onChange={async (event) => {
                                                await handleImageUpload(item.id, event.target.files?.[0]);
                                                event.target.value = '';
                                            }}
                                        />
                                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                                    </label>
                                        <div className="text-center mt-2 w-full">
                                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block w-full">
                                                ✨ Recommended: 1080x1080px (1:1)
                                            </p>
                                        </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {isFamilyRelationEditor ? (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Relation Type</label>
                                            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-600">
                                                {(FAMILY_RELATION_OPTIONS.find((option) => option.value === item.relationKey)?.label) || 'Relation'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Bond Type</label>
                                            <select
                                                value={item.bondKey || ''}
                                                onChange={(event) => updateItem(item.id, 'bondKey', event.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                                            >
                                                <option value="">Select Bond</option>
                                                {HOME_BOND_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <Input
                                        label="Display Name"
                                        value={item.name || ''}
                                        onChange={(event) => {
                                            if (isFamilyRelationEditor && editingCardId !== item.id) return;
                                            updateItem(item.id, 'name', event.target.value);
                                        }}
                                        placeholder={isFamilyRelationEditor ? 'MOTHER' : 'Wife'}
                                        readOnly={isFamilyRelationEditor && editingCardId !== item.id}
                                        className={isFamilyRelationEditor && editingCardId !== item.id ? 'bg-gray-50 text-gray-500' : ''}
                                    />

                                    {isFamilyRelationEditor && (
                                        <Input
                                            label="Subtitle"
                                            value={item.subtitle || ''}
                                            onChange={(event) => {
                                                if (editingCardId !== item.id) return;
                                                updateItem(item.id, 'subtitle', event.target.value);
                                            }}
                                            placeholder="Graceful keepsakes"
                                            readOnly={editingCardId !== item.id}
                                            className={editingCardId !== item.id ? 'bg-gray-50 text-gray-500' : ''}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShopByBondEditor;
