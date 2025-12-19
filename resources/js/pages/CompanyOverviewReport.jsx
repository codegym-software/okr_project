import React, { useEffect, useMemo, useState } from 'react';
import ToastNotification from '../components/ToastNotification';
import { CycleDropdown } from '../components/Dropdown';
import PerformanceTab from '../components/reports/PerformanceTab';
import ProcessTab from '../components/reports/ProcessTab';
import QualityTab from '../components/reports/QualityTab';
import FilterDropdown from '../components/reports/FilterDropdown';
import SnapshotModal from '../components/reports/SnapshotModal';
import SnapshotHistoryModal from '../components/reports/SnapshotHistoryModal';
import { fetchDetailedData, createSnapshot } from '../utils/reports/dataFetchers';
import { loadSnapshots as loadSnapshotsUtil } from '../utils/reports/snapshotHelpers';
import { FiDownload, FiArchive, FiClock, FiFilter, FiTrendingUp, FiCheckCircle, FiShield, FiXCircle } from "react-icons/fi";
import { Dropdown } from '../components/Dropdown';

export default function CompanyOverviewReport() {
    const [cycles, setCycles] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    // Modal states
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    // Data & Context states
    const [currentTab, setCurrentTab] = useState('performance');
    const [toast, setToast] = useState(null);
    const [filters, setFilters] = useState({
        cycleId: '',
        departmentId: '',
        objectiveLevel: 'all',
        dateRange: { start: null, end: null },
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState(null);
    const [viewingSnapshot, setViewingSnapshot] = useState(null); // New state for snapshot view mode
    
    // Metadata states
    const [snapshots, setSnapshots] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [isAdminOrCeo, setIsAdminOrCeo] = useState(false);

    const hasActiveFilters = useMemo(() => {
        return !viewingSnapshot && (!!filters.departmentId || filters.objectiveLevel !== 'all' || !!filters.dateRange.start || !!filters.dateRange.end);
    }, [filters, viewingSnapshot]);

    const showNotification = (type, message) => {
        setToast({ type, message });
    };

    const handleExport = () => {
        if (viewingSnapshot) {
            showNotification('info', 'Chức năng xuất file không áp dụng cho snapshot.');
            return;
        }
        if (!filters.cycleId) {
            showNotification('error', 'Vui lòng chọn chu kỳ để xuất báo cáo.');
            return;
        }
        const params = new URLSearchParams();
        params.set('cycle_id', filters.cycleId);
        params.set('tab', currentTab);
        if (filters.departmentId) params.set('department_id', filters.departmentId);
        if (filters.objectiveLevel && filters.objectiveLevel !== 'all') params.set('level', filters.objectiveLevel);
        if (filters.dateRange.start) params.set('start_date', filters.dateRange.start);
        if (filters.dateRange.end) params.set('end_date', filters.dateRange.end);
        
        const url = `/api/reports/okr-company/export-csv?${params.toString()}`;
        window.open(url, '_blank');
    };

    const handleSaveSnapshot = async (name) => {
        if (!name) {
            showNotification('error', 'Vui lòng đặt tên cho snapshot.');
            return;
        }
        try {
            const payload = {
                report_name: name,
                report_type: 'company',
                cycle_id: filters.cycleId,
                department_id: filters.departmentId || null,
                level: filters.objectiveLevel,
                start_date: filters.dateRange.start,
                end_date: filters.dateRange.end,
                notes: `Snapshot for company report with filters: ${JSON.stringify(filters)}`,
            };
            
            await createSnapshot(payload);

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
            const result = await loadSnapshotsUtil(cycleId, 'company');
            setSnapshots(result.snapshots || []);
        } catch (error) {
            showNotification('error', 'Không thể tải lịch sử snapshot.');
        }
    };
    
    const handleViewSnapshot = async (snapshotId) => {
        setIsHistoryModalOpen(false); // Close modal immediately
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
                setViewingSnapshot(result.data); // Set the full snapshot object
            } else {
                throw new Error(result.message || 'Lỗi không xác định khi tải snapshot.');
            }
        } catch (e) {
            setError(e.message);
            showNotification('error', e.message);
            setViewingSnapshot(null); // Clear snapshot view on error
        } finally {
            setLoading(false);
        }
    };

    const handleExitSnapshotView = () => {
        setViewingSnapshot(null);
    };
    
    // Read query params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const cycleId = params.get('cycle_id');
        const departmentId = params.get('department_id');
        const objectiveLevel = params.get('level');
        
        const initialFilters = { ...filters };
        if (cycleId) initialFilters.cycleId = cycleId;
        if (departmentId) initialFilters.departmentId = departmentId;
        if (objectiveLevel) initialFilters.objectiveLevel = objectiveLevel;
        
        setFilters(initialFilters);
    }, []);

    // Fetch initial dropdown data
    useEffect(() => {
        (async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
                const headers = { Accept: 'application/json', 'X-CSRF-TOKEN': token };
                const [rCycles, rDepts, rProfile] = await Promise.all([
                    fetch('/cycles', { headers }),
                    fetch('/departments', { headers }),
                    fetch('/api/profile', { headers })
                ]);
                
                const dCycles = await rCycles.json();
                const dDepts = await rDepts.json();
                const dProfile = await rProfile.json();

                setUserRole(dProfile.user?.role?.role_name?.toLowerCase() || '');
                setIsAdminOrCeo(['admin', 'ceo'].includes(dProfile.user?.role?.role_name?.toLowerCase()));
                setCycles(Array.isArray(dCycles.data) ? dCycles.data : []);
                setDepartments(Array.isArray(dDepts.data) ? dDepts.data : []);

                if (dCycles.data.length && !filters.cycleId) {
                    const current = dCycles.data.find(c => c.status === 'active') || dCycles.data[0];
                    setFilters(f => ({ ...f, cycleId: current.cycle_id }));
                }
            } catch (e) { console.error("Failed to fetch initial data", e); }
        })();
    }, []);

    // Main data fetching logic (for live data)
    useEffect(() => {
        if (viewingSnapshot || !filters.cycleId) return; // Skip if in snapshot mode or no cycle
        
        setLoading(true);
        setError('');
        fetchDetailedData(filters, currentTab)
            .then(data => setReportData(data))
            .catch(e => {
                setError(e.message || 'Có lỗi xảy ra khi tải dữ liệu báo cáo.');
                setReportData(null);
            })
            .finally(() => setLoading(false));
    }, [filters, currentTab, viewingSnapshot]);

    // Sync filters to URL, but not in snapshot mode
    useEffect(() => {
        if (viewingSnapshot) return;
        
        const url = new URL(window.location.href);
        const params = url.searchParams;

        if (filters.cycleId) params.set('cycle_id', filters.cycleId); else params.delete('cycle_id');
        if (filters.departmentId) params.set('department_id', filters.departmentId); else params.delete('department_id');
        if (filters.objectiveLevel && filters.objectiveLevel !== 'all') params.set('level', filters.objectiveLevel); else params.delete('level');

        window.history.replaceState({}, '', url.toString());
    }, [filters, viewingSnapshot]);

    // Load snapshots when cycle changes, but not in snapshot mode
    useEffect(() => {
        if (viewingSnapshot || !filters.cycleId || !cycles.length) return;
        loadSnapshots(filters.cycleId);
    }, [filters.cycleId, cycles, viewingSnapshot]);

    // Determine the data to render
    const dataToRender = viewingSnapshot ? viewingSnapshot.snapshot_data.data : reportData;
    
    const tabConfig = [
        { id: 'performance', label: 'Hiệu suất', icon: FiTrendingUp },
        { id: 'process', label: 'Quy trình', icon: FiCheckCircle },
        { id: 'quality', label: 'Chất lượng & Cấu trúc', icon: FiShield },
    ];

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            {/* Snapshot View Banner */}
            {viewingSnapshot && (
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg shadow-md flex items-center justify-between">
                    <div>
                        <p className="font-bold">Chế độ xem Snapshot</p>
                        <p className="text-sm">Bạn đang xem báo cáo "{viewingSnapshot.report_name}" được lưu vào lúc {new Date(viewingSnapshot.created_at).toLocaleString('vi-VN')}.</p>
                    </div>
                    <button onClick={handleExitSnapshotView} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100">
                        <FiXCircle />
                        Thoát
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-4 sm:mb-0">Báo cáo Thống kê Cấp Công ty</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex flex-col">
                             <span className="text-xs font-semibold text-slate-600">Chu kỳ OKR</span>
                            <CycleDropdown
                                cyclesList={cycles}
                                cycleFilter={filters.cycleId}
                                handleCycleChange={(value) => setFilters(f => ({ ...f, cycleId: value || null, dateRange: { start: null, end: null } }))}
                                disabled={!!viewingSnapshot}
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <Dropdown
                                position="right"
                                trigger={
                                    <button disabled={!!viewingSnapshot} className={`relative flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium border rounded-lg transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${hasActiveFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}>
                                        <FiFilter />
                                        Bộ lọc
                                        {hasActiveFilters && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}
                                    </button>
                                }
                            >
                                <FilterDropdown filters={filters} setFilters={setFilters} allDepartments={departments} />
                            </Dropdown>

                            {isAdminOrCeo && (
                                <>
                                    <button onClick={() => setIsSnapshotModalOpen(true)} disabled={!!viewingSnapshot} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <FiArchive />
                                        Tạo Snapshot
                                    </button>
                                     <button onClick={() => { loadSnapshots(filters.cycleId); setIsHistoryModalOpen(true); }} disabled={!!viewingSnapshot} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <FiClock />
                                        Lịch sử
                                    </button>
                                </>
                            )}
                            <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                               <FiDownload />
                                Xuất CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200">
                <div className="flex items-center gap-4 -mb-px">
                    {tabConfig.map(tab => (
                        <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-colors duration-200 ${ currentTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700' }`}>
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            {/* Tab Content */}
            <div className="report-content overflow-x-hidden">
                {loading && !viewingSnapshot && ( <div className="text-center py-20"><div className="animate-spin h-8 w-8 text-blue-600 mx-auto" /><p className="mt-2 text-gray-500">Đang tải dữ liệu...</p></div> )}
                {!loading && error && !viewingSnapshot && ( <div className="bg-red-50 border-l-4 border-red-400 p-4 max-w-3xl mx-auto"><div className="flex"><div className="flex-shrink-0"><svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0 4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" /></svg></div><div className="ml-3"><p className="text-sm text-red-700 font-semibold">Lỗi tải báo cáo</p><p className="mt-1 text-sm text-red-600">{error}</p></div></div></div> )}
                {dataToRender && (
                    <>
                        {currentTab === 'performance' && <PerformanceTab data={dataToRender.performance} isSnapshot={!!viewingSnapshot} />}
                        {currentTab === 'process' && <ProcessTab data={dataToRender.process} isSnapshot={!!viewingSnapshot} />}
                        {currentTab === 'quality' && <QualityTab data={dataToRender.quality} isSnapshot={!!viewingSnapshot} />}
                    </>
                )}
            </div>
            
            {/* Modals */}
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

