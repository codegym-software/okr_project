import React from 'react';
import { CycleDropdown } from '../Dropdown';
import { FiDownload, FiArchive, FiClock, FiFilter } from "react-icons/fi";

export default function ReportHeader({
    filters,
    setFilters,
    cycles,
    handleExport,
    setIsFilterModalOpen,
    setIsSnapshotModalOpen,
    setIsHistoryModalOpen,
    hasActiveFilters,
    isAdminOrCeo,
    snapshotContext,
    handleExitSnapshotMode,
}) {
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left side: Title */}
                <h1 className="text-2xl font-bold text-slate-800">Báo cáo Tổng quan OKR</h1>

                {/* Right side: Actions */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex-grow">
                        <label htmlFor="cycle-filter" className="sr-only">Chu kỳ OKR</label>
                        <CycleDropdown
                            id="cycle-filter"
                            cyclesList={cycles}
                            cycleFilter={filters.cycleId}
                            handleCycleChange={(value) => {
                                setFilters(f => ({ ...f, cycleId: value || null, departmentId: '', objectiveLevel: 'all', dateRange: { start: null, end: null } }));
                                if (snapshotContext.isSnapshot) {
                                    handleExitSnapshotMode();
                                }
                            }}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFilterModalOpen(true)}
                            className={`relative flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors duration-150 ${hasActiveFilters ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'}`}
                        >
                            <FiFilter className="w-4 h-4" />
                            <span>Bộ lọc</span>
                            {hasActiveFilters && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-xs">!</span>}
                        </button>
                        
                        {isAdminOrCeo && (
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <FiClock className="w-4 h-4" />
                                <span>Lịch sử</span>
                            </button>
                        )}

                        <div className="h-6 border-l border-gray-300 mx-1"></div>

                        {isAdminOrCeo && (
                             <button
                                onClick={() => setIsSnapshotModalOpen(true)}
                                disabled={snapshotContext.isSnapshot}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={snapshotContext.isSnapshot ? "Không thể tạo snapshot khi đang ở chế độ xem snapshot" : "Tạo snapshot mới"}
                            >
                                <FiArchive className="w-4 h-4" />
                            </button>
                        )}
                        
                        <button
                            onClick={handleExport}
                            disabled={snapshotContext.isSnapshot}
                            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                             title={snapshotContext.isSnapshot ? "Không thể xuất CSV khi đang ở chế độ xem snapshot" : "Xuất báo cáo ra file CSV"}
                        >
                            <FiDownload className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
