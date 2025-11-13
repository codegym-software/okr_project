import React from "react";

export default function LineChart({
    data = [],
    width = 600,
    height = 260,
    color = "#2563eb",
    label = "Avg Progress",
    xAxisLabel = "Thời gian",
    yAxisLabel = "Tiến độ (%)",
}) {
    const paddingLeft = 48;
    const paddingRight = 32;
    const paddingTop = 32;
    const paddingBottom = 48;
    const w = width;
    const h = height;
    const innerW = w - paddingLeft - paddingRight;
    const innerH = h - paddingTop - paddingBottom;

    const values = data.map((d) => d.avgProgress || 0);
    const maxV = Math.max(100, Math.max(0, ...values));
    const minV = 0;

    const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const points = data
        .map((d, i) => {
            const x = paddingLeft + i * xStep;
            const y =
                paddingTop +
                innerH -
                ((d.avgProgress - minV) / (maxV - minV)) * innerH;
            return `${x},${isFinite(y) ? y : padding + innerH}`;
        })
        .join(" ");

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">
                {label}
            </div>
            <svg width={w} height={h} className="w-full">
                {/* axes */}
                <line
                    x1={paddingLeft}
                    y1={paddingTop}
                    x2={paddingLeft}
                    y2={h - paddingBottom}
                    stroke="#e5e7eb"
                />
                <line
                    x1={paddingLeft}
                    y1={h - paddingBottom}
                    x2={w - paddingRight}
                    y2={h - paddingBottom}
                    stroke="#e5e7eb"
                />
                {/* horizontal grid + y ticks */}
                {[0, 25, 50, 75, 100].map((v, idx) => {
                    const y = paddingTop + innerH - (v / 100) * innerH;
                    return (
                        <g key={`y-${idx}`}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={w - paddingRight}
                                y2={y}
                                stroke="#f1f5f9"
                            />
                            <text
                                x={paddingLeft - 10}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill="#94a3b8"
                            >
                                {v}%
                            </text>
                        </g>
                    );
                })}
                {/* vertical grid + x ticks */}
                {data.map((d, idx) => {
                    const x = paddingLeft + idx * xStep;
                    return (
                        <g key={`x-${idx}`}>
                            <line
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={h - paddingBottom}
                                stroke="#f8fafc"
                            />
                            <text
                                x={x}
                                y={h - paddingBottom + 16}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#94a3b8"
                            >
                                {d.bucket}
                            </text>
                        </g>
                    );
                })}
                {/* polyline */}
                {data.length > 0 && (
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        points={points}
                    />
                )}
                {/* points */}
                {data.map((d, i) => {
                    const x = paddingLeft + i * xStep;
                    const rawY =
                        paddingTop +
                        innerH -
                        ((d.avgProgress - minV) / (maxV - minV)) * innerH;
                    const y = isFinite(rawY) ? rawY : paddingTop + innerH;
                    const progress = Number.isFinite(d.avgProgress)
                        ? d.avgProgress
                        : 0;
                    return (
                        <g key={i}>
                            <circle
                                cx={x}
                                cy={y}
                                r="4.5"
                                fill={color}
                                stroke="#ffffff"
                                strokeWidth="1.5"
                            >
                                <title>{`${progress.toFixed(1)}%`}</title>
                            </circle>
                        </g>
                    );
                })}
                {/* axis labels */}
                <text
                    x={w / 2}
                    y={h - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#64748b"
                >
                    {xAxisLabel}
                </text>
                <text
                    x={8}
                    y={h / 2}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#64748b"
                    transform={`rotate(-90, 8, ${h / 2})`}
                >
                    {yAxisLabel}
                </text>
            </svg>
        </div>
    );
}
