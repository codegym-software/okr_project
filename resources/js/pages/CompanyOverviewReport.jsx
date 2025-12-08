import React, { useEffect, useMemo, useState } from 'react';
import { CycleDropdown } from '../components/Dropdown';
import GroupedBarChart from '../components/GroupedBarChart';
import ToastNotification from '../components/ToastNotification';
import StatCard from '../components/reports/StatCard';
import TrendIcon from '../components/reports/TrendIcon';
import Pagination from '../components/reports/Pagination';
import ObjectivesTable from '../components/reports/ObjectivesTable';
import KeyResultsTable from '../components/reports/KeyResultsTable';
import OwnersTable from '../components/reports/OwnersTable';
import CheckInsTable from '../components/reports/CheckInsTable';
import SnapshotModal from '../components/reports/SnapshotModal';
import OverviewCards from '../components/reports/OverviewCards';
import ChartSection from '../components/reports/ChartSection';
import DepartmentTable from '../components/reports/DepartmentTable';
import { fetchDetailedData, fetchDetailedDataForSnapshot } from '../utils/reports/dataFetchers';
import { loadSnapshots as loadSnapshotsUtil, loadSnapshot as loadSnapshotUtil } from '../utils/reports/snapshotHelpers';
import { exportToExcel as exportToExcelUtil } from '../utils/reports/exportHelpers';

