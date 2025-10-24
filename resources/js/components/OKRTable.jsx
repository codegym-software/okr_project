import React, { useState } from 'react';
import { canCheckInKeyResult } from '../utils/checkinPermissions';

export default function OKRTable({ 
    items, 
    departments, 
    cyclesList, 
    loading, 
    onViewOKR, 
    onCheckIn, 
    onViewCheckInHistory,
    currentUser 
}) {
    const [expandedObjectives, setExpandedObjectives] = useState({});

    const toggleExpand = (objectiveId) => {
        setExpandedObjectives(prev => ({
            ...prev,
            [objectiveId]: !prev[objectiveId]
        }));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center text-gray-500">Đang tải...</div>
            </div>
        );
    }

    // Kiểm tra quyền checkin Key Result - sử dụng logic đồng bộ với backend
    const canCheckIn = (kr, objective) => {
        return canCheckInKeyResult(currentUser, kr, objective);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-500">
                    <div>tiêu đề</div>
                    <div className="hidden md:block">phòng ban</div>
                    <div className="hidden lg:block">chu kỳ</div>
                    <div className="hidden md:block">mục tiêu</div>
                    <div>tiến độ</div>
                    <div>checkin</div>
                </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-gray-200">
                {items.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Không có OKR nào</h3>
                        <p className="mt-1 text-sm text-gray-500">Hãy tạo OKR đầu tiên của bạn.</p>
                    </div>
                ) : (
                    items.map((item, index) => {
                        // Tính tiến độ trung bình của các Key Results từ công thức hiện tại/mục tiêu
                        const avgProgress = item.key_results?.length > 0 
                            ? (item.key_results.reduce((sum, kr) => {
                                const currentValue = parseFloat(kr.current_value) || 0;
                                const targetValue = parseFloat(kr.target_value) || 0;
                                const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
                                return sum + percentage;
                            }, 0) / item.key_results.length)
                            : 0;
                        
                        // Đếm số Key Results đã check-in
                        const checkinCount = item.key_results?.length > 0 
                            ? item.key_results.filter(kr => kr.checkins?.length > 0).length
                            : 0;
                        
                        const isExpanded = expandedObjectives[item.objective_id];
                        
                        return (
                            <React.Fragment key={item.objective_id}>
                                <div className={`px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                    <div className="grid grid-cols-6 gap-4 items-center">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <button
                                                onClick={() => toggleExpand(item.objective_id)}
                                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                title={isExpanded ? "Thu gọn" : "Mở rộng"}
                                            >
                                                <svg 
                                                    className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                                                    fill="currentColor" 
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => onViewOKR?.(item)}
                                                className="text-sm text-gray-900 hover:text-blue-600 hover:underline text-left truncate"
                                                title={item.obj_title}
                                            >
                                                {item.obj_title}
                                            </button>
                                        </div>
                                        <div className="hidden md:block text-sm text-gray-600 truncate">
                                            {departments.find(d => String(d.department_id) === String(item.department_id))?.d_name || '-'}
                                        </div>
                                        <div className="hidden lg:block text-sm text-gray-600 truncate">
                                            {cyclesList.find(c => String(c.cycle_id) === String(item.cycle_id))?.cycle_name || '-'}
                                        </div>
                                        <div className="hidden md:block text-sm text-gray-600">100%</div>
                                        <div className="text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium">{avgProgress.toFixed(2)}%</span>
                                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                                        style={{ width: `${Math.min(avgProgress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs">{checkinCount}/{item.key_results?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Mobile view */}
                                    <div className="md:hidden mt-2 space-y-1">
                                        <div className="text-xs text-gray-500">
                                            Phòng ban: {departments.find(d => String(d.department_id) === String(item.department_id))?.d_name || '-'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Chu kỳ: {cyclesList.find(c => String(c.cycle_id) === String(item.cycle_id))?.cycle_name || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* Key Results Section - hiển thị khi mở rộng */}
                                {isExpanded && item.key_results && item.key_results.length > 0 && (
                                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                                        <div className="ml-8 space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Results:</h4>
                                            {item.key_results.map((kr, krIndex) => {
                                                // Tính phần trăm chính xác từ công thức hiện tại/mục tiêu
                                                const currentValue = parseFloat(kr.current_value) || 0;
                                                const targetValue = parseFloat(kr.target_value) || 0;
                                                const calculatedPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
                                                
                                                return (
                                                <div key={kr.kr_id} className="bg-white rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-gray-900">{kr.kr_title}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm font-bold text-blue-600">{calculatedPercentage.toFixed(2)}%</span>
                                                            {/* Nút Check-in cho Key Result */}
                                                            {canCheckIn(kr, item) && (
                                                                <button
                                                                    onClick={() => onCheckIn?.({ ...kr, objective_id: item.objective_id })}
                                                                    className="p-1 rounded hover:bg-blue-50 transition-colors"
                                                                    title="Check-in Key Result"
                                                                >
                                                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            {/* Nút Xem lịch sử Key Result */}
                                                            <button
                                                                onClick={() => onViewCheckInHistory?.({ ...kr, objective_id: item.objective_id })}
                                                                className="p-1 rounded hover:bg-gray-50 transition-colors"
                                                                title="Lịch sử check-in Key Result"
                                                            >
                                                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                        <div 
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                                            style={{ width: `${Math.min(calculatedPercentage, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <span>Target: {kr.target_value} {kr.unit || ''}</span>
                                                        <span>Current: {kr.current_value || 0} {kr.unit || ''}</span>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
}
