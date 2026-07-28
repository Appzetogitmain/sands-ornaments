import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { adminService } from '../../services/adminService';
import { useDraftState } from '../../hooks/useDraftState';

const createBlankItem = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    subtitle: '',
    description: '',
    location: '',
    rating: 5,
    image: ''
});

const TestimonialSectionEditor = ({ sectionData, onSave, defaultItems = [] }) => {
    const initialItems = useMemo(() => {
        if (Array.isArray(sectionData?.items) && sectionData.items.length > 0) {
            return sectionData.items.map((item) => ({
                id: item.itemId || item.id || item._id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: item.name || '',
                subtitle: item.subtitle || '',
                description: item.description || '',
                location: item.location || '',
                rating: Number(item.rating) || 5,
                image: item.image || ''
            }));
        }

        if (Array.isArray(defaultItems) && defaultItems.length > 0) {
            return defaultItems.map((item, index) => ({
                id: item.itemId || item.id || item._id || `testimonial-${index + 1}`,
                name: item.name || '',
                subtitle: item.subtitle || '',
                description: item.description || '',
                location: item.location || '',
                rating: Number(item.rating) || 5,
                image: item.image || ''
            }));
        }

        return [createBlankItem()];
    }, [defaultItems, sectionData?.items]);

    const [items, setItems] = useDraftState(`draft_items_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialItems);
    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, sectionData.settings || {});

    const updateItem = (id, field, value) => {
        setItems((prev) => prev.map((item) => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const handleSettingChange = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
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
        setItems((prev) => [...prev, createBlankItem()]);
    };

    const removeItem = (id) => {
        setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
    };

    const handleSave = () => {
        const cleanedItems = items
            .map((item, index) => ({
                itemId: item.id,
                name: item.name?.trim(),
                subtitle: item.subtitle?.trim(),
                description: item.description?.trim(),
                location: item.location?.trim(),
                rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
                image: item.image,
                sortOrder: index
            }))
            .filter((item) => item.name && item.description && item.image);

        if (cleanedItems.length === 0) {
            toast.error('Add at least one complete testimonial before saving.');
            return;
        }

        onSave({ 
            items: cleanedItems,
            settings: settings
        });
    };

    const isGoldPage = sectionData.pageKey === 'gold-collection';

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">
                        {isGoldPage ? 'Gold Testimonials' : 'Testimonial Section'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage customer stories while keeping the {isGoldPage ? 'Gold Page' : 'homepage'} testimonial cards visually consistent.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E7D8D3] text-[#3E2723] font-semibold text-sm hover:bg-[#FFF8F6] transition-colors"
                    >
                        <Plus size={16} />
                        Add Testimonial
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

            <div className="p-6 md:p-8 space-y-6">
                {/* Section Settings */}
                <div className="bg-[#FAF9F6] rounded-2xl p-5 border border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#8D6E63] mb-4">Section Header</h4>
                    <div className="max-w-md">
                        <Input
                            label="Section Title"
                            value={settings.title || ''}
                            onChange={(e) => handleSettingChange('title', e.target.value)}
                            placeholder={isGoldPage ? 'Moments, Made by Heer' : 'Customer Stories'}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-[#EFE3DF] bg-[#FFFCFB] p-5 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.28em] text-[#B28A8A] font-bold">Story {index + 1}</p>
                                <h4 className="text-lg font-semibold text-[#3E2723] mt-1">Customer Testimonial</h4>
                            </div>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#F1D9D5] text-[#A84C4C] hover:bg-[#FFF1F1] transition-colors"
                                    aria-label="Remove testimonial"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
                            <div className="space-y-3">
                                <div className="rounded-2xl border border-dashed border-[#E7D8D3] bg-white overflow-hidden aspect-square flex items-center justify-center relative">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name || 'Testimonial'} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center px-4">
                                            <Upload className="w-7 h-7 text-[#B28A8A] mx-auto mb-2" />
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9D7C7C]">Upload Portrait</p>
                                        </div>
                                    )}
                                </div>
                                <label className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 rounded-xl bg-white border border-[#E7D8D3] text-[#3E2723] font-semibold text-sm hover:bg-[#FFF8F6] cursor-pointer transition-colors">
                                    <Upload size={16} />
                                    Upload Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(event) => handleImageUpload(item.id, event.target.files?.[0])}
                                    />
                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                                </label>
                                        <div className="text-center mt-2 w-full">
                                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block w-full">
                                                ✨ Recommended: 1080x1080px (1:1)
                                            </p>
                                        </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Customer Name"
                                        value={item.name}
                                        onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                                        placeholder="Ananya Sharma"
                                    />
                                    <Input
                                        label="Role / Badge"
                                        value={item.subtitle}
                                        onChange={(event) => updateItem(item.id, 'subtitle', event.target.value)}
                                        placeholder="Verified Buyer"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Location"
                                        value={item.location}
                                        onChange={(event) => updateItem(item.id, 'location', event.target.value)}
                                        placeholder="Mumbai"
                                    />
                                    <Input
                                        label="Rating (1-5)"
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={item.rating}
                                        onChange={(event) => updateItem(item.id, 'rating', event.target.value)}
                                        placeholder="5"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Story</label>
                                    <textarea
                                        value={item.description}
                                        onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                                        rows="5"
                                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20 resize-none"
                                        placeholder="Share the customer experience shown on the homepage card."
                                    />
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

export default TestimonialSectionEditor;
