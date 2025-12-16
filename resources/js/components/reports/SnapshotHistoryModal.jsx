import React, { useState } from 'react';
import { CycleDropdown } from '../Dropdown';
import SnapshotDetailView from './SnapshotDetailView';
import TeamReportContent from './TeamReportContent';
import ProgressBar from './ProgressBar';

export default function SnapshotHistoryModal({
    isOpen,
    onClose,
    snapshots,
    snapshotLevelFilter,
    onSnapshotLevelChange,
    snapshotPage,
    snapshotPagination,
    onPageChange,
    onSelectSnapshot,
    selectedSnapshot,
    onDeselectSnapshot,
    onExportSnapshot,
    modalCycleFilter,
    onModalCycleFilterChange,
    cyclesList,
    showLevelFilter = true,
}) {
    if (!isOpen) return null;

    const [snapshotSortBy, setSnapshotSortBy] = useState(null);
    const [snapshotSortDir, setSnapshotSortDir] = useState('asc');
    const [snapshotLevelDropdownOpen, setSnapshotLevelDropdownOpen] = useState(false);
    const [creatorTooltip, setCreatorTooltip] = useState(null);

    // Lọc snapshot theo cấp độ
    const filteredSnapshots = (snapshots || []).filter((snap) => {
        if (showLevelFilter && snapshotLevelFilter && snapshotLevelFilter !== 'all') {
            const isCompanyLevel = !snap.department;
            if (snapshotLevelFilter === 'company' && !isCompanyLevel) {
                return false;
            }
            if (snapshotLevelFilter === 'departments' && isCompanyLevel) {
                return false;
            }
        }
        return true;
    });

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
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Lịch sử Báo cáo (Snapshots)</h2>
                    </div>
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
                    {selectedSnapshot ? (
                        <div>
                            {selectedSnapshot.data_snapshot?.level === 'unit' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4 gap-3">
                                        <button 
                                            onClick={onDeselectSnapshot} 
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium transition"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                            </svg>
                                            Quay lại danh sách
                                        </button>

                                        <button
                                            onClick={() => onExportSnapshot?.(selectedSnapshot)}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-colors"
                                        >
                                            <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                <polyline points="7 10 12 15 17 10"/>
                                                <line x1="12" y1="15" x2="12" y2="3"/>
                                            </svg>
                                            Xuất file
                                        </button>
                                    </div>

                                    <h4 className="text-lg font-bold text-slate-900 mb-2">{selectedSnapshot.title}</h4>
                                    
                                    <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200 shadow-sm text-sm flex flex-wrap gap-x-8 gap-y-2">
                                         <div><span className="text-slate-500">Chu kỳ:</span> <span className="font-semibold ml-1">{selectedSnapshot.cycle_name}</span></div>
                                         <div><span className="text-slate-500">Ngày chốt:</span> <span className="font-semibold ml-1">{new Date(selectedSnapshot.snapshotted_at).toLocaleDateString('vi-VN')}</span></div>
                                         <div><span className="text-slate-500">Người tạo:</span> <span className="font-semibold ml-1">{selectedSnapshot.creator?.full_name || 'N/A'}</span></div>
                                    </div>

                                    <TeamReportContent 
                                        reportData={selectedSnapshot.data_snapshot}
                                        departmentName={selectedSnapshot.data_snapshot.department_name}
                                        isReadOnly={true}
                                        showCheckin={false}
                                    />
                                </div>
                            ) : (
                                <SnapshotDetailView
                                    snapshot={selectedSnapshot}
                                    onBack={onDeselectSnapshot}
                                    onExport={onExportSnapshot}
                                />
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Filter Bar */}
                            <div className="mb-4 flex items-center justify-end gap-6">
                                <div className="flex items-center gap-4">
                                    {/* Filter theo cấp độ */}
                                    {showLevelFilter && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setSnapshotLevelDropdownOpen(v => !v)}
                                            className="flex items-center justify-between gap-3 px-4 h-10 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition whitespace-nowrap min-w-40"
                                        >
                                            <span>
                                                {snapshotLevelFilter === 'all'
                                                    ? 'Tất cả cấp độ'
                                                    : snapshotLevelFilter === 'company'
                                                        ? 'Công ty'
                                                        : 'Phòng ban'}
                                            </span>
                                            <svg
                                                className={`w-4 h-4 transition-transform flex-shrink-0 ${snapshotLevelDropdownOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {snapshotLevelDropdownOpen && (
                                            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[65] overflow-hidden">
                                                <button
                                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 first:rounded-t-lg"
                                                    onClick={() => {
                                                        onSnapshotLevelChange('all');
                                                        onPageChange?.(1);
                                                        setSnapshotLevelDropdownOpen(false);
                                                    }}
                                                >
                                                    Tất cả cấp độ
                                                </button>
                                                <button
                                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100"
                                                    onClick={() => {
                                                        onSnapshotLevelChange('company');
                                                        onPageChange?.(1);
                                                        setSnapshotLevelDropdownOpen(false);
                                                    }}
                                                >
                                                    Công ty
                                                </button>
                                                <button
                                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 last:rounded-b-lg"
                                                    onClick={() => {
                                                        onSnapshotLevelChange('departments');
                                                        onPageChange?.(1);
                                                        setSnapshotLevelDropdownOpen(false);
                                                    }}
                                                >
                                                    Phòng ban
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    )}

                                    {/* Filter theo chu kỳ */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col gap-1">
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
                                        {snapshotLevelFilter === 'all'
                                            ? 'Nhấn nút "Tạo Báo cáo" để tạo bản sao đầu tiên'
                                            : `Chưa có Báo cáo nào cho cấp độ ${snapshotLevelFilter === 'company' ? 'Công ty' : 'Phòng ban'}`
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                    {(() => {
                                        const sorted = [...filteredSnapshots];
                                        if (snapshotSortBy === 'name') {
                                            sorted.sort((a, b) => {
                                                const A = (a.title || '').toString().toLowerCase();
                                                const B = (b.title || '').toString().toLowerCase();
                                                if (A < B) return snapshotSortDir === 'asc' ? -1 : 1;
                                                if (A > B) return snapshotSortDir === 'asc' ? 1 : -1;
                                                return 0;
                                            });
                                        } else if (snapshotSortBy === 'date') {
                                            sorted.sort((a, b) => {
                                                const A = new Date(a.snapshotted_at || a.created_at || 0).getTime();
                                                const B = new Date(b.snapshotted_at || b.created_at || 0).getTime();
                                                if (A < B) return snapshotSortDir === 'asc' ? -1 : 1;
                                                if (A > B) return snapshotSortDir === 'asc' ? 1 : -1;
                                                return 0;
                                            });
                                        }

                                        return (
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
                                                            onClick={() => onSelectSnapshot?.(snap)}
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
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Pagination */}
                            {snapshotPagination?.total > 0 && snapshotPagination?.last_page > 1 && (
                                <div className="mt-6 flex items-center justify-center">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const newPage = Math.max(1, snapshotPage - 1);
                                                onPageChange?.(newPage);
                                            }}
                                            disabled={snapshotPage === 1}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${snapshotPage === 1
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from(
                                                { length: snapshotPagination.last_page },
                                                (_, i) => i + 1
                                            ).map((pageNumber) => {
                                                if (
                                                    pageNumber === 1 ||
                                                    pageNumber === snapshotPagination.last_page ||
                                                    (pageNumber >= snapshotPage - 1 && pageNumber <= snapshotPage + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNumber}
                                                            onClick={() => onPageChange?.(pageNumber)}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${snapshotPage === pageNumber
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                                }`}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    );
                                                } else if (
                                                    pageNumber === snapshotPage - 2 ||
                                                    pageNumber === snapshotPage + 2
                                                ) {
                                                    return (
                                                        <span key={pageNumber} className="px-2 text-gray-400">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>

                                        <button
                                            onClick={() => {
                                                const newPage = Math.min(snapshotPagination.last_page, snapshotPage + 1);
                                                onPageChange?.(newPage);
                                            }}
                                            disabled={snapshotPage === snapshotPagination.last_page}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${snapshotPage === snapshotPagination.last_page
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Creator Tooltip */}
            {creatorTooltip && (
                <div
                    className="fixed bg-white rounded-lg shadow-xl p-4 z-[100] border border-slate-200 min-w-max"
                    style={{
                        top: `${creatorTooltip.position.top - 85}px`,
                        left: `${creatorTooltip.position.left + creatorTooltip.position.width / 2 - 170}px`,
                    }}
                >
                    <div className="flex items-center gap-3">
                        {creatorTooltip.info.avatar ? (
                            <img
                                src={creatorTooltip.info.avatar}
                                alt={creatorTooltip.info.full_name}
                                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 flex-shrink-0">
                                {creatorTooltip.info.full_name?.[0] || '?'}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="font-semibold text-slate-900 text-sm leading-tight">
                                {creatorTooltip.info.full_name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {creatorTooltip.info.email}
                            </div>
                        </div>
                    </div>
                    {/* Arrow */}
                    <div
                        className="absolute w-2 h-2 bg-white border-r border-b border-slate-200 transform rotate-45"
                        style={{
                            bottom: '-4px',
                            left: '50%',
                            marginLeft: '-4px',
                        }}
                    />
                </div>
            )}
        </div>
    );
}