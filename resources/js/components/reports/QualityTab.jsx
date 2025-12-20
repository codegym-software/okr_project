import React from 'react';
import StatCard from './StatCard';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { FiAward, FiStar, FiClipboard } from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const ChartWrapper = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm h-96">
        <h3 className="font-semibold text-lg mb-2 text-gray-800">{title}</h3>
        {children}
    </div>
);

const QualityTable = ({ tableData }) => {
    if (!tableData || tableData.length === 0) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-sm">Không có dữ liệu chi tiết.</div>;
    }

    const HealthStatusBadge = ({ status }) => {
        const statusStyles = {
            on_track: 'bg-green-100 text-green-800',
            at_risk: 'bg-yellow-100 text-yellow-800',
            off_track: 'bg-red-100 text-red-800',
        };
        const statusText = {
            on_track: 'Đang theo dõi',
            at_risk: 'Rủi ro',
            off_track: 'Trễ',
        }
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
                {statusText[status] || 'Không xác định'}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto mt-6">
            <h3 className="font-bold text-lg mb-2 p-4">Các OKR có Dấu hiệu Cấu trúc kém</h3>
            <table className="divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Mục tiêu (O/KR)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban/Đơn vị</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại KR</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tham vọng</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng KR</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thẻ Chiến lược</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiến độ (%)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tình trạng</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vấn đề Cấu trúc</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => (
                        <tr key={row.objective_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <a href={`/objectives/${row.objective_id}`} className="hover:underline" target="_blank" rel="noopener noreferrer">{row.objective_name}</a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.kr_type_distribution?.outcome > 0 && `Kết quả (${row.kr_type_distribution.outcome})`}
                                {row.kr_type_distribution?.outcome > 0 && row.kr_type_distribution?.activity > 0 && ', '}
                                {row.kr_type_distribution?.activity > 0 && `Hoạt động (${row.kr_type_distribution.activity})`}
                                {(!row.kr_type_distribution || (row.kr_type_distribution.outcome === 0 && row.kr_type_distribution.activity === 0)) && 'Không xác định'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.is_aspirational ? 'Tham vọng' : 'Cam kết'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.kr_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.strategic_tags && row.strategic_tags.length > 0 ? row.strategic_tags.join(', ') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.progress}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <HealthStatusBadge status={row.health_status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                {row.structural_issues || 'Không'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function QualityTab({ data }) {
    if (!data) {
        return <div className="text-center p-8">Không có dữ liệu để hiển thị.</div>;
    }

    const { statCards, charts, table } = data;

    // Chart Data for Strategic Tag Distribution
    const strategicTagLabels = Object.keys(charts?.strategic_tag_distribution || {});
    const strategicTagDataValues = Object.values(charts?.strategic_tag_distribution || {});
    const strategicTagChartData = {
        labels: strategicTagLabels.length > 0 ? strategicTagLabels : ['Không có dữ liệu'],
        datasets: [{
            data: strategicTagDataValues.length > 0 ? strategicTagDataValues : [1], // If no data, show a slice for 'No Data'
            backgroundColor: strategicTagLabels.length > 0 ? [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
            ] : ['#d1d5db'], // Grey for no data
            hoverBackgroundColor: strategicTagLabels.length > 0 ? [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
            ] : ['#9ca3af'],
        }]
    };

    // Chart Data for KR Type Distribution
    const krTypeLabels = ['Kết quả', 'Hoạt động'];
    const krTypeDataValues = [charts?.kr_type_distribution?.outcome || 0, charts?.kr_type_distribution?.activity || 0];
    const krTypeChartData = {
        labels: krTypeLabels,
        datasets: [{
            data: krTypeDataValues[0] + krTypeDataValues[1] > 0 ? krTypeDataValues : [1],
            backgroundColor: krTypeDataValues[0] + krTypeDataValues[1] > 0 ? [
                '#4BC0C0', '#FF9F40'
            ] : ['#d1d5db'],
            hoverBackgroundColor: krTypeDataValues[0] + krTypeDataValues[1] > 0 ? [
                '#4BC0C0', '#FF9F40'
            ] : ['#9ca3af'],
        }]
    };


    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <StatCard 
                    icon={<FiAward className="w-6 h-6" />}
                    title="Tỷ lệ KR Kết quả" 
                    value={`${statCards.outcome_kr_rate}%`}
                    tooltip="Tỷ lệ phần trăm các Key Result được phân loại là 'Kết quả' (outcome-based) thay vì 'Hoạt động' (activity-based)."
                />
                <StatCard 
                    icon={<FiStar className="w-6 h-6" />}
                    title="Tỷ lệ O Tham vọng" 
                    value={`${statCards.aspirational_rate}%`}
                    tooltip="Tỷ lệ phần trăm các Mục tiêu được đánh dấu là 'Tham vọng', có thể không đạt 100%."
                />
                <StatCard 
                    icon={<FiClipboard className="w-6 h-6" />}
                    title="Số KR TB/O Toàn Công ty" 
                    value={`${statCards.avg_krs_per_objective}`}
                    tooltip="Số lượng Key Result trung bình trên mỗi Mục tiêu. Con số lý tưởng thường là từ 2 đến 5."
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper title="Phân bổ Mục tiêu theo Thẻ Chiến lược">
                    {strategicTagLabels.length > 0 ? (
                        <Pie data={strategicTagChartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '0%' }} />
                    ) : (
                        <div className="text-center text-gray-500 mt-10">Không có dữ liệu thẻ chiến lược.</div>
                    )}
                </ChartWrapper>
                <ChartWrapper title="Phân bổ Loại Key Result">
                    {krTypeDataValues[0] + krTypeDataValues[1] > 0 ? (
                        <Pie data={krTypeChartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '0%' }} />
                    ) : (
                        <div className="text-center text-gray-500 mt-10">Không có dữ liệu loại KR.</div>
                    )}
                </ChartWrapper>
            </div>
            
            {/* Detailed Table */}
            <QualityTable tableData={table} />
        </div>
    );
}
