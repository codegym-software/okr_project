import React, { useState } from 'react';
import { CycleDropdown } from '../Dropdown';

export default function SnapshotHistoryModal({
    isOpen,
    onClose,
    snapshots,
    onViewSnapshot,
    snapshotPage,
    snapshotPagination,
    onPageChange,
    modalCycleFilter,
    onModalCycleFilterChange,
    cyclesList,
}) {
    if (!isOpen) return null;

    const [snapshotSortBy, setSnapshotSortBy] = useState(null);
    const [snapshotSortDir, setSnapshotSortDir] = useState('asc');

    const filteredSnapshots = snapshots || [];

    return (
        <div
            className="fixed inset-0 bg-black/30 bg-opacity-70 flex items-center justify-center z-[70] p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-[80vw] w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-50 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-xl shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900">Lịch sử Báo cáo (Snapshots)</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg p-2 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div>
                        {/* Filter Bar */}
                        <div className="mb-4 flex items-center justify-end gap-6">
                            <div className="flex items-center gap-4">
                                <CycleDropdown
                                    cyclesList={cyclesList}
                                    cycleFilter={modalCycleFilter}
                                    handleCycleChange={(value) => {
                                        onModalCycleFilterChange(value || '');
                                        onPageChange?.(1);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Snapshots Table */}
                        {filteredSnapshots.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 font-semibold text-lg">Chưa có Báo cáo nào</p>
                                <p className="text-gray-400 text-sm mt-2">
                                    Nhấn nút "Tạo Báo cáo" để tạo bản sao đầu tiên
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-left bg-white text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-slate-600 font-semibold text-xs uppercase">
                                            <th className="px-4 py-3 w-[35%]">Tên Báo cáo</th>
                                            <th className="px-4 py-3 w-[25%]">Phòng ban/Cấp độ</th>
                                            <th className="px-4 py-3 w-[25%]">Người tạo</th>
                                            <th className="px-4 py-3 w-[15%] text-right">Ngày tạo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredSnapshots.map((snap) => (
                                            <tr
                                                key={snap.report_id}
                                                className="hover:bg-slate-50 cursor-pointer"
                                                onClick={() => onViewSnapshot?.(snap.report_id)}
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-800">{snap.report_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                        snap.department 
                                                        ? 'bg-indigo-100 text-indigo-800' 
                                                        : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {snap.department?.department_name || 'Công ty'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{snap.creator?.full_name || 'N/A'}</td>
                                                <td className="px-4 py-3 text-slate-500 text-right">{snap.created_at_formatted}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {snapshotPagination?.total > 0 && snapshotPagination?.last_page > 1 && (
                            <div className="mt-6 flex items-center justify-center">
                                {/* Pagination UI remains the same */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}