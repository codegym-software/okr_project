import React, { useState, useMemo } from 'react';
import StatCard from './StatCard';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { FiAward, FiStar, FiClipboard, FiChevronLeft, FiChevronRight, FiPieChart } from 'react-icons/fi';
import { tooltipOptions, legendOptions } from './chartConfig';
import EmptyState from './EmptyState';
import QualityTable from './QualityTable';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const ChartWrapper = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col h-full ${className}`}>
        <h3 className="font-semibold text-lg mb-4 text-gray-800 flex-shrink-0">{title}</h3>
        <div className="relative flex-grow min-h-0">
            {children}
        </div>
    </div>
);


export default function QualityTab({ data }) {
    const [activeIndex, setActiveIndex] = useState(0);

    const { statCards, charts, table } = data || {};

    const allCharts = useMemo(() => {
        if (!charts) return [];

        const pieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: legendOptions,
                tooltip: {
                    ...tooltipOptions,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed;
                            }
                            return label;
                        }
                    }
                }
            }
        };

        // --- Chart 1: Strategic Tag Distribution (Pie) ---
        const strategicTagLabels = Object.keys(charts.strategic_tag_distribution || {});
        const strategicTagDataValues = Object.values(charts.strategic_tag_distribution || {});
        const strategicTagChartData = {
            labels: strategicTagLabels.length > 0 ? strategicTagLabels : ['Không có dữ liệu'],
            datasets: [{
                data: strategicTagDataValues.length > 0 ? strategicTagDataValues : [1],
                backgroundColor: strategicTagLabels.length > 0 ? ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] : ['#d1d5db'],
                hoverBackgroundColor: strategicTagLabels.length > 0 ? ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] : ['#9ca3af'],
            }]
        };

        // --- Chart 2: KR Type Distribution (Pie) ---
        const krTypeDataValues = [charts.kr_type_distribution?.outcome || 0, charts.kr_type_distribution?.activity || 0];
        const krTypeChartData = {
            labels: ['Kết quả', 'Hoạt động'],
            datasets: [{
                data: krTypeDataValues[0] + krTypeDataValues[1] > 0 ? krTypeDataValues : [1],
                backgroundColor: krTypeDataValues[0] + krTypeDataValues[1] > 0 ? ['#4BC0C0', '#FF9F40'] : ['#d1d5db'],
                hoverBackgroundColor: krTypeDataValues[0] + krTypeDataValues[1] > 0 ? ['#4BC0C0', '#FF9F40'] : ['#9ca3af'],
            }]
        };

        return [
            {
                title: "Phân bổ Mục tiêu theo Thẻ Chiến lược",
                component: strategicTagLabels.length > 0 ? 
                    <div className="absolute inset-0"><Pie data={strategicTagChartData} options={{...pieOptions, cutout: '0%'}} /></div> : 
                    <EmptyState icon={FiPieChart} title="Không có dữ liệu" />
            },
            {
                title: "Phân bổ Loại Key Result",
                component: (krTypeDataValues[0] + krTypeDataValues[1] > 0) ? 
                    <div className="absolute inset-0"><Pie data={krTypeChartData} options={{...pieOptions, cutout: '0%'}} /></div> : 
                    <EmptyState icon={FiPieChart} title="Không có dữ liệu" />
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
                <StatCard icon={<FiAward className="w-6 h-6" />} title="Tỷ lệ KR Kết quả" value={`${statCards.outcome_kr_rate}%`} tooltip="Tỷ lệ phần trăm các Key Result được phân loại là 'Kết quả' (outcome-based) thay vì 'Hoạt động' (activity-based)." />
                <StatCard icon={<FiStar className="w-6 h-6" />} title="Tỷ lệ O Tham vọng" value={`${statCards.aspirational_rate}%`} tooltip="Tỷ lệ phần trăm các Mục tiêu được đánh dấu là 'Tham vọng', có thể không đạt 100%." />
                <StatCard icon={<FiClipboard className="w-6 h-6" />} title="Số KR TB/O Toàn Công ty" value={`${statCards.avg_krs_per_objective}`} tooltip="Số lượng Key Result trung bình trên mỗi Mục tiêu. Con số lý tưởng thường là từ 2 đến 5." />
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
                            <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white/70 backdrop-blur-sm rounded-full p-2 text-slate-600 hover:text-slate-900 shadow-md hover:shadow-lg transition-all z-10" aria-label="Previous chart">
                                <FiChevronLeft className="w-6 h-6" />
                            </button>
                            <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white/70 backdrop-blur-sm rounded-full p-2 text-slate-600 hover:text-slate-900 shadow-md hover:shadow-lg transition-all z-10" aria-label="Next chart">
                                <FiChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {/* Detailed Table */}
            <QualityTable tableData={table} />
        </div>
    );
}
