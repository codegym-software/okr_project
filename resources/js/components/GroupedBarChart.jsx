import React from 'react';

// Modern grouped/clustered column chart using SVG
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
    // Vertical grouped bars: Ox = categories (dept names), Oy = quantity
    const topPad = 50;
    const bottomPad = 80;
    const leftPad = 50;
    const rightPad = 30;
    const h = Math.max(height, 300);
    const innerH = h - topPad - bottomPad;
    const w = Math.max(width, 600);
    const innerW = w - leftPad - rightPad;

    const rawMax = Math.max(1, ...series.flatMap(s => s.data));
    const chartMax = Math.ceil(rawMax * 1.1); // Add 10% padding at top

    const groupWidth = Math.max(80, innerW / Math.max(categories.length, 1));
    const groupGap = 20;
    const barGap = 6;
    const barWidth = series.length > 0 
        ? Math.max(14, (groupWidth - groupGap) / series.length - barGap) 
        : groupWidth - groupGap;

    const wrapLabel = (text, maxChars = 12) => {
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

    // Generate Y-axis ticks
    const yTicks = [];
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
        const value = Math.round((chartMax / tickCount) * i);
        yTicks.push(value);
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">{label}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                    {series.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div 
                                className="h-3 w-3 rounded-full shadow-sm" 
                                style={{ 
                                    background: s.color,
                                    boxShadow: `0 2px 4px ${s.color}40`
                                }}
                            ></div>
                            <span className="font-medium text-slate-600">{s.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
                    <defs>
                        {/* Gradient definitions for bars */}
                        {series.map((s, i) => (
                            <linearGradient key={i} id={`gradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                                <stop offset="100%" stopColor={s.color} stopOpacity="0.85" />
                            </linearGradient>
                        ))}
                        {/* Drop shadow filter */}
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                            <feOffset dx="0" dy="2" result="offsetblur"/>
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.3"/>
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Y-axis grid lines and labels */}
                    {yTicks.map((value, i) => {
                        const y = topPad + innerH - (value / chartMax) * innerH;
                        return (
                            <g key={i}>
                                <line 
                                    x1={leftPad} 
                                    y1={y} 
                                    x2={w - rightPad} 
                                    y2={y} 
                                    stroke={i === 0 ? "#cbd5e1" : "#e2e8f0"} 
                                    strokeWidth={i === 0 ? 1.5 : 1}
                                    strokeDasharray={i === 0 ? "0" : "4 4"}
                                />
                                <text 
                                    x={leftPad - 12} 
                                    y={y + 4} 
                                    fontSize="11" 
                                    textAnchor="end" 
                                    fill="#64748b"
                                    className="font-medium"
                                >
                                    {value}
                                </text>
                            </g>
                        );
                    })}

                    {/* X-axis line */}
                    <line 
                        x1={leftPad} 
                        y1={h - bottomPad} 
                        x2={w - rightPad} 
                        y2={h - bottomPad} 
                        stroke="#cbd5e1" 
                        strokeWidth="2"
                    />

                    {/* Y-axis line */}
                    <line 
                        x1={leftPad} 
                        y1={topPad} 
                        x2={leftPad} 
                        y2={h - bottomPad} 
                        stroke="#cbd5e1" 
                        strokeWidth="2"
                    />

                    {/* Bars */}
                    {categories.map((cat, ci) => {
                        const groupX = leftPad + ci * groupWidth + groupGap / 2;
                        return (
                            <g key={ci}>
                                {series.map((s, si) => {
                                    const value = s.data[ci] || 0;
                                    const heightPx = value > 0 ? (innerH * (value / chartMax)) : 0;
                                    const x = groupX + si * (barWidth + barGap);
                                    const y = h - bottomPad - heightPx;
                                    
                                    return (
                                        <g key={si}>
                                            {/* Bar with gradient and shadow */}
                                            <rect 
                                                x={x} 
                                                y={y} 
                                                width={barWidth} 
                                                height={heightPx} 
                                                fill={`url(#gradient-${si})`}
                                                rx="4" 
                                                ry="4"
                                                filter="url(#shadow)"
                                                className="transition-all duration-300 hover:opacity-90"
                                            />
                                            {/* Value label on top of bar */}
                                            {value > 0 && (
                                                <text 
                                                    x={x + barWidth / 2} 
                                                    y={y - 6} 
                                                    fontSize="11" 
                                                    textAnchor="middle" 
                                                    fill="#1e293b"
                                                    className="font-semibold"
                                                >
                                                    {value}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                                
                                {/* X-axis labels - department names with wrapping */}
                                {(() => {
                                    const lines = wrapLabel(cat, Math.max(10, Math.floor((groupWidth - groupGap) / 8)));
                                    const x = groupX + (groupWidth - groupGap) / 2;
                                    const startY = h - bottomPad + 16;
                                    const lineHeight = 13;
                                    return (
                                        <text 
                                            x={x} 
                                            y={startY} 
                                            fontSize="11" 
                                            textAnchor="middle" 
                                            fill="#475569"
                                            className="font-medium"
                                        >
                                            {lines.map((ln, idx) => (
                                                <tspan 
                                                    key={idx} 
                                                    x={x} 
                                                    dy={idx === 0 ? 0 : lineHeight}
                                                >
                                                    {ln}
                                                </tspan>
                                            ))}
                                        </text>
                                    );
                                })()}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
