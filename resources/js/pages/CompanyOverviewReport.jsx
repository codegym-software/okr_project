import React, { useEffect, useMemo, useState } from 'react';
import ToastNotification from '../components/ToastNotification';
import { CycleDropdown } from '../components/Dropdown';
import PerformanceTab from '../components/reports/PerformanceTab';
import ProcessTab from '../components/reports/ProcessTab';
import QualityTab from '../components/reports/QualityTab';
import FilterDropdown from '../components/reports/FilterDropdown';
import SnapshotModal from '../components/reports/SnapshotModal';
import SnapshotHistoryModal from '../components/reports/SnapshotHistoryModal';
import { fetchDetailedData, fetchDetailedDataForSnapshot, createSnapshot } from '../utils/reports/dataFetchers';
import { loadSnapshots as loadSnapshotsUtil } from '../utils/reports/snapshotHelpers';
import { FiDownload, FiArchive, FiList, FiTrendingUp, FiCheckCircle, FiGitMerge, FiFilter, FiClock, FiX } from "react-icons/fi";
import { Dropdown } from '../components/Dropdown';

export default function CompanyOverviewReport() {
    const [cycles, setCycles] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    // Modal states
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    // Data & Context states
    const [currentTab, setCurrentTab] = useState('performance');
    const [snapshotContext, setSnapshotContext] = useState({ isSnapshot: false, name: null });
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
    
    // Metadata states
    const [currentCycleMeta, setCurrentCycleMeta] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [isAdminOrCeo, setIsAdminOrCeo] = useState(false);

    const hasActiveFilters = useMemo(() => {
        return !!filters.departmentId || filters.objectiveLevel !== 'all' || !!filters.dateRange.start || !!filters.dateRange.end;
    }, [filters]);

    const showNotification = (type, message) => {
        setToast({ type, message });
    };

    const handleExport = () => {
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
            await createSnapshot({
                name,
                cycle_id: filters.cycleId,
                filters: {
                    departmentId: filters.departmentId,
                    objectiveLevel: filters.objectiveLevel,
                    dateRange: filters.dateRange,
                }
            });
            showNotification('success', `Đã tạo snapshot "${name}" thành công!`);
            setIsSnapshotModalOpen(false);
            loadSnapshots(); // Refresh snapshot list
        } catch (e) {
            showNotification('error', e.message || 'Không thể tạo snapshot.');
        }
    };

    const loadSnapshots = async (cycleId) => {
        if (!cycleId) return;
        try {
            const result = await loadSnapshotsUtil(cycleId);
            setSnapshots(result.snapshots || []);
        } catch (error) {
            showNotification('error', 'Không thể tải lịch sử snapshot.');
        }
    };

    const handleLoadSnapshotData = async (snapshot) => {
        setLoading(true);
        setError('');
        try {
            // The full snapshot data, including its saved filters, should be returned from the history modal
            const savedFilters = snapshot.data?.filters || {};
            
            // Fetch the report content for this snapshot
            const data = await fetchDetailedDataForSnapshot(snapshot.id, currentTab);
            setReportData(data);

            // Sync main filters to reflect the snapshot's context
            setFilters(prev => ({
                ...prev, // Keep cycleId
                departmentId: savedFilters.departmentId || '',
                objectiveLevel: savedFilters.objectiveLevel || 'all',
                dateRange: savedFilters.dateRange || { start: null, end: null }
            }));
            
            setSnapshotContext({ isSnapshot: true, name: snapshot.name });
            setIsHistoryModalOpen(false);
            showNotification('info', `Đang xem dữ liệu từ snapshot "${snapshot.name}".`);
        } catch (e) {
            setError(e.message || 'Có lỗi xảy ra khi tải dữ liệu snapshot.');
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExitSnapshotMode = () => {
        setSnapshotContext({ isSnapshot: false, name: null });
        showNotification('info', 'Đã quay lại chế độ xem dữ liệu trực tiếp.');
        // The main useEffect [filters, currentTab] will trigger a refetch of live data
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

                // Set user role
                const role = dProfile.user?.role?.role_name?.toLowerCase() || '';
                setUserRole(role);
                setIsAdminOrCeo(role === 'admin' || role === 'ceo');

                // Set dropdown data
                setCycles(Array.isArray(dCycles.data) ? dCycles.data : []);
                setDepartments(Array.isArray(dDepts.data) ? dDepts.data : []);

                // Set initial cycle if not in URL
                if (dCycles.data.length && !filters.cycleId) {
                    const current = dCycles.data.find(c => c.status === 'active') || dCycles.data[0];
                    setFilters(f => ({ ...f, cycleId: current.cycle_id }));
                }
            } catch (e) { console.error("Failed to fetch initial data", e); }
        })();
    }, []);

    // Main data fetching logic (for live data)
    useEffect(() => {
        if (!filters.cycleId || snapshotContext.isSnapshot) return; // Don't fetch live data in snapshot mode
        
        setLoading(true);
        setError('');
        fetchDetailedData(filters, currentTab)
            .then(data => setReportData(data))
            .catch(e => {
                setError(e.message || 'Có lỗi xảy ra khi tải dữ liệu báo cáo.');
                setReportData(null);
            })
            .finally(() => setLoading(false));
    }, [filters, currentTab, snapshotContext.isSnapshot]);

    // Sync filters to URL
    useEffect(() => {
        const url = new URL(window.location.href);
        const params = url.searchParams;

        if (filters.cycleId) params.set('cycle_id', filters.cycleId);
        else params.delete('cycle_id');

        if (filters.departmentId) params.set('department_id', filters.departmentId);
        else params.delete('department_id');

        if (filters.objectiveLevel && filters.objectiveLevel !== 'all') params.set('level', filters.objectiveLevel);
        else params.delete('level');

        window.history.replaceState({}, '', url.toString());
    }, [filters]);

    // Update cycle meta and load snapshots
    useEffect(() => {
        if (!filters.cycleId || !cycles.length) return;
        setCurrentCycleMeta(cycles.find(c => String(c.cycle_id) === String(filters.cycleId)));
        loadSnapshots(filters.cycleId);
    }, [filters.cycleId, cycles]);
    
    const tabConfig = [
        { id: 'performance', label: 'Hiệu suất', icon: FiTrendingUp },
        { id: 'process', label: 'Quy trình', icon: FiCheckCircle },
        { id: 'quality', label: 'Chất lượng & Cấu trúc', icon: FiGitMerge },
    ];

    return (
        <div className="px-6 py-8 min-h-screen bg-gray-50">
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
                                handleCycleChange={(value) => { setFilters(f => ({ ...f, cycleId: value || null, dateRange: { start: null, end: null } })); handleExitSnapshotMode(); }}
                            />
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-4">
                            <Dropdown
                                position="right"
                                trigger={
                                    <button className={`relative flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium border rounded-lg transition-colors ${hasActiveFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}>
                                        <FiFilter />
                                        Bộ lọc
                                        {hasActiveFilters && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}
                                    </button>
                                }
                            >
                                <FilterDropdown
                                    filters={filters}
                                    setFilters={setFilters}
                                    allDepartments={departments}
                                />
                            </Dropdown>

                            {isAdminOrCeo && (
                                <>
                                    <button onClick={() => setIsSnapshotModalOpen(true)} disabled={snapshotContext.isSnapshot} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <FiArchive />
                                        Tạo Snapshot
                                    </button>
                                     <button onClick={() => { loadSnapshots(filters.cycleId); setIsHistoryModalOpen(true); }} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                        <FiClock />
                                        Lịch sử
                                    </button>
                                </>
                            )}
                            <button onClick={handleExport} disabled={snapshotContext.isSnapshot} className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                               <FiDownload />
                                Xuất CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Snapshot Mode Banner */}
            {snapshotContext.isSnapshot && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded-md flex justify-between items-center shadow-sm">
                    <p className="text-sm font-medium">
                        <strong>Cảnh báo:</strong> Bạn đang xem dữ liệu từ snapshot <strong>"{snapshotContext.name}"</strong>.
                    </p>
                    <button onClick={handleExitSnapshotMode} className="flex items-center gap-1 text-sm font-bold hover:underline">
                        <FiX /> Thoát
                    </button>
                </div>
            )}

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
            <div className="report-content">
                {loading && ( <div className="text-center py-20"><div className="animate-spin h-8 w-8 text-blue-600 mx-auto" /><p className="mt-2 text-gray-500">Đang tải dữ liệu...</p></div> )}
                {!loading && error && ( <div className="bg-red-50 border-l-4 border-red-400 p-4 max-w-3xl mx-auto"><div className="flex"><div className="flex-shrink-0"><svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0 4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" /></svg></div><div className="ml-3"><p className="text-sm text-red-700 font-semibold">Lỗi tải báo cáo</p><p className="mt-1 text-sm text-red-600">{error}</p></div></div></div> )}
                {!loading && !error && reportData && (
                    <>
                        {currentTab === 'performance' && <PerformanceTab data={reportData} />}
                        {currentTab === 'process' && <ProcessTab data={reportData} />}
                        {currentTab === 'quality' && <QualityTab data={reportData} />}
                    </>
                )}
            </div>
            
            {/* Modals */}
            {isAdminOrCeo && (
                <>
                    <SnapshotModal isOpen={isSnapshotModalOpen} onClose={() => setIsSnapshotModalOpen(false)} onSave={handleSaveSnapshot} />
                    <SnapshotHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} snapshots={snapshots} onLoadSnapshot={handleLoadSnapshotData} cycleName={currentCycleMeta?.cycle_name || ''} />
                </>
            )}
        </div>
    );
}
