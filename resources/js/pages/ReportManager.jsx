import React, { useState, useEffect, useMemo } from 'react';
import CheckInHistory from '../components/CheckInHistory';
import PieChart from '../components/PieChart';
import GroupedBarChart from '../components/GroupedBarChart';

export default function ReportManager() {
    const [loading, setLoading] = useState(true);
    const [okrs, setOkrs] = useState([]);
    const [personalOkrs, setPersonalOkrs] = useState([]);
    const [teamOkrs, setTeamOkrs] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [memberProgress, setMemberProgress] = useState([]);
    const [summary, setSummary] = useState({
        total_okrs: 0,
        completed_okrs: 0,
        in_progress_okrs: 0,
        at_risk_okrs: 0,
        not_started_okrs: 0,
        average_progress: 0,
        completion_rate: 0,
    });
    const [department, setDepartment] = useState(null);
    const [cycles, setCycles] = useState([]);
    const [currentCycleMeta, setCurrentCycleMeta] = useState(null);
    
    // Filters
    const [filters, setFilters] = useState({
        cycle_id: '',
        member_id: '',
        status: '',
        objective_id: '',
    });
    
    const [expandedOkrs, setExpandedOkrs] = useState({});
    const [expandedTeamOkrs, setExpandedTeamOkrs] = useState({});
    const [checkInHistory, setCheckInHistory] = useState({ open: false, objectiveId: null, krId: null });
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    
    // Snapshot states
    const [reportsList, setReportsList] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [isSnapshot, setIsSnapshot] = useState(false);
    const [snapshotMetadata, setSnapshotMetadata] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingSnapshot, setCreatingSnapshot] = useState(false);
    const [reportName, setReportName] = useState("");
    const [reportNotes, setReportNotes] = useState("");

    // Load cycles
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/cycles', { headers: { Accept: 'application/json' } });
                const json = await res.json();
                if (json.success || json.data) {
                    const cyclesList = json.data || json;
                    setCycles(Array.isArray(cyclesList) ? cyclesList : []);
                    if (cyclesList.length > 0) {
                        const now = new Date();
                        const parse = (s) => (s ? new Date(s) : null);
                        // Ưu tiên cycle đã kết thúc (báo cáo cuối kỳ)
                        const endedCycles = cyclesList.filter(c => {
                            const end = parse(c.end_date || c.endDate);
                            return end && end < now;
                        }).sort((a, b) => {
                            const endA = parse(a.end_date || a.endDate);
                            const endB = parse(b.end_date || b.endDate);
                            return endB - endA; // Mới nhất trước
                        });
                        
                        const selected = endedCycles.length > 0 ? endedCycles[0] : cyclesList[0];
                        setFilters(f => ({ ...f, cycle_id: selected.cycle_id || selected.cycleId }));
                        setCurrentCycleMeta({
                            id: selected.cycle_id || selected.cycleId,
                            name: selected.cycle_name || selected.cycleName,
                            start: selected.start_date || selected.startDate,
                            end: selected.end_date || selected.endDate,
                        });
                    }
                }
            } catch (e) {
                console.error('Error loading cycles:', e);
            }
        })();
    }, []);

    // Keep current cycle label in sync when user changes dropdown
    useEffect(() => {
        if (!filters.cycle_id || !Array.isArray(cycles) || cycles.length === 0) return;
        const c = cycles.find(x => String(x.cycle_id || x.cycleId) === String(filters.cycle_id));
        if (c) {
            setCurrentCycleMeta({
                id: c.cycle_id || c.cycleId,
                name: c.cycle_name || c.cycleName,
                start: c.start_date || c.startDate,
                end: c.end_date || c.endDate,
            });
        }
    }, [filters.cycle_id, cycles]);

    // Load OKR data
    const loadOkrs = async (reportId = null) => {
        setLoading(true);
        setError('');
        try {
            let json;
            
            if (reportId) {
                // Load từ snapshot
                const snapshotRes = await fetch(`/api/reports/snapshots/${reportId}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'include',
                });
                const snapshotData = await snapshotRes.json();
                
                if (snapshotData.success) {
                    json = snapshotData.data.snapshot_data;
                    setIsSnapshot(true);
                    setSnapshotMetadata({
                        report_name: snapshotData.data.report_name,
                        created_at: snapshotData.data.created_at_formatted,
                        creator: snapshotData.data.creator,
                        notes: snapshotData.data.notes,
                        cycle_id: snapshotData.data.cycle?.cycle_id,
                        cycle_name: snapshotData.data.cycle?.cycle_name,
                    });
                    
                    // Tự động cập nhật cycle selector về cycle của snapshot
                    if (snapshotData.data.cycle?.cycle_id && String(snapshotData.data.cycle.cycle_id) !== String(filters.cycle_id)) {
                        setFilters(f => ({ ...f, cycle_id: String(snapshotData.data.cycle.cycle_id) }));
                        setCurrentCycleMeta({
                            id: snapshotData.data.cycle.cycle_id,
                            name: snapshotData.data.cycle.cycle_name,
                        });
                    }
                } else {
                    throw new Error(snapshotData.message || "Không thể tải snapshot");
                }
            } else {
                // Load real-time
                const params = new URLSearchParams();
                if (filters.cycle_id) {
                    params.set('cycle_id', filters.cycle_id);
                }
                if (filters.member_id) params.set('member_id', filters.member_id);
                if (filters.status) params.set('status', filters.status);
                if (filters.objective_id) params.set('objective_id', filters.objective_id);

                const res = await fetch(`/api/reports/manager/team-okrs?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'include',
                });
                
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
                    throw new Error(errorData.message || `Lỗi ${res.status}: ${res.statusText}`);
                }
                
                json = await res.json();
                setIsSnapshot(false);
                setSnapshotMetadata(null);
            }

            if (!json.success) {
                throw new Error(json.message || 'Không thể tải dữ liệu OKR');
            }

            setOkrs(json.data?.okrs || []);
            setPersonalOkrs(json.data?.personal_okrs || []);
            setTeamOkrs(json.data?.team_okrs || []);
            setTeamMembers(json.data?.team_members || []);
            setMemberProgress(json.data?.member_progress || []);
            setSummary(json.data?.summary || {
                total_okrs: 0,
                completed_okrs: 0,
                in_progress_okrs: 0,
                at_risk_okrs: 0,
                not_started_okrs: 0,
                average_progress: 0,
                completion_rate: 0,
            });
            setDepartment(json.data?.department || null);
        } catch (e) {
            const errorMsg = e.message || 'Có lỗi xảy ra khi tải dữ liệu';
            setError(errorMsg);
            console.error('Error loading OKRs:', e);
        } finally {
            setLoading(false);
        }
    };

    // Load danh sách báo cáo đã tạo (timeline)
    const loadReportsList = async () => {
        try {
            const res = await fetch(`/api/reports/snapshots/list?report_type=manager&cycle_id=${filters.cycle_id || ''}`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            const data = await res.json();
            if (data.success) {
                setReportsList(data.data || []);
            }
        } catch (e) {
            console.error("Error loading reports list:", e);
        }
    };

    // Tạo snapshot báo cáo
    const createSnapshot = async () => {
        if (!filters.cycle_id) {
            setError("Vui lòng chọn chu kỳ trước khi tạo báo cáo");
            return;
        }
        
        setCreatingSnapshot(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
            const res = await fetch("/api/reports/snapshots/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": token,
                },
                credentials: "include",
                body: JSON.stringify({
                    report_type: "manager",
                    cycle_id: parseInt(filters.cycle_id),
                    department_id: department?.department_id,
                    report_name: reportName || `Báo cáo phòng ban - ${new Date().toLocaleString('vi-VN')}`,
                    notes: reportNotes,
                    member_id: filters.member_id || null,
                    status: filters.status || null,
                    objective_id: filters.objective_id || null,
                }),
            });
            
            const data = await res.json();
            if (data.success) {
                // Hiển thị thông báo thành công
                alert("✅ Đã tạo snapshot báo cáo thành công!");
                setShowCreateModal(false);
                setReportName("");
                setReportNotes("");
                setError(""); // Clear error
                await loadReportsList();
                if (data.data?.report_id) {
                    setSelectedReportId(data.data.report_id);
                    await loadOkrs(data.data.report_id);
                }
            } else {
                const errorMsg = data.message || "Không thể tạo snapshot";
                setError(errorMsg);
                alert("❌ Lỗi: " + errorMsg);
                console.error("Snapshot creation failed:", data);
            }
        } catch (e) {
            console.error("Error creating snapshot:", e);
            const errorMsg = "Lỗi khi tạo snapshot báo cáo: " + (e.message || "Lỗi không xác định");
            setError(errorMsg);
            alert("❌ " + errorMsg);
        } finally {
            setCreatingSnapshot(false);
        }
    };

    useEffect(() => {
        // Reset snapshot khi cycle thay đổi (người dùng chọn cycle khác)
        if (filters.cycle_id) {
            // Nếu đang xem snapshot của cycle khác, reset về real-time
            if (selectedReportId && isSnapshot && snapshotMetadata) {
                const snapshotCycleId = snapshotMetadata.cycle_id;
                if (snapshotCycleId && String(snapshotCycleId) !== String(filters.cycle_id)) {
                    setSelectedReportId(null);
                    setIsSnapshot(false);
                    setSnapshotMetadata(null);
                }
            }
            loadOkrs();
        }
        loadReportsList();
    }, [filters.cycle_id, filters.member_id, filters.status, filters.objective_id]);

    // Báo cáo cuối kỳ - không auto-refresh

    const toggleOkrExpand = (objectiveId) => {
        setExpandedOkrs(prev => ({
            ...prev,
            [objectiveId]: !prev[objectiveId],
        }));
    };

    const toggleTeamOkrExpand = (objectiveId) => {
        setExpandedTeamOkrs(prev => ({
            ...prev,
            [objectiveId]: !prev[objectiveId],
        }));
    };

    const openCheckInHistory = (objectiveId, krId) => {
        setCheckInHistory({ open: true, objectiveId, krId });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
            in_progress: { label: 'Đang tiến hành', color: 'bg-blue-100 text-blue-700' },
            at_risk: { label: 'Có rủi ro', color: 'bg-amber-100 text-amber-700' },
            not_started: { label: 'Chưa bắt đầu', color: 'bg-slate-100 text-slate-700' },
        };
        const statusInfo = statusMap[status] || statusMap.not_started;
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
            </span>
        );
    };

    const getProgressColor = (progress) => {
        if (progress >= 100) return 'bg-emerald-500';
        if (progress >= 70) return 'bg-blue-500';
        if (progress >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (filters.cycle_id) params.set('cycle_id', filters.cycle_id);
            if (filters.member_id) params.set('member_id', filters.member_id);
            if (filters.status) params.set('status', filters.status);
            if (filters.objective_id) params.set('objective_id', filters.objective_id);
            
            const url = `/api/reports/manager/export.pdf?${params.toString()}`;
            
            // Download PDF file first
            const response = await fetch(url);
            
            // Check if response is JSON (error response)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Export failed');
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Export failed: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // Check if blob is actually PDF
            if (blob.type && !blob.type.includes('pdf') && !blob.type.includes('html')) {
                // Might be JSON error
                const text = await blob.text();
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.message || errorData.error || 'Export failed');
                } catch (e) {
                    // Not JSON, continue with download
                }
            }
            
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            const fileName = `bao_cao_phong_ban_${currentCycleMeta?.name || new Date().toISOString().split('T')[0]}.pdf`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (e) {
            console.error('Export failed:', e);
            alert('Xuất báo cáo thất bại: ' + (e.message || 'Lỗi không xác định'));
        } finally {
            setExporting(false);
        }
    };

    // Chart data
    const pieData = useMemo(() => {
        return [
            { label: 'Hoàn thành', value: summary.completed_okrs || 0, color: '#22c55e' },
            { label: 'Đang tiến hành', value: summary.in_progress_okrs || 0, color: '#3b82f6' },
            { label: 'Có rủi ro', value: summary.at_risk_okrs || 0, color: '#f59e0b' },
            { label: 'Chưa bắt đầu', value: summary.not_started_okrs || 0, color: '#94a3b8' },
        ];
    }, [summary]);

    const memberChartData = useMemo(() => {
        if (!memberProgress || memberProgress.length === 0) {
            return {
                categories: [],
                series: [
                    { name: 'Tiến độ trung bình', color: '#3b82f6', data: [] },
                ],
            };
        }
        return {
            categories: memberProgress.map(m => m.full_name),
            series: [
                { name: 'Tiến độ trung bình', color: '#3b82f6', data: memberProgress.map(m => m.average_progress || 0) },
            ],
        };
    }, [memberProgress]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-8">
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo phòng ban</h1>
                    {isSnapshot && snapshotMetadata && (
                        <div className="mt-2 text-sm text-slate-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                📸 Snapshot
                            </span>
                            <span>Tạo bởi: <strong>{snapshotMetadata.creator.full_name}</strong> • {snapshotMetadata.created_at}</span>
                            {snapshotMetadata.report_name && (
                                <span className="ml-2">• {snapshotMetadata.report_name}</span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tạo báo cáo
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {exporting ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xuất...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Xuất PDF
                            </>
                        )}
                    </button>
                    <div className="relative inline-block">
                        <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm13 9H4v7a1 1 0 001 1h14a1 1 0 001-1v-7zM6 6h12V5H6v1z" />
                        </svg>
                        <select
                            value={filters.cycle_id ?? ''}
                            onChange={(e) => setFilters(f => ({...f, cycle_id: e.target.value}))}
                            className="w-56 appearance-none rounded-lg bg-white py-2 pl-10 pr-9 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                            {cycles.map(c => (
                                <option key={c.cycle_id || c.cycleId} value={c.cycle_id || c.cycleId}>
                                    {c.cycle_name || c.cycleName}
                                </option>
                            ))}
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Timeline các báo cáo đã tạo */}
            {reportsList.length > 0 && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline báo cáo đã tạo:</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        <button
                            onClick={() => {
                                setSelectedReportId(null);
                                loadOkrs();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                !selectedReportId
                                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">📊 Xem dữ liệu hiện tại (real-time)</span>
                                <span className="text-xs text-slate-500">Live</span>
                            </div>
                        </button>
                        {reportsList.map((report) => (
                            <button
                                key={report.report_id}
                                onClick={() => {
                                    setSelectedReportId(report.report_id);
                                    loadOkrs(report.report_id);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    selectedReportId === report.report_id
                                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{report.report_name || 'Báo cáo không tên'}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {report.creator.full_name} • {report.created_at_formatted}
                                            {report.cycle && (
                                                <span className="ml-1">• {report.cycle.cycle_name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">📸</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {currentCycleMeta && (
                <div className="mb-6 flex items-center gap-4 text-sm">
                    <div className="text-slate-600">
                        Chu kỳ: <span className="font-semibold text-slate-800">{currentCycleMeta.name}</span>
                    </div>
                    {(() => {
                        const endDate = currentCycleMeta.end ? new Date(currentCycleMeta.end) : null;
                        const now = new Date();
                        const isEnded = endDate && endDate < now;
                        return isEnded ? (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                Đã kết thúc
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                Đang diễn ra
                            </span>
                        );
                    })()}
                    {department && (
                        <div className="text-slate-600">
                            Phòng ban: <span className="font-semibold text-slate-800">{department.department_name}</span>
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Đang tải báo cáo...</div>
            )}
            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {!loading && !error && (
                <>
                    {/* KPI cards */}
                    <div className="grid gap-6 md:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tổng số OKR</div>
                            <div className="mt-2 text-4xl font-extrabold text-slate-900">{summary.total_okrs}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tiến độ trung bình</div>
                            <div className="mt-2 text-4xl font-extrabold text-slate-900">{summary.average_progress.toFixed(1)}%</div>
                            <div className="mt-1 text-xs text-slate-500">Tất cả OKR (cá nhân + nhóm)</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-emerald-600">Hoàn thành</div>
                            <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.completed_okrs}
                                <span className="ml-2 text-base text-slate-500">({summary.completion_rate.toFixed(1)}%)</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-blue-600">Đang tiến hành</div>
                            <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.in_progress_okrs}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-amber-600">Có rủi ro</div>
                            <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary.at_risk_okrs}</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Phân bổ trạng thái OKR</h3>
                                <PieChart data={pieData} />
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Tiến độ trung bình theo thành viên</h3>
                                {memberChartData.categories.length > 0 ? (
                                    <GroupedBarChart
                                        categories={memberChartData.categories}
                                        series={memberChartData.series}
                                        label="Tiến độ trung bình"
                                    />
                                ) : (
                                    <div className="text-center py-8 text-slate-500">Chưa có dữ liệu</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* OKR cấp nhóm (Team OKR) */}
                    {teamOkrs.length > 0 && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">
                                OKR cấp nhóm (Team OKR)
                            </div>
                            <div className="p-6 space-y-4">
                                {teamOkrs.map((okr) => (
                                    <div key={okr.objective_id} className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200 p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-bold text-slate-900">{okr.objective_title}</h3>
                                                        {getStatusBadge(okr.overall_status)}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-600">
                                                        <span>{okr.cycle_name}</span>
                                                        <span>•</span>
                                                        <span>Tiến độ: <strong>{okr.overall_progress.toFixed(1)}%</strong></span>
                                                    </div>
                                                    {okr.objective_description && (
                                                        <p className="mt-2 text-sm text-slate-600">{okr.objective_description}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleTeamOkrExpand(okr.objective_id)}
                                                    className="ml-4 p-2 rounded-lg hover:bg-white/50 transition-colors"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`h-5 w-5 text-slate-600 transition-transform ${expandedTeamOkrs[okr.objective_id] ? 'rotate-180' : ''}`}
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="mt-3">
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${getProgressColor(okr.overall_progress)}`}
                                                        style={{ width: `${Math.min(okr.overall_progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        {expandedTeamOkrs[okr.objective_id] && (
                                            <div className="p-4">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                                    Key Results ({okr.key_results?.length || 0})
                                                </h4>
                                                <div className="space-y-3">
                                                    {okr.key_results?.map((kr) => (
                                                        <div key={kr.kr_id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex-1">
                                                                    <h5 className="font-semibold text-slate-900">{kr.kr_title}</h5>
                                                                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
                                                                        <span>Thực tế: <strong>{kr.current_value}</strong></span>
                                                                        <span>Mục tiêu: <strong>{kr.target_value}</strong></span>
                                                                        <span>Đơn vị: {kr.unit}</span>
                                                                        {kr.assignee && (
                                                                            <span>Người thực hiện: {kr.assignee.full_name}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="ml-4 text-right">
                                                                    <div className="text-lg font-bold text-slate-900">
                                                                        {kr.progress_percent.toFixed(1)}%
                                                                    </div>
                                                                    <button
                                                                        onClick={() => openCheckInHistory(okr.objective_id, kr.kr_id)}
                                                                        className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                                                                    >
                                                                        Xem lịch sử
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2">
                                                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                                    <div
                                                                        className={`h-1.5 rounded-full transition-all ${getProgressColor(kr.progress_percent)}`}
                                                                        style={{ width: `${Math.min(kr.progress_percent, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Danh sách thành viên với tỷ lệ hoàn thành */}
                    {memberProgress.length > 0 && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">
                                Tiến độ hoàn thành theo thành viên
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-6 py-3">Thành viên</th>
                                            <th className="px-6 py-3">Số OKR</th>
                                            <th className="px-6 py-3">Tiến độ trung bình</th>
                                            <th className="px-6 py-3">Hoàn thành</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {memberProgress.map((member, i) => (
                                            <tr key={member.user_id || i} className="border-t border-slate-100">
                                                <td className="px-6 py-3">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{member.full_name}</div>
                                                        {member.job_title && (
                                                            <div className="text-xs text-slate-500">{member.job_title}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">{member.total_okrs || 0}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{member.average_progress.toFixed(1)}%</span>
                                                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                                                            <div
                                                                className={`h-2 rounded-full ${getProgressColor(member.average_progress)}`}
                                                                style={{ width: `${Math.min(member.average_progress, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">{member.completed_okrs || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* OKR cá nhân */}
                    {personalOkrs.length > 0 && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm font-semibold text-slate-700">
                                    OKR cá nhân ({personalOkrs.length})
                                </div>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={filters.member_id}
                                        onChange={(e) => setFilters(f => ({ ...f, member_id: e.target.value }))}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Tất cả thành viên</option>
                                        {teamMembers.map(m => (
                                            <option key={m.user_id} value={m.user_id}>
                                                {m.full_name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Tất cả trạng thái</option>
                                        <option value="completed">Hoàn thành</option>
                                        <option value="in_progress">Đang tiến hành</option>
                                        <option value="at_risk">Có rủi ro</option>
                                        <option value="not_started">Chưa bắt đầu</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {personalOkrs.map((okr) => (
                                    <div key={okr.objective_id} className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-200 p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-bold text-slate-900">{okr.objective_title}</h3>
                                                        {getStatusBadge(okr.overall_status)}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-600">
                                                        <span className="font-semibold">{okr.member_name}</span>
                                                        <span>•</span>
                                                        <span>{okr.cycle_name}</span>
                                                        <span>•</span>
                                                        <span>Tiến độ: <strong>{okr.overall_progress.toFixed(1)}%</strong></span>
                                                    </div>
                                                    {okr.objective_description && (
                                                        <p className="mt-2 text-sm text-slate-600">{okr.objective_description}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleOkrExpand(okr.objective_id)}
                                                    className="ml-4 p-2 rounded-lg hover:bg-white/50 transition-colors"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`h-5 w-5 text-slate-600 transition-transform ${expandedOkrs[okr.objective_id] ? 'rotate-180' : ''}`}
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="mt-3">
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${getProgressColor(okr.overall_progress)}`}
                                                        style={{ width: `${Math.min(okr.overall_progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        {expandedOkrs[okr.objective_id] && (
                                            <div className="p-4">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                                    Key Results ({okr.key_results?.length || 0})
                                                </h4>
                                                <div className="space-y-3">
                                                    {okr.key_results?.map((kr) => (
                                                        <div key={kr.kr_id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex-1">
                                                                    <h5 className="font-semibold text-slate-900">{kr.kr_title}</h5>
                                                                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
                                                                        <span>Thực tế: <strong>{kr.current_value}</strong></span>
                                                                        <span>Mục tiêu: <strong>{kr.target_value}</strong></span>
                                                                        <span>Đơn vị: {kr.unit}</span>
                                                                        {kr.assignee && (
                                                                            <span>Người thực hiện: {kr.assignee.full_name}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="ml-4 text-right">
                                                                    <div className="text-lg font-bold text-slate-900">
                                                                        {kr.progress_percent.toFixed(1)}%
                                                                    </div>
                                                                    <button
                                                                        onClick={() => openCheckInHistory(okr.objective_id, kr.kr_id)}
                                                                        className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                                                                    >
                                                                        Xem lịch sử
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2">
                                                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                                    <div
                                                                        className={`h-1.5 rounded-full transition-all ${getProgressColor(kr.progress_percent)}`}
                                                                        style={{ width: `${Math.min(kr.progress_percent, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {okrs.length === 0 && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                            Chưa có OKR nào phù hợp với bộ lọc.
                        </div>
                    )}
                </>
            )}

            {/* Check-in History Modal */}
            {checkInHistory.open && (
                <CheckInHistory
                    open={checkInHistory.open}
                    onClose={() => setCheckInHistory({ open: false, objectiveId: null, krId: null })}
                    objectiveId={checkInHistory.objectiveId}
                    krId={checkInHistory.krId}
                    isManagerView={true}
                    keyResult={[...teamOkrs, ...personalOkrs].find(o => o.objective_id === checkInHistory.objectiveId)?.key_results?.find(kr => kr.kr_id === checkInHistory.krId)}
                />
            )}

            {/* Modal tạo báo cáo */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Tạo snapshot báo cáo</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Tên báo cáo (tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    value={reportName}
                                    onChange={(e) => setReportName(e.target.value)}
                                    placeholder="Báo cáo phòng ban - Q1 2024"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Ghi chú (tùy chọn)
                                </label>
                                <textarea
                                    value={reportNotes}
                                    onChange={(e) => setReportNotes(e.target.value)}
                                    placeholder="Thêm ghi chú cho báo cáo này..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                                <strong>Lưu ý:</strong> Báo cáo sẽ lưu snapshot dữ liệu tại thời điểm hiện tại. 
                                Dữ liệu sau này có thể thay đổi nhưng snapshot này sẽ giữ nguyên.
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setReportName("");
                                    setReportNotes("");
                                }}
                                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={createSnapshot}
                                disabled={creatingSnapshot}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creatingSnapshot ? "Đang tạo..." : "Tạo báo cáo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
