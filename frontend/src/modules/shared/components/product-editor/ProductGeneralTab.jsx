import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
    Tag, Sparkles, Scale, Zap, IndianRupee, CheckCircle2, 
    Layers, Copy, Barcode as BarcodeIcon, QrCode, Download, 
    Loader2, Upload, Plus, Trash2, ImagePlus, FileText, Info,
    Search, X
} from 'lucide-react';
import Barcode from 'react-barcode';
import { FormSection, Input, Select, TextArea } from '../../../admin/components/common/FormControls';
import { quillModules, quillFormats } from '../../utils/productEditorUtils';
import toast from 'react-hot-toast';
import { downloadImage } from '../../../../utils/downloadUtils';

const ProductGeneralTab = ({ 
    formData, 
    setFormData, 
    errors, 
    categories, 
    isViewMode, 
    handleCategoryChange,
    createdProductData,
    sellerProfile,
    editorMode
}) => {
    const [categorySearchQuery, setCategorySearchQuery] = React.useState('');
    const filteredCategories = React.useMemo(() => {
        return (categories || []).filter(cat => 
            cat && String(cat.name || '').toLowerCase().includes(categorySearchQuery.toLowerCase())
        );
    }, [categories, categorySearchQuery]);

    const materialOptions = React.useMemo(() => {
        const options = [];
        const hasGold = editorMode !== 'seller' || !sellerProfile || !!sellerProfile.bisNumberGold;
        const hasSilver = editorMode !== 'seller' || !sellerProfile || !!sellerProfile.bisNumberSilver;

        if (hasGold) options.push({ label: 'Gold', value: 'Gold' });
        if (hasSilver) options.push({ label: 'Silver', value: 'Silver' });
        return options;
    }, [sellerProfile, editorMode]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Section: Basic Info & Core Specs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FormSection title="Basic Information">
                    <div className="space-y-5">
                        <Input
                            label={<span>Product Name <span className="text-red-500">*</span></span>}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Stunning Silver Ring"
                            disabled={isViewMode}
                            error={errors.name}
                        />
                        <Input
                            label={<span>HUID (Hallmark Unique ID) <span className="text-gray-400 text-xs font-normal">(Optional)</span></span>}
                            value={formData.huid}
                            onChange={(e) => setFormData({ ...formData, huid: e.target.value.toUpperCase() })}
                            placeholder="e.g. ABC123"
                            disabled={isViewMode}
                            error={errors.huid}
                            className="font-mono tracking-widest"
                        />
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category <span className="text-red-500">*</span>
                            </label>
                            
                            {!isViewMode && (
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={categorySearchQuery}
                                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                                        placeholder="Type to filter categories..."
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-normal text-gray-800 outline-none focus:bg-white focus:border-[#3E2723] focus:ring-4 focus:ring-[#3E2723]/5 transition-all shadow-sm"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#3E2723] transition-colors">
                                        <Search size={14} />
                                    </div>
                                    {categorySearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setCategorySearchQuery('')}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <select
                                value={formData.categories?.[0]?.category || ''}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className={`w-full bg-white border rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.categories ? 'border-red-300 focus:border-red-400 focus:ring-red-200/40' : 'border-gray-200 focus:border-[#3E2723] focus:ring-[#3E2723]/10'}`}
                                disabled={isViewMode}
                            >
                                <option value="">
                                    {categorySearchQuery ? `Matching Categories (${filteredCategories.length})` : 'Select Category'}
                                </option>
                                {filteredCategories.map(cat => (
                                    <option key={cat._id} value={cat._id} disabled={cat.isActive === false}>
                                        {cat.name}{cat.isActive === false ? ' (Inactive)' : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.categories && <span className="text-xs text-red-500 mt-1 block">{errors.categories}</span>}
                        </div>

                        <Select
                            label="Audience"
                            value={Array.isArray(formData.audience) ? formData.audience[0] : 'unisex'}
                            onChange={(e) => setFormData({ ...formData, audience: [e.target.value] })}
                            options={[
                                { label: 'Unisex', value: 'unisex' },
                                { label: 'Men', value: 'men' },
                                { label: 'Women', value: 'women' },
                                { label: 'Family', value: 'family' }
                            ]}
                            disabled={isViewMode}
                        />
                    </div>
                </FormSection>

                <FormSection title="Metal & Weight Protocol">
                    <div className="space-y-5">
                        <Select
                            label="Primary Material"
                            value={formData.material}
                            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                            options={materialOptions}
                            disabled={isViewMode}
                        />

                        {formData.material === 'Silver' && (
                            <Select
                                label="Silver Purity Categorization"
                                value={formData.silverCategory}
                                onChange={(e) => setFormData({ ...formData, silverCategory: e.target.value })}
                                options={[
                                    { label: 'Select Purity', value: '' },
                                    { label: '800', value: '800' },
                                    { label: '835', value: '835' },
                                    { label: '925', value: '925' },
                                    { label: '925 Sterling Silver', value: '925 sterling silver' },
                                    { label: '958', value: '958' },
                                    { label: '970', value: '970' },
                                    { label: '990', value: '990' },
                                    { label: '999', value: '999' }
                                ]}
                                disabled={isViewMode}
                            />
                        )}
                        {formData.material === 'Gold' && (
                            <Select
                                label="Gold Karat Categorization"
                                value={formData.goldCategory}
                                onChange={(e) => setFormData({ ...formData, goldCategory: e.target.value })}
                                options={[
                                    { label: 'Select Karat', value: '' },
                                    { label: '14 Karat', value: '14' },
                                    { label: '18 Karat', value: '18' },
                                    { label: '22 Karat', value: '22' },
                                    { label: '24 Karat', value: '24' }
                                ]}
                                disabled={isViewMode}
                            />
                        )}

                        <Select
                            label="PG Fee Bearer"
                            value={formData.paymentGatewayChargeBearer || 'seller'}
                            onChange={(e) => setFormData({ ...formData, paymentGatewayChargeBearer: e.target.value })}
                            options={[
                                { label: 'Seller / Admin', value: 'seller' },
                                { label: 'User', value: 'user' }
                            ]}
                            disabled={isViewMode}
                        />
                    </div>
                </FormSection>
            </div>

            {/* Narrative & Content Section */}
            <FormSection title="Visual Narrative & Descriptions">
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Description <span className="text-red-500">*</span></label>
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <ReactQuill
                                theme="snow"
                                value={formData.description}
                                onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                                readOnly={isViewMode}
                                modules={quillModules}
                                formats={quillFormats}
                                style={{ height: '250px', marginBottom: '50px' }}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <ReactQuill
                                theme="snow"
                                value={formData.specifications}
                                onChange={(value) => setFormData((prev) => ({ ...prev, specifications: value }))}
                                readOnly={isViewMode}
                                modules={quillModules}
                                formats={quillFormats}
                                style={{ height: '150px', marginBottom: '50px' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Styling Protocol</label>
                            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.stylingTips}
                                    onChange={(value) => setFormData((prev) => ({ ...prev, stylingTips: value }))}
                                    readOnly={isViewMode}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    style={{ height: '150px', marginBottom: '50px' }}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1 mb-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Caring Protocol</label>
                                {!isViewMode && (
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, careTips: "<p><strong>Jewelry Care Guide:</strong></p><ul><li>Avoid direct contact with perfumes, lotions, and hairsprays.</li><li>Remove jewelry before swimming, bathing, or exercising.</li><li>Store in a cool, dry place, ideally in an airtight bag or box.</li><li>Clean occasionally with a soft, lint-free cloth to restore shine.</li></ul>" }))}
                                        className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus size={12} /> Load Template
                                    </button>
                                )}
                            </div>
                            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.careTips}
                                    onChange={(value) => setFormData((prev) => ({ ...prev, careTips: value }))}
                                    readOnly={isViewMode}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    style={{ height: '150px', marginBottom: '50px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </FormSection>

            {/* Identity & Tracking (Visual Signatures) */}
            {(isViewMode || createdProductData || formData.productCode) && (
                <FormSection title="Registry Identity">
                    <div className="max-w-md mx-auto">
                        <div className="p-4 sm:p-8 bg-[#FDFBF7] rounded-[2rem] border border-amber-100/50 flex flex-col items-center justify-center text-center shadow-inner">
                             <p className="text-sm font-medium text-amber-700 mb-4">Master Identity</p>
                             <div className="flex items-center gap-4">
                                 <span className="text-2xl font-mono text-gray-900 tracking-wide">
                                     {formData.productCode || createdProductData?.productCode || 'LOCKING...'}
                                 </span>
                                 <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(formData.productCode || createdProductData?.productCode);
                                        toast.success("Identity copied to clipboard");
                                    }}
                                    className="p-2.5 bg-white rounded-xl border border-amber-200 text-amber-600 hover:bg-[#3E2723] hover:text-white transition-all shadow-sm"
                                 >
                                     <Copy size={16} />
                                 </button>
                             </div>
                             <div className="mt-6 flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-amber-100 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium text-amber-700">Registry Synchronized</span>
                             </div>
                        </div>
                    </div>
                </FormSection>
            )}

            {/* Labels & Tags Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FormSection title="Commerce Labels">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input
                            label="Card Badge Label"
                            value={formData.cardLabel}
                            onChange={(e) => setFormData({ ...formData, cardLabel: e.target.value })}
                            disabled={isViewMode}
                            placeholder="e.g. Rare Find"
                        />
                        <Input
                            label="Promo Badge"
                            value={formData.cardBadge}
                            onChange={(e) => setFormData({ ...formData, cardBadge: e.target.value })}
                            disabled={isViewMode}
                            placeholder="e.g. Limited Edition"
                        />
                    </div>
                </FormSection>

                <FormSection title="Visibility Protocol">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex flex-wrap gap-3">
                            {['unisex', 'men', 'women', 'family'].map((key) => {
                                const checked = Array.isArray(formData.audience) && formData.audience.includes(key);
                                return (
                                    <label key={key} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-[#3E2723] text-white border-[#3E2723] shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            className="hidden"
                                            disabled={isViewMode}
                                            onChange={(e) => {
                                                const next = new Set(Array.isArray(formData.audience) ? formData.audience : []);
                                                if (e.target.checked) next.add(key);
                                                else next.delete(key);
                                                const normalized = Array.from(next);
                                                setFormData({ ...formData, audience: normalized.length > 0 ? normalized : ['unisex'] });
                                            }}
                                        />
                                        <span className="text-sm font-medium">{key}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-xs font-light text-gray-500 mt-6 flex items-start gap-2">
                            <Info size={14} className="mt-0.5 shrink-0" />
                            Defines which store departments this artifact is discoverable in. Default is "Unisex".
                        </p>
                    </div>
                </FormSection>
            </div>
        </div>
    );
};

export default ProductGeneralTab;
