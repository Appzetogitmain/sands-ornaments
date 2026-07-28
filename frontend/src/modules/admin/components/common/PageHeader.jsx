import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({ title, subtitle, action, backPath }) => {
    const navigate = useNavigate();

    return (
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 md:gap-4">
                {backPath && (
                    <button
                        onClick={() => navigate(backPath)}
                        className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-white rounded-full hover:bg-gray-50 transition-all text-gray-900 shadow-sm md:shadow-md border border-gray-100"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                )}
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
                    {subtitle && <p className="text-xs md:text-sm font-medium text-gray-500 mt-1">{subtitle}</p>}
                </div>
            </div>

            {action && (
                <button
                    onClick={action.onClick}
                    className="bg-[#3E2723] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#2D1B18] transition-all shadow-sm active:scale-95"
                >
                    {action.icon || <Plus className="w-4 h-4" />}
                    <span>{action.label}</span>
                </button>
            )}
        </div>
    );
};

export default PageHeader;
