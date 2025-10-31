import React, { useEffect, useMemo, useState } from 'react';
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';
import StackedBarChart from '../components/StackedBarChart';

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
                    setFilters(f => ({ ...f, cycleId: listCycles[0].cycle_id || listCycles[0].cycleId }));
                }
            } catch (e) { /* ignore */ }
        })();
    }, []);

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

    const pieData = useMemo(() => {
        const counts = report?.overall?.statusCounts || {};
        return [
            { label: 'On track', value: counts.onTrack || 0, color: '#22c55e' },
            { label: 'At risk', value: counts.atRisk || 0, color: '#f59e0b' },
            { label: 'Off track', value: counts.offTrack || 0, color: '#ef4444' },
        ];
    }, [report]);

    const exportCsv = async () => {
        const params = new URLSearchParams();
        if (filters.cycleId) params.set('cycle_id', filters.cycleId);
        if (filters.departmentId) params.set('department_id', filters.departmentId);
        if (filters.status) params.set('status', filters.status);
        if (filters.ownerId) params.set('owner_id', filters.ownerId);
        const url = `/api/reports/okr-company/export.csv${params.toString() ? `?${params.toString()}` : ''}`;
        window.open(url, '_blank');
    };

    return (
        <div className="px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo tổng quan OKR công ty</h1>
                <div className="flex items-center gap-3">
                    <button onClick={() => window.print()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Xuất PDF</button>
                    <button onClick={exportCsv} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-95">Xuất Excel (CSV)</button>
                </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Chu kỳ</label>
                    <select
                        value={filters.cycleId ?? ''}
                        onChange={(e) => setFilters(f => ({...f, cycleId: e.target.value}))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                        {cycles.map(c => (
                            <option key={c.cycle_id || c.cycleId} value={c.cycle_id || c.cycleId}>
                                {c.cycle_name || c.cycleName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Phòng ban</label>
                    <select
                        value={filters.departmentId ?? ''}
                        onChange={(e) => setFilters(f => ({...f, departmentId: e.target.value}))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                        <option value="">Tất cả</option>
                        {departments.map(d => (
                            <option key={d.department_id} value={d.department_id}>{d.d_name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Trạng thái</label>
                    <select
                        value={filters.status ?? ''}
                        onChange={(e) => setFilters(f => ({...f, status: e.target.value}))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                        <option value="">Tất cả</option>
                        <option value="on_track">On Track</option>
                        <option value="at_risk">At Risk</option>
                        <option value="off_track">Off Track</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Phụ trách</label>
                    <select
                        value={filters.ownerId ?? ''}
                        onChange={(e) => setFilters(f => ({...f, ownerId: e.target.value}))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                        <option value="">Tất cả</option>
                        {owners.map(u => (
                            <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                        ))}
                    </select>
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
                    {/* KPI cards */}
                    <div className="grid gap-6 md:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tổng số OKR</div>
                            <div className="mt-2 text-4xl font-extrabold text-slate-900">{report.overall.totalObjectives}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tiến độ trung bình</div>
                            <div className="mt-2 text-4xl font-extrabold text-slate-900">{report.overall.averageProgress?.toFixed?.(2) ?? report.overall.averageProgress}%</div>
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
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <LineChart data={report.trend || []} label="Xu hướng tiến độ theo tuần" />
                        <StackedBarChart data={report.departments || []} label="Phân bổ trạng thái theo phòng ban" />
                    </div>

                    {/* Department table */}
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">Chi tiết theo phòng ban</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-6 py-3">Phòng ban</th>
                                        <th className="px-6 py-3">Số OKR</th>
                                        <th className="px-6 py-3">Tiến độ TB</th>
                                        <th className="px-6 py-3">On Track</th>
                                        <th className="px-6 py-3">At Risk</th>
                                        <th className="px-6 py-3">Off Track</th>
                                        <th className="px-6 py-3">Xu hướng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.departments || []).map((d, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-6 py-3">{d.departmentName || 'N/A'}</td>
                                            <td className="px-6 py-3">{d.count}</td>
                                            <td className="px-6 py-3">{(d.averageProgress ?? 0).toFixed(2)}%</td>
                                            <td className="px-6 py-3">{d.onTrack} ({d.onTrackPct}%)</td>
                                            <td className="px-6 py-3">{d.atRisk} ({d.atRiskPct}%)</td>
                                            <td className="px-6 py-3">{d.offTrack} ({d.offTrackPct}%)</td>
                                            <td className="px-6 py-3">
                                                {d.trendDelta === null || d.trendDelta === undefined ? '—' : (
                                                    <span className={d.trendDelta > 0 ? 'text-emerald-600' : (d.trendDelta < 0 ? 'text-red-600' : 'text-slate-500')}>
                                                        {d.trendDelta > 0 ? '▲' : (d.trendDelta < 0 ? '▼' : '▶')} {Math.abs(d.trendDelta).toFixed(2)}%
                                                    </span>
                                                )}
                                            </td>
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
                                        <th className="px-6 py-3">Objective ID</th>
                                        <th className="px-6 py-3">Phòng ban</th>
                                        <th className="px-6 py-3">Tiến độ</th>
                                        <th className="px-6 py-3">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.risks || []).map((r, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-6 py-3">#{r.objective_id}</td>
                                            <td className="px-6 py-3">{(report.departments || []).find(d => d.departmentId === r.department_id)?.departmentName || '—'}</td>
                                            <td className="px-6 py-3">{(r.progress ?? 0).toFixed(2)}%</td>
                                            <td className="px-6 py-3">{r.status === 'on_track' ? 'On Track' : (r.status === 'at_risk' ? 'At Risk' : 'Off Track')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}


