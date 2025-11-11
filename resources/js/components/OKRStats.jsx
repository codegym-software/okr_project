import React from "react";

/**
 * Component hiển thị thống kê OKR
 * @param {string} title - Tiêu đề (My OKR, OKR Phòng ban, OKR Công ty)
 * @param {Array} items - Danh sách OKR items
 * @param {Function} onFilterClick - Callback khi click nút filter
 * @param {boolean} showFilters - Trạng thái hiển thị filters
 */
export default function OKRStats({ title, items = [], onFilterClick, showFilters }) {
    // Tính toán thống kê
    const total = items.length;
    
    const completed = items.filter(item => {
        if (!item.key_results || item.key_results.length === 0) return false;
        return item.key_results.every(kr => parseFloat(kr.progress_percent || 0) >= 100);
    }).length;
    
    const inProgress = items.filter(item => {
        if (!item.key_results || item.key_results.length === 0) return false;
        const hasProgress = item.key_results.some(kr => parseFloat(kr.progress_percent || 0) > 0);
        const notCompleted = item.key_results.some(kr => parseFloat(kr.progress_percent || 0) < 100);
        return hasProgress && notCompleted;
    }).length;
    
    const notStarted = items.filter(item => {
        if (!item.key_results || item.key_results.length === 0) return true;
        return item.key_results.every(kr => parseFloat(kr.progress_percent || 0) === 0);
    }).length;

    return (
        <div className="mb-8">
            {/* Section Header */}
            <div className="bg-blue-50 px-6 py-4 rounded-lg mb-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                    {onFilterClick && (
                        <button 
                            onClick={onFilterClick}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                showFilters 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span>filter</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{total}</div>
                    <div className="text-sm text-gray-600">Tổng OKR</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">{inProgress}</div>
                    <div className="text-sm text-gray-600">Đang Thực Hiện</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-pink-600">{completed}</div>
                    <div className="text-sm text-gray-600">Đã Hoàn Thành</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-amber-600">{notStarted}</div>
                    <div className="text-sm text-gray-600">Chưa Bắt Đầu</div>
                </div>
            </div>
        </div>
    );
}

