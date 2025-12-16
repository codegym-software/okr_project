import React from 'react';
import { FiBarChart2, FiTrendingDown, FiTrendingUp, FiCheckCircle, FiSmile } from 'react-icons/fi';

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
                    icon={<FiTrendingUp className="w-6 h-6" />}
                    title="Tiến độ TB các O Cấp Công ty"
                    value={`${statCards.avg_company_progress || 0}%`}
                    tooltip="Tiến độ trung bình của tất cả các Mục tiêu cấp công ty trong chu kỳ này."
                />
                <StatCard
                    icon={<FiCheckCircle className="w-6 h-6" />}
                    title="Tỷ lệ O Hoàn thành (Dự kiến)"
                    value={`${statCards.completed_company_rate || 0}%`}
                    tooltip="Tỷ lệ phần trăm các Mục tiêu được coi là 'Hoàn thành' (tiến độ đạt trên 70%)."
                />
                <StatCard
                    icon={<FiSmile className="w-6 h-6" />}
                    title="Tổng Điểm Tự tin TB"
                    value={statCards.avg_confidence_score || 'N/A'}
                    tooltip="Điểm tự tin trung bình được báo cáo từ các lần check-in gần nhất của các thành viên."
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
