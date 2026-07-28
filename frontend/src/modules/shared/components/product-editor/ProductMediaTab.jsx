import React from 'react';
import {
    Upload, X, Trash2, Sparkles, ImagePlus, ExternalLink,
    FileText, CheckCircle2, Download, Info, Loader2, Copy
} from 'lucide-react';
import { FormSection } from '../../../admin/components/common/FormControls';
import { ENHANCEMENT_PROMPT } from '../../utils/productEditorUtils';
import toast from 'react-hot-toast';

const ProductMediaTab = ({
    formData,
    setFormData,
    isViewMode,
    previewImages,
    handleImageUpload,
    handleHoverImageUpload,
    handleRemoveImage,
    handleVideoUpload,
    handleRemoveVideo,
    resolvedVideoPreview,
    isImageVideoPreview,
    removeVideo,
    enhancingIndex,
    setEnhancingIndex,
    showEnhanceModal,
    setShowEnhanceModal,
    enhancedIndices,
    handleEnhancedUpload
}) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Management */}
                <div className="space-y-6">
                    <FormSection title="Product Gallery">
                        <div className="space-y-6">
                            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-4">
                                <div className="p-2 bg-white rounded-xl border border-amber-200 text-amber-600">
                                    <Info size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Gallery Intelligence</p>
                                    <p className="text-[10px] text-amber-700/70 mt-1 leading-relaxed font-medium">
                                        Image 1 is the <span className="font-bold text-amber-900">Master Identity</span>. Image 2 enables the <span className="font-bold text-amber-900">Interactive Hover</span> state. Total 5 slots available.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {previewImages.map((img, idx) => (
                                    <div key={idx} className="group relative aspect-square rounded-[1.5rem] overflow-hidden border-2 border-white shadow-md ring-1 ring-black/5 hover:ring-amber-200 transition-all">
                                        <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />

                                        {/* Badge Labels */}
                                        <div className="absolute bottom-3 left-3 flex gap-1.5">
                                            {idx === 0 && (
                                                <div className="px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                                                    Master
                                                </div>
                                            )}
                                            {idx === 1 && (
                                                <div className="px-2 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[#3E2723] text-[8px] font-black uppercase tracking-widest shadow-lg border border-black/5">
                                                    Hover
                                                </div>
                                            )}
                                            {enhancedIndices.has(idx) && (
                                                <div className="px-1.5 py-1 rounded-lg bg-emerald-500/90 backdrop-blur-md text-white shadow-lg border border-white/20">
                                                    <Sparkles size={8} />
                                                </div>
                                            )}
                                        </div>

                                        {!isViewMode && (
                                            <div className="absolute top-3 right-3 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEnhancingIndex(idx);
                                                        setShowEnhanceModal(true);
                                                    }}
                                                    className="p-2 bg-white/90 backdrop-blur-md text-amber-600 rounded-xl shadow-lg border border-white hover:bg-amber-600 hover:text-white transition-all"
                                                    title="Enhance with AI"
                                                >
                                                    <Sparkles size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(idx)}
                                                    className="p-2 bg-white/90 backdrop-blur-md text-gray-400 rounded-xl shadow-lg border border-white hover:bg-red-500 hover:text-white transition-all"
                                                    title="Remove Image"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {!isViewMode && previewImages.length < 5 && (
                                    <label className="aspect-square rounded-[1.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/20 transition-all group">
                                        <div className="p-3 rounded-full bg-gray-50 text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-all">
                                            <ImagePlus size={20} />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-black uppercase mt-3 tracking-widest group-hover:text-amber-700">Add Image</span>
                                        <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                    </label>
                                )}
                            </div>
                            <div className="mt-3 inline-block">
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200">
                                    ✨ Recommended Size: 1080x1080px (1:1 Ratio)
                                </p>
                            </div>

                            {!isViewMode && previewImages.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEnhancingIndex(0);
                                            setShowEnhanceModal(true);
                                        }}
                                        className="flex-1 py-4 bg-[#FDFBF7] border border-[#EFEBE9] text-[#8D6E63] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-amber-400 hover:bg-white transition-all flex items-center justify-center gap-2 group shadow-sm"
                                    >
                                        <Sparkles size={14} className="group-hover:animate-pulse" /> AI Enhancement Suite
                                    </button>
                                </div>
                            )}
                        </div>
                    </FormSection>
                </div>

                {/* Video Management */}
                <div className="space-y-6">
                    <FormSection title="Visual Narrative (Video)">
                        <div className="space-y-6">
                            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-[#0c0c0c] ring-1 ring-black/5 group">
                                {removeVideo ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                        <div className="p-4 rounded-full bg-red-50 text-red-400 mb-4 animate-pulse">
                                            <Trash2 size={24} />
                                        </div>
                                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">Marked for Deletion</p>
                                        <p className="text-[10px] text-red-400 mt-2 max-w-[200px] font-bold uppercase tracking-tight">Save changes to finalize removal or upload new file below.</p>
                                    </div>
                                ) : resolvedVideoPreview ? (
                                    <>
                                        {isImageVideoPreview ? (
                                            <img src={resolvedVideoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={resolvedVideoPreview} controls playsInline className="w-full h-full object-cover" />
                                        )}
                                        {!isViewMode && (
                                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveVideo}
                                                    className="p-3 bg-red-500/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/20 hover:bg-red-600 transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                        <div className="p-4 rounded-full bg-white/5 text-white/20 mb-4">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">No Visual Signal</p>
                                        <p className="text-[9px] text-white/20 mt-2 max-w-[180px] font-bold uppercase tracking-widest leading-relaxed">Optional visual story. Supports high-res MP4/MOV formats.</p>
                                    </div>
                                )}
                            </div>

                            {!isViewMode && (
                                <div className="flex gap-4">
                                    <label className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#3E2723] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                                        <Upload size={14} /> {resolvedVideoPreview ? 'Replace Video' : 'Upload Video Story'}
                                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                    </label>
                                </div>
                            )}
                        </div>
                    </FormSection>
                </div>
            </div>

            {/* AI Enhancement Modal (Embedded for better state management if preferred, but usually a global portal is better. Keeping it here for component isolation) */}
            {showEnhanceModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
                        <div className="bg-[#3E2723] p-10 text-white relative">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-2 bg-amber-400 rounded-xl text-[#3E2723]">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="text-3xl font-black uppercase tracking-tight">Vision Engine</h2>
                            </div>
                            <p className="text-[10px] font-black text-amber-400/80 uppercase tracking-[0.3em] ml-1">Powered by Gemini Visual Intelligence</p>
                            <button
                                onClick={() => setShowEnhanceModal(false)}
                                className="absolute top-10 right-10 p-2 hover:bg-white/10 rounded-2xl transition-all text-white/60"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-10 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
                                <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-md flex-shrink-0">
                                    <img src={previewImages[enhancingIndex]} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Source Artifact</p>
                                    <p className="text-lg font-black text-[#3E2723] uppercase">Shot #{enhancingIndex + 1}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ready for re-rendering</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Enhancement Protocol</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { icon: ExternalLink, text: "Access Gemini Cloud Studio", color: "text-blue-500", bg: "bg-blue-50" },
                                        { icon: Upload, text: "Inject Source Artifact", color: "text-purple-500", bg: "bg-purple-50" },
                                        { icon: FileText, text: "Execute Logic Prompt", color: "text-amber-500", bg: "bg-amber-50" },
                                        { icon: CheckCircle2, text: "Commit Enhanced Asset", color: "text-emerald-500", bg: "bg-emerald-50" }
                                    ].map((step, i) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                            <div className={`w-8 h-8 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0`}>
                                                <step.icon size={16} className={step.color} />
                                            </div>
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center leading-relaxed">{step.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 bg-[#FDFBF7] p-8 rounded-[2rem] border border-amber-100/50 shadow-inner group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-[0.25em]">Master Prompt</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(ENHANCEMENT_PROMPT);
                                            toast.success("Intelligence prompt copied");
                                        }}
                                        className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase hover:underline bg-white px-3 py-1.5 rounded-full border border-blue-50 shadow-sm"
                                    >
                                        <Copy size={12} /> Copy Logic
                                    </button>
                                </div>
                                <div className="p-4 bg-white/60 rounded-xl border border-white/80">
                                    <p className="text-[11px] font-bold text-gray-500 italic leading-relaxed text-balance">
                                        "{ENHANCEMENT_PROMPT}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 pt-4 flex flex-col gap-4">
                            <a
                                href="https://gemini.google.com/"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-5 bg-[#3E2723] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-[0_20px_40px_-10px_rgba(62,39,35,0.3)] hover:bg-black transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                            >
                                1. Initialize Gemini Studio <ExternalLink size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </a>

                            <label className="w-full py-5 bg-white border-2 border-dashed border-gray-200 text-gray-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] hover:border-amber-600 hover:text-amber-600 cursor-pointer transition-all flex items-center justify-center gap-3 group active:scale-[0.98]">
                                <ImagePlus size={16} className="group-hover:scale-125 transition-transform" /> 2. Commit Enhanced Asset
                                <input type="file" className="hidden" onChange={handleEnhancedUpload} accept="image/*" />
                            </label>

                            <button
                                onClick={() => setShowEnhanceModal(false)}
                                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors"
                            >
                                Bypass Enhancement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductMediaTab;
