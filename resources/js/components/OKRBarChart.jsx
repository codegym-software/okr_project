import React from 'react';

export default function OKRBarChart({ okrData }) {
    // Tính tổng và phần trăm cho từng trạng thái OKR
    const total = okrData.reduce((sum, item) => sum + item.value, 0);
    const okrChartData = okrData.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
    }));

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái OKR</h3>
            <div className="space-y-4">
                {okrChartData.map((item, index) => {
                    const barWidth = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: item.color }}
                                    ></div>
                                    <span className="text-gray-700 font-medium">{item.label}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">{item.value}</span>
                                    <span className="text-gray-500">({item.percentage}%)</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${barWidth}%`,
                                        backgroundColor: item.color
                                    }}
                                >
                                    <div className="h-full flex items-center justify-end pr-2">
                                        {barWidth > 10 && (
                                            <span className="text-xs font-medium text-white">
                                                {item.percentage}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                    Tổng OKR: <span className="font-semibold text-gray-900">{total}</span>
                </div>
            </div>
        </div>
    );
}
