import React from 'react';

export default function PieChart({ data }) {
    // Tính toán dữ liệu cho pie chart
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const pieData = data.map(item => ({
        ...item,
        percentage: ((item.value / total) * 100).toFixed(2)
    }));

    // Tính toán strokeDasharray cho SVG
    const circumference = 2 * Math.PI * 40; // r = 40
    let offset = 0;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-center">
                {/* Pie Chart */}
                <div className="relative w-64 h-64">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {pieData.map((item, index) => {
                            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
                            const strokeDashoffset = -offset;
                            offset += (item.value / total) * circumference;
                            
                            return (
                                <circle
                                    key={index}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={item.color}
                                    strokeWidth="20"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900">{total}</div>
                            <div className="text-sm text-gray-500">Total OKR</div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="ml-8 space-y-4">
                    {pieData.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                            <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-gray-600">
                                {item.label}: {item.value} ({item.percentage}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
