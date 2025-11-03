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
                <div className="text-center text-gray-500">Đang Tải...</div>
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
                <div className="grid grid-cols-7 gap-4 text-sm font-medium text-gray-500">
                    <div>Tiêu Đề</div>
                    <div className="hidden md:block">Phòng Ban</div>
                    <div className="hidden md:block">Mục Tiêu</div>
                    <div>Tiến Độ</div>
                    <div className="hidden lg:block">Ngày Hết Hạn</div>
                    <div className="hidden lg:block">Trạng Thái</div>
                    <div>Mức Độ Ưu Tiên</div>
                </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-gray-200">
                {items.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Không Có OKR Nào</h3>
                        <p className="mt-1 text-sm text-gray-500">Hãy Tạo OKR Đầu Tiên Của Bạn.</p>
                    </div>
                ) : (
                    items.map((item, index) => {
                        // Tính tiến độ trung bình của các Key Results từ progress_percent hoặc công thức
                        const avgProgress = item.key_results?.length > 0 
                            ? (item.key_results.reduce((sum, kr) => {
                                // Ưu tiên dùng progress_percent nếu có
                                let percentage = 0;
                                if (kr.progress_percent !== null && kr.progress_percent !== undefined) {
                                    percentage = parseFloat(kr.progress_percent);
                                } else {
                                    // Nếu không có progress_percent, tính từ current_value/target_value
                                    const currentValue = parseFloat(kr.current_value) || 0;
                                    const targetValue = parseFloat(kr.target_value) || 0;
                                    percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
                                }
                                return sum + percentage;
                            }, 0) / item.key_results.length)
                            : 0;
                        
                        const isExpanded = expandedObjectives[item.objective_id];
                        
                        return (
                            <React.Fragment key={item.objective_id}>
                                <div className={`px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                    <div className="grid grid-cols-7 gap-4 items-center">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <button
                                                onClick={() => toggleExpand(item.objective_id)}
                                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                title={isExpanded ? "Thu Gọn" : "Mở Rộng"}
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
                                        <div className="hidden lg:block text-sm text-gray-600">
                                            {item.deadlineCharacter ? item.deadlineCharacter : '-'}
                                        </div>
                                        <div className="hidden lg:block text-sm">
                                            {item.isOverdue !== undefined && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    item.isOverdue 
                                                        ? 'bg-red-100 text-red-700' 
                                                        : item.isUpcoming
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {item.isOverdue ? 'Quá Hạn' : item.isUpcoming ? 'Sắp Hết Hạn' : 'Còn Hạn'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            {item.priority !== undefined && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    item.priority === 'high'
                                                        ? 'bg-red-100 text-red-700' 
                                                        : item.priority === 'medium'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Trung Bình' : 'Thấp'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Mobile view */}
                                    <div className="md:hidden mt-2 space-y-1">
                                        <div className="text-xs text-gray-500">
                                            Phòng Ban: {departments.find(d => String(d.department_id) === String(item.department_id))?.d_name || '-'}
                                        </div>
                                        {item.isOverdue !== undefined && (
                                            <div className="text-xs">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    item.isOverdue 
                                                        ? 'bg-red-100 text-red-700' 
                                                        : item.isUpcoming
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {item.isOverdue ? 'Quá Hạn' : item.isUpcoming ? 'Sắp Hết Hạn' : 'Còn Hạn'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Key Results Section - hiển thị khi mở rộng */}
                                {isExpanded && item.key_results && item.key_results.length > 0 && (
                                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                                        <div className="ml-8 space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Kết Quả Chính (Key Results):</h4>
                                            {item.key_results.map((kr, krIndex) => {
                                                // Tính phần trăm: ưu tiên progress_percent, nếu không có thì tính từ current_value/target_value
                                                let calculatedPercentage = 0;
                                                if (kr.progress_percent !== null && kr.progress_percent !== undefined) {
                                                    calculatedPercentage = parseFloat(kr.progress_percent);
                                                } else {
                                                    const currentValue = parseFloat(kr.current_value) || 0;
                                                    const targetValue = parseFloat(kr.target_value) || 0;
                                                    calculatedPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
                                                }
                                                
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
                                                                    title="Check-In Kết Quả Chính"
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
                                                                title="Lịch Sử Check-In"
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
