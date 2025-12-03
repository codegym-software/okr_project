import React from 'react';
import GroupedBarChart from '../GroupedBarChart';

export default function ChartSection({ report, level, onLevelChange }) {
    const groupedChartData = React.useMemo(() => {
        if (level === 'company') {
            const ov = report?.overall || { statusCounts: {} };
            return {
                categories: ['Công ty'],
                series: [
                    { name: 'Đúng tiến độ', color: '#22c55e', data: [ov.statusCounts?.onTrack || 0] },
                    { name: 'Có nguy cơ', color: '#f59e0b', data: [ov.statusCounts?.atRisk || 0] },
                    { name: 'Chậm tiến độ', color: '#ef4444', data: [ov.statusCounts?.offTrack || 0] },
                ],
            };
        }
        if (level === 'departments') {
            const list = (report.departmentsHierarchy || report.departments || [])
                .filter(d => d.departmentId && (d.departmentName || '').toLowerCase() !== 'công ty');
            return {
                categories: list.map(d => d.departmentName),
                series: [
                    { name: 'Đúng tiến độ', color: '#22c55e', data: list.map(d => d.onTrack || 0) },
                    { name: 'Có nguy cơ', color: '#f59e0b', data: list.map(d => d.atRisk || 0) },
                    { name: 'Chậm tiến độ', color: '#ef4444', data: list.map(d => d.offTrack || 0) },
                ],
            };
        }
        return {
            categories: [],
            series: [
                { name: 'Đúng tiến độ', color: '#22c55e', data: [] },
                { name: 'Có nguy cơ', color: '#f59e0b', data: [] },
                { name: 'Chậm tiến độ', color: '#ef4444', data: [] },
            ],
        };
    }, [report, level]);

    return (
        <div className="mt-6 space-y-6">
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-semibold text-slate-700">
                        <button 
                            onClick={() => onLevelChange('company')} 
                            className={`px-3 py-1.5 rounded-md ${level === 'company' ? 'bg-slate-100' : ''}`}
                        >
                            Công ty
                        </button>
                        <button 
                            onClick={() => onLevelChange('departments')} 
                            className={`px-3 py-1.5 rounded-md ${level === 'departments' ? 'bg-slate-100' : ''}`}
                        >
                            Phòng ban
                        </button>
                    </div>
                </div>
                <GroupedBarChart
                    categories={groupedChartData.categories}
                    series={groupedChartData.series}
                    label={`Phân bổ trạng thái theo ${level === 'company' ? 'công ty' : 'phòng ban'}`}
                />
            </div>
        </div>
    );
}

