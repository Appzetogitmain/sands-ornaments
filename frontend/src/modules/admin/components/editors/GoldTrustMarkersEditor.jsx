import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Input, Select } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const ICON_OPTIONS = [
    { value: 'ShieldCheck', label: 'Shield Check' },
    { value: 'RefreshCw', label: 'Refresh / Exchange' },
    { value: 'RotateCcw', label: 'Rotate / Return' },
    { value: 'Star', label: 'Star / Hallmark' },
    { value: 'Truck', label: 'Delivery / Truck' },
    { value: 'FileText', label: 'File / Policy' }
];

const DEFAULT_ITEMS = [
    { itemId: 'trust-1', name: '100% Certified Lab', subtitle: 'Grown Diamonds', iconName: 'ShieldCheck' },
    { itemId: 'trust-2', name: 'Lifetime Exchange', subtitle: '& Buyback', iconName: 'RefreshCw' },
    { itemId: 'trust-3', name: 'Easy 30', subtitle: 'Days Return', iconName: 'RotateCcw' },
    { itemId: 'trust-4', name: 'B I S', subtitle: 'Hallmark', iconName: 'Star' }
];

const GoldTrustMarkersEditor = ({ sectionData, onSave }) => {
    const initialItems = useMemo(() => {
        const source = Array.isArray(sectionData?.items) && sectionData.items.length > 0
            ? sectionData.items
            : DEFAULT_ITEMS;

        return DEFAULT_ITEMS.map((fallback, index) => {
            const current = source[index] || {};
            return {
                id: current.itemId || current.id || fallback.itemId,
                name: current.name || current.label || fallback.name,
                subtitle: current.subtitle || current.description || fallback.subtitle,
                iconName: current.iconName || current.iconKey || fallback.iconName
            };
        });
    }, [sectionData?.items]);

    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const handleSave = async () => {
        const normalizedItems = items.map((item, index) => ({
            itemId: item.id || `trust-${index + 1}`,
            name: String(item.name || '').trim(),
            label: String(item.name || '').trim(),
            subtitle: String(item.subtitle || '').trim(),
            description: String(item.subtitle || '').trim(),
            iconName: item.iconName || 'ShieldCheck',
            iconKey: item.iconName || 'ShieldCheck',
            sortOrder: index
        }));

        const invalid = normalizedItems.filter((item) => !item.name || !item.subtitle);
        if (invalid.length > 0) {
            toast.error('Each trust marker needs title and subtitle before saving.');
            return;
        }

        const result = await onSave({ items: normalizedItems });
        if (result?.success === false) return;
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Gold Trust Markers</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        These 4 cards are fixed for layout consistency. Update title, subtitle, and icon.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white font-semibold text-sm hover:bg-[#5a3d36] transition-colors"
                >
                    Save Section
                </button>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[#B28A8A] font-bold">Marker {index + 1}</p>
                        <div className="mt-4 space-y-4">
                            <Input
                                label="Title"
                                value={item.name}
                                onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                                placeholder="100% Certified Lab"
                            />
                            <Input
                                label="Subtitle"
                                value={item.subtitle}
                                onChange={(event) => updateItem(item.id, 'subtitle', event.target.value)}
                                placeholder="Grown Diamonds"
                            />
                            <Select
                                label="Icon"
                                value={item.iconName}
                                onChange={(event) => updateItem(item.id, 'iconName', event.target.value)}
                                options={ICON_OPTIONS}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GoldTrustMarkersEditor;
