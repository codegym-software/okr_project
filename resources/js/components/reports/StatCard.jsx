import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';


const StatCard = ({ icon, title, value, tooltip, delta, deltaType = 'neutral' }) => {
    
    const DeltaIcon = deltaType === 'positive' ? FiTrendingUp : deltaType === 'negative' ? FiTrendingDown : FiMinus;
    const deltaColor = deltaType === 'positive' ? 'text-emerald-500' : deltaType === 'negative' ? 'text-red-500' : 'text-slate-500';

    return (
        <div className="relative flex flex-col justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-slate-500 truncate" title={title}>
                                {title}
                            </p>
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg">
                                {icon}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-3xl font-bold text-slate-800">
                                    {value}
                                </p>
                                {delta && (
                                    <div className={`flex items-center text-sm font-semibold ${deltaColor}`}>
                                        <DeltaIcon className="w-4 h-4" />
                                        <span>{delta}</span>
                                    </div>
                                )}
                            </div>
                        </div>
        </div>
    );
};

export default StatCard;

