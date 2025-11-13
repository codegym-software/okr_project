import React from 'react';

export default function PieChart({ data = [] }) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-center text-slate-500 py-8">
                    Không có dữ liệu để hiển thị
                </div>
            </div>
        );
    }

    // Tính tổng giá trị
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    if (total === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-center text-slate-500 py-8">
                    Không có dữ liệu để hiển thị
                </div>
            </div>
        );
    }

    // Tính toán góc cho từng phần
    let currentAngle = -90; // Bắt đầu từ trên cùng
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    const circumference = 2 * Math.PI * radius;

    const segments = data.map((item, index) => {
        const value = item.value || 0;
        const percentage = (value / total) * 100;
        const angle = (value / total) * 360;
        
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        
        // Tính toán điểm bắt đầu và kết thúc của cung
        const startAngleRad = (startAngle * Math.PI) / 180;
        const endAngleRad = (endAngle * Math.PI) / 180;
        
        const x1 = centerX + radius * Math.cos(startAngleRad);
        const y1 = centerY + radius * Math.sin(startAngleRad);
        const x2 = centerX + radius * Math.cos(endAngleRad);
        const y2 = centerY + radius * Math.sin(endAngleRad);
        
        // Xác định large-arc-flag (1 nếu góc > 180 độ)
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');
        
        const strokeDasharray = (percentage / 100) * circumference;
        const strokeDashoffset = circumference - strokeDasharray;
        
        currentAngle += angle;
        
        return {
            ...item,
            percentage: percentage.toFixed(1),
            pathData,
            strokeDasharray,
            strokeDashoffset,
            color: item.color || '#3b82f6'
        };
    });

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Phân bổ trạng thái</h3>
            
            <div className="flex items-center justify-center gap-8">
                {/* Pie Chart SVG */}
                <div className="flex-shrink-0">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                        {segments.map((segment, index) => (
                            <path
                                key={index}
                                d={segment.pathData}
                                fill={segment.color}
                                stroke="white"
                                strokeWidth="2"
                                className="transition-opacity hover:opacity-80"
                            />
                        ))}
                    </svg>
                </div>
                
                {/* Legend */}
                <div className="flex-1 space-y-3">
                    {segments.map((segment, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: segment.color }}
                            ></div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">
                                    {segment.label}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {segment.value} ({segment.percentage}%)
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

