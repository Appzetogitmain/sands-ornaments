import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const AllJewellerySectionEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};

        return {
            eyebrow: currentSettings.eyebrow || fallbackSettings.eyebrow || 'Our Collection',
            title: currentSettings.title || fallbackSettings.title || 'All Jewellery',
            ctaLabel: currentSettings.ctaLabel || fallbackSettings.ctaLabel || 'View Full Collection',
            productLimit: String(currentSettings.productLimit || fallbackSettings.productLimit || 16)
        };
    }, [defaultSection?.settings, sectionData?.settings]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);

    const updateSetting = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const parsedLimit = Number(settings.productLimit);

        if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
            toast.error('Product limit must be greater than 0.');
            return;
        }

        onSave({
            items: sectionData?.items || [],
            settings: {
                eyebrow: settings.eyebrow?.trim(),
                title: settings.title?.trim(),
                ctaLabel: settings.ctaLabel?.trim(),
                productLimit: parsedLimit
            }
        });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">All Jewellery Section</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage the Home collection heading, CTA, and product count while keeping the current layout unchanged.</p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white font-semibold text-sm hover:bg-[#5a3d36] transition-colors"
                >
                    Save Section
                </button>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Eyebrow"
                    value={settings.eyebrow}
                    onChange={(event) => updateSetting('eyebrow', event.target.value)}
                    placeholder="Our Collection"
                />
                <Input
                    label="Title"
                    value={settings.title}
                    onChange={(event) => updateSetting('title', event.target.value)}
                    placeholder="All Jewellery"
                />
                <Input
                    label="CTA Label"
                    value={settings.ctaLabel}
                    onChange={(event) => updateSetting('ctaLabel', event.target.value)}
                    placeholder="View Full Collection"
                />
                <Input
                    label="Product Limit"
                    type="number"
                    min="1"
                    value={settings.productLimit}
                    onChange={(event) => updateSetting('productLimit', event.target.value)}
                    placeholder="16"
                />
            </div>
        </div>
    );
};

export default AllJewellerySectionEditor;
