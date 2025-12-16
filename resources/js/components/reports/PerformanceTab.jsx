import React, { useState, useMemo } from 'react';
import { FiTrendingDown, FiTrendingUp, FiCheckCircle, FiSmile, FiChevronLeft, FiChevronRight, FiBarChart2 } from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';

import StatCard from './StatCard';
import PerformanceTable from './PerformanceTable';
import EmptyState from './EmptyState';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const createGradient = (ctx, area) => {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
    return gradient;
};

const ChartWrapper = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col h-full ${className}`}>
        <h3 className="font-semibold text-lg mb-4 text-gray-800 flex-shrink-0">{title}</h3>
        <div className="relative flex-grow min-h-0">
            {children}
        </div>
    </div>
);

const tooltipOptions = {
    backgroundColor: '#fff',
    titleColor: '#333',
    bodyColor: '#666',
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 10,
    usePointStyle: true,
};

export default function PerformanceTab({ data }) {
    const [activeIndex, setActiveIndex] = useState(0);

    const { statCards, charts, table } = data || {};

    const allCharts = useMemo(() => {
        if (!charts) return [];

        // --- Chart 1: Progress Over Time (Line) ---
        const progressData = {
            labels: charts.progress_over_time?.map(d => d.bucket.replace('-', '/W')) || [],
            datasets: [
                {
                    label: 'Tiến độ Thực tế (%)',
                    data: charts.progress_over_time?.map(d => d.avg_progress),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: (context) => {
                        const { ctx, chartArea } = context.chart;
                        if (!chartArea) return null;
                        return createGradient(ctx, chartArea);
                    },
                    fill: true, tension: 0.4, pointBackgroundColor: 'rgb(59, 130, 246)',
                },
                {
                    label: 'Tiến độ Lý tưởng (%)',
                    data: charts.progress_over_time?.map(d => d.ideal_progress),
                    borderColor: 'rgb(160, 174, 192)',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5], tension: 0.4, pointBackgroundColor: 'rgb(160, 174, 192)',
                }
            ]
        };
        const progressOptions = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } },
                tooltip: { ...tooltipOptions, callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y}%` } }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { stepSize: 20, callback: value => value + '%' } },
                x: { grid: { display: false } }
            },
            interaction: { mode: 'index', intersect: false },
        };

        // --- Chart 2: Performance by Department (Bar) ---
        const deptPerfData = {
            labels: charts.performance_by_department?.map(d => d.department_name),
            datasets: [{
                label: 'Tiến độ TB (%)',
                data: charts.performance_by_department?.map(d => d.average_progress),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1, borderRadius: 8, borderSkipped: false,
            }]
        };
        const deptPerfOptions = {
            indexAxis: 'x', // Changed to 'x' for vertical bars
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { ...tooltipOptions, callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y.toFixed(2)}%` } }
            },
            scales: {
                y: { // Y-axis for values
                    beginAtZero: true, max: 100, 
                    ticks: { stepSize: 20, callback: value => value + '%' }
                },
                x: { // X-axis for categories
                    grid: { display: false }
                }
            }
        };

        return [
            {
                title: 'Tiến độ O Cấp Công ty Theo Thời gian',
                component: (charts.progress_over_time?.length > 0) ? (
                    <div className="absolute inset-0"><Line data={progressData} options={progressOptions} /></div>
                ) : <div className="flex items-center justify-center h-full"><EmptyState icon={FiTrendingDown} title="Không có dữ liệu xu hướng" /></div>
            },
            {
                title: 'Đóng góp Hiệu suất theo Phòng ban',
                component: (charts.performance_by_department?.length > 0) ? (
                    <div className="absolute inset-0">
                        <Bar data={deptPerfData} options={deptPerfOptions} />
                    </div>
                ) : <div className="flex items-center justify-center h-full"><EmptyState icon={FiBarChart2} title="Không có dữ liệu phòng ban" /></div>
            }
        ];
    }, [charts]);

    if (!data) {
        return <div className="text-center p-8">Không có dữ liệu để hiển thị.</div>;
    }

    const handleNext = () => setActiveIndex(prev => (prev + 1) % allCharts.length);
    const handlePrev = () => setActiveIndex(prev => (prev - 1 + allCharts.length) % allCharts.length);

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
            
            {/* Chart Carousel */}
            {allCharts.length > 0 && (
                <div className="relative w-full h-0" style={{ paddingBottom: '50%' }}>
                    <div className="absolute top-0 left-0 w-full h-full">
                        <ChartWrapper title={allCharts[activeIndex].title}>
                            {allCharts[activeIndex].component}
                        </ChartWrapper>
                    </div>

                    {allCharts.length > 1 && (
                        <>
                            <button 
                                onClick={handlePrev} 
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white/70 backdrop-blur-sm rounded-full p-2 text-slate-600 hover:text-slate-900 shadow-md hover:shadow-lg transition-all z-10"
                                aria-label="Previous chart"
                            >
                                <FiChevronLeft className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={handleNext} 
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white/70 backdrop-blur-sm rounded-full p-2 text-slate-600 hover:text-slate-900 shadow-md hover:shadow-lg transition-all z-10"
                                aria-label="Next chart"
                            >
                                <FiChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {/* Detailed Table */}
            <PerformanceTable tableData={table} />
        </div>
    );
}
