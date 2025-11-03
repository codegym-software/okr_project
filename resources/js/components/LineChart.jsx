import React from 'react';

export default function LineChart({ data, title }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="text-center text-gray-500 py-8">
                    Không có dữ liệu để hiển thị
                </div>
            </div>
        );
    }

    // Tính toán các giá trị min, max cho scaling
    const values = data.map(item => item.value);
    const minValue = Math.max(0, Math.min(...values) - 5);
    const maxValue = Math.min(100, Math.max(...values) + 5);
    const range = maxValue - minValue || 100;
    
    // Chiều cao và chiều rộng của biểu đồ
    const chartHeight = 300;
    const padding = 60;
    const pointRadius = 5;
    const strokeWidth = 3;

    // Tính toán tọa độ cho các điểm
    const points = data.map((item, index) => {
        const x = padding + (index * (100 - 2 * padding) / Math.max(data.length - 1, 1));
        const y = padding + ((maxValue - item.value) / range) * (100 - 2 * padding);
        return { x, y, value: item.value, label: item.label };
    });

    // Tạo path cho đường line
    const createPath = () => {
        if (points.length < 2) return '';
        
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x} ${points[i].y}`;
        }
        return path;
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
            
            <div className="relative" style={{ height: '400px' }}>
                <svg 
                    viewBox="0 0 100 100" 
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((value, idx) => {
                        const y = padding + ((maxValue - value) / range) * (100 - 2 * padding);
                        if (value < minValue || value > maxValue) return null;
                        return (
                            <g key={idx}>
                                <line
                                    x1={padding}
                                    y1={y}
                                    x2={100 - padding}
                                    y2={y}
                                    stroke="#e5e7eb"
                                    strokeWidth="0.3"
                                    strokeDasharray="1,1"
                                />
                                <text
                                    x={padding - 2}
                                    y={y + 1}
                                    fontSize="2.5"
                                    fill="#6b7280"
                                    textAnchor="end"
                                >
                                    {value}%
                                </text>
                            </g>
                        );
                    })}

                    {/* Line */}
                    <path
                        d={createPath()}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Points */}
                    {points.map((point, index) => (
                        <g key={index}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={pointRadius * 0.5}
                                fill="#3b82f6"
                                stroke="#fff"
                                strokeWidth={strokeWidth * 0.15}
                            />
                            {/* Tooltip trigger area */}
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={2}
                                fill="transparent"
                                className="cursor-pointer"
                            >
                                <title>
                                    {point.label}: {point.value.toFixed(1)}%
                                </title>
                            </circle>
                        </g>
                    ))}
                </svg>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between" style={{ paddingLeft: `${padding}%`, paddingRight: `${padding}%`, paddingTop: '10px' }}>
                    {data.map((item, index) => (
                        <div 
                            key={index}
                            className="text-xs text-gray-600 text-center"
                            style={{ 
                                flex: '1',
                                transform: 'rotate(-45deg)',
                                transformOrigin: 'center',
                                whiteSpace: 'nowrap'
                            }}
                            title={item.label}
                        >
                            {item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
