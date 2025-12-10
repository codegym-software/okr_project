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
    currentUser,
    viewMode = 'my',
    // Props cho quản trị
    canManage = false,
    onEditObjective,
    onDeleteObjective,
    onEditKeyResult,
    onDeleteKeyResult,
    onAddKeyResult,
}) {
    const [expandedObjectives, setExpandedObjectives] = useState({});

    const toggleExpand = (objectiveId) => {
        setExpandedObjectives(prev => ({
            ...prev,
            [objectiveId]: !prev[objectiveId]
        }));
    };

    const isPersonalView = viewMode === 'my';

    const formatDateTime = (value) => {
        if (!value) return '--';
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        let dateValue = value;
        if (typeof value === 'number') {
            // Nếu là giây (10 chữ số) chuyển sang mili giây
            dateValue = value > 1e12 ? value : value * 1000;
        }
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getLastCheckInAt = (objective) => {
        if (!objective) return '--';

        const timestamps = [];
        const pushDate = (raw) => {
            if (!raw) return;
            if (raw instanceof Date) {
                if (!Number.isNaN(raw.getTime())) {
                    timestamps.push(raw);
                }
                return;
            }
            let input = raw;
            if (typeof raw === 'number') {
                input = raw > 1e12 ? raw : raw * 1000;
            }
            const parsed = new Date(input);
            if (!Number.isNaN(parsed.getTime())) {
                timestamps.push(parsed);
            }
        };

        pushDate(
            objective.last_check_in_at ||
                objective.last_checkin_at ||
                objective.latest_check_in_at ||
                objective.latest_checkin_at ||
                objective.updated_at
        );

        if (Array.isArray(objective.key_results)) {
            objective.key_results.forEach((kr) => {
                pushDate(
                    kr?.last_check_in_at ||
                        kr?.last_checkin_at ||
                        kr?.latest_check_in_at ||
                        kr?.latest_checkin_at ||
                        kr?.updated_at
                );
                if (Array.isArray(kr?.check_ins)) {
                    kr.check_ins.forEach((checkIn) => {
                        pushDate(
                            checkIn?.checked_in_at ||
                                checkIn?.created_at ||
                                checkIn?.updated_at
                        );
                    });
                }
            });
        }

        if (!timestamps.length) return '--';
        const latest = timestamps.sort((a, b) => b.getTime() - a.getTime())[0];
        return formatDateTime(latest);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center text-gray-500">Đang Tải...</div>
            </div>
        );
    }

    // Kiểm tra quyền checkin Key Result - chỉ owner của Key Result mới có quyền
    const canCheckIn = (kr, objective) => {
        return canCheckInKeyResult(currentUser, kr, objective);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                {isPersonalView ? (
                    <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500">
                        <div>Tiêu Đề</div>
                        <div>Tiến Độ</div>
                        <div className="hidden lg:block">Lần Check-in Cuối</div>
                        <div className="hidden lg:block">Trạng Thái</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-500">
                        <div>Tiêu Đề</div>
                        <div className="hidden md:block">Phòng Ban</div>
                        <div>Tiến Độ</div>
                        <div className="hidden lg:block">Lần Check-in Cuối</div>
                        <div className="hidden lg:block">Trạng Thái</div>
                    </div>
                )}
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
                        const lastCheckInDisplay = getLastCheckInAt(item);
                        
                        return (
                            <React.Fragment key={item.objective_id}>
                                <div className={`px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                    <div
                                        className={`grid ${
                                            isPersonalView
                                                ? 'grid-cols-4'
                                                : 'grid-cols-5'
                                        } gap-4 items-center`}
                                    >
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
                                        {!isPersonalView && (
                                            <div className="hidden md:block text-sm text-gray-600 truncate">
                                                {departments.find(d => String(d.department_id) === String(item.department_id))?.d_name || '-'}
                                            </div>
                                        )}
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
                                            {lastCheckInDisplay}
                                        </div>
                                        <div className="hidden lg:block text-sm flex items-center gap-2">
                                            {item.status && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    item.status === 'completed'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : item.status === 'overdue'
                                                        ? 'bg-red-100 text-red-700'
                                                        : item.status === 'upcoming'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {item.status === 'completed' ? 'Hoàn Thành' : 
                                                     item.status === 'overdue' ? 'Quá Hạn' : 
                                                     item.status === 'upcoming' ? 'Sắp Hết Hạn' : 
                                                     'Đang Tiến Hành'}
                                                </span>
                                            )}
                                            {/* Nút quản trị Objective */}
                                            {canManage && !isPersonalView && (
                                                <div className="flex items-center space-x-1 ml-2">
                                                    <button
                                                        onClick={() => onEditObjective?.(item)}
                                                        className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                                                        title="Sửa Objective"
                                                    >
                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteObjective?.(item)}
                                                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                                                        title="Xóa Objective"
                                                    >
                                                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Mobile view */}
                                    <div className="md:hidden mt-2 space-y-1">
                                        {!isPersonalView && (
                                            <div className="text-xs text-gray-500">
                                                Phòng Ban: {departments.find(d => String(d.department_id) === String(item.department_id))?.d_name || '-'}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {`Lần check-in cuối: ${lastCheckInDisplay}`}
                                        </div>
                                        {item.status && (
                                            <div className="text-xs">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    item.status === 'completed'
                                                        ? 'bg-blue-100 text-blue-700' 
                                                        : item.status === 'overdue'
                                                        ? 'bg-red-100 text-red-700'
                                                        : item.status === 'upcoming'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {item.status === 'completed' ? 'Hoàn Thành' : 
                                                     item.status === 'overdue' ? 'Quá Hạn' : 
                                                     item.status === 'upcoming' ? 'Sắp Hết Hạn' : 
                                                     'Đang Tiến Hành'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Key Results Section - hiển thị khi mở rộng */}
                                {isExpanded && item.key_results && item.key_results.length > 0 && (
                                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                                        <div className="ml-8 space-y-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-gray-700">Kết Quả Chính (Key Results):</h4>
                                                {canManage && !isPersonalView && (
                                                    <button
                                                        onClick={() => onAddKeyResult?.(item)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Thêm Key Result
                                                    </button>
                                                )}
                                            </div>
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
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-gray-900 block truncate">{kr.kr_title}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                                                            {/* Hiển thị phần trăm tiến độ của từng KR - nổi bật hơn */}
                                                            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-lg">
                                                                <span className="text-sm font-bold text-blue-700">{calculatedPercentage.toFixed(2)}%</span>
                                                            </div>
                                                            {/* Nút Check-in cho Key Result - luôn hiển thị nhưng disable khi không có quyền */}
                                                            {onCheckIn && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (!canCheckIn(kr, item)) return;
                                                                        onCheckIn?.({ ...kr, objective_id: item.objective_id });
                                                                    }}
                                                                    className="p-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title={canCheckIn(kr, item) ? "Check-In Kết Quả Chính" : "Bạn không có quyền check-in"}
                                                                    disabled={!canCheckIn(kr, item)}
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
                                                            {/* Nút quản trị Key Result */}
                                                            {canManage && !isPersonalView && (
                                                                <>
                                                                    <button
                                                                        onClick={() => onEditKeyResult?.(kr, item)}
                                                                        className="p-1 rounded hover:bg-blue-50 transition-colors"
                                                                        title="Sửa Key Result"
                                                                    >
                                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onDeleteKeyResult?.(kr, item)}
                                                                        className="p-1 rounded hover:bg-red-50 transition-colors"
                                                                        title="Xóa Key Result"
                                                                    >
                                                                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Thanh tiến độ với nhãn phần trăm */}
                                                    <div className="space-y-1 mb-2">
                                                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                            <span>Tiến độ: {calculatedPercentage.toFixed(2)}%</span>
                                                            <span>{kr.current_value || 0} / {kr.target_value} {kr.unit || ''}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                            <div 
                                                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                                                    calculatedPercentage >= 100 ? 'bg-green-500' :
                                                                    calculatedPercentage >= 75 ? 'bg-blue-600' :
                                                                    calculatedPercentage >= 50 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(calculatedPercentage, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                                                        <span>Mục tiêu: {kr.target_value} {kr.unit || ''}</span>
                                                        <span>Hiện tại: {kr.current_value || 0} {kr.unit || ''}</span>
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
