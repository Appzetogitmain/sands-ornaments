import React from 'react';
import { Sparkles, Layers, Scale, Droplets, Zap, Box, ShieldCheck } from 'lucide-react';

const ProductSpecs = ({ 
    hasDiamonds, 
    diamondType, 
    currentVariant, 
    product, 
    selectedVariantWeight, 
    selectedVariantWeightUnit 
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {hasDiamonds && (
                <div className="bg-white rounded-2xl p-4 md:p-6 border border-[#8E2B45]/10 shadow-[0_4px_20px_-4px_rgba(142,43,69,0.05)] flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8E2B45] to-[#5B1E26] flex items-center justify-center mb-4 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[#8E2B45] mb-6 border-b border-[#8E2B45]/10 pb-2">Diamond Intelligence</h4>
                    <div className="grid grid-cols-3 gap-y-5 gap-x-1 w-full">
                        <div className="group transition-all duration-300 flex flex-col items-center justify-start h-full text-center">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 group-hover:bg-[#8E2B45]/5 transition-colors shrink-0">
                                <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Type</span>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 block capitalize leading-tight">{String(diamondType).replace('_', ' ')}</span>
                        </div>
                        <div className="group transition-all duration-300 flex flex-col items-center justify-start h-full text-center">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 group-hover:bg-[#8E2B45]/5 transition-colors shrink-0">
                                <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Weight</span>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 block leading-tight">
                                {currentVariant?.diamondSpecs?.carat || product.diamondWeight || currentVariant?.diamondWeight || '---'}
                                <span className="text-[8px] md:text-[9px] ml-0.5">Ct</span>
                            </span>
                        </div>
                        <div className="group transition-all duration-300 flex flex-col items-center justify-start h-full text-center">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 group-hover:bg-[#8E2B45]/5 transition-colors shrink-0">
                                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Clarity</span>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 block leading-tight">{currentVariant?.diamondSpecs?.clarity || product.diamondClarity || currentVariant?.diamondClarity || '---'}</span>
                        </div>
                        <div className="group transition-all duration-300 flex flex-col items-center justify-start h-full text-center">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 group-hover:bg-[#8E2B45]/5 transition-colors shrink-0">
                                <Droplets className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Color</span>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 block leading-tight">{currentVariant?.diamondSpecs?.color || '---'}</span>
                        </div>
                        <div className="group transition-all duration-300 flex flex-col items-center justify-start h-full text-center">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 group-hover:bg-[#8E2B45]/5 transition-colors shrink-0">
                                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Cut/Shape</span>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 flex items-center justify-center flex-wrap leading-tight">
                                <span>{currentVariant?.diamondSpecs?.cut || '---'}</span>
                                <span className="mx-0.5 text-gray-300">/</span>
                                <span>{currentVariant?.diamondSpecs?.shape || '---'}</span>
                            </span>
                        </div>
                        <div className="group transition-all duration-300 flex flex-col items-center justify-start h-full text-center">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 group-hover:bg-[#8E2B45]/5 transition-colors shrink-0">
                                <Box className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Count</span>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 block leading-tight">{currentVariant?.diamondSpecs?.diamondCount || product.diamondCount || currentVariant?.diamondCount || '---'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className={`${hasDiamonds ? '' : 'md:col-span-2 max-w-lg mx-auto w-full'} bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-100 flex flex-col items-center text-center`}>
                <div className="w-10 h-10 rounded-full bg-[#9C5B61]/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5 text-[#9C5B61]" />
                </div>
                <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Metal & Authentication</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 w-full">
                    <div className="space-y-1">
                        <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Metal</span>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-900 block whitespace-nowrap">{product.material || product.metal || '925 Silver'}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Purity</span>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-900 block whitespace-nowrap">{product.silverCategory || product.purity || '---'}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Weight</span>
                        <span className="text-[10px] md:text-xs font-semibold text-gray-900 block whitespace-nowrap">{selectedVariantWeight || product.weight || '---'} {selectedVariantWeightUnit || product.weightUnit || 'g'}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">HUID</span>
                        <span className="text-[10px] md:text-xs font-semibold text-emerald-700 block uppercase tracking-tighter whitespace-nowrap">{product.huid || 'SANDS-AUTH'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductSpecs;
