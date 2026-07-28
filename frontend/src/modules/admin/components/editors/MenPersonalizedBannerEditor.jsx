import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { adminService } from '../../services/adminService';
import { buildMenShopPath } from '../../../user/utils/menNavigation';

const normalizeLabel = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseCategoryHint = (item = {}) => {
    const categoryFromPath = String(item.path || '').includes('category=')
        ? String(item.path).split('category=')[1]?.split('&')[0] || ''
        : '';
    return categoryFromPath || item.categoryId || item.name || '';
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

    if (normalizedHint.endsWith('s')) {
        const singular = normalizedHint.replace(/s$/, '');
        const bySingular = categories.find((category) => {
            const slug = normalizeLabel(category.slug || '');
            const name = normalizeLabel(category.name || '');
            return slug === singular || name === singular;
        });
        if (bySingular) return String(bySingular._id);
    }

    return '';
};

const RECOMMENDED_IMAGE_SIZE = '1600 x 700 px';

const MenPersonalizedBannerEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);

    const initialItem = useMemo(() => {
        const sourceItems = Array.isArray(sectionData?.items) && sectionData.items.length > 0
            ? sectionData.items
            : (defaultSection?.items || []);
        const item = sourceItems[0] || {};
        return {
            id: item.itemId || item.id || 'men-personalized-main',
            name: item.name || item.label || 'Personalised',
            subtitle: item.subtitle || item.description || 'Flawless Gifting, Tailored to You',
            ctaLabel: item.ctaLabel || 'Customise Now',
            image: item.image || '',
            categoryId: item.categoryId || '',
            categoryHint: parseCategoryHint(item)
        };
    }, [defaultSection?.items, sectionData?.items]);

    const [item, setItem] = useState(initialItem);

    useEffect(() => {
        setItem(initialItem);
    }, [initialItem]);

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await adminService.getCategories();
            const list = Array.isArray(data) ? data : [];
            setCategories(list);
            if (!item.categoryId && list.length > 0) {
                const resolved = resolveCategoryId(item.categoryHint || item.name, list);
                if (resolved) {
                    setItem((prev) => ({ ...prev, categoryId: resolved }));
                }
            }
        };
        fetchCategories();
    }, []);

    const handleImageUpload = async (file) => {
        if (!file) return;
        const uploadedUrl = await adminService.uploadSectionImage(file);
        if (!uploadedUrl) {
            toast.error('Image upload failed. Please try again.');
            return;
        }
        setItem((prev) => ({ ...prev, image: uploadedUrl }));
    };

    const handleSave = async () => {
        if (!String(item.image || '').trim()) {
            toast.error('Banner image is required before saving.');
            return;
        }
        if (!item.categoryId) {
            toast.error('Select a category before saving.');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                settings: sectionData?.settings || {},
                items: [
                    {
                        itemId: item.itemId || item.id,
                        name: item.name?.trim() || 'Personalised',
                        label: item.name?.trim() || 'Personalised',
                        subtitle: item.subtitle?.trim() || '',
                        ctaLabel: item.ctaLabel?.trim() || 'Customise Now',
                        image: item.image,
                        categoryId: item.categoryId,
                        path: buildMenShopPath({ category: item.categoryId }),
                        sortOrder: 0
                    }
                ]
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Personalized Banner</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Keep this banner fully safe: no free CTA URL, only category-based navigation.
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
                <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
                    <div className="space-y-3">
                        <div className="relative aspect-[16/7] rounded-2xl border border-dashed border-gray-300 bg-[#F8F5F2] overflow-hidden">
                            {item.image ? (
                                <img src={item.image} alt={item.name || 'Personalized banner'} className="w-full h-full object-cover" />
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
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1920x1080px (16:9 Ratio)</p>
                        </label>
                                        <div className="text-center mt-2 w-full">
                                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block w-full">
                                                ✨ Recommended: 1920x1080px (16:9)
                                            </p>
                                        </div>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Heading"
                            value={item.name}
                            onChange={(event) => setItem((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Personalised"
                        />
                        <Input
                            label="Subtitle"
                            value={item.subtitle}
                            onChange={(event) => setItem((prev) => ({ ...prev, subtitle: event.target.value }))}
                            placeholder="Flawless Gifting, Tailored to You"
                        />
                        <Input
                            label="CTA Label"
                            value={item.ctaLabel}
                            onChange={(event) => setItem((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                            placeholder="Customise Now"
                        />
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                            <select
                                value={item.categoryId || ''}
                                onChange={(event) => setItem((prev) => ({ ...prev, categoryId: event.target.value }))}
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
        </div>
    );
};

export default MenPersonalizedBannerEditor;
