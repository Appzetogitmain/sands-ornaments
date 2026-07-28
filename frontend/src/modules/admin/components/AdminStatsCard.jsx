import React from 'react';

const AdminStatsCard = ({ label, value, icon: Icon, color, bgColor, badge, badgeColor, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all group relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-3 h-full ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md' : 'hover:shadow-md'}`}
        >
            <div className="text-left flex-1 min-w-0 w-full">
                <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">{label}</p>
                <h3 className="text-sm md:text-base font-bold text-gray-900 truncate leading-tight" title={typeof value === 'string' || typeof value === 'number' ? value : ''}>{value}</h3>
                {badge && (
                    <div className="mt-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 ${badgeColor || 'text-gray-400'} uppercase tracking-tight`}>
                            {badge}
                        </span>
                    </div>
                )}
            </div>
            <div className={`w-8 h-8 md:w-10 md:h-10 ${bgColor || 'bg-gray-50'} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 self-end md:self-auto`}>
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color}`} strokeWidth={2.5} />
            </div>
        </div>
    );
};

export default AdminStatsCard;
