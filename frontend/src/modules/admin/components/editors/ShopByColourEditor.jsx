import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { Input } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const METAL_OPTIONS = [
    { value: 'silver', label: 'Pure 925 Silver' },
    { value: 'gold', label: 'Gold Plated' },
    { value: 'rose-gold', label: 'Rose Gold Plated' },
    { value: 'oxidised', label: 'Oxidised Silver' }
];

const createFallbackItems = (items = []) => items.map((item, index) => ({
    id: item.itemId || item.id || `shop-by-colour-${index + 1}`,
    name: item.name || '',
    image: item.image || '',
    tag: item.tag || '',
    metalKey: item.metalKey || ''
}));

const RECOMMENDED_IMAGE_SIZE = '1200 x 1000 px';

const ShopByColourEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};

        return {
            title: currentSettings.title || fallbackSettings.title || 'Shop by Colour'
        };
    }, [defaultSection?.settings, sectionData?.settings]);

    const initialItems = useMemo(() => {
        const sourceItems = Array.isArray(sectionData?.items) && sectionData.items.length > 0
            ? sectionData.items
            : (defaultSection?.items || []);

        return createFallbackItems(sourceItems);
    }, [defaultSection?.items, sectionData?.items]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);
    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    

    const updateItem = (id, field, value) => {
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
        updateItem(id, 'image', uploadedUrl);
    };

    const handleSave = async () => {
        const invalid = items.find((item) => !item.image?.trim() || !item.metalKey);
        if (invalid) {
            toast.error(`Each card needs an image and metal type before saving. Missing: ${invalid.name || 'Card'}`);
            return;
        }

        setSaving(true);
        try {
            await onSave({
                settings: {
                    title: settings.title?.trim() || 'Shop by Colour'
                },
                items: items.map((item, index) => ({
                    ...item,
                    itemId: item.itemId || item.id,
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
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Shop by Colour</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage the four colour cards safely. Routes are generated automatically from the selected metal type,
                        so admin cannot break navigation with custom links.
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
                        placeholder="Shop by Colour"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {items.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                                    Card {index + 1}
                                </div>
                                <div className="text-[11px] font-semibold text-gray-400">
                                    Route auto-generated from metal
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
                                <div className="space-y-3">
                                    <div className="relative aspect-[1.2/1] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name || `Colour card ${index + 1}`} className="w-full h-full object-cover" />
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

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Metal Type</label>
                                        <select
                                            value={item.metalKey || ''}
                                            onChange={(event) => updateItem(item.id, 'metalKey', event.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                                        >
                                            <option value="">Select Metal</option>
                                            {METAL_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Input
                                        label="Display Name"
                                        value={item.name || ''}
                                        onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                                        placeholder="Pure 925 Silver"
                                    />

                                    <Input
                                        label="Badge Text"
                                        value={item.tag || ''}
                                        onChange={(event) => updateItem(item.id, 'tag', event.target.value)}
                                        placeholder="Pure 925 Silver"
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

export default ShopByColourEditor;
