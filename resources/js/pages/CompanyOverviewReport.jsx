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
// Thêm state cho snapshots
const [snapshots, setSnapshots] = useState([]);
const [showSnapshots, setShowSnapshots] = useState(false);
const [creatingSnapshot, setCreatingSnapshot] = useState(false);
const [lastFetchDebug, setLastFetchDebug] = useState({ status: null, body: null, error: null });

// Thêm function tạo snapshot
const createSnapshot = async () => {
    if (!filters.cycleId) return alert('Chọn chu kỳ đi!');

    setCreatingSnapshot(true);
    try {
        const response = await fetch('/api/reports/snapshot/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                title: `Báo cáo ${currentCycleMeta?.name} - ${new Date().toLocaleDateString('vi-VN')}`,
                cycle_id: filters.cycleId,
                scope: 'company',
                data_snapshot: report
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('ĐÃ LƯU SNAPSHOT THÀNH CÔNG!');
            await loadSnapshots();
            setShowSnapshots(true); // Tự động hiển thị danh sách snapshot
        } else {
            alert('Lỗi: ' + result.message);
        }
    } catch (err) {
        alert('Lỗi mạng: ' + err.message);
    } finally {
        setCreatingSnapshot(false);
    }
};
// Thêm function load snapshots
const loadSnapshots = async () => {
    try {
        // Build query params based on current filters
        const params = new URLSearchParams({
            scope: 'company',
            cycle_id: filters.cycleId || '',
        });
        
        const response = await fetch(`/api/reports/snapshots?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        const text = await response.text();
        let result = null;
        try {
            result = JSON.parse(text);
        } catch (e) {
            setLastFetchDebug({ status: response.status, body: text, error: 'Invalid JSON from server' });
            console.error('Invalid JSON from snapshots endpoint', text);
            setSnapshots([]);
            return;
        }
        setLastFetchDebug({ status: response.status, body: result, error: result && result.success ? null : (result && result.message) || null });
        if (result.success) {
            setSnapshots(result.data || []);
            console.log('Snapshots loaded:', result.data);
        } else {
            console.error('Load snapshots error:', result.message);
            setSnapshots([]);
        }
    } catch (error) {
        console.error('Load snapshots error:', error);
        setLastFetchDebug({ status: null, body: null, error: String(error) });
    }
};

// Load snapshots khi component mount
useEffect(() => {
    loadSnapshots();
}, []);
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

    // Keep current cycle label in sync when user changes dropdown
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
                // Load snapshots for this cycle
                await loadSnapshots();
            } catch (e) {
                setError(e.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        })();
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId]);

    // Realtime auto-refresh every 15s
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
        }, 15000);
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
        // teams
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

    // Close filter popover when clicking outside
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

    return (
        <div className="px-6 py-8">
            <div className="mb-2 flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo tổng quan</h1>
                <div className="relative inline-block">
                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm13 9H4v7a1 1 0 001 1h14a1 1 0 001-1v-7zM6 6h12V5H6v1z" />
                    </svg>
                    <select
                        value={filters.cycleId ?? ''}
                        onChange={(e) => setFilters(f => ({...f, cycleId: e.target.value}))}
                        className="w-56 appearance-none rounded-lg bg-white py-2 pl-10 pr-9 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
    {/* Chu kỳ info */}
    {currentCycleMeta && (
        <div className="text-sm text-slate-600">
            Chu kỳ hiện tại: <span className="font-semibold text-slate-800">{currentCycleMeta.name}</span>
        </div>
    )}
    
    {/* 🔥 SNAPSHOT BUTTONS */}
    <div className="flex items-center gap-4">
        {/* Nút TẠO Snapshot */}
        <button
            onClick={createSnapshot}
            disabled={creatingSnapshot || !filters.cycleId || loading}
            className={`
                inline-flex items-center gap-2 rounded-xl bg-gradient-to-r 
                from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold 
                text-white shadow-lg hover:shadow-xl hover:from-emerald-600 
                hover:to-teal-700 focus:outline-none focus:ring-4 
                focus:ring-emerald-500/25 transition-all duration-200
                disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed
                disabled:shadow-none
            `}
        >
            {creatingSnapshot ? (
                <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 20 20">
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    📸 Tạo Snapshot
                </>
            )}
        </button>
        
        {/* Nút XEM lịch sử */}
        <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all duration-200"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lịch sử ({snapshots.length})
        </button>
    </div>
</div>
{loading && (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Đang tải báo cáo...</div>
)}
{error && (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
)}

{/* 🔥 SNAPSHOTS HISTORY PANEL */}
{showSnapshots && (
    <div className="mb-6 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900">📋 Lịch sử báo cáo</h3>
                    <p className="text-sm text-slate-500">Các snapshot đã lưu</p>
                </div>
            </div>
            <button
                onClick={() => setShowSnapshots(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="border-t border-slate-200 px-6 pb-6">
            {snapshots.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                    <div className="mx-auto h-20 w-20 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">Chưa có báo cáo</h3>
                    <p className="mt-1 text-sm text-slate-600">Nhấn nút bên dưới để lưu snapshot báo cáo hiện tại.</p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                            onClick={createSnapshot}
                            disabled={creatingSnapshot || !filters.cycleId || loading}
                            className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all duration-150 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-none`}
                        >
                            {creatingSnapshot ? 'Đang lưu...' : '📸 Tạo Snapshot'}
                        </button>
                        <button
                            onClick={() => setShowSnapshots(false)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all duration-150"
                        >
                            Đóng
                        </button>
                    </div>
                    {/* Temporary debug output to assist with local troubleshooting */}
                    <div className="mt-6 text-left text-xs text-slate-500">
                        <div className="font-semibold text-slate-600 mb-1">Debug:</div>
                        {lastFetchDebug.error && (
                            <div className="mb-1 text-sm text-red-600">Error: {String(lastFetchDebug.error)}</div>
                        )}
                        <div className="whitespace-pre-wrap break-words bg-white p-3 rounded border border-slate-100">
                            {lastFetchDebug.body ? JSON.stringify(lastFetchDebug.body, null, 2) : (lastFetchDebug.status ? `HTTP ${lastFetchDebug.status}` : 'No response yet')}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {snapshots.slice(0, 6).map((snapshot) => (  // Chỉ show 6 cái gần nhất
                        <div
                            key={snapshot.id}
                            className="group relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-300"
                        >
                            {/* Snapshot badge */}
                            <div className="absolute -top-3 left-4">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                                    📸 #{snapshot.id?.toString().padStart(3, '0')}
                                </span>
                            </div>
                            
                            {/* Header */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-500">
                                        {new Date(snapshot.created_at).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                        {snapshot.cycle_name}
                                    </span>
                                </div>
                                <h4 className="mt-1 truncate font-semibold text-slate-900">
                                    {snapshot.title || `Báo cáo ${snapshot.cycle_name}`}
                                </h4>
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {snapshot.data?.overall?.totalObjectives || 0}
                                    </div>
                                    <div className="text-xs text-slate-500">OKR</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {snapshot.data?.overall?.averageProgress?.toFixed(1) || 0}%
                                    </div>
                                    <div className="text-xs text-slate-500">Tiến độ</div>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {snapshot.created_by_name || 'Hệ thống'}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => {
                                            window.open(`/reports/${snapshot.id}`, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all duration-200"
                                    >
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Xem
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
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
                    <div className="mt-6 space-y-6">
                        {/* <LineChart data={report.trend || []} label="Xu hướng tiến độ theo tuần" /> */}
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
                                        return true; // company level keeps single row
                                    }).map((d,i)=> (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-6 py-3">{d.departmentName || 'N/A'}</td>
                                            <td className="px-6 py-3">{d.count}</td>
                                            <td className="px-6 py-3">{(d.averageProgress ?? 0).toFixed(2)}%</td>
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
                                            <td className="px-6 py-3">{r.objective_title || (`#${r.objective_id}`)}</td>
                                            <td className="px-6 py-3">{(report.departments || []).find(d => d.departmentId === r.department_id)?.departmentName || '—'}</td>
                                            <td className="px-6 py-3">{(r.progress ?? 0).toFixed(2)}%</td>
                                            <td className="px-6 py-3">
                                                {r.status === 'on_track' && (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">On Track</span>
                                                )}
                                                {r.status === 'at_risk' && (
                                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">At Risk</span>
                                                )}
                                                {r.status === 'off_track' && (
                                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Off Track</span>
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
        </div>
    );
}


