import React, { useEffect, useMemo, useState } from 'react';
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';
import GroupedBarChart from '../components/GroupedBarChart';

function StatCard({ title, value, suffix = '%', hint }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-500">{title}</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}{suffix}</div>
            {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
    );
}

export default function CompanyOverviewReport() {
    const [cycles, setCycles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [owners, setOwners] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [level, setLevel] = useState('departments'); // company | departments | teams
    const [teamsParentId, setTeamsParentId] = useState('');
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);

    const [filters, setFilters] = useState({
        cycleId: '',
        departmentId: '',
        status: '',
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

    const TrendIcon = ({ delta }) => {
        if (delta === null || delta === undefined) return <span className="text-slate-400">—</span>;
        const up = delta > 0; const down = delta < 0;
        const color = up ? 'text-emerald-600' : (down ? 'text-red-600' : 'text-slate-500');
        return (
            <span className={`inline-flex items-center gap-1 ${color}`} title={`${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`}>
                {up && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12l5-5 4 4 5-5v8H3z"/></svg>
                )}
                {down && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17 8l-5 5-4-4-5 5V6h14z"/></svg>
                )}
                {!up && !down && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 10h12v2H4z"/></svg>
                )}
                <span>{Math.abs(delta).toFixed(2)}%</span>
            </span>
        );
    };

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
                if (filters.status) params.set('status', filters.status);
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
                const res = await fetch(url, { headers: { Accept: 'application/json' } });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Load report failed');
                setReport(json.data);
            } catch (e) {
                setError(e.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        })();
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId]);

    useEffect(() => {
        if (!filters.cycleId) return;
        const timer = setInterval(() => {
            const params = new URLSearchParams();
            if (filters.cycleId) params.set('cycle_id', filters.cycleId);
            if (filters.departmentId) params.set('department_id', filters.departmentId);
            if (filters.status) params.set('status', filters.status);
            if (filters.ownerId) params.set('owner_id', filters.ownerId);
            const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
            fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-store' }})
                .then(r => r.json().then(j => ({ ok: r.ok, j })))
                .then(({ ok, j }) => { if (ok && j.success) setReport(j.data); })
                .catch(() => {});
        }, 60000); 
        return () => clearInterval(timer);
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId]);

    const pieData = useMemo(() => {
        const counts = report?.overall?.statusCounts || {};
        return [
            { label: 'On track', value: counts.onTrack || 0, color: '#22c55e' },
            { label: 'At risk', value: counts.atRisk || 0, color: '#f59e0b' },
            { label: 'Off track', value: counts.offTrack || 0, color: '#ef4444' },
        ];
    }, [report]);

    const groupedChartData = useMemo(() => {
        if (level === 'company') {
            const ov = report?.overall || { statusCounts: {} };
            return {
                categories: ['Công ty'],
                series: [
                    { name: 'On Track', color: '#22c55e', data: [ov.statusCounts?.onTrack || 0] },
                    { name: 'At Risk', color: '#f59e0b', data: [ov.statusCounts?.atRisk || 0] },
                    { name: 'Off Track', color: '#ef4444', data: [ov.statusCounts?.offTrack || 0] },
                ],
            };
        }
        if (level === 'departments') {
            const list = (report.departmentsHierarchy || report.departments || [])
              .filter(d => d.departmentId && (d.departmentName || '').toLowerCase() !== 'công ty');
            return {
                categories: list.map(d => d.departmentName),
                series: [
                    { name: 'On Track', color: '#22c55e', data: list.map(d => d.onTrack || 0) },
                    { name: 'At Risk', color: '#f59e0b', data: list.map(d => d.atRisk || 0) },
                    { name: 'Off Track', color: '#ef4444', data: list.map(d => d.offTrack || 0) },
                ],
            };
        }
        const list = [];
        (report.departmentsHierarchy || []).forEach(d => {
            (d.children || []).forEach(t => {
                if (!teamsParentId || String(teamsParentId) === String(d.departmentId)) {
                    list.push(t);
                }
            });
        });
        return {
            categories: list.map(t => t.departmentName),
            series: [
                { name: 'On Track', color: '#22c55e', data: list.map(t => t.onTrack || 0) },
                { name: 'At Risk', color: '#f59e0b', data: list.map(t => t.atRisk || 0) },
                { name: 'Off Track', color: '#ef4444', data: list.map(t => t.offTrack || 0) },
            ],
        };
    }, [report, level, teamsParentId]);

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

    const resetFilters = () => {
        setFilters(f => ({
            ...f,
            cycleId: currentCycleMeta?.id || f.cycleId,
            departmentId: '',
            status: '',
        }));
    };

    const createSnapshot = async () => {
        if (!filters.cycleId) {
            alert('Vui lòng chọn chu kỳ trước khi chốt sổ');
            return;
        }

        setIsCreatingSnapshot(true);
        try {
            const snapshotTitle = `Báo cáo OKR: ${currentCycleMeta?.name || 'Chu kỳ'}`;

            // Chuẩn hóa dữ liệu trước khi lưu
            const cleanSnapshotData = {
                // Tổng quan
                overall: report.overall,

                // Ưu tiên dùng departmentsHierarchy (cấu trúc cây mới), nếu không có thì dùng mảng cũ
                departments: report.departmentsHierarchy?.length > 0 
                    ? report.departmentsHierarchy 
                    : (report.departments || []),

                // Các phần khác
                trend: report.trend || [],
                risks: report.risks || [],

                // Nếu bạn có thêm dữ liệu nào khác cần lưu thì thêm vào đây
                // (không cần lưu toàn bộ report để tránh rác và trùng lặp)
            };

            const response = await fetch('/api/reports/snapshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    cycle_id: filters.cycleId,
                    title: snapshotTitle,
                    data_snapshot: cleanSnapshotData, // Gửi dữ liệu đã được làm sạch
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Không thể tạo snapshot');
            }

            alert('Đã chốt sổ báo cáo thành công!');
            loadSnapshots(); // Tải lại danh sách snapshot
        } catch (error) {
            console.error('Lỗi khi chốt sổ:', error);
            alert('Lỗi: ' + (error.message || 'Đã có lỗi xảy ra'));
        } finally {
            setIsCreatingSnapshot(false);
        }
    };

    const loadSnapshots = async () => {
        try {
            const cycleId = filters.cycleId ? `?cycle_id=${filters.cycleId}` : '';
            const response = await fetch(`/api/reports/snapshots${cycleId}`, {
                headers: { Accept: 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                setSnapshots(data.data.data || []);
            }
        } catch (error) {
            console.error('Lỗi khi tải snapshots:', error);
        }
    };

    const loadSnapshot = async (snapshotId) => {
        try {
            const response = await fetch(`/api/reports/snapshots/${snapshotId}`, {
                headers: { Accept: 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedSnapshot(data.data);
            }
        } catch (error) {
            console.error('Lỗi khi tải snapshot:', error);
        }
    };

    const handleViewSnapshots = () => {
        setShowSnapshots(!showSnapshots);
        if (!showSnapshots) {
            loadSnapshots();
        }
    };

    // State for export menu
    const [exportMenuOpen, setExportMenuOpen] = useState(false);



    const generateExecutiveSummary = () => {
        const total = report.overall?.totalObjectives || 0;
        const avgProgress = report.overall?.averageProgress ?? 0;
        const onTrackCount = report.overall?.statusCounts?.onTrack || 0;
        const atRiskCount = report.overall?.statusCounts?.atRisk || 0;
        const offTrackCount = report.overall?.statusCounts?.offTrack || 0;
        const risks = report.risks?.filter(r => r.status === 'at_risk' || r.status === 'off_track') || [];

        let summary = `📊 ${currentCycleMeta?.name || 'Báo cáo'}: `;
        
        if (avgProgress >= 80) {
            summary += `Tiến độ tốt ${avgProgress.toFixed(1)}% `;
        } else if (avgProgress >= 50) {
            summary += `Tiến độ trung bình ${avgProgress.toFixed(1)}% `;
        } else {
            summary += `Tiến độ thấp ${avgProgress.toFixed(1)}% `;
        }

        summary += `(${onTrackCount}/${total} đúng kế hoạch). `;

        if (offTrackCount > 0) {
            summary += `⚠️ ${offTrackCount} OKR đang OFF TRACK. `;
        }
        if (atRiskCount > 0) {
            summary += `🔶 ${atRiskCount} OKR có rủi ro. `;
        }

        if (risks.length > 0) {
            const topRisk = risks[0];
            summary += `Cần chú ý ngay: "${topRisk.objective_title || 'N/A'}" chỉ ${topRisk.progress?.toFixed(0)}% hoàn thành.`;
        }

        return summary;
    };

    return (
        <div className="px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo tổng quan</h1>
                    {currentCycleMeta && (
                        <p className="text-base font-semibold text-slate-800 mt-1">
                            Chu kỳ: {currentCycleMeta.name}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={createSnapshot} disabled={isCreatingSnapshot}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isCreatingSnapshot ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Đang chốt...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.5 1.5H19a2 2 0 012 2v14a2 2 0 01-2 2H1a2 2 0 01-2-2V3.5a2 2 0 012-2h8.5m0 0a2 2 0 012 2v2a2 2 0 11-4 0v-2a2 2 0 012-2z" /></svg>
                                Chốt sổ báo cáo
                            </>
                        )}
                    </button>

                    <button onClick={handleViewSnapshots} className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        Xem chốt sổ ({snapshots.length})
                    </button>

                    {/* NÚT XUẤT FILE - GIỐNG HỆT HÌNH BẠN GỬI */}
                    <div className="relative">
                    <button
                        onClick={() => setExportMenuOpen(prev => !prev)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Xuất báo cáo"
                    >
                        <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-slate-500"
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

                    {/* Dropdown Menu - giống hệt ảnh: icon màu xám + file icons chuẩn */}
                    {exportMenuOpen && (
                        <>
                        <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />

                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                            <div className="py-1">

                            {/* Xuất sang PDF */}
                            <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition border-t border-slate-100">
                                <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                <span className="text-sm font-medium text-slate-700">Xuất sang PDF</span>
                            </button>

                            {/* Xuất sang XLS */}
                            <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition border-t border-slate-100">
                                <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <path d="M9 13h6v6H9z"/>
                                <path d="M12 10v9"/>
                                </svg>
                                <span className="text-sm font-medium text-slate-700">Xuất sang XLS</span>
                            </button>

                            </div>
                        </div>
                        </>
                    )}
                    </div>
                    
                    <div className="relative inline-block">
                        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm13 9H4v7a1 1 0 001 1h14a1 1 0 001-1v-7zM6 6h12V5H6v1z"/>
                        </svg>
                        <select
                            value={filters.cycleId ?? ''}
                            onChange={(e) => setFilters(f => ({...f, cycleId: e.target.value}))}
                            className="w-44 pl-10 pr-10 py-3 text-sm font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent appearance-none cursor-pointer hover:bg-slate-50 transition"
                        >
                            {cycles.map(c => (
                                <option key={c.cycle_id || c.cycleId} value={c.cycle_id || c.cycleId}>
                                    {c.cycle_name || c.cycleName}
                                </option>
                            ))}
                        </select>
                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                        </svg>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Đang tải báo cáo...</div>
            )}
            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {!loading && !error && (
                <>
                    {/* Executive Summary */}
                    <div className="mb-8 p-5 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
                        <p className="text-sm font-semibold text-slate-900 leading-relaxed">{generateExecutiveSummary()}</p>
                    </div>

                    {/* Improved Filter Section */}
                    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-700">Lọc theo:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['on_track', 'at_risk', 'off_track'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilters(f => ({ ...f, status: f.status === status ? '' : status }))}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                                            filters.status === status
                                                ? status === 'on_track' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' 
                                                : status === 'at_risk' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                                                : 'bg-red-100 text-red-700 ring-2 ring-red-300'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {status === 'on_track' && '✓ On Track'}
                                        {status === 'at_risk' && '⚠ At Risk'}
                                        {status === 'off_track' && '✕ Off Track'}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={resetFilters}
                                className="ml-auto px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                ↺ Reset
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tổng số OKR</div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <div className="text-4xl font-extrabold text-slate-900">{report.overall.totalObjectives}</div>
                                {report.overall.totalObjectivesDelta && <TrendIcon delta={report.overall.totalObjectivesDelta} />}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tiến độ trung bình</div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <div className="text-4xl font-extrabold text-slate-900">{report.overall.averageProgress?.toFixed?.(2) ?? report.overall.averageProgress}%</div>
                                {report.overall.averageProgressDelta && <TrendIcon delta={report.overall.averageProgressDelta} />}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-emerald-600">On Track</div>
                            <div className="mt-2 text-3xl font-extrabold text-slate-900">{report.overall.statusCounts?.onTrack || 0}
                                <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.onTrack || 0}%)</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-amber-600">At Risk</div>
                            <div className="mt-2 text-3xl font-extrabold text-slate-900">{report.overall.statusCounts?.atRisk || 0}
                                <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.atRisk || 0}%)</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-red-600">Off Track</div>
                            <div className="mt-2 text-3xl font-extrabold text-slate-900">{report.overall.statusCounts?.offTrack || 0}
                                <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.offTrack || 0}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="mt-6 space-y-6">
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-semibold text-slate-700">
                                    <button onClick={() => setLevel('company')} className={`px-3 py-1.5 rounded-md ${level==='company'?'bg-slate-100':''}`}>Công ty</button>
                                    <button onClick={() => setLevel('departments')} className={`px-3 py-1.5 rounded-md ${level==='departments'?'bg-slate-100':''}`}>Phòng ban</button>
                                    <button onClick={() => setLevel('teams')} className={`px-3 py-1.5 rounded-md ${level==='teams'?'bg-slate-100':''}`}>Đội nhóm</button>
                                </div>
                                {level==='teams' && (
                                    <select value={teamsParentId} onChange={e=>setTeamsParentId(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                                        <option value="">Tất cả phòng ban</option>
                                        {(report.departmentsHierarchy||[])
                                            .filter(d => d.departmentId && (d.departmentName||'').toLowerCase() !== 'công ty')
                                            .map(d=> (
                                                <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                                            ))}
                                    </select>
                                )}
                            </div>
                            <GroupedBarChart
                                categories={groupedChartData.categories}
                                series={groupedChartData.series}
                                label={`Phân bổ trạng thái theo ${level==='company'?'công ty':(level==='departments'?'phòng ban':'đội nhóm')}`}
                            />
                        </div>
                    </div>

                    {/* Detail table by level */}
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">{level==='company'?'Chi tiết công ty':(level==='departments'?'Chi tiết theo phòng ban':'Chi tiết theo đội nhóm')}</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-6 py-3">{level==='teams'?'Đội nhóm':(level==='company'?'Công ty':'Phòng ban')}</th>
                                        <th className="px-6 py-3">Số OKR</th>
                                        <th className="px-6 py-3">Tiến độ TB</th>
                                        <th className="px-6 py-3">On Track</th>
                                        <th className="px-6 py-3">At Risk</th>
                                        <th className="px-6 py-3">Off Track</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(level==='company' ? [
                                        {
                                            departmentName: 'Công ty',
                                            count: report.overall?.totalObjectives || 0,
                                            averageProgress: report.overall?.averageProgress || 0,
                                            onTrack: report.overall?.statusCounts?.onTrack || 0,
                                            atRisk: report.overall?.statusCounts?.atRisk || 0,
                                            offTrack: report.overall?.statusCounts?.offTrack || 0,
                                            onTrackPct: report.overall?.statusDistribution?.onTrack || 0,
                                            atRiskPct: report.overall?.statusDistribution?.atRisk || 0,
                                            offTrackPct: report.overall?.statusDistribution?.offTrack || 0,
                                        }
                                    ] : level==='departments' ? (report.departmentsHierarchy || report.departments || [])
                                      : (()=>{
                                          const arr = [];
                                          (report.departmentsHierarchy||[]).forEach(d=>{
                                              (d.children||[]).forEach(t=>{
                                                  if (!teamsParentId || String(teamsParentId)===String(d.departmentId)) arr.push(t);
                                              });
                                          });
                                          return arr;
                                      })()
                                    ).filter(d => {
                                        if (level === 'departments') {
                                            return d.departmentId && (d.departmentName || '').toLowerCase() !== 'công ty';
                                        }
                                        if (level === 'teams') return true;
                                        return true;
                                    }).map((d,i)=> (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-6 py-3">{d.departmentName || 'N/A'}</td>
                                            <td className="px-6 py-3">{d.count}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 max-w-xs bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full ${
                                                                d.averageProgress >= 80 ? 'bg-emerald-500' : 
                                                                d.averageProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${Math.min(d.averageProgress ?? 0, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-semibold whitespace-nowrap">{(d.averageProgress ?? 0).toFixed(2)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">{d.onTrack} ({d.onTrackPct}%)</td>
                                            <td className="px-6 py-3">{d.atRisk} ({d.atRiskPct}%)</td>
                                            <td className="px-6 py-3">{d.offTrack} ({d.offTrackPct}%)</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Risk section */}
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">Cảnh báo rủi ro</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-6 py-3">Objective</th>
                                        <th className="px-6 py-3">Phòng ban</th>
                                        <th className="px-6 py-3">Tiến độ</th>
                                        <th className="px-6 py-3">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {((report.risks || [])
                                        .filter(r => r.status === 'at_risk' || r.status === 'off_track')
                                        .sort((a,b) => (a.status === 'off_track' ? -1 : 0) - (b.status === 'off_track' ? -1 : 0))
                                    ).map((r, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-6 py-3 font-semibold text-slate-900">{r.objective_title || (`#${r.objective_id}`)}</td>
                                            <td className="px-6 py-3">{(report.departments || []).find(d => d.departmentId === r.department_id)?.departmentName || '—'}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 max-w-xs bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full ${
                                                                r.progress >= 80 ? 'bg-emerald-500' : 
                                                                r.progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${Math.min(r.progress ?? 0, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-semibold whitespace-nowrap">{(r.progress ?? 0).toFixed(2)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                {r.status === 'on_track' && (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">✓ On Track</span>
                                                )}
                                                {r.status === 'at_risk' && (
                                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">⚠ At Risk</span>
                                                )}
                                                {r.status === 'off_track' && (
                                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">✕ Off Track</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Snapshots Modal */}
            {showSnapshots && (
            <>
                {/* Backdrop + cố định trang + click ngoài để đóng */}
                <div 
                className="fixed inset-0 absolute inset-0 bg-black/30 bg-opacity-70 flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                    setShowSnapshots(false);
                    setSelectedSnapshot(null);
                    }
                }}
                >
                {/* Modal chính - ngăn sự kiện click lan ra ngoài */}
                <div 
                    className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-2xl font-bold text-gray-900">Lịch sử chốt sổ báo cáo</h2>
                    <button 
                        onClick={() => { 
                        setShowSnapshots(false); 
                        setSelectedSnapshot(null); 
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
                        /* ==================== XEM CHI TIẾT SNAPSHOT ==================== */
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

                        {/* Thông tin snapshot */}
                        <div className="bg-slate-50 rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedSnapshot.title}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-600">Chu kỳ:</span>
                                    <span className="ml-2 font-semibold text-slate-900">{selectedSnapshot.cycle_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Ngày chốt:</span>
                                    <span className="ml-2 font-semibold text-slate-900">{new Date(selectedSnapshot.snapshotted_at).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Tạo bởi:</span>
                                    <span className="ml-2 font-semibold text-slate-900">{selectedSnapshot.creator?.email || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Thời gian:</span>
                                    <span className="ml-2 font-semibold text-slate-900">{new Date(selectedSnapshot.created_at).toLocaleTimeString('vi-VN')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Nội dung báo cáo - giữ nguyên logic cũ nhưng đẹp hơn */}
                        {selectedSnapshot.data_snapshot && (
                            <div className="space-y-8">
                            {/* Tổng quan */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-4">Tổng quan</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Tổng OKR", value: selectedSnapshot.data_snapshot.overall?.totalObjectives || 0, color: "gray" },
                                    { label: "Tiến độ TB", value: `${(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0).toFixed(1)}%`, color: "blue" },
                                    { label: "On Track", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0, color: "emerald" },
                                    { label: "Off Track", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0, color: "red" },
                                ].map((item, i) => (
                                    <div key={i} className={`bg-white border ${i >= 2 ? `border-${item.color}-200` : 'border-gray-200'} rounded-xl p-5 shadow-sm`}>
                                    <div className={`text-sm ${i >= 2 ? `text-${item.color}-600` : 'text-gray-600'}`}>{item.label}</div>
                                    <div className={`text-3xl font-bold ${i >= 2 ? `text-${item.color}-600` : 'text-gray-900'} mt-1`}>
                                        {item.value}
                                    </div>
                                    </div>
                                ))}
                                </div>
                            </div>

                            {/* Chi tiết phòng ban */}
                            {selectedSnapshot.data_snapshot.departments?.length > 0 && (
                                <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-4">Theo công ty</h4>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                        <th className="text-left p-4 font-semibold text-gray-700">Phòng ban</th>
                                        <th className="text-center p-4 font-semibold text-gray-700">OKR</th>
                                        <th className="text-center p-4 font-semibold text-gray-700">Tiến độ</th>
                                        <th className="text-center p-4 font-semibold text-green-600">On Track</th>
                                        <th className="text-center p-4 font-semibold text-yellow-600">At Risk</th>
                                        <th className="text-center p-4 font-semibold text-red-600">Off Track</th>
                                        </tr>
                                    </thead>
                                        <tbody>
                                            {/* 1. Dòng tổng Công ty */}
                                            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                                                <td className="p-4 text-slate-900">
                                                    Công ty
                                                </td>
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
                                                <td className="p-4 text-center text-green-600">
                                                    {selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0}
                                                </td>
                                                <td className="p-4 text-center text-yellow-600">
                                                    {selectedSnapshot.data_snapshot.overall?.statusCounts?.atRisk || 0}
                                                </td>
                                                <td className="p-4 text-center text-red-600">
                                                    {selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0}
                                                </td>
                                            </tr>

                                            {/* 2. Render cây: Phòng ban → Đội nhóm */}
                                            {(selectedSnapshot.data_snapshot.departments || []).map((dept) => {
                                                // Bỏ qua nếu là node "Công ty" (đã hiển thị ở trên)
                                                if (dept.departmentName?.toLowerCase() === 'công ty') return null;

                                                const hasTeams = dept.children && dept.children.length > 0;

                                                return (
                                                    <React.Fragment key={dept.departmentId}>
                                                        {/* Dòng Phòng ban */}
                                                        <tr className="bg-blue-50/30 border-t border-slate-200 hover:bg-blue-50/50 transition">
                                                            <td className="p-4 font-semibold text-blue-900 pl-8">
                                                                {dept.departmentName || 'Phòng ban không tên'}
                                                            </td>
                                                            <td className="p-4 text-center text-slate-700">{dept.count || 0}</td>
                                                            <td className="p-4 text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-blue-600 transition-all"
                                                                            style={{ width: `${Math.min(dept.averageProgress ?? 0, 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="font-semibold text-blue-900">
                                                                        {(dept.averageProgress ?? 0).toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center font-medium text-green-600">{dept.onTrack || 0}</td>
                                                            <td className="p-4 text-center font-medium text-yellow-600">{dept.atRisk || 0}</td>
                                                            <td className="p-4 text-center font-medium text-red-600">{dept.offTrack || 0}</td>
                                                        </tr>

                                                        {/* Đội nhóm (nếu có) */}
                                                        {hasTeams && dept.children.map((team) => (
                                                            <tr key={team.departmentId} className="border-t border-slate-100 hover:bg-slate-50 transition">
                                                                <td className="p-4 text-slate-700 pl-16">
                                                                    ↳ {team.departmentName || 'Đội nhóm không tên'}
                                                                </td>
                                                                <td className="p-4 text-center text-slate-600">{team.count || 0}</td>
                                                                <td className="p-4 text-center">
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className={`h-full transition-all ${
                                                                                    (team.averageProgress ?? 0) >= 80 ? 'bg-emerald-500' :
                                                                                    (team.averageProgress ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                                                }`}
                                                                                style={{ width: `${Math.min(team.averageProgress ?? 0, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className={`font-medium ${
                                                                            (team.averageProgress ?? 0) >= 80 ? 'text-emerald-700' :
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
                            </div>
                        )}
                        </div>
                    ) : (
                        /* ==================== DANH SÁCH SNAPSHOT ==================== */
                        <div>
                        {snapshots.length === 0 ? (
                            <div className="text-center py-16">
                            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-600 font-semibold text-lg">Chưa có chốt sổ nào</p>
                            <p className="text-gray-400 text-sm mt-2">Nhấn nút "Chốt sổ báo cáo" để tạo bản sao đầu tiên</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                            {snapshots.map((snap) => (
                                <button
                                key={snap.id}
                                onClick={() => loadSnapshot(snap.id)}
                                className="w-full p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left group"
                                >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition">
                                        {snap.title}
                                    </h3>
                                    <div className="flex items-center gap-6 text-sm text-gray-500 mt-2">
                                        <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {new Date(snap.snapshotted_at).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        {snap.creator?.email || 'N/A'}
                                        </span>
                                    </div>
                                    </div>
                                    <svg className="h-6 w-6 text-gray-400 group-hover:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                </button>
                            ))}
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


