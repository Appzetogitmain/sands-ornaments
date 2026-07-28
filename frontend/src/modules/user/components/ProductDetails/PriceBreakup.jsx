import React from 'react';
import { formatCurrency } from '../../../utils/price';

const PriceBreakup = ({ 
    selectedVariantWeight, 
    product, 
    pricingBreakdown, 
    gstPercent, 
    variantPrice 
}) => {
    return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-3 md:px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-[50%]">Component</th>
                            <th className="px-3 md:px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right w-[25%]">Rate/Qty</th>
                            <th className="px-3 md:px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right w-[25%]">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[
                            { label: 'Metal (925 Silver)', rate: `${selectedVariantWeight || product.weight || '---'} g`, value: pricingBreakdown.metalPrice },
                            { label: 'Making Charges', rate: '-', value: pricingBreakdown.makingCharge },
                            { label: 'Diamond / Stones', rate: '-', value: pricingBreakdown.diamondPrice },
                            { label: `GST (${gstPercent}%)`, rate: '-', value: pricingBreakdown.gst }
                        ].map((item, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                                <td className="px-3 md:px-5 py-2.5 text-[10px] md:text-[11px] font-bold text-gray-700 uppercase tracking-tight truncate">{item.label}</td>
                                <td className="px-3 md:px-5 py-2.5 text-[10px] md:text-[11px] font-semibold text-gray-500 text-right">{item.rate}</td>
                                <td className="px-3 md:px-5 py-2.5 text-[10px] md:text-[11px] font-bold text-gray-900 text-right">{formatCurrency(item.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-[#8E2B45]/5 border-t border-[#8E2B45]/10">
                            <td colSpan="2" className="px-3 md:px-5 py-3.5 text-[10px] md:text-[11px] font-black text-[#8E2B45] uppercase tracking-[0.2em]">Total Price</td>
                            <td className="px-3 md:px-5 py-3.5 text-sm md:text-base font-black text-[#8E2B45] text-right">{formatCurrency(pricingBreakdown.finalPrice || variantPrice || 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="mt-3 text-[8.5px] md:text-[9px] text-gray-400 text-center font-bold uppercase tracking-widest italic">* Final price includes all applicable taxes and insured shipping.</p>
        </div>
    );
};

export default PriceBreakup;
