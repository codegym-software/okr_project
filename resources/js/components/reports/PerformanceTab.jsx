import React from 'react';
import { FiBarChart2, FiTrendingDown } from 'react-icons/fi';

import StatCard from './StatCard';
import ProgressOverTimeChart from './ProgressOverTimeChart';
import DepartmentPerformanceChart from './DepartmentPerformanceChart';
import PerformanceTable from './PerformanceTable';
import EmptyState from './EmptyState';

export default function PerformanceTab({ data }) {
    if (!data) {
        return <div className="text-center p-8">Không có dữ liệu để hiển thị.</div>;
    }

    const { statCards, charts, table } = data;

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <StatCard
                    label="Tiến độ TB các O Cấp Công ty"
                    value={`${statCards.avg_company_progress || 0}%`}
                />
                <StatCard
                    label="Tỷ lệ O Hoàn thành (Dự kiến)"
                    value={`${statCards.completed_company_rate || 0}%`}
                    details="Score >= 0.7"
                />
                <StatCard
                    label="Tổng Điểm Tự tin TB"
                    value={statCards.avg_confidence_score || 'N/A'}
                    details="Của lãnh đạo"
                />
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.progress_over_time?.length > 0 ? (
                    <ProgressOverTimeChart chartData={charts.progress_over_time} />
                ) : (
                    <div className="bg-white p-4 rounded-lg shadow-sm h-96 flex items-center justify-center">
                        <EmptyState 
                            icon={FiTrendingDown}
                            title="Không có dữ liệu xu hướng"
                            message="Chưa có đủ dữ liệu check-in trong khoảng thời gian này để vẽ biểu đồ."
                        />
                    </div>
                )}
                {charts.performance_by_department?.length > 0 ? (
                    <DepartmentPerformanceChart chartData={charts.performance_by_department} />
                ) : (
                     <div className="bg-white p-4 rounded-lg shadow-sm h-96 flex items-center justify-center">
                        <EmptyState 
                            icon={FiBarChart2}
                            title="Không có dữ liệu phòng ban"
                            message="Chưa có mục tiêu nào được gán cho các phòng ban trong chu kỳ này."
                        />
                    </div>
                )}
            </div>
            
            {/* Detailed Table */}
            <PerformanceTable tableData={table} />
        </div>
    );
}

