import React, { useEffect, useMemo, useState } from 'react';
import ToastNotification from '../components/ToastNotification';
import { CycleDropdown } from '../components/Dropdown';
import PerformanceTab from '../components/reports/PerformanceTab';
import ProcessTab from '../components/reports/ProcessTab';
import QualityTab from '../components/reports/QualityTab';

import SnapshotModal from '../components/reports/SnapshotModal';
import SnapshotHistoryModal from '../components/reports/SnapshotHistoryModal';
import { fetchDetailedData, createSnapshot } from '../utils/reports/dataFetchers';
import { loadSnapshots as loadSnapshotsUtil } from '../utils/reports/snapshotHelpers';
import { exportCompanyReportToExcel } from '../utils/reports/excelExport';
import { FiDownload, FiFilter, FiTrendingUp, FiCheckCircle, FiShield, FiXCircle, FiFileText, FiSave, FiList } from "react-icons/fi";
import { Dropdown } from '../components/Dropdown';

export default function CompanyOverviewReport() {
    const [cycles, setCycles] = useState([]);

    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState('performance');
    const [toast, setToast] = useState(null);
    const [filters, setFilters] = useState({
        cycleId: '',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState(null);
    const [viewingSnapshot, setViewingSnapshot] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [isAdminOrCeo, setIsAdminOrCeo] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const hasActiveFilters = useMemo(() => {
        return !viewingSnapshot && (!!filters.departmentId || filters.objectiveLevel !== 'all' || !!filters.dateRange.start || !!filters.dateRange.end);
    }, [filters, viewingSnapshot]);

    const showNotification = (type, message) => setToast({ type, message });

    const handleExportExcel = async () => {
        if (!filters.cycleId && !viewingSnapshot) { // If not viewing snapshot, cycleId is required
            showNotification('error', 'Vui lòng chọn chu kỳ để xuất báo cáo.');
            return;
        }

        setIsExportingExcel(true);
        showNotification('info', 'Đang chuẩn bị dữ liệu và tạo file Excel...');

        try {
            let dataForExport = null;
            let exportCycleName = 'report';

            if (viewingSnapshot) {
                // Use data from the snapshot
                dataForExport = viewingSnapshot.snapshot_data?.data || viewingSnapshot.snapshot_data;
                exportCycleName = viewingSnapshot.cycle?.cycle_name || viewingSnapshot.report_name || 'snapshot_report';
            } else {
                // Fetch fresh, complete data for the export (for live reports)
                dataForExport = await fetchDetailedData({ cycleId: filters.cycleId }); // Using updated call
                const cycle = cycles.find(c => c.cycle_id == filters.cycleId);
                exportCycleName = cycle?.cycle_name || 'report';
            }
            
            if (!dataForExport) {
                throw new Error('Không có dữ liệu để xuất file.');
            }

            const result = await exportCompanyReportToExcel(dataForExport, exportCycleName);

            if (result.success) {
                showNotification('success', 'Đã tạo và tải xuống file Excel thành công!');
            } else {
                throw new Error(result.message || 'Không thể tạo file Excel.');
            }
        } catch (e) {
            showNotification('error', `Lỗi khi xuất Excel: ${e.message}`);
        } finally {
            setIsExportingExcel(false);
        }
    };
    
    const handleSaveSnapshot = async (name) => {
        if (!name) return showNotification('error', 'Vui lòng đặt tên cho snapshot.');
        try {
            await createSnapshot({
                report_name: name,
                report_type: 'company',
                cycle_id: filters.cycleId,
                notes: `Snapshot for company report. Cycle ID: ${filters.cycleId}`, // Simplified notes
            });
            showNotification('success', `Đã tạo snapshot "${name}" thành công!`);
            setIsSnapshotModalOpen(false);
            loadSnapshots(filters.cycleId);
        } catch (e) {
            showNotification('error', e.message || 'Không thể tạo snapshot.');
        }
    };

    const loadSnapshots = async (cycleId) => {
        if (!cycleId) return;
        try {
            const { snapshots } = await loadSnapshotsUtil(cycleId, 'company');
            setSnapshots(snapshots || []);
        } catch (error) {
            showNotification('error', 'Không thể tải lịch sử snapshot.');
        }
    };

    const handleViewSnapshot = async (snapshotId) => {
        setIsHistoryModalOpen(false);
        setLoading(true);
        setError('');
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
            const res = await fetch(`/api/reports/snapshots/detail/${snapshotId}`, {
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token }
            });
            if (!res.ok) throw new Error('Không thể tải dữ liệu snapshot.');
            const result = await res.json();
            if (result.success) {
                setViewingSnapshot(result.data);
            } else {
                throw new Error(result.message || 'Lỗi không xác định khi tải snapshot.');
            }
        } catch (e) {
            setError(e.message);
            showNotification('error', e.message);
            setViewingSnapshot(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExitSnapshotView = () => setViewingSnapshot(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const initialCycleId = params.get('cycle_id') || '';
        setFilters(f => ({ ...f, cycleId: initialCycleId })); // Update cycleId in filters

        (async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
                const headers = { Accept: 'application/json', 'X-CSRF-TOKEN': token };
                const [rCycles, rProfile] = await Promise.all([
                    fetch('/api/reports/cycles', { headers }),
                    fetch('/api/profile', { headers })
                ]);
                const dCycles = await rCycles.json();
                const dProfile = await rProfile.json();

                setIsAdminOrCeo(['admin', 'ceo'].includes(dProfile.user?.role?.role_name?.toLowerCase()));
                setCycles(dCycles.data || []);

                if (dCycles.success && dCycles.data?.length > 0 && !initialCycleId) {
                    const defaultCycleId = dCycles.meta?.default_cycle_id ?? dCycles.data[0].cycle_id;
                    setFilters(f => ({ ...f, cycleId: String(defaultCycleId) }));
                }
            } catch (e) { console.error("Failed to fetch initial data", e); }
        })();
    }, []);

    useEffect(() => {
        if (viewingSnapshot || !filters.cycleId) return;
        
        setLoading(true);
        setError('');
        fetchDetailedData({ cycleId: filters.cycleId })
            .then(data => setReportData(data))
            .catch(e => {
                setError(e.message || 'Có lỗi xảy ra khi tải dữ liệu báo cáo.');
                setReportData(null);
            })
            .finally(() => setLoading(false));
    }, [filters, viewingSnapshot]);

    useEffect(() => {
        if (viewingSnapshot) return;
        const url = new URL(window.location.href);
        // Only update cycleId in URL
        if (filters.cycleId) {
            url.searchParams.set('cycleId', filters.cycleId);
        } else {
            url.searchParams.delete('cycleId');
        }
        window.history.replaceState({}, '', url.toString());
        loadSnapshots(filters.cycleId);
    }, [filters, viewingSnapshot]);

    const tabConfig = [
        { id: 'performance', label: 'Hiệu suất', icon: FiTrendingUp },
        { id: 'process', label: 'Quy trình', icon: FiCheckCircle },
        { id: 'quality', label: 'Chất lượng & Cấu trúc', icon: FiShield },
    ];

    const renderContent = () => {
        if (viewingSnapshot) {
            // Robustly access snapshot data, handling both nested and direct data structures.
            const snapshotContent = viewingSnapshot.snapshot_data?.data || viewingSnapshot.snapshot_data;
            if (!snapshotContent) return <div className="text-center p-8">Snapshot không có dữ liệu chi tiết.</div>;
            return (
                <>
                    {currentTab === 'performance' && <PerformanceTab data={snapshotContent.performance} isSnapshot />}
                    {currentTab === 'process' && <ProcessTab data={snapshotContent.process} isSnapshot />}
                    {currentTab === 'quality' && <QualityTab data={snapshotContent.quality} isSnapshot />}
                </>
            );
        }
        if (loading) return <div className="text-center py-20"><div className="animate-spin h-8 w-8 text-blue-600 mx-auto" /><p className="mt-2 text-gray-500">Đang tải dữ liệu...</p></div>;
        if (error) return <div className="bg-red-50 border-l-4 border-red-400 p-4 max-w-3xl mx-auto"><p className="text-sm text-red-700 font-semibold">Lỗi tải báo cáo</p><p className="mt-1 text-sm text-red-600">{error}</p></div>;
        if (reportData) {
            return (
                <>
                    {currentTab === 'performance' && <PerformanceTab data={reportData.performance} />}
                    {currentTab === 'process' && <ProcessTab data={reportData.process} />}
                    {currentTab === 'quality' && <QualityTab data={reportData.quality} />}
                </>
            );
        }
        return <div className="text-center p-8">Không có dữ liệu để hiển thị cho bộ lọc hiện tại.</div>;
    };

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
                        <div className="mb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 sm:mb-0">
                                        <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo Thống kê Cấp Công ty</h1>
                                        {viewingSnapshot && (
                                                                        <>
                                                                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">
                                                                                Đang xem: {viewingSnapshot.report_name}
                                                                            </span>
                                                                        </>                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                                                {!viewingSnapshot && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-semibold text-slate-600">Chu kỳ OKR</span>
                                                                        <CycleDropdown
                                                                            cyclesList={cycles}
                                                                            cycleFilter={filters.cycleId}
                                                                            handleCycleChange={(value) => setFilters(f => ({ ...f, cycleId: value || '' }))}
                                                                            disabled={!!viewingSnapshot}
                                                                        />
                                                                    </div>
                                                                )}                                        <div className="flex items-center gap-2 mt-4">
                                                                        {isAdminOrCeo && !viewingSnapshot && (
                                                                            <>
                                                                                <button onClick={() => setIsSnapshotModalOpen(true)} disabled={!!viewingSnapshot} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                                                                    <FiSave />
                                                                                    Tạo Snapshot
                                                                                </button>
                                                                                <button onClick={() => { loadSnapshots(filters.cycleId); setIsHistoryModalOpen(true); }} disabled={!!viewingSnapshot} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                                                                    <FiList />
                                                                                    Lịch sử
                                                                                </button>
                                                                            </>
                                                                        )}                            {viewingSnapshot && (
                                <button onClick={handleExitSnapshotView} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-colors">
                                    Quay lại Hiện tại
                                </button>                        )}
                            <button onClick={handleExportExcel} disabled={isExportingExcel} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isExportingExcel ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiFileText />}
                                {isExportingExcel ? 'Đang xuất...' : 'Xuất Excel'}
                            </button>
                                        </div>
                                    </div>
                                </div>
                    
            </div>

            <div className="mb-6 border-b border-gray-200">
                <div className="flex items-center gap-4 -mb-px">
                    {tabConfig.map(tab => (
                        <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-colors duration-200 ${currentTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            <div className="report-content overflow-x-hidden">
                {renderContent()}
            </div>
            
            {isAdminOrCeo && (
                <>
                    <SnapshotModal isOpen={isSnapshotModalOpen} onClose={() => setIsSnapshotModalOpen(false)} onSave={handleSaveSnapshot} />
                    <SnapshotHistoryModal 
                        isOpen={isHistoryModalOpen} 
                        onClose={() => setIsHistoryModalOpen(false)} 
                        snapshots={snapshots} 
                        onViewSnapshot={handleViewSnapshot}
                        cyclesList={cycles}
                        modalCycleFilter={filters.cycleId}
                        onModalCycleFilterChange={(value) => setFilters(f => ({...f, cycleId: value}))}
                    />
                </>
            )}
        </div>
    );
}

