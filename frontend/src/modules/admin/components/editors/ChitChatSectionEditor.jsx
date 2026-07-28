import React, { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input, TextArea } from '../common/FormControls';
import { adminService } from '../../services/adminService';
import { useDraftState } from '../../hooks/useDraftState';

const ChitChatSectionEditor = ({ sectionData, onSave, defaultItems = [] }) => {
    const initialSettings = useMemo(() => {
        const fallbackSettings = defaultItems?.settings || {};
        const currentSettings = sectionData?.settings || {};
        return {
            title: currentSettings.title || fallbackSettings.title || "We're Here for You",
            subtitle: currentSettings.subtitle || fallbackSettings.subtitle || "Questions or styling advice? We'd love to hear from you.",
            responseText: currentSettings.responseText || fallbackSettings.responseText || 'Replies within 2 hours',
            submitLabel: currentSettings.submitLabel || fallbackSettings.submitLabel || 'Send Message',
            successMessage: currentSettings.successMessage || fallbackSettings.successMessage || "Thanks for chatting with us! We'll get back to you shortly.",
            logo: currentSettings.logo || fallbackSettings.logo || ''
        };
    }, [defaultItems, sectionData?.settings]);

    const [settings, setSettings] = useDraftState(`draft_settings_${sectionData?.sectionKey || sectionData?.id || ''}_${sectionData?.pageKey || ''}`, initialSettings);

    const updateSetting = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (file) => {
        if (!file) return;
        const uploadedUrl = await adminService.uploadSectionImage(file);
        if (!uploadedUrl) {
            toast.error('Image upload failed. Please try again.');
            return;
        }
        updateSetting('logo', uploadedUrl);
    };

    const handleSave = () => {
        onSave({
            items: [],
            settings: {
                ...settings,
                title: settings.title?.trim(),
                subtitle: settings.subtitle?.trim(),
                responseText: settings.responseText?.trim(),
                submitLabel: settings.submitLabel?.trim(),
                successMessage: settings.successMessage?.trim(),
                logo: settings.logo
            }
        });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#3E2723]">Chit Chat Section</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage the homepage contact block without changing its current visual layout.</p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E2723] text-white font-semibold text-sm hover:bg-[#5a3d36] transition-colors"
                >
                    Save Section
                </button>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
                <div className="space-y-3">
                    <div className="rounded-2xl border border-dashed border-[#E7D8D3] bg-[#FFF8F6] overflow-hidden aspect-square flex items-center justify-center relative">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Section logo" className="w-full h-full object-contain p-8" />
                        ) : (
                            <div className="text-center px-4">
                                <Upload className="w-7 h-7 text-[#B28A8A] mx-auto mb-2" />
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9D7C7C]">Upload Logo</p>
                            </div>
                        )}
                    </div>
                    <label className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 rounded-xl bg-white border border-[#E7D8D3] text-[#3E2723] font-semibold text-sm hover:bg-[#FFF8F6] cursor-pointer transition-colors">
                        <Upload size={16} />
                        Upload Logo
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => handleImageUpload(event.target.files?.[0])}
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
                    <Input
                        label="Title"
                        value={settings.title}
                        onChange={(event) => updateSetting('title', event.target.value)}
                        placeholder="We're Here for You"
                    />
                    <TextArea
                        label="Subtitle"
                        value={settings.subtitle}
                        onChange={(event) => updateSetting('subtitle', event.target.value)}
                        rows={3}
                        placeholder="Questions or styling advice? We'd love to hear from you."
                    />
                    <Input
                        label="Response Text"
                        value={settings.responseText}
                        onChange={(event) => updateSetting('responseText', event.target.value)}
                        placeholder="Replies within 2 hours"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Submit Button Label"
                            value={settings.submitLabel}
                            onChange={(event) => updateSetting('submitLabel', event.target.value)}
                            placeholder="Send Message"
                        />
                        <Input
                            label="Success Message"
                            value={settings.successMessage}
                            onChange={(event) => updateSetting('successMessage', event.target.value)}
                            placeholder="Thanks for chatting with us! We'll get back to you shortly."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChitChatSectionEditor;
