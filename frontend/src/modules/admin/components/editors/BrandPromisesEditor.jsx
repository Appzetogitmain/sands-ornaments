import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input, Select, TextArea } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const ICON_OPTIONS = [
    { value: 'gem', label: 'Gem' },
    { value: 'rotate-ccw', label: 'Rotate / Return' },
    { value: 'truck', label: 'Truck / Delivery' },
    { value: 'file-text', label: 'File / Terms' },
    { value: 'shield', label: 'Shield / Protection' },
    { value: 'gift', label: 'Gift / Gifting' },
    { value: 'sparkles', label: 'Sparkles / Premium' },
    { value: 'lock', label: 'Lock / Secure' },
    { value: 'credit-card', label: 'Card / Payments' }
];

const createBlankPromise = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    subtitle: '',
    description: '',
    iconKey: 'gem'
});

const BrandPromisesEditor = ({ sectionData, onSave, defaultItems = [] }) => {
    const initialItems = useMemo(() => {
        if (Array.isArray(sectionData?.items) && sectionData.items.length > 0) {
            return sectionData.items.map((item) => ({
                id: item.itemId || item.id || item._id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: item.name || item.label || '',
                subtitle: item.subtitle || '',
                description: item.description || '',
                iconKey: item.iconKey || 'gem'
            }));
        }

        if (Array.isArray(defaultItems) && defaultItems.length > 0) {
            return defaultItems.map((item, index) => ({
                id: item.itemId || item.id || item._id || `promise-${index + 1}`,
                name: item.name || item.label || '',
                subtitle: item.subtitle || '',
                description: item.description || '',
                iconKey: item.iconKey || 'gem'
            }));
        }

        return [createBlankPromise()];
    }, [defaultItems, sectionData?.items]);

    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const addItem = () => setItems((prev) => [...prev, createBlankPromise()]);
    const removeItem = (id) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

    const handleSave = () => {
        const cleanedItems = items
            .map((item, index) => ({
                itemId: item.id,
                name: item.name?.trim(),
                label: item.name?.trim(),
                subtitle: item.subtitle?.trim(),
                description: item.description?.trim(),
                iconKey: item.iconKey || 'gem',
                sortOrder: index
            }))
            .filter((item) => item.name && item.subtitle);

        if (cleanedItems.length === 0) {
            toast.error('Add at least one complete promise before saving.');
            return;
        }

        onSave({ items: cleanedItems });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Brand Promises Section</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage the Home commitments cards without changing the current UI style.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E7D8D3] text-[#3E2723] font-semibold text-sm hover:bg-[#FFF8F6] transition-colors"
                    >
                        <Plus size={16} />
                        Add Promise
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white font-semibold text-sm hover:bg-[#5a3d36] transition-colors"
                    >
                        Save Section
                    </button>
                </div>
            </div>

            <div className="p-6 md:p-8 space-y-5">
                {items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.28em] text-[#B28A8A] font-bold">Promise {index + 1}</p>
                                <h4 className="text-lg font-semibold text-[#3E2723] mt-1">Commitment Card</h4>
                            </div>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#F1D9D5] text-[#A84C4C] hover:bg-[#FFF1F1] transition-colors"
                                    aria-label="Remove promise"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Title"
                                value={item.name}
                                onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                                placeholder="Pure 925"
                            />
                            <Input
                                label="Subtitle"
                                value={item.subtitle}
                                onChange={(event) => updateItem(item.id, 'subtitle', event.target.value)}
                                placeholder="SILVER"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Select
                                label="Icon"
                                value={item.iconKey}
                                onChange={(event) => updateItem(item.id, 'iconKey', event.target.value)}
                                options={ICON_OPTIONS}
                            />
                            <TextArea
                                label="Helper Text"
                                value={item.description}
                                onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                                rows={3}
                                placeholder="Certified Authenticity"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BrandPromisesEditor;
