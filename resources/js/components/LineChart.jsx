import React from 'react';

export default function LineChart({ data = [], width = 600, height = 260, color = '#2563eb', label = 'Avg Progress' }) {
    const padding = 32;
    const w = width;
    const h = height;
    const innerW = w - padding * 2;
    const innerH = h - padding * 2;

    const values = data.map(d => d.avgProgress || 0);
    const maxV = Math.max(100, Math.max(0, ...values));
    const minV = 0;

    const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const points = data.map((d, i) => {
        const x = padding + i * xStep;
        const y = padding + innerH - ((d.avgProgress - minV) / (maxV - minV)) * innerH;
        return `${x},${isFinite(y) ? y : padding + innerH}`;
    }).join(' ');

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
            <svg width={w} height={h} className="w-full">
                {/* axes */}
                <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="#e5e7eb" />
                <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#e5e7eb" />
                {/* grid lines */}
                {[0,25,50,75,100].map((v, idx) => {
                    const y = padding + innerH - (v/100) * innerH;
                    return <line key={idx} x1={padding} y1={y} x2={w - padding} y2={y} stroke="#f1f5f9" />;
                })}
                {/* polyline */}
                {data.length > 0 && (
                    <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
                )}
                {/* points */}
                {data.map((d, i) => {
                    const x = padding + i * xStep;
                    const y = padding + innerH - ((d.avgProgress - minV) / (maxV - minV)) * innerH;
                    return <circle key={i} cx={x} cy={isFinite(y) ? y : padding + innerH} r="3" fill={color} />
                })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {data.map((d, i) => (
                    <span key={i} className="rounded bg-slate-50 px-2 py-1">{d.bucket}</span>
                ))}
            </div>
        </div>
    );
}


