import React from 'react';

export default function BarChart({ data, title, xAxisLabel, yAxisLabel = 'Tiến độ (%)' }) {
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

    // Tính toán giá trị max để scale
    const maxValue = Math.max(...data.map(item => item.value), 100);
    
    // Màu sắc dựa trên giá trị
    const getBarColor = (value) => {
        if (value >= 100) return '#10b981'; // green
        if (value >= 75) return '#3b82f6'; // blue
        if (value >= 50) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
            
            <div className="space-y-4">
                {data.map((item, index) => {
                    // Tính toán chiều rộng thanh: 
                    // - Nếu giá trị >= 100%, thanh fill 100% container
                    // - Các giá trị khác scale theo maxValue (tối đa 100%)
                    const barWidthPercent = item.value >= 100 
                        ? 100 
                        : Math.min((item.value / Math.max(maxValue, 100)) * 100, 100);
                    const color = getBarColor(item.value);
                    
                    return (
                        <div key={index} className="flex items-center gap-4">
                            {/* Label */}
                            <div className="w-48 text-sm font-medium text-gray-700 truncate" title={item.label}>
                                {item.label}
                            </div>
                            
                            {/* Bar */}
                            <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                                        style={{
                                            width: `${barWidthPercent}%`,
                                            backgroundColor: color,
                                            minWidth: barWidthPercent > 0 ? '40px' : '0px'
                                        }}
                                    >
                                        {barWidthPercent > 15 && (
                                            <span className="text-xs font-semibold text-white">
                                                {item.value.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    {barWidthPercent <= 15 && (
                                        <span className="absolute left-0 top-0 h-full flex items-center pl-2 text-xs font-semibold text-gray-700">
                                            {item.value.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                        <span className="text-gray-600">Hoàn thành (≥100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-gray-600">Tốt (≥75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-gray-600">Trung bình (≥50%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                        <span className="text-gray-600">Cần cải thiện (&lt;50%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

