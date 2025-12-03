import React from 'react';
import ProgressBar from './ProgressBar';

export default function DepartmentTable({ report, level }) {
    const departments = level === 'company'
        ? [
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
            },
        ]
        : (report.departmentsHierarchy || report.departments || []).filter(
            (d) => d.departmentId && (d.departmentName || '').toLowerCase() !== 'công ty'
        );

    return (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">
                {level === 'company' ? 'Chi tiết công ty' : 'Chi tiết theo đơn vị'}
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
                        {departments.map((d, i) => (
                            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-3 font-medium text-slate-900">
                                    {d.departmentName || 'N/A'}
                                </td>
                                <td className="px-6 py-3 text-center font-semibold text-slate-900">
                                    {d.count ?? d.totalObjectives ?? 0}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <ProgressBar progress={d.averageProgress ?? 0} />
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
    );
}

