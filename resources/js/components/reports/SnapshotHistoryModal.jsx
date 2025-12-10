import React, { useState } from 'react';
import { CycleDropdown } from '../Dropdown';
import SnapshotDetailView from './SnapshotDetailView';
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
    onLoadSnapshot,
    selectedSnapshot,
    onBackToList,
    onExportSnapshot,
    modalCycleFilter,
    onModalCycleFilterChange,
    cyclesList,
}) {
    if (!isOpen) return null;

    const [snapshotSortBy, setSnapshotSortBy] = useState(null);
    const [snapshotSortDir, setSnapshotSortDir] = useState('asc');
    const [snapshotLevelDropdownOpen, setSnapshotLevelDropdownOpen] = useState(false);
    const [modalCycleDropdownOpen, setModalCycleDropdownOpen] = useState(false);
    const [creatorTooltip, setCreatorTooltip] = useState(null);

    // Lọc snapshot theo cấp độ và chu kỳ
    const filteredSnapshots = (snapshots || []).filter((snap) => {
        // Filter by level
        if (snapshotLevelFilter && snapshotLevelFilter !== 'all') {
            const snapLevel = snap.data_snapshot?.level || 'departments';
            if (snapLevel !== snapshotLevelFilter) return false;
        }

        // Filter by cycle
        if (modalCycleFilter && snap.cycle_id !== parseInt(modalCycleFilter)) {
            return false;
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
                        <h2 className="text-xl font-bold text-gray-900">Danh sách Báo cáo</h2>
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
                            <SnapshotDetailView
                                snapshot={selectedSnapshot}
                                onBack={onBackToList}
                                onExport={onExportSnapshot}
                            />
                        </div>
                    ) : (
                        <div>
                            {/* Filter Bar */}
                            <div className="mb-4 flex items-center justify-end gap-6">
                                <div className="flex items-center gap-4">
                                    {/* Filter theo cấp độ */}
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
                                                dropdownOpen={modalCycleDropdownOpen}
                                                setDropdownOpen={setModalCycleDropdownOpen}
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
                                            <table className="w-full text-left bg-white border border-gray-200 rounded-lg">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th
                                                            onClick={() => {
                                                                if (snapshotSortBy === 'name') setSnapshotSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                                                else {
                                                                    setSnapshotSortBy('name');
                                                                    setSnapshotSortDir('asc');
                                                                }
                                                            }}
                                                            className={`
                                                                px-4 py-3 text-left cursor-pointer
                                                                ${snapshotSortBy === 'name' ? 'bg-gray-100' : ''}
                                                                w-[50%]    
                                                                hover:bg-gray-100      
                                                            `}
                                                        >
                                                            Tên Báo cáo
                                                            <span className="ml-2 text-xs text-gray-500">
                                                                {snapshotSortBy === 'name' ? (snapshotSortDir === 'asc' ? '▲' : '▼') : ''}
                                                            </span>
                                                        </th>

                                                        <th className="px-4 py-3 w-[15%] text-center">
                                                            Người thực hiện
                                                        </th>

                                                        <th className="px-4 py-3 w-[20%] text-center">
                                                            Tiến độ (%)
                                                        </th>

                                                        <th
                                                            onClick={() => {
                                                                if (snapshotSortBy === 'date') setSnapshotSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                                                else {
                                                                    setSnapshotSortBy('date');
                                                                    setSnapshotSortDir('asc');
                                                                }
                                                            }}
                                                            className={`
                                                                px-4 py-3 cursor-pointer text-center
                                                                ${snapshotSortBy === 'date' ? 'bg-gray-100' : ''}
                                                                w-[15%]
                                                                hover:bg-gray-100
                                                            `}
                                                        >
                                                            Ngày chốt
                                                            <span className="ml-2 text-xs text-center text-gray-500">
                                                                {snapshotSortBy === 'date' ? (snapshotSortDir === 'asc' ? '▲' : '▼') : ''}
                                                            </span>
                                                        </th>


                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sorted.map((snap) => {
                                                        const snapLevel = snap.data_snapshot?.level || 'departments';
                                                        const levelText = snapLevel === 'company' ? 'Công ty' : 'Phòng ban';
                                                        const rowKey = `snapshot-${snap.id}-${snapshotSortBy || 'nosort'}-${snapshotSortDir}-${snap.snapshotted_at || snap.created_at || ''}`;
                                                        return (
                                                            <tr
                                                                key={rowKey}
                                                                className="border-t border-gray-100 hover:bg-slate-50 cursor-pointer"
                                                                onClick={() => onLoadSnapshot?.(snap.id)}
                                                            >
                                                                <td className="px-6 py-4 pl-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <h3 className="font-medium text-gray-900 text-base leading-6 truncate hover:text-blue-600 transition-colors">
                                                                            {snap.title}
                                                                        </h3>

                                                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                                                                            {levelText}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-middle">
                                                                    {snap.creator ? (
                                                                        <div
                                                                            className="flex items-center gap-2 justify-center"
                                                                            onMouseEnter={(e) =>
                                                                                setCreatorTooltip({
                                                                                    info: snap.creator,
                                                                                    position: e.currentTarget.getBoundingClientRect(),
                                                                                })
                                                                            }
                                                                            onMouseLeave={() => setCreatorTooltip(null)}
                                                                        >
                                                                            {snap.creator.avatar ? (
                                                                                <img
                                                                                    src={snap.creator.avatar}
                                                                                    alt={snap.creator.full_name}
                                                                                    className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                                                                                />
                                                                            ) : (
                                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                                                                    {snap.creator.full_name?.[0] || '?'}
                                                                                </div>
                                                                            )}
                                                                            <span className="text-sm text-slate-900 max-w-[100px] truncate">
                                                                                {snap.creator.full_name || 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-xs">N/A</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 align-middle">
                                                                    <div className="flex justify-center items-center">
                                                                        <div className="w-32 mx-auto">
                                                                            <ProgressBar progress={snap.data_snapshot?.overall?.averageProgress || 0} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-middle text-gray-700 text-center">{new Date(snap.snapshotted_at).toLocaleDateString('vi-VN')}</td>
                                                            </tr>
                                                        );
                                                    })}
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