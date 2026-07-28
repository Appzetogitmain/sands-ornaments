import React, { memo } from 'react';

export const Input = memo(({ label, helperText, ...props }) => (
    <div className="space-y-1.5">
        {label && (
            <label className="block text-xs font-semibold text-gray-700 tracking-wide">
                {label}
            </label>
        )}
        <input
            {...props}
            className={`w-full bg-white border rounded-lg py-2.5 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all shadow-sm ${props.error ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200/40' : 'border-gray-300 focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10'}`}
        />
        {helperText && !props.error && <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{helperText}</p>}
        {props.error && <p className="text-[10px] text-red-500 font-bold ml-1">{props.error}</p>}
    </div>
));

export const Select = memo(({ label, options, helperText, ...props }) => (
    <div className="space-y-1.5">
        {label && (
            <label className="block text-xs font-semibold text-gray-700 tracking-wide">
                {label}
            </label>
        )}
        <div className="relative">
            <select
                {...props}
                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all shadow-sm appearance-none cursor-pointer"
            >
                {options.map((opt, i) => (
                    <option key={i} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
        </div>
        {helperText && <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{helperText}</p>}
    </div>
));

export const TextArea = memo(({ label, helperText, ...props }) => (
    <div className="space-y-1.5">
        {label && (
            <label className="block text-xs font-semibold text-gray-700 tracking-wide">
                {label}
            </label>
        )}
        <textarea
            {...props}
            rows={props.rows || 4}
            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#3E2723] focus:ring-2 focus:ring-[#3E2723]/10 transition-all shadow-sm resize-none"
        ></textarea>
        {helperText && <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{helperText}</p>}
    </div>
));

export const FormSection = memo(({ title, children, className = "" }) => (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${className}`}>
        {title && (
            <h3 className="text-sm font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                {title}
            </h3>
        )}
        <div className="space-y-5">
            {children}
        </div>
    </div>
));
