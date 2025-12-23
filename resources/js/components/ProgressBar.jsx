import React from 'react';

const ProgressBar = ({ progress }) => {
    const safeProgress = Math.max(0, Math.min(100, progress || 0));

    let bgColorClass = 'bg-slate-400';
    if (safeProgress >= 70) {
        bgColorClass = 'bg-green-500';
    } else if (safeProgress >= 30) {
        bgColorClass = 'bg-yellow-500';
    } else if (safeProgress > 0) {
        bgColorClass = 'bg-red-500';
    }

    return (
        <div className="w-full bg-slate-200 rounded-full h-4 relative overflow-hidden">
            <div
                className={`h-full rounded-full absolute left-0 transition-all duration-500 ${bgColorClass}`}
                style={{ width: `${safeProgress}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-screen">
                {`${safeProgress.toFixed(0)}%`}
            </span>
        </div>
    );
};

export default ProgressBar;