export default function CompanyOverviewReport() {
    const [cycles, setCycles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [owners, setOwners] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [level, setLevel] = useState('departments');
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [snapshotLevelFilter, setSnapshotLevelFilter] = useState('all');
    const [snapshotPage, setSnapshotPage] = useState(1);
    const [snapshotPagination, setSnapshotPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [showSnapshotModal, setShowSnapshotModal] = useState(false);
    const [snapshotTitleInput, setSnapshotTitleInput] = useState('');
    const [toast, setToast] = useState(null);
    const [isReportReady, setIsReportReady] = useState(false);
    const [showExcelMenu, setShowExcelMenu] = useState(false);
    const [modalCycleDropdownOpen, setModalCycleDropdownOpen] = useState(false);
    const [snapshotLevelDropdownOpen, setSnapshotLevelDropdownOpen] = useState(false);
    const [modalCycleFilter, setModalCycleFilter] = useState('');
    const [cyclesList, setCyclesList] = useState([]);
    const [cycleFilter, setCycleFilter] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const [filters, setFilters] = useState({
        cycleId: '',
        departmentId: '',
        status: '',
        ownerId: '',
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [report, setReport] = useState({
        overall: { totalObjectives: 0, averageProgress: 0, statusCounts: { onTrack: 0, atRisk: 0, offTrack: 0 }, statusDistribution: { onTrack: 0, atRisk: 0, offTrack: 0 } },
        departments: [],
        trend: [],
        risks: [],
    });
    const [currentCycleMeta, setCurrentCycleMeta] = useState(null);
    const [detailedData, setDetailedData] = useState({
        objectives: [],
        keyResults: [],
        owners: [],
        checkIns: [],
    });

    const [userRole, setUserRole] = useState(null);
    const [isAdminOrCeo, setIsAdminOrCeo] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
                const res = await fetch('/api/profile', {
                    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    const role = data.user?.role?.role_name?.toLowerCase() || '';
                    setUserRole(role);
                    setIsAdminOrCeo(role === 'admin' || role === 'ceo');
                }
            } catch (error) {
                console.error('Lỗi khi tải thông tin user:', error);
            }
        })();
    }, []);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);

            const cycleId = params.get('cycle_id');
            const departmentId = params.get('department_id');
            const ownerId = params.get('owner_id');
            const status = params.get('status');
            const levelParam = params.get('level');
            const snapshotLevel = params.get('snapshot_level');
            const showSnapshotsParam = params.get('show_snapshots');

            if (cycleId) {
                setFilters(f => ({ ...f, cycleId }));
            }
            if (departmentId) {
                setFilters(f => ({ ...f, departmentId }));
            }
            if (ownerId) {
                setFilters(f => ({ ...f, ownerId }));
            }
            if (status) {
                setFilters(f => ({ ...f, status }));
            }
            if (levelParam === 'company' || levelParam === 'departments') {
                setLevel(levelParam);
            }
            if (snapshotLevel === 'all' || snapshotLevel === 'company' || snapshotLevel === 'departments') {
                setSnapshotLevelFilter(snapshotLevel);
            }
            if (showSnapshotsParam) {
                const pageNum = parseInt(showSnapshotsParam, 10);
                if (!isNaN(pageNum) && pageNum > 0) {
                    setShowSnapshots(true);
                    setSnapshotPage(pageNum);
                } else if (showSnapshotsParam === 'true' || showSnapshotsParam === '1') {
                    setShowSnapshots(true);
                    setSnapshotPage(1);
                }
            }
        } catch (e) {
            console.error('Failed to read query params:', e);
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [rCycles, rDepts, rUsers] = await Promise.all([
                    fetch('/cycles', { headers: { Accept: 'application/json' } }),
                    fetch('/departments', { headers: { Accept: 'application/json' } }),
                    fetch('/users?per_page=1000', { headers: { Accept: 'application/json' } })
                ]);
                const dCycles = await rCycles.json();
                const dDepts = await rDepts.json();
                const dUsers = await rUsers.json();
                const listCycles = Array.isArray(dCycles.data) ? dCycles.data : [];
                const listDepts = Array.isArray(dDepts.data) ? dDepts.data : [];
                const listUsers = Array.isArray(dUsers.data) ? dUsers.data : [];
                setCycles(listCycles);
                setCyclesList(listCycles);
                setDepartments(listDepts);
                setOwners(listUsers);
                if (listCycles.length) {
                    const now = new Date();
                    const parse = (s) => (s ? new Date(s) : null);
                    const params = new URLSearchParams(window.location.search);
                    if (!params.get('cycle_id')) {
                        const current = listCycles.find(c => {
                            const start = parse(c.start_date || c.startDate);
                            const end = parse(c.end_date || c.endDate);
                            return start && end && start <= now && now <= end;
                        }) || listCycles[0];
                        setFilters(f => ({ ...f, cycleId: current.cycle_id || current.cycleId }));
                        setCycleFilter(current.cycle_id || current.cycleId);
                        setCurrentCycleMeta({
                            id: current.cycle_id || current.cycleId,
                            name: current.cycle_name || current.cycleName,
                            start: current.start_date || current.startDate,
                            end: current.end_date || current.endDate,
                        });
                    } else {
                        setCycleFilter(params.get('cycle_id'));
                    }
                }
            } catch (e) { }
        })();
    }, []);

    useEffect(() => {
        if (!filters.cycleId) return;
        const source = Array.isArray(cyclesList) && cyclesList.length ? cyclesList : cycles;
        if (!Array.isArray(source) || source.length === 0) return;
        const c = source.find(x => String(x.cycle_id || x.cycleId) === String(filters.cycleId));
        if (c) {
            setCurrentCycleMeta({
                id: c.cycle_id || c.cycleId,
                name: c.cycle_name || c.cycleName,
                start: c.start_date || c.startDate,
                end: c.end_date || c.endDate,
            });
            setCycleFilter(c.cycle_id || c.cycleId);
        }
    }, [filters.cycleId, cycles]);

    useEffect(() => {
        if (filters.cycleId === undefined) return;
        setLoading(true);
        setError('');
        (async () => {
            try {
                const params = new URLSearchParams();
                if (filters.cycleId) params.set('cycle_id', filters.cycleId);
                if (filters.departmentId) params.set('department_id', filters.departmentId);
                if (filters.status) params.set('status', filters.status);
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                if (level) params.set('level', level);
                const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
                const res = await fetch(url, { headers: { Accept: 'application/json' } });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Load report failed');
                setReport(json.data);
                const detailedDataResult = await fetchDetailedData(filters.cycleId, filters.departmentId, filters.ownerId, level);
                setDetailedData(detailedDataResult);
            } catch (e) {
                setError(e.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        })();
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId, level]);

    useEffect(() => {
        if (!filters.cycleId) return;
        const timer = setInterval(() => {
            const params = new URLSearchParams();
            if (filters.cycleId) params.set('cycle_id', filters.cycleId);
            if (filters.departmentId) params.set('department_id', filters.departmentId);
            if (filters.status) params.set('status', filters.status);
            if (filters.ownerId) params.set('owner_id', filters.ownerId);
            if (level) params.set('level', level);
            const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
            fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-store' } })
                .then(r => r.json().then(j => ({ ok: r.ok, j })))
                .then(({ ok, j }) => { if (ok && j.success) setReport(j.data); })
                .catch(() => { });
        }, 60000);
        return () => clearInterval(timer);
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId, level]);

    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (filters.cycleId) {
                url.searchParams.set('cycle_id', filters.cycleId);
            } else {
                url.searchParams.delete('cycle_id');
            }
            if (filters.departmentId) {
                url.searchParams.set('department_id', filters.departmentId);
            } else {
                url.searchParams.delete('department_id');
            }
            if (filters.ownerId) {
                url.searchParams.set('owner_id', filters.ownerId);
            } else {
                url.searchParams.delete('owner_id');
            }
            if (filters.status) {
                url.searchParams.set('status', filters.status);
            } else {
                url.searchParams.delete('status');
            }
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync filters to URL', e);
        }
    }, [filters.cycleId, filters.departmentId, filters.ownerId, filters.status]);

    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (level && level !== 'departments') {
                url.searchParams.set('level', level);
            } else {
                url.searchParams.delete('level');
            }
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync level to URL', e);
        }
    }, [level]);

    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (snapshotLevelFilter && snapshotLevelFilter !== 'all') {
                url.searchParams.set('snapshot_level', snapshotLevelFilter);
            } else {
                url.searchParams.delete('snapshot_level');
            }
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync snapshotLevelFilter to URL', e);
        }
    }, [snapshotLevelFilter]);

    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (showSnapshots) {
                url.searchParams.set('show_snapshots', String(snapshotPage));
            } else {
                url.searchParams.delete('show_snapshots');
            }
            url.searchParams.delete('snapshot_page');
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync showSnapshots to URL', e);
        }
    }, [showSnapshots, snapshotPage]);

    useEffect(() => {
        const handler = (e) => {
            const pop = document.getElementById('okr-filter-popover');
            const btn = document.getElementById('okr-filter-button');
            if (!pop || !btn) return;
            if (!pop.contains(e.target) && !btn.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        if (filterOpen) document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [filterOpen]);

    useEffect(() => {
        if (showSnapshotModal || showSnapshots) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showSnapshotModal, showSnapshots]);

    const resetFilters = () => {
        setFilters(f => ({
            ...f,
            cycleId: currentCycleMeta?.id || f.cycleId,
            departmentId: '',
            status: '',
        }));
    };

    const showNotification = (type, message) => {
        setToast({ type, message });
    };

    const openSnapshotModal = () => {
        if (!filters.cycleId) {
            showNotification('error', '⚠ Vui lòng chọn chu kỳ trước khi tạo Báo cáo');
            return;
        }
        setSnapshotTitleInput('');
        setShowSnapshotModal(true);
    };

    const confirmCreateSnapshot = async () => {
        if (!snapshotTitleInput.trim()) {
            showNotification('error', '�Warning Vui lòng nhập tên Báo cáo Cuối kỳ');
            return;
        }

        setIsCreatingSnapshot(true);
        try {
            const baseTitle = snapshotTitleInput.trim();
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            const fetchDataForLevel = async (levelToFetch) => {
                const params = new URLSearchParams();
                if (filters.cycleId) params.set('cycle_id', filters.cycleId);
                if (filters.departmentId) params.set('department_id', filters.departmentId);
                if (filters.status) params.set('status', filters.status);
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                params.set('level', levelToFetch);

                const reportRes = await fetch(`/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`, {
                    headers: { Accept: 'application/json' }
                });
                const reportJson = await reportRes.json();
                if (!reportRes.ok || !reportJson.success) {
                    throw new Error(`Không thể tải dữ liệu cho ${levelToFetch === 'company' ? 'công ty' : 'phòng ban'}`);
                }

                const detailedDataForLevel = await fetchDetailedDataForSnapshot(
                    filters.cycleId,
                    filters.departmentId,
                    filters.ownerId,
                    levelToFetch
                );

                return {
                    report: reportJson.data,
                    detailedData: detailedDataForLevel,
                };
            };

            const [companyData, departmentsData] = await Promise.all([
                fetchDataForLevel('company'),
                fetchDataForLevel('departments'),
            ]);

            const companySnapshotData = {
                overall: companyData.report.overall,
                departments: companyData.report.departmentsHierarchy?.length > 0
                    ? companyData.report.departmentsHierarchy
                    : (companyData.report.departments || []),
                trend: companyData.report.trend || [],
                risks: companyData.report.risks || [],
                detailedData: {
                    objectives: companyData.detailedData.objectives || [],
                    keyResults: companyData.detailedData.keyResults || [],
                    owners: companyData.detailedData.owners || [],
                    checkIns: companyData.detailedData.checkIns || [],
                },
                level: 'company',
            };

            const departmentsSnapshotData = {
                overall: departmentsData.report.overall,
                departments: departmentsData.report.departmentsHierarchy?.length > 0
                    ? departmentsData.report.departmentsHierarchy
                    : (departmentsData.report.departments || []),
                trend: departmentsData.report.trend || [],
                risks: departmentsData.report.risks || [],
                detailedData: {
                    objectives: departmentsData.detailedData.objectives || [],
                    keyResults: departmentsData.detailedData.keyResults || [],
                    owners: departmentsData.detailedData.owners || [],
                    checkIns: departmentsData.detailedData.checkIns || [],
                },
                level: 'departments',
            };

            const [companyResponse, departmentsResponse] = await Promise.all([
                fetch('/api/reports/snapshot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        cycle_id: filters.cycleId,
                        title: baseTitle,
                        data_snapshot: companySnapshotData,
                    }),
                }),
                fetch('/api/reports/snapshot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        cycle_id: filters.cycleId,
                        title: baseTitle,
                        data_snapshot: departmentsSnapshotData,
                    }),
                }),
            ]);

            const companyDataResult = await companyResponse.json();
            const departmentsDataResult = await departmentsResponse.json();

            if (!companyResponse.ok || !companyDataResult.success) {
                throw new Error(companyDataResult.message || 'Không thể tạo snapshot cho công ty');
            }

            if (!departmentsResponse.ok || !departmentsDataResult.success) {
                throw new Error(departmentsDataResult.message || 'Không thể tạo snapshot cho phòng ban');
            }

            showNotification('success', 'Tạo Báo cáo thành công!');
            setSnapshotPage(1);
            loadSnapshots(1, filters.cycleId);

            setIsReportReady(true);

            setShowSnapshotModal(false);
            setSnapshotTitleInput('');
        } catch (error) {
            console.error('Lỗi khi tạo Báo cáo:', error);
            showNotification('error', '✗ ' + (error.message || 'Đã có lỗi xảy ra'));
        } finally {
            setIsCreatingSnapshot(false);
        }
    };

    const loadSnapshots = async (page = 1, cycleId = null) => {
        const useCycle = cycleId || filters.cycleId || modalCycleFilter || '';
        const result = await loadSnapshotsUtil(useCycle, page);
        setSnapshots(result.snapshots);
        setSnapshotPagination(result.pagination);
    };

    const loadSnapshot = async (snapshotId) => {
        const snapshot = await loadSnapshotUtil(snapshotId);
        if (snapshot) {
            setSelectedSnapshot(snapshot);
        }
    };

    const handleViewSnapshots = () => {
        if (!showSnapshots) {
            setShowSnapshots(true);
            setSnapshotPage(1);
            setSelectedSnapshot(null);

            const initialCycle = modalCycleFilter || cycleFilter || filters.cycleId;
            if (initialCycle && !modalCycleFilter) {
                setModalCycleFilter(initialCycle);
            }

            loadSnapshots(1, initialCycle || undefined);

        } else {
            setShowSnapshots(false);
            setSelectedSnapshot(null);
            setSnapshotPage(1);
            setModalCycleDropdownOpen(false);
        }
    };

    const exportToExcel = async () => {
        if (!isReportReady || snapshots.length === 0) {
            showNotification('error', '⚠ Vui lòng tạo Báo cáo trước khi xuất file');
            return;
        }

        try {
            const fetchDataForLevel = async (levelToFetch) => {
                const params = new URLSearchParams();
                if (filters.cycleId) params.set('cycle_id', filters.cycleId);
                if (filters.departmentId) params.set('department_id', filters.departmentId);
                if (filters.status) params.set('status', filters.status);
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                params.set('level', levelToFetch);

                const reportRes = await fetch(`/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`, {
                    headers: { Accept: 'application/json' }
                });
                const reportJson = await reportRes.json();
                if (!reportRes.ok || !reportJson.success) {
                    throw new Error(`Không thể tải dữ liệu cho ${levelToFetch === 'company' ? 'công ty' : 'phòng ban'}`);
                }

                const detailedData = await fetchDetailedDataForSnapshot(
                    filters.cycleId,
                    filters.departmentId,
                    filters.ownerId,
                    levelToFetch
                );

                return {
                    report: reportJson.data,
                    detailedData: detailedData,
                };
            };

            const [companyData, departmentsData] = await Promise.all([
                fetchDataForLevel('company'),
                fetchDataForLevel('departments'),
            ]);

            let snapshotTitle = null;
            try {
                if (filters.cycleId && snapshots.length > 0) {
                    const latestSnapshot = snapshots
                        .filter(s => s.cycle_id === parseInt(filters.cycleId))
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    if (latestSnapshot) {
                        snapshotTitle = latestSnapshot.title;
                    }
                }
            } catch (e) {
                console.warn('Không thể lấy tên snapshot:', e);
            }

            exportToExcelUtil(
                companyData,
                departmentsData,
                currentCycleMeta,
                snapshotTitle,
                (message) => showNotification('success', message),
                (message) => showNotification('error', message)
            );
        } catch (error) {
            console.error('Lỗi khi xuất Excel:', error);
            showNotification('error', 'Xuất Excel thất bại: ' + (error.message || 'Lỗi không xác định'));
        }
    };

    return (
        <div className="px-6 py-8 min-h-screen bg-gray-50">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo tổng quan</h1>

                    <div className="flex items-center gap-3">
                        {isAdminOrCeo && (
                            <button
                                onClick={openSnapshotModal}
                                disabled={isCreatingSnapshot}
                                className="flex items-center justify-center gap-2 px-4 h-10 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-10 whitespace-nowrap"
                            >
                                {isCreatingSnapshot ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.507 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                        Tạo Báo cáo
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleViewSnapshots}
                            className="flex items-center justify-center gap-2 px-4 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-200 min-w-48 whitespace-nowrap"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Danh sách Báo cáo ({snapshots.length})
                        </button>

                        <div className="h-10 min-w-48 flex items-center">
                            <div className="w-full h-full">
                                <CycleDropdown
                                    cyclesList={cyclesList}
                                    cycleFilter={cycleFilter}
                                    handleCycleChange={(val) => {
                                        setCycleFilter(val);
                                        setFilters(f => ({ ...f, cycleId: val }));
                                    }}
                                    dropdownOpen={dropdownOpen}
                                    setDropdownOpen={setDropdownOpen}
                                    className="w-full h-10"
                                />
                            </div>
                        </div>

                        <div className="relative h-10">
                            <button
                                onClick={() => {
                                    if (isReportReady && snapshots.length > 0) {
                                        setShowExcelMenu((prev) => !prev);
                                    }
                                }}
                                disabled={!isReportReady || snapshots.length === 0}
                                className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${!isReportReady || snapshots.length === 0
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-slate-100 cursor-pointer'
                                    }`}
                                title={
                                    !isReportReady || snapshots.length === 0
                                        ? 'Vui lòng tạo Báo cáo trước khi xuất file'
                                        : 'Xuất báo cáo Excel'
                                }
                            >
                                <svg
                                    className={`h-5 w-5 ${!isReportReady || snapshots.length === 0
                                        ? 'text-slate-400'
                                        : 'text-slate-600'
                                        }`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </button>
                            {isReportReady && snapshots.length > 0 && showExcelMenu && (
                                <div className="absolute right-0 top-full mt-2 w-full min-w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                                    <button
                                        onClick={() => {
                                            exportToExcel();
                                            setShowExcelMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
                                    >
                                        Xuất Excel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            {isReportReady ? (
                <>
                    <OverviewCards report={report} />

                    <ChartSection report={report} level={level} onLevelChange={setLevel} />

                    <DepartmentTable report={report} level={level} />

                    <ObjectivesTable objectives={detailedData.objectives} level={level} />

                    <KeyResultsTable keyResults={detailedData.keyResults} />

                    <OwnersTable owners={detailedData.owners} />

                    <CheckInsTable checkIns={detailedData.checkIns} objectives={detailedData.objectives} />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Chưa có báo cáo Cuối kỳ</h3>
                    <p className="text-slate-600 max-w-md leading-relaxed">
                        Nhấn <strong className="text-blue-600">Tạo Báo cáo</strong> để tạo Báo cáo chính thức.<br />
                        Nội dung Báo cáo sẽ hiển thị tại đây sau khi hoàn tất.
                    </p>
                </div>
            )}

            <SnapshotModal
                isOpen={showSnapshotModal}
                onClose={() => {
                    setShowSnapshotModal(false);
                    setSnapshotTitleInput('');
                }}
                title={snapshotTitleInput}
                onTitleChange={setSnapshotTitleInput}
                onSubmit={confirmCreateSnapshot}
                isSubmitting={isCreatingSnapshot}
            />

            {showSnapshots && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowSnapshots(false);
                                setSelectedSnapshot(null);
                                setSnapshotPage(1);
                                setSnapshotLevelDropdownOpen(false);
                                setModalCycleDropdownOpen(false);
                            }
                        }}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-[80vw] w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-xl z-50">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-gray-900">Danh sách Báo cáo</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSnapshots(false);
                                        setSelectedSnapshot(null);
                                        setSnapshotPage(1);

                                        setSnapshotLevelDropdownOpen(false);
                                        setModalCycleDropdownOpen(false);
                                    }}
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
                                        <button
                                            onClick={() => setSelectedSnapshot(null)}
                                            className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium transition"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                            </svg>
                                            Quay lại danh sách
                                        </button>

                                        <h4 className="text-lg font-bold text-slate-900 mb-2">{selectedSnapshot.title}</h4>

                                        <div className="bg-slate-50 rounded-lg p-6 mb-6 border border-slate-200 shadow-sm">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-600">Chu kỳ:</span>
                                                    <span className="ml-2 font-semibold text-slate-900">{selectedSnapshot.cycle_name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600">Ngày chốt:</span>
                                                    <span className="ml-2 font-semibold text-slate-900">
                                                        {new Date(selectedSnapshot.snapshotted_at).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600">Tạo bởi:</span>
                                                    <span className="ml-2 font-semibold text-slate-900">
                                                        {selectedSnapshot.creator?.full_name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600">Thời gian:</span>
                                                    <span className="ml-2 font-semibold text-slate-900">
                                                        {new Date(selectedSnapshot.created_at).toLocaleTimeString('vi-VN')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedSnapshot.data_snapshot && (
                                            <div className="space-y-8">

                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-900 mb-4">Tổng quan</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                        {[
                                                            { label: "Tổng OKR", value: selectedSnapshot.data_snapshot.overall?.totalObjectives || 0, color: "gray" },
                                                            { label: "Tiến độ TB", value: `${(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0).toFixed(1)}%`, color: "blue" },
                                                            { label: "Đúng tiến độ", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0, percent: selectedSnapshot.data_snapshot.overall?.statusDistribution?.onTrack || 0, color: "emerald" },
                                                            { label: "Có nguy cơ", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.atRisk || 0, percent: selectedSnapshot.data_snapshot.overall?.statusDistribution?.atRisk || 0, color: "amber" },
                                                            { label: "Chậm tiến độ", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0, percent: selectedSnapshot.data_snapshot.overall?.statusDistribution?.offTrack || 0, color: "red" },
                                                        ].map((item, i) => (
                                                            <div
                                                                key={i}
                                                                className={`
                                                                        rounded-xl p-5 shadow-sm bg-white border
                                                                        ${i <= 1 ? 'border-gray-200' :
                                                                        item.color === 'emerald' ? 'border-emerald-200' :
                                                                            item.color === 'amber' ? 'border-amber-200' :
                                                                                'border-red-200'}
                                                                        `}
                                                            >
                                                                <div className={`
                                                                        text-sm font-medium
                                                                        ${i <= 1 ? 'text-gray-600' :
                                                                        item.color === 'emerald' ? 'text-emerald-600' :
                                                                            item.color === 'amber' ? 'text-amber-600' :
                                                                                'text-red-600'}
                                                                        `}>
                                                                    {item.label}
                                                                </div>
                                                                <div className={`
                                                                        text-xl font-bold mt-1
                                                                        ${i <= 1 ? 'text-gray-900' :
                                                                        item.color === 'emerald' ? 'text-emerald-700' :
                                                                            item.color === 'amber' ? 'text-amber-700' :
                                                                                'text-red-700'}
                                                                        `}>
                                                                    {item.value}
                                                                    {item.percent !== undefined && (
                                                                        <span className="ml-2 text-sm font-normal text-gray-600">
                                                                            ({item.percent}%)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-900 mb-4">Phân bổ trạng thái</h4>
                                                    {(() => {
                                                        const snapshotLevel = selectedSnapshot.data_snapshot.level || 'departments';
                                                        let chartData;
                                                        if (snapshotLevel === 'company') {
                                                            const ov = selectedSnapshot.data_snapshot.overall || { statusCounts: {} };
                                                            chartData = {
                                                                categories: ['Công ty'],
                                                                series: [
                                                                    { name: 'Đúng tiến độ', color: '#22c55e', data: [ov.statusCounts?.onTrack || 0] },
                                                                    { name: 'Có nguy cơ', color: '#f59e0b', data: [ov.statusCounts?.atRisk || 0] },
                                                                    { name: 'Chậm tiến độ', color: '#ef4444', data: [ov.statusCounts?.offTrack || 0] },
                                                                ],
                                                            };
                                                        } else {
                                                            const list = (selectedSnapshot.data_snapshot.departments || [])
                                                                .filter(d => d.departmentId && (d.departmentName || '').toLowerCase() !== 'công ty');
                                                            chartData = {
                                                                categories: list.map(d => d.departmentName),
                                                                series: [
                                                                    { name: 'Đúng tiến độ', color: '#22c55e', data: list.map(d => d.onTrack || 0) },
                                                                    { name: 'Có nguy cơ', color: '#f59e0b', data: list.map(d => d.atRisk || 0) },
                                                                    { name: 'Chậm tiến độ', color: '#ef4444', data: list.map(d => d.offTrack || 0) },
                                                                ],
                                                            };
                                                        }
                                                        return (
                                                            <GroupedBarChart
                                                                categories={chartData.categories}
                                                                series={chartData.series}
                                                                label={`Phân bổ trạng thái theo ${snapshotLevel === 'company' ? 'công ty' : 'phòng ban'}`}
                                                            />
                                                        );
                                                    })()}
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-white">
                                                    <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">
                                                        {selectedSnapshot.data_snapshot.level === 'company' ? 'Chi tiết công ty' : 'Chi tiết theo đơn vị'}
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-sm">
                                                            <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left">Đơn vị</th>
                                                                    <th className="px-6 py-3 text-center">Số OKR</th>
                                                                    <th className="px-6 py-3 text-center">Tiến độ TB</th>
                                                                    <th className="px-6 py-3 text-center">Đúng tiến độ</th>
                                                                    <th className="px-6 py-3 text-center">Có nguy cơ</th>
                                                                    <th className="px-6 py-3 text-center">Chậm tiến độ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(selectedSnapshot.data_snapshot.level === 'company'
                                                                    ? [
                                                                        {
                                                                            departmentName: 'Công ty',
                                                                            count: selectedSnapshot.data_snapshot.overall?.totalObjectives || 0,
                                                                            averageProgress: selectedSnapshot.data_snapshot.overall?.averageProgress || 0,
                                                                            onTrack: selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0,
                                                                            atRisk: selectedSnapshot.data_snapshot.overall?.statusCounts?.atRisk || 0,
                                                                            offTrack: selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0,
                                                                            onTrackPct: selectedSnapshot.data_snapshot.overall?.statusDistribution?.onTrack || 0,
                                                                            atRiskPct: selectedSnapshot.data_snapshot.overall?.statusDistribution?.atRisk || 0,
                                                                            offTrackPct: selectedSnapshot.data_snapshot.overall?.statusDistribution?.offTrack || 0,
                                                                        },
                                                                    ]
                                                                    : (selectedSnapshot.data_snapshot.departments || []).filter(
                                                                        (d) =>
                                                                            d.departmentId &&
                                                                            (d.departmentName || '').toLowerCase() !== 'công ty'
                                                                    )
                                                                ).map((d, i) => (
                                                                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                                        <td className="px-6 py-3 font-medium text-slate-900">
                                                                            {d.departmentName || 'N/A'}
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center font-semibold text-slate-900">
                                                                            {d.count ?? d.totalObjectives ?? 0}
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <div className="flex items-center justify-center gap-3" style={{ width: '180px', margin: '0 auto' }}>
                                                                                <div className="w-32 bg-slate-200 rounded-full h-2 flex-shrink-0">
                                                                                    <div
                                                                                        className={`h-2 rounded-full transition-all duration-300 ${(d.averageProgress ?? 0) >= 80
                                                                                            ? 'bg-emerald-500'
                                                                                            : (d.averageProgress ?? 0) >= 50
                                                                                                ? 'bg-amber-500'
                                                                                                : 'bg-red-500'
                                                                                            }`}
                                                                                        style={{ width: `${Math.min(d.averageProgress ?? 0, 100)}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-sm font-semibold tabular-nums whitespace-nowrap w-12 text-right">
                                                                                    {(d.averageProgress ?? 0).toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <div className="font-semibold text-emerald-700">
                                                                                {d.onTrack ?? 0}
                                                                            </div>
                                                                            <div className="text-xs text-slate-500">
                                                                                ({d.onTrackPct ?? d.onTrackPercent ?? 0}%)
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <div className="font-semibold text-amber-700">
                                                                                {d.atRisk ?? 0}
                                                                            </div>
                                                                            <div className="text-xs text-slate-500">
                                                                                ({d.atRiskPct ?? d.atRiskPercent ?? 0}%)
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <div className="font-semibold text-red-700">
                                                                                {d.offTrack ?? 0}
                                                                            </div>
                                                                            <div className="text-xs text-slate-500">
                                                                                ({d.offTrackPct ?? d.offTrackPercent ?? 0}%)
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {selectedSnapshot.data_snapshot.departments?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-lg font-bold text-gray-900 mb-4">Chi tiết theo đơn vị</h4>
                                                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th className="text-left p-4 font-semibold text-gray-700">Đơn vị</th>
                                                                        <th className="text-center p-4 font-semibold text-gray-700">OKR</th>
                                                                        <th className="text-center p-4 font-semibold text-gray-700">Tiến độ</th>
                                                                        <th className="text-center p-4 font-semibold text-green-600">Đúng tiến độ</th>
                                                                        <th className="text-center p-4 font-semibold text-yellow-600">Có nguy cơ</th>
                                                                        <th className="text-center p-4 font-semibold text-red-600">Chậm tiến độ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                                                                        <td className="p-4 text-slate-900">Công ty</td>
                                                                        <td className="p-4 text-center text-slate-700">
                                                                            {selectedSnapshot.data_snapshot.overall?.totalObjectives || 0}
                                                                        </td>
                                                                        <td className="p-4 text-center">
                                                                            <div className="flex items-center justify-center gap-3">
                                                                                <div className="w-20 h-2 bg-slate-300 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                                                                                        style={{ width: `${Math.min(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0, 100)}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="font-bold text-slate-900">
                                                                                    {(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0).toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 text-center text-green-600 font-medium">
                                                                            {selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0}
                                                                        </td>
                                                                        <td className="p-4 text-center text-yellow-600 font-medium">
                                                                            {selectedSnapshot.data_snapshot.overall?.statusCounts?.atRisk || 0}
                                                                        </td>
                                                                        <td className="p-4 text-center text-red-600 font-medium">
                                                                            {selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0}
                                                                        </td>
                                                                    </tr>

                                                                    {(selectedSnapshot.data_snapshot.departments || []).map((dept) => {
                                                                        if (dept.departmentName?.toLowerCase() === 'công ty') return null;
                                                                        const hasTeams = dept.children && dept.children.length > 0;

                                                                        return (
                                                                            <React.Fragment key={dept.departmentId}>
                                                                                <tr className="bg-blue-50/30 border-t border-slate-200 hover:bg-blue-50/50 transition">
                                                                                    <td className="p-4 font-semibold text-blue-900 pl-8">
                                                                                        {dept.departmentName || 'Phòng ban không tên'}
                                                                                    </td>
                                                                                    <td className="p-4 text-center text-slate-700">{dept.count || 0}</td>
                                                                                    <td className="p-4 text-center">
                                                                                        <div className="flex items-center justify-center gap-3">
                                                                                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                                                <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.min(dept.averageProgress ?? 0, 100)}%` }} />
                                                                                            </div>
                                                                                            <span className="font-semibold text-blue-900">{(dept.averageProgress ?? 0).toFixed(1)}%</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4 text-center text-green-600 font-medium">{dept.onTrack || 0}</td>
                                                                                    <td className="p-4 text-center text-yellow-600 font-medium">{dept.atRisk || 0}</td>
                                                                                    <td className="p-4 text-center text-red-600 font-medium">{dept.offTrack || 0}</td>
                                                                                </tr>

                                                                                {hasTeams && dept.children.map((team) => (
                                                                                    <tr key={team.departmentId} className="border-t border-slate-100 hover:bg-slate-50 transition">
                                                                                        <td className="p-4 text-slate-700 pl-16">↳ {team.departmentName}</td>
                                                                                        <td className="p-4 text-center text-slate-600">{team.count || 0}</td>
                                                                                        <td className="p-4 text-center">
                                                                                            <div className="flex items-center justify-center gap-3">
                                                                                                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                                                    <div
                                                                                                        className={`h-full transition-all ${(team.averageProgress ?? 0) >= 80 ? 'bg-emerald-500' :
                                                                                                            (team.averageProgress ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                                                            }`}
                                                                                                        style={{ width: `${Math.min(team.averageProgress ?? 0, 100)}%` }}
                                                                                                    />
                                                                                                </div>
                                                                                                <span className={`font-medium ${(team.averageProgress ?? 0) >= 80 ? 'text-emerald-700' :
                                                                                                    (team.averageProgress ?? 0) >= 50 ? 'text-amber-700' : 'text-red-700'
                                                                                                    }`}>
                                                                                                    {(team.averageProgress ?? 0).toFixed(1)}%
                                                                                                </span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-4 text-center text-green-600">{team.onTrack || 0}</td>
                                                                                        <td className="p-4 text-center text-yellow-600">{team.atRisk || 0}</td>
                                                                                        <td className="p-4 text-center text-red-600">{team.offTrack || 0}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedSnapshot.data_snapshot.detailedData?.objectives && selectedSnapshot.data_snapshot.detailedData.objectives.length > 0 && (
                                                    <div className="rounded-xl border border-slate-200 bg-white">
                                                        <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Chi tiết Objectives</div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                                                                    <tr>
                                                                        <th className="px-6 py-3">Tên Objective</th>
                                                                        <th className="px-6 py-3">Cấp độ</th>
                                                                        {selectedSnapshot.data_snapshot.level !== 'company' && <th className="px-6 py-3">Phòng ban</th>}
                                                                        <th className="px-6 py-3 text-center">Số KR</th>
                                                                        <th className="px-6 py-3 text-center">Tiến độ</th>
                                                                        <th className="px-6 py-3 text-center">Trạng thái</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedSnapshot.data_snapshot.detailedData.objectives.map((obj, i) => {
                                                                        const krs = obj.keyResults || obj.key_results || [];
                                                                        let progress = 0;

                                                                        if (krs.length > 0) {
                                                                            const totalProgress = krs.reduce((sum, kr) => {
                                                                                const krProgress = parseFloat(kr.progress_percent) || 0;
                                                                                return sum + krProgress;
                                                                            }, 0);
                                                                            progress = totalProgress / krs.length;
                                                                        } else {
                                                                            progress = parseFloat(obj.progress_percent) || 0;
                                                                        }

                                                                        const status = progress >= 70 ? 'on_track' : (progress >= 40 ? 'at_risk' : 'off_track');
                                                                        const levelText = obj.level === 'company' ? 'Công ty' : obj.level === 'unit' ? 'Phòng ban' : obj.level === 'person' ? 'Cá nhân' : 'N/A';
                                                                        return (
                                                                            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                                                <td className="px-6 py-3 font-semibold text-slate-900">{obj.obj_title || 'N/A'}</td>
                                                                                <td className="px-6 py-3">
                                                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                                                                        {levelText}
                                                                                    </span>
                                                                                </td>
                                                                                {selectedSnapshot.data_snapshot.level !== 'company' && (
                                                                                    <td className="px-6 py-3">{obj.department?.d_name || obj.department?.departmentName || '—'}</td>
                                                                                )}
                                                                                <td className="px-6 py-3 text-center font-semibold">{obj.key_results?.length || krs.length || 0}</td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    <div className="flex items-center justify-center gap-3" style={{ width: '180px', margin: '0 auto' }}>
                                                                                        <div className="w-32 bg-slate-200 rounded-full h-2 flex-shrink-0">
                                                                                            <div
                                                                                                className={`h-2 rounded-full transition-all ${progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                                                    }`}
                                                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-sm font-semibold tabular-nums whitespace-nowrap w-12 text-right">{progress.toFixed(1)}%</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    {status === 'on_track' && (
                                                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                                                            Đúng tiến độ
                                                                                        </span>
                                                                                    )}
                                                                                    {status === 'at_risk' && (
                                                                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                                                                            Có nguy cơ
                                                                                        </span>
                                                                                    )}
                                                                                    {status === 'off_track' && (
                                                                                        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                                                                            Chậm tiến độ
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedSnapshot.data_snapshot.detailedData?.keyResults && selectedSnapshot.data_snapshot.detailedData.keyResults.length > 0 && (
                                                    <div className="rounded-xl border border-slate-200 bg-white">
                                                        <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Chi tiết Key Results</div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                                                                    <tr>
                                                                        <th className="px-6 py-3">Tên Key Result</th>
                                                                        <th className="px-6 py-3">Objective</th>
                                                                        <th className="px-6 py-3">Người được giao</th>
                                                                        <th className="px-6 py-3 text-center">Tiến độ</th>
                                                                        <th className="px-6 py-3 text-center">Trạng thái</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedSnapshot.data_snapshot.detailedData.keyResults.map((kr, i) => {
                                                                        const progress = kr.progress_percent || 0;
                                                                        const status = progress >= 70 ? 'on_track' : (progress >= 40 ? 'at_risk' : 'off_track');
                                                                        return (
                                                                            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                                                <td className="px-6 py-3 font-medium text-slate-900">{kr.kr_title || 'N/A'}</td>
                                                                                <td className="px-6 py-3 text-slate-600">{kr.objective_title || 'N/A'}</td>
                                                                                <td className="px-6 py-3">
                                                                                    {(() => {
                                                                                        const assigneeName = kr.assignedUser?.full_name;
                                                                                        if (assigneeName) return assigneeName;
                                                                                        const ownerName = kr.objective_owner?.full_name || kr.objective_owner?.name;
                                                                                        return ownerName || 'Chưa gán';
                                                                                    })()}
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    <div className="flex items-center justify-center gap-3" style={{ width: '180px', margin: '0 auto' }}>
                                                                                        <div className="w-32 bg-slate-200 rounded-full h-2 flex-shrink-0">
                                                                                            <div
                                                                                                className={`h-2 rounded-full transition-all ${progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                                                    }`}
                                                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-sm font-semibold tabular-nums whitespace-nowrap w-12 text-right">{progress.toFixed(1)}%</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    {status === 'on_track' && (
                                                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                                                            Đúng tiến độ
                                                                                        </span>
                                                                                    )}
                                                                                    {status === 'at_risk' && (
                                                                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                                                                            Có nguy cơ
                                                                                        </span>
                                                                                    )}
                                                                                    {status === 'off_track' && (
                                                                                        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                                                                            Chậm tiến độ
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedSnapshot.data_snapshot.detailedData?.owners && selectedSnapshot.data_snapshot.detailedData.owners.length > 0 && (
                                                    <div className="rounded-xl border border-slate-200 bg-white">
                                                        <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Phân tích theo Người chịu trách nhiệm</div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                                                                    <tr>
                                                                        <th className="px-6 py-3">Người chịu trách nhiệm</th>
                                                                        <th className="px-6 py-3 text-center">Số Key Results</th>
                                                                        <th className="px-6 py-3 text-center">Tiến độ TB</th>
                                                                        <th className="px-6 py-3 text-center">Đúng tiến độ</th>
                                                                        <th className="px-6 py-3 text-center">Có nguy cơ</th>
                                                                        <th className="px-6 py-3 text-center">Chậm tiến độ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedSnapshot.data_snapshot.detailedData.owners.map((owner, i) => (
                                                                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                                            <td className="px-6 py-3 font-semibold text-slate-900">{owner.owner_name || 'Chưa gán'}</td>
                                                                            <td className="px-6 py-3 text-center font-semibold">{owner.keyResults?.length || 0}</td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                <div className="flex items-center justify-center gap-3" style={{ width: '180px', margin: '0 auto' }}>
                                                                                    <div className="w-32 bg-slate-200 rounded-full h-2 flex-shrink-0">
                                                                                        <div
                                                                                            className={`h-2 rounded-full transition-all ${owner.averageProgress >= 80 ? 'bg-emerald-500' : owner.averageProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                                                }`}
                                                                                            style={{ width: `${Math.min(owner.averageProgress, 100)}%` }}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap w-12 text-right">{owner.averageProgress}%</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                <span className="font-semibold text-emerald-700">{owner.onTrack || 0}</span>
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                <span className="font-semibold text-amber-700">{owner.atRisk || 0}</span>
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                <span className="font-semibold text-red-700">{owner.offTrack || 0}</span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedSnapshot.data_snapshot.detailedData?.checkIns && (
                                                    <div className="rounded-xl border border-slate-200 bg-white">
                                                        <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Lịch sử Check-in</div>
                                                        <div className="p-6">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Tổng số Check-in</div>
                                                                    <div className="text-2xl font-bold text-slate-900">{selectedSnapshot.data_snapshot.detailedData.checkIns.length || 0}</div>
                                                                </div>
                                                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Check-in trung bình/Objective</div>
                                                                    <div className="text-2xl font-bold text-slate-900">
                                                                        {selectedSnapshot.data_snapshot.detailedData.objectives?.length > 0
                                                                            ? (selectedSnapshot.data_snapshot.detailedData.checkIns.length / selectedSnapshot.data_snapshot.detailedData.objectives.length).toFixed(1)
                                                                            : 0}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Check-in gần nhất</div>
                                                                    <div className="text-sm font-semibold text-slate-900">
                                                                        {selectedSnapshot.data_snapshot.detailedData.checkIns.length > 0
                                                                            ? new Date(Math.max(...selectedSnapshot.data_snapshot.detailedData.checkIns.map(ci => new Date(ci.created_at || ci.createdAt).getTime()))).toLocaleDateString('vi-VN')
                                                                            : 'Chưa có'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-sm">
                                                                    <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                                                                        <tr>
                                                                            <th className="px-6 py-3">Key Result</th>
                                                                            <th className="px-6 py-3">Objective</th>
                                                                            <th className="px-6 py-3">Người check-in</th>
                                                                            <th className="px-6 py-3 text-center">Tiến độ</th>
                                                                            <th className="px-6 py-3 text-center">Ngày check-in</th>
                                                                            <th className="px-6 py-3">Ghi chú</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {selectedSnapshot.data_snapshot.detailedData.checkIns.length === 0 ? (
                                                                            <tr>
                                                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                                                                    Chưa có check-in nào
                                                                                </td>
                                                                            </tr>
                                                                        ) : (
                                                                            selectedSnapshot.data_snapshot.detailedData.checkIns.slice(0, 20).map((checkIn, i) => (
                                                                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                                                    <td className="px-6 py-3 font-medium text-slate-900">
                                                                                        {checkIn.key_result?.kr_title || checkIn.kr_title || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-6 py-3 text-slate-600">
                                                                                        {checkIn.objective?.obj_title || checkIn.objective_title || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-6 py-3">{checkIn.user?.full_name || checkIn.user_name || 'N/A'}</td>
                                                                                    <td className="px-6 py-3 text-center">
                                                                                        <span className="font-semibold">{checkIn.progress_percent || 0}%</span>
                                                                                    </td>
                                                                                    <td className="px-6 py-3 text-center text-slate-600">
                                                                                        {checkIn.created_at
                                                                                            ? new Date(checkIn.created_at).toLocaleDateString('vi-VN')
                                                                                            : 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-6 py-3 text-slate-600 max-w-xs truncate">
                                                                                        {checkIn.notes || checkIn.note || '—'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-4 flex items-center justify-end gap-6">
                                            <div className="flex items-center gap-4">
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
                                                        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                                                            <button
                                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 first:rounded-t-lg"
                                                                onClick={() => {
                                                                    setSnapshotLevelFilter('all');
                                                                    setSnapshotPage(1);
                                                                    setSnapshotLevelDropdownOpen(false);
                                                                }}
                                                            >
                                                                Tất cả cấp độ
                                                            </button>
                                                            <button
                                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100"
                                                                onClick={() => {
                                                                    setSnapshotLevelFilter('company');
                                                                    setSnapshotPage(1);
                                                                    setSnapshotLevelDropdownOpen(false);
                                                                }}
                                                            >
                                                                Công ty
                                                            </button>
                                                            <button
                                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 last:rounded-b-lg"
                                                                onClick={() => {
                                                                    setSnapshotLevelFilter('departments');
                                                                    setSnapshotPage(1);
                                                                    setSnapshotLevelDropdownOpen(false);
                                                                }}
                                                            >
                                                                Phòng ban
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <CycleDropdown
                                                    cyclesList={cyclesList}
                                                    cycleFilter={modalCycleFilter || cycleFilter}
                                                    handleCycleChange={(val) => {
                                                        setModalCycleFilter(val);
                                                        if (showSnapshots) loadSnapshots(1, val);
                                                        setModalCycleDropdownOpen(false);
                                                    }}
                                                    dropdownOpen={modalCycleDropdownOpen}
                                                    setDropdownOpen={setModalCycleDropdownOpen}
                                                />
                                            </div>
                                        </div>

                                        {(() => {
                                            const filteredSnapshots = snapshots.filter((snap) => {
                                                if (snapshotLevelFilter === 'all') return true;
                                                const snapLevel = snap.data_snapshot?.level || 'departments';
                                                return snapLevel === snapshotLevelFilter;
                                            });

                                            if (filteredSnapshots.length === 0) {
                                                return (
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
                                                );
                                            }

                                            return (
                                                <div className="grid gap-4">
                                                    {filteredSnapshots.map((snap) => {
                                                        const snapLevel = snap.data_snapshot?.level || 'departments';
                                                        const levelText = snapLevel === 'company' ? 'Công ty' : 'Phòng ban';
                                                        return (
                                                            <button
                                                                key={snap.id}
                                                                onClick={() => loadSnapshot(snap.id)}
                                                                className="w-full p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left group"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition">
                                                                                {snap.title}
                                                                            </h3>
                                                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                                                {levelText}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-6 text-sm text-gray-500 mt-2">
                                                                            <span className="flex items-center gap-1">
                                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                                {new Date(snap.snapshotted_at).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                                                {snap.creator?.full_name || 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <svg className="h-6 w-6 text-gray-400 group-hover:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}

                                        {snapshotPagination.total > 0 && snapshotPagination.last_page > 1 && (
                                            <div className="mt-6 flex items-center justify-center">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const newPage = Math.max(1, snapshotPage - 1);
                                                            setSnapshotPage(newPage);
                                                            loadSnapshots(newPage, modalCycleFilter || filters.cycleId || cycleFilter);
                                                        }}
                                                        disabled={snapshotPage === 1}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${snapshotPage === 1
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M15 19l-7-7 7-7"
                                                            />
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
                                                                (pageNumber >= snapshotPage - 1 &&
                                                                    pageNumber <= snapshotPage + 1)
                                                            ) {
                                                                return (
                                                                    <button
                                                                        key={pageNumber}
                                                                        onClick={() => {
                                                                            setSnapshotPage(pageNumber);
                                                                            loadSnapshots(pageNumber, modalCycleFilter || filters.cycleId || cycleFilter);
                                                                        }}
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
                                                                    <span
                                                                        key={pageNumber}
                                                                        className="px-2 text-gray-400"
                                                                    >
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
                                                            setSnapshotPage(newPage);
                                                            loadSnapshots(newPage, modalCycleFilter || filters.cycleId || cycleFilter);
                                                        }}
                                                        disabled={snapshotPage === snapshotPagination.last_page}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${snapshotPage === snapshotPagination.last_page
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 5l7 7-7 7"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <style jsx>{`
                body { overflow: hidden; }
                `}</style>
                </>
            )}
        </div>
    );
}