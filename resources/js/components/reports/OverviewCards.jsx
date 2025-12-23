import React from 'react';
import TrendIcon from './TrendIcon';

export default function OverviewCards({ report }) {
    return (
        <div className="grid gap-6 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-slate-500">Tổng số mục tiêu</div>
                <div className="mt-2 flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-900">{report.overall.totalObjectives}</div>
                    {report.overall.totalObjectivesDelta && <TrendIcon delta={report.overall.totalObjectivesDelta} />}
                </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-slate-500">Tiến độ trung bình</div>
                <div className="mt-2 flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-900">
                        {(report.overall.averageProgress || 0).toFixed(2)}%
                    </div>
                    {report.overall.averageProgressDelta && <TrendIcon delta={report.overall.averageProgressDelta} />}
                </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-emerald-600">Đúng tiến độ</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                    {report.overall.statusCounts?.onTrack || 0}
                    <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.onTrack || 0}%)</span>
                </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-amber-600">Có nguy cơ</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                    {report.overall.statusCounts?.atRisk || 0}
                    <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.atRisk || 0}%)</span>
                </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-red-600">Chậm tiến độ</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                    {report.overall.statusCounts?.offTrack || 0}
                    <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.offTrack || 0}%)</span>
                </div>
            </div>
        </div>
    );
}

