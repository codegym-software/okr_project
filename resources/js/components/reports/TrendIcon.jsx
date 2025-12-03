export default function TrendIcon({ delta }) {
    if (delta === null || delta === undefined) return <span className="text-slate-400">—</span>;
    const up = delta > 0;
    const down = delta < 0;
    const color = up ? 'text-emerald-600' : (down ? 'text-red-600' : 'text-slate-500');
    return (
        <span className={`inline-flex items-center gap-1 ${color}`} title={`${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`}>
            {up && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 12l5-5 4 4 5-5v8H3z"/>
                </svg>
            )}
            {down && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17 8l-5 5-4-4-5 5V6h14z"/>
                </svg>
            )}
            {!up && !down && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 10h12v2H4z"/>
                </svg>
            )}
            <span>{Math.abs(delta).toFixed(2)}%</span>
        </span>
    );
}

