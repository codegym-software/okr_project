import React from 'react';

export default function StackedBarChart({ data = [], width = 600, height = 260, label = 'Status by Department' }) {
    const padding = 32;
    const w = width;
    const h = height;
    const innerW = w - padding * 2;
    const innerH = h - padding * 2;
    const barGap = 12;
    const barWidth = data.length > 0 ? (innerW - barGap * (data.length - 1)) / data.length : innerW;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
            <svg width={w} height={h} className="w-full">
                <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="#e5e7eb" />
                <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#e5e7eb" />
                {data.map((d, i) => {
                    const x = padding + i * (barWidth + barGap);
                    const total = Math.max(1, (d.onTrack || 0) + (d.atRisk || 0) + (d.offTrack || 0));
                    const onH = innerH * (d.onTrack || 0) / total;
                    const riskH = innerH * (d.atRisk || 0) / total;
                    const offH = innerH * (d.offTrack || 0) / total;
                    let y = h - padding;
                    // Off track bottom
                    const offY = y - offH; y = offY;
                    // At risk middle
                    const riskY = y - riskH; y = riskY;
                    // On track top
                    const onY = y - onH;
                    return (
                        <g key={i}>
                            <rect x={x} y={offY} width={barWidth} height={offH} fill="#ef4444" />
                            <rect x={x} y={riskY} width={barWidth} height={riskH} fill="#f59e0b" />
                            <rect x={x} y={onY} width={barWidth} height={onH} fill="#22c55e" />
                            <text x={x + barWidth/2} y={h - padding + 14} fontSize="10" textAnchor="middle" fill="#64748b">
                                {(d.departmentName || 'N/A').slice(0, 8)}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{background:'#22c55e'}}></span>On Track</div>
                <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{background:'#f59e0b'}}></span>At Risk</div>
                <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{background:'#ef4444'}}></span>Off Track</div>
            </div>
        </div>
    );
}


