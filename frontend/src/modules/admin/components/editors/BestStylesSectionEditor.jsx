import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Input } from '../common/FormControls';
import { useDraftState } from '../../hooks/useDraftState';

const BestStylesSectionEditor = ({ sectionData, onSave, defaultSection = {} }) => {
    const isGoldPage = sectionData?.pageKey === 'gold-collection';
    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultSection?.settings || {};
        const currentSettings = sectionData?.settings || {};

        return {
            title: currentSettings.title || fallbackSettings.title || '',
            subtitle: currentSettings.subtitle || fallbackSettings.subtitle || '',
            ctaLabel: currentSettings.ctaLabel || fallbackSettings.ctaLabel || 'View All Collection',
            productLimit: String(currentSettings.productLimit || fallbackSettings.productLimit || 6)
        };
    }, [defaultSection?.settings, isGoldPage, sectionData?.settings]);

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
                title: settings.title?.trim() || '',
                subtitle: settings.subtitle?.trim() || '',
                ctaLabel: settings.ctaLabel?.trim() || 'View All Collection',
                ctaPath: isGoldPage ? '/shop?metal=gold' : '/shop',
                productLimit: parsedLimit
            }
        });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">{sectionData?.label || 'Rule-Based Section'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage the content settings. Products are pulled automatically based on collection rules,
                        so you don't have to curate them manually.
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

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Title"
                    value={settings.title}
                    onChange={(event) => updateSetting('title', event.target.value)}
                    placeholder="Enter section title..."
                />
                <Input
                    label="Subtitle / Description"
                    value={settings.subtitle}
                    onChange={(event) => updateSetting('subtitle', event.target.value)}
                    placeholder="Enter subtitle..."
                />
                <Input
                    label="CTA Label"
                    value={settings.ctaLabel}
                    onChange={(event) => updateSetting('ctaLabel', event.target.value)}
                    placeholder="View All Collection"
                />
                <Input
                    label="Product Limit"
                    type="number"
                    min="1"
                    value={settings.productLimit}
                    onChange={(event) => updateSetting('productLimit', event.target.value)}
                    placeholder="6"
                />
            </div>
        </div>
    );
};

export default BestStylesSectionEditor;
