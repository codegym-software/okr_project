import React from 'react';

// Simple grouped/clustered column chart using SVG
// Props:
// - categories: string[] (x-axis labels)
// - series: [{ name: string, color: string, data: number[] }]
// - width, height
// - label
export default function GroupedBarChart({
    categories = [],
    series = [],
    width = 640,
    height = 300,
    label = 'Biểu đồ',
}) {
    // Vertical grouped bars: Ox = categories (dept names), Oy = quantity 0..5
    const topPad = 40;
    const bottomPad = 70; // extra room for wrapped labels
    const h = Math.max(height, 260);
    const innerH = h - topPad - bottomPad;

    const rawMax = Math.max(1, ...series.flatMap(s => s.data));
    const chartMax = Math.max(1, Math.min(5, Math.ceil(rawMax))); // Oy max 5

    const groupWidth = 56; // px per category
    const groupGap = 10;
    const barGap = 4;
    const barWidth = Math.max(6, series.length > 0 ? (groupWidth - groupGap) / series.length - barGap : groupWidth - groupGap);
    const w = Math.max(width, topPad * 2 + categories.length * groupWidth);
    const innerW = w - topPad * 2;

    const wrapLabel = (text, maxChars = 14) => {
        if (!text) return [''];
        const words = String(text).split(' ');
        const lines = [];
        let line = '';
        words.forEach((w) => {
            const candidate = line ? line + ' ' + w : w;
            if (candidate.length <= maxChars) {
                line = candidate;
            } else {
                if (line) lines.push(line);
                line = w;
            }
        });
        if (line) lines.push(line);
        return lines;
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
            <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
            <svg width={w} height={h} className="w-full">
                {/* axes */}
                <line x1={topPad} y1={topPad} x2={topPad} y2={h - bottomPad} stroke="#e5e7eb" />
                <line x1={topPad} y1={h - bottomPad} x2={w - topPad} y2={h - bottomPad} stroke="#e5e7eb" />
                {/* Oy grid and ticks (counts) */}
                {[0,1,2,3,4,5].map((v, i) => {
                    const y = topPad + innerH - (v / chartMax) * innerH;
                    return (
                        <g key={i}>
                            <line x1={topPad} y1={y} x2={w - topPad} y2={y} stroke="#f1f5f9" />
                            <text x={topPad - 8} y={y + 3} fontSize="10" textAnchor="end" fill="#94a3b8">{v}</text>
                        </g>
                    );
                })}
                {/* bars */}
                {categories.map((cat, ci) => {
                    const groupX = topPad + ci * groupWidth + groupGap / 2;
                    return (
                        <g key={ci}>
                            {series.map((s, si) => {
                                const value = s.data[ci] || 0;
                                const heightPx = innerH * (value / chartMax);
                                const x = groupX + si * (barWidth + barGap);
                                const y = h - bottomPad - heightPx;
                                return (
                                    <g key={si}>
                                        <rect x={x} y={y} width={barWidth} height={heightPx} fill={s.color} rx="3" />
                                        <text x={x + barWidth / 2} y={y - 4} fontSize="10" textAnchor="middle" fill="#334155">{value}</text>
                                    </g>
                                );
                            })}
                            {/* Ox labels - department names with wrapping */}
                            {(() => {
                                const lines = wrapLabel(cat, Math.max(10, Math.floor((groupWidth - groupGap) / 7)));
                                const x = groupX + (groupWidth - groupGap) / 2;
                                const startY = h - bottomPad + 12;
                                const lineHeight = 12;
                                return (
                                    <text x={x} y={startY} fontSize="11" textAnchor="middle" fill="#64748b">
                                        {lines.map((ln, idx) => (
                                            <tspan key={idx} x={x} dy={idx === 0 ? 0 : lineHeight}>{ln}</tspan>
                                        ))}
                                    </text>
                                );
                            })()}
                        </g>
                    );
                })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                {series.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }}></span>
                        <span>{s.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}


