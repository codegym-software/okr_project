import { getProgressBarColor } from '../../utils/reports/statusHelpers';

export default function ProgressBar({ progress, showText = true, className = '' }) {
    const colorClass = getProgressBarColor(progress);
    const width = Math.min(progress, 100);
    
    return (
        <div className={`flex items-center justify-center gap-3 ${className}`} style={{ width: '180px', margin: '0 auto' }}>
            <div className="w-32 bg-slate-200 rounded-full h-2 flex-shrink-0">
                <div
                    className={`h-2 rounded-full transition-all ${colorClass}`}
                    style={{ width: `${width}%` }}
                />
            </div>
            {showText && (
                <span className="text-sm font-semibold tabular-nums whitespace-nowrap w-12 text-right">
                    {progress.toFixed(1)}%
                </span>
            )}
        </div>
    );
}

