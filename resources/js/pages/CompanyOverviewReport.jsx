import React, { useEffect, useMemo, useState } from 'react';
import PieChart from '../components/PieChart';

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
    const [cycleId, setCycleId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState({
        overallProgress: 0,
        statusDistribution: { onTrack: 0, atRisk: 0, offTrack: 0 },
        departments: []
    });

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch('/cycles', { headers: { Accept: 'application/json' }});
                const d = await r.json();
                const list = Array.isArray(d.data) ? d.data : [];
                setCycles(list);
                // chọn chu kỳ đầu tiên (mới nhất) nếu có
                if (list.length) setCycleId(list[0].cycle_id || list[0].cycleId);
            } catch (e) {/* ignore */}
        })();
    }, []);

    useEffect(() => {
        if (cycleId === undefined) return;
        setLoading(true);
        setError('');
        (async () => {
            try {
                const url = `/api/reports/company-overview${cycleId ? `?cycle_id=${cycleId}` : ''}`;
                const res = await fetch(url, { headers: { Accept: 'application/json' } });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Load report failed');
                setData(json.data);
            } catch (e) {
                setError(e.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        })();
    }, [cycleId]);

    const pieData = useMemo(() => [
        { label: 'On track', value: data.statusDistribution.onTrack || 0, color: '#22c55e' },
        { label: 'At risk', value: data.statusDistribution.atRisk || 0, color: '#f59e0b' },
        { label: 'Off track', value: data.statusDistribution.offTrack || 0, color: '#ef4444' },
    ], [data]);

    return (
        <div className="px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-slate-900">Tổng quan công ty</h1>
                <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-600">Chu kỳ</label>
                    <select
                        value={cycleId ?? ''}
                        onChange={(e) => setCycleId(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                        {cycles.map(c => (
                            <option key={c.cycle_id || c.cycleId} value={c.cycle_id || c.cycleId}>
                                {c.cycle_name || c.cycleName}
                            </option>
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
                    <div className="grid gap-6 md:grid-cols-3">
                        <StatCard title="Tiến độ trung bình toàn công ty" value={data.overallProgress?.toFixed?.(2) ?? data.overallProgress} />
                        <div className="md:col-span-2">
                            <PieChart data={pieData} />
                        </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">Tiến độ theo phòng ban</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-6 py-3">Phòng ban</th>
                                        <th className="px-6 py-3">Tiến độ trung bình</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.departments || []).map((d, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="px-6 py-3">{d.departmentName || 'N/A'}</td>
                                            <td className="px-6 py-3">{(d.averageProgress ?? 0).toFixed(2)}%</td>
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


