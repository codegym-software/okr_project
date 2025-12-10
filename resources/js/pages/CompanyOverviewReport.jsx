import React, { useEffect, useMemo, useState } from 'react';
import GroupedBarChart from '../components/GroupedBarChart';
import ToastNotification from '../components/ToastNotification';
import { CycleDropdown } from '../components/Dropdown';
import StatCard from '../components/reports/StatCard';
import TrendIcon from '../components/reports/TrendIcon';
import Pagination from '../components/reports/Pagination';
import ObjectivesTable from '../components/reports/ObjectivesTable';
import KeyResultsTable from '../components/reports/KeyResultsTable';
import OwnersTable from '../components/reports/OwnersTable';
import CheckInsTable from '../components/reports/CheckInsTable';
import SnapshotModal from '../components/reports/SnapshotModal';
import SnapshotHistoryModal from '../components/reports/SnapshotHistoryModal';
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
    const [snapshotLevelFilter, setSnapshotLevelFilter] = useState('all'); // 'all', 'company', 'departments'
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

    const [filters, setFilters] = useState({
        cycleId: '',
        departmentId: '',
        ownerId: '',
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [report, setReport] = useState({
        overall: { totalObjectives: 0, averageProgress: 0, statusCounts: { onTrack:0, atRisk:0, offTrack:0 }, statusDistribution: { onTrack:0, atRisk:0, offTrack:0 } },
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

    // User role state
    const [userRole, setUserRole] = useState(null);
    const [isAdminOrCeo, setIsAdminOrCeo] = useState(false);

    // Fetch user profile to check role
    useEffect(() => {
        (async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
                const res = await fetch('/api/profile', {
                    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    // API trả về data.user.role, không phải data.role
                    const role = data.user?.role?.role_name?.toLowerCase() || '';
                    setUserRole(role);
                    setIsAdminOrCeo(role === 'admin' || role === 'ceo');
                }
            } catch (error) {
                console.error('Lỗi khi tải thông tin user:', error);
            }
        })();
    }, []);

    // Đọc query params khi component mount
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            
            // Đọc các query params
            const cycleId = params.get('cycle_id');
            const departmentId = params.get('department_id');
            const ownerId = params.get('owner_id');
            const levelParam = params.get('level');
            const snapshotLevel = params.get('snapshot_level');
            const showSnapshotsParam = params.get('show_snapshots');
            
            // Khôi phục state từ query params
            if (cycleId) {
                setFilters(f => ({ ...f, cycleId }));
            }
            if (departmentId) {
                setFilters(f => ({ ...f, departmentId }));
            }
            if (ownerId) {
                setFilters(f => ({ ...f, ownerId }));
            }
            if (levelParam === 'company' || levelParam === 'departments') {
                setLevel(levelParam);
            }
            if (snapshotLevel === 'all' || snapshotLevel === 'company' || snapshotLevel === 'departments') {
                setSnapshotLevelFilter(snapshotLevel);
            }
            // show_snapshots = số trang (1, 2, 3...) khi modal mở
            if (showSnapshotsParam) {
                const pageNum = parseInt(showSnapshotsParam, 10);
                if (!isNaN(pageNum) && pageNum > 0) {
                    // Nếu là số hợp lệ, đó là số trang
                    setShowSnapshots(true);
                    setSnapshotPage(pageNum);
                } else if (showSnapshotsParam === 'true' || showSnapshotsParam === '1') {
                    // Tương thích với format cũ (boolean), mở modal ở trang 1
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
                    fetch('/cycles', { headers: { Accept: 'application/json' }}),
                    fetch('/departments', { headers: { Accept: 'application/json' }}),
                    fetch('/users?per_page=1000', { headers: { Accept: 'application/json' }})
                ]);
                const dCycles = await rCycles.json();
                const dDepts = await rDepts.json();
                const dUsers = await rUsers.json();
                const listCycles = Array.isArray(dCycles.data) ? dCycles.data : [];
                const listDepts = Array.isArray(dDepts.data) ? dDepts.data : [];
                const listUsers = Array.isArray(dUsers.data) ? dUsers.data : [];
                setCycles(listCycles);
                setDepartments(listDepts);
                setOwners(listUsers);
                if (listCycles.length) {
                    const now = new Date();
                    const parse = (s) => (s ? new Date(s) : null);
                    // Chỉ set cycle mặc định nếu chưa có trong query params
                    const params = new URLSearchParams(window.location.search);
                    if (!params.get('cycle_id')) {
                    const current = listCycles.find(c => {
                        const start = parse(c.start_date || c.startDate);
                        const end = parse(c.end_date || c.endDate);
                        return start && end && start <= now && now <= end;
                    }) || listCycles[0];
                    setFilters(f => ({ ...f, cycleId: current.cycle_id || current.cycleId }));
                    setCurrentCycleMeta({
                        id: current.cycle_id || current.cycleId,
                        name: current.cycle_name || current.cycleName,
                        start: current.start_date || current.startDate,
                        end: current.end_date || current.endDate,
                    });
                    }
                }
            } catch (e) { /* ignore */ }
        })();
    }, []);

    useEffect(() => {
        if (!filters.cycleId || !Array.isArray(cycles) || cycles.length === 0) return;
        const c = cycles.find(x => String(x.cycle_id || x.cycleId) === String(filters.cycleId));
        if (c) {
            setCurrentCycleMeta({
                id: c.cycle_id || c.cycleId,
                name: c.cycle_name || c.cycleName,
                start: c.start_date || c.startDate,
                end: c.end_date || c.endDate,
            });
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
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                if (level) params.set('level', level); // Add level filter
                const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
                const res = await fetch(url, { headers: { Accept: 'application/json' } });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Load report failed');
                setReport(json.data);
                
                // Fetch detailed data based on current level
                const detailedDataResult = await fetchDetailedData(filters.cycleId, filters.departmentId, filters.ownerId, level);
                setDetailedData(detailedDataResult);
            } catch (e) {
                setError(e.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        })();
    }, [filters.cycleId, filters.departmentId, filters.ownerId, level]);
    
    // fetchDetailedData and fetchDetailedDataForSnapshot are now imported from utils/reports/dataFetchers

    useEffect(() => {
        if (!filters.cycleId) return;
        const timer = setInterval(() => {
            const params = new URLSearchParams();
            if (filters.cycleId) params.set('cycle_id', filters.cycleId);
            if (filters.departmentId) params.set('department_id', filters.departmentId);
            if (filters.ownerId) params.set('owner_id', filters.ownerId);
            if (level) params.set('level', level); // Add level filter to auto-refresh
            const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
            fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-store' }})
                .then(r => r.json().then(j => ({ ok: r.ok, j })))
                .then(({ ok, j }) => { if (ok && j.success) setReport(j.data); })
                .catch(() => {});
        }, 60000); 
        return () => clearInterval(timer);
    }, [filters.cycleId, filters.departmentId, filters.ownerId, level]); // Add level to dependencies

    // Đồng bộ filters với query params
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
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync filters to URL', e);
        }
    }, [filters.cycleId, filters.departmentId, filters.ownerId]);

    // Đồng bộ level với query params - chỉ thêm vào URL nếu khác mặc định
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            // Chỉ thêm level vào URL nếu khác với giá trị mặc định 'departments'
            if (level && level !== 'departments') {
                url.searchParams.set('level', level);
            } else {
                // Xóa level khỏi URL nếu là giá trị mặc định
                url.searchParams.delete('level');
            }
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync level to URL', e);
        }
    }, [level]);

    // Đồng bộ snapshotLevelFilter với query params
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

    // Đồng bộ showSnapshots và snapshotPage với query params
    // show_snapshots = số trang (1, 2, 3...) khi modal mở, xóa khi đóng
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (showSnapshots) {
                // Khi modal mở, show_snapshots = số trang hiện tại
                url.searchParams.set('show_snapshots', String(snapshotPage));
            } else {
                // Khi modal đóng, xóa show_snapshots
                url.searchParams.delete('show_snapshots');
            }
            // Xóa snapshot_page cũ nếu có (để tương thích ngược)
            url.searchParams.delete('snapshot_page');
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to sync showSnapshots to URL', e);
        }
    }, [showSnapshots, snapshotPage]);

    // pieData and groupedChartData are now handled in ChartSection component

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
        }));
    };

    // Show notification
    const showNotification = (type, message) => {
        setToast({ type, message });
    };

    // Mở modal Chốt + nhập tên
    const openSnapshotModal = () => {
        if (!filters.cycleId) {
            showNotification('error', '⚠ Vui lòng chọn chu kỳ trước khi Tạo báo cáo');
            return;
        }
        setSnapshotTitleInput('');
        setShowSnapshotModal(true);
    };

    const confirmCreateSnapshot = async () => {
        if (!snapshotTitleInput.trim()) {
            showNotification('error', '�Warning Vui lòng nhập tên báo cáo chốt kỳ');
            return;
        }

        setIsCreatingSnapshot(true);
        try {
            const baseTitle = snapshotTitleInput.trim();
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            // Fetch dữ liệu cho cả hai level
            const fetchDataForLevel = async (levelToFetch) => {
                // Fetch report data
                const params = new URLSearchParams();
                if (filters.cycleId) params.set('cycle_id', filters.cycleId);
                if (filters.departmentId) params.set('department_id', filters.departmentId);
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                params.set('level', levelToFetch);
                
                const reportRes = await fetch(`/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`, {
                    headers: { Accept: 'application/json' }
                });
                const reportJson = await reportRes.json();
                if (!reportRes.ok || !reportJson.success) {
                    throw new Error(`Không thể tải dữ liệu cho ${levelToFetch === 'company' ? 'công ty' : 'phòng ban'}`);
                }

                // Fetch detailed data
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

            // Tạo snapshot cho cả hai level
            const [companyData, departmentsData] = await Promise.all([
                fetchDataForLevel('company'),
                fetchDataForLevel('departments'),
            ]);

            // Tạo snapshot cho công ty
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

            // Tạo snapshot cho phòng ban
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

            // Tạo cả hai snapshot
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

            showNotification('success', 'Tạo báo cáo thành công!');
            setSnapshotPage(1);
            loadSnapshots(1);

            setIsReportReady(true);

            setShowSnapshotModal(false);
            setSnapshotTitleInput('');
        } catch (error) {
            console.error('Lỗi khi Tạo báo cáo:', error);
            showNotification('error', '✗ ' + (error.message || 'Đã có lỗi xảy ra'));
        } finally {
            setIsCreatingSnapshot(false);
        }
    };

    const loadSnapshots = async (page = 1) => {
        const result = await loadSnapshotsUtil(filters.cycleId, page);
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
            // Mở modal
            setShowSnapshots(true);
            setSnapshotPage(1);
            loadSnapshots(1);
        } else {
            // Đóng modal - reset về trang 1 và xóa query params
            setShowSnapshots(false);
            setSelectedSnapshot(null);
            setSnapshotPage(1);
        }
    };

    // Export Excel từ snapshot đang chọn (hoặc snapshot mới nhất)
    const exportSnapshotToExcel = async (snapshot) => {
        let targetSnapshot = snapshot || selectedSnapshot;

        // Nếu chưa chọn snapshot (từ modal), lấy snapshot mới nhất theo chu kỳ hiện tại (hoặc mới nhất tổng thể)
        if (!targetSnapshot) {
            if (!snapshots || snapshots.length === 0) {
                showNotification('error', '⚠ Chưa có báo cáo để xuất file');
            return;
            }
            const filtered = filters.cycleId
                ? snapshots.filter(s => String(s.cycle_id) === String(filters.cycleId))
                : snapshots;
            if (filtered.length === 0) {
                showNotification('error', '⚠ Chưa có báo cáo cho chu kỳ hiện tại');
                return;
            }
            targetSnapshot = [...filtered].sort((a, b) => new Date(b.snapshotted_at || b.created_at) - new Date(a.snapshotted_at || a.created_at))[0];
        }

        try {
            const cycleId = targetSnapshot.cycle_id;

            // Ưu tiên dùng dữ liệu có sẵn trong snapshots (nhanh, không gọi API)
            const snapsSameCycle = snapshots?.filter(s => String(s.cycle_id) === String(cycleId)) || [];
            const companySnap = snapsSameCycle.find(s => (s.data_snapshot?.level || 'departments') === 'company');
            const deptSnap = snapsSameCycle.find(s => (s.data_snapshot?.level || 'departments') === 'departments');

            let companyData;
            let departmentsData;

            if (companySnap && deptSnap) {
                // Dùng thẳng data_snapshot đã lưu
                companyData = {
                    report: companySnap.data_snapshot,
                    detailedData: companySnap.data_snapshot?.detailedData || {},
                };
                departmentsData = {
                    report: deptSnap.data_snapshot,
                    detailedData: deptSnap.data_snapshot?.detailedData || {},
                };
            } else {
                // Trường hợp thiếu snapshot một trong hai cấp, fallback gọi API như cũ
            const fetchDataForLevel = async (levelToFetch) => {
                const params = new URLSearchParams();
                    if (cycleId) params.set('cycle_id', cycleId);
                params.set('level', levelToFetch);
                const reportRes = await fetch(`/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`, {
                    headers: { Accept: 'application/json' }
                });
                const reportJson = await reportRes.json();
                if (!reportRes.ok || !reportJson.success) {
                    throw new Error(`Không thể tải dữ liệu cho ${levelToFetch === 'company' ? 'công ty' : 'phòng ban'}`);
                }
                const detailedData = await fetchDetailedDataForSnapshot(
                        cycleId,
                        null,
                        null,
                    levelToFetch
                );
                    return { report: reportJson.data, detailedData };
                };

                [companyData, departmentsData] = await Promise.all([
                fetchDataForLevel('company'),
                fetchDataForLevel('departments'),
            ]);
            }

            exportToExcelUtil(
                companyData,
                departmentsData,
                currentCycleMeta,
                targetSnapshot.title,
                (message) => showNotification('success', message),
                (message) => showNotification('error', message)
            );
        } catch (error) {
            console.error('Lỗi khi xuất Excel từ lịch sử:', error);
            showNotification('error', 'Xuất Excel thất bại: ' + (error.message || 'Lỗi không xác định'));
        }
    };
    
    return (
        <div className="px-6 py-8 min-h-screen bg-gray-50">
            {/* ===================== HEADER - LUÔN HIỂN THỊ ===================== */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo tổng quan</h1>

                    <div className="flex items-end gap-3">
                    {/* Nút Tạo kết chuyển / Lập báo cáo cuối kỳ - Chỉ Admin và CEO */}
                    {isAdminOrCeo && (
                    <button
                        onClick={openSnapshotModal}
                        disabled={isCreatingSnapshot}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isCreatingSnapshot ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.507 3 7.938l3-2.647z"/>
                                </svg>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                {/* Icon: lưu trữ / kết chuyển (dùng icon archive-box hoặc document-check) */}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                Tạo báo cáo
                            </>
                        )}
                    </button>
                    )}

                    {/* Nút Xem lịch sử kết chuyển */}
                    <button
                        onClick={handleViewSnapshots}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-200"
                    >
                        {/* Icon: lịch sử / danh sách báo cáo */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Lịch sử 
                    </button>

                        {/* Filter chu kỳ */} 
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-600 leading-none">
                                    Chu kỳ OKR
                                </span>
                                <CycleDropdown
                                    cyclesList={cycles}
                                    cycleFilter={filters.cycleId}
                                    handleCycleChange={(value) => setFilters(f => ({ ...f, cycleId: value || null }))}
                                    dropdownOpen={filterOpen}
                                    setDropdownOpen={setFilterOpen}
                                />
                            </div>
                        </div>

                        {/* Nút Export Excel - Chỉ cho phép sau khi đã tạo snapshot */}
                            <button
                            onClick={() => exportSnapshotToExcel()}
                            disabled={!isReportReady || snapshots.length === 0}
                            className={`p-2.5 rounded-lg transition-colors ${
                                !isReportReady || snapshots.length === 0
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-slate-100 cursor-pointer'
                            }`}
                            title={
                                !isReportReady || snapshots.length === 0
                                    ? 'Vui lòng tạo snapshot (Tạo báo cáo) trước khi xuất file'
                                    : 'Xuất báo cáo Excel'
                            }
                        >
                            <svg 
                                className={`h-5 w-5 ${
                                    !isReportReady || snapshots.length === 0
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
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                            </button>
                    </div>
                </div>
            </div>

            {/* ===================== NOTIFICATION TOAST ===================== */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            {/* ===================== NỘI DUNG BÁO CÁO - CHỈ HIỂN THỊ SAU KHI TẠO BÁO CÁO ===================== */}
            {isReportReady ? (
                <>
                    {/* 5 Cards Tổng quan */}
                    <OverviewCards report={report} />

                    {/* Biểu đồ */}
                    <ChartSection report={report} level={level} onLevelChange={setLevel} />

                    {/* Bảng chi tiết theo cấp độ */}
                    <DepartmentTable report={report} level={level} />

                    {/* 1. Chi tiết Objectives */}
                    <ObjectivesTable objectives={detailedData.objectives} level={level} />

                    {/* 2. Chi tiết Key Results */}
                    <KeyResultsTable keyResults={detailedData.keyResults} />

                    {/* 3. Phân tích theo Owner */}
                    <OwnersTable owners={detailedData.owners} />

                    {/* 4. Lịch sử Check-in */}
                    <CheckInsTable checkIns={detailedData.checkIns} objectives={detailedData.objectives} />
                </>
            ) : (
                /* ===================== TRƯỚC KHI TẠO BÁO CÁO - CHỈ HIỂN THỊ THÔNG BÁO ===================== */
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-32 h-32 flex items-center justify-center mb-8 rounded-xl border-2 border-gray-300 bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg"
                            className="w-20 h-20 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">Chưa có báo cáo</h3>
                    <p className="text-slate-600 max-w-md leading-relaxed">
                        Nhấn <strong className="text-blue-600">Tạo báo cáo</strong> để tạo báo cáo chính thức.<br/>
                        Nội dung báo cáo sẽ hiển thị tại đây sau khi hoàn tất.
                    </p>
                </div>
            )}

            {/* Modal Tạo báo cáo */}
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

            {/* Snapshots Modal (lịch sử + chi tiết) */}
            {showSnapshots && (
                <SnapshotHistoryModal
                    isOpen={showSnapshots}
                    onClose={() => { 
                        setShowSnapshots(false);
                        setSelectedSnapshot(null);
                                    setSnapshotPage(1);
                                }}
                    snapshots={snapshots}
                    snapshotLevelFilter={snapshotLevelFilter}
                    onSnapshotLevelChange={setSnapshotLevelFilter}
                    snapshotPage={snapshotPage}
                    snapshotPagination={snapshotPagination}
                    onPageChange={(page) => { setSnapshotPage(page); loadSnapshots(page); }}
                    onLoadSnapshot={(id) => loadSnapshot(id)}
                    selectedSnapshot={selectedSnapshot}
                    onBackToList={() => setSelectedSnapshot(null)}
                    onExportSnapshot={exportSnapshotToExcel}
                />
            )}     
        </div>
    );
}