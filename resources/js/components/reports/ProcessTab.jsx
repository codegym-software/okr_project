import React from 'react';
import StatCard from './StatCard';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import EmptyState from './EmptyState';
import { FiBarChart2, FiPieChart, FiTrendingDown, FiCheckSquare, FiLink, FiLayers, FiRepeat } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend);

const ChartWrapper = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm h-96">
        <h3 className="font-semibold text-lg mb-2 text-gray-800">{title}</h3>
        {children}
    </div>
);

const ProcessTable = ({ tableData }) => {
     if (!tableData || tableData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm mt-6">
                <EmptyState 
                    icon={FiCheckSquare}
                    title="Không có dữ liệu tuân thủ"
                    message="Chưa có mục tiêu nào trong chu kỳ này để phân tích quy trình check-in."
                />
            </div>
        );
    }

    const columns = [
        'Tên Mục tiêu (O/KR)',
        'Phòng ban/Đơn vị',
        'Người Sở hữu Chính',
        'Tình trạng (Health)',
        'Check-in Gần nhất',
        'Quá hạn Check-in (Ngày)',
        'Tỷ lệ Check-in Định kỳ (%)',
    ];
    
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
            <h3 className="font-bold text-lg mb-2 p-4">Chi tiết Tuân thủ Quy trình (Sắp xếp theo mức độ bị lãng quên)</h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map(col => (
                            <th key={col} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => (
                        <tr key={row.objective_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <a href={`/objectives/${row.objective_id}`} className="hover:underline" target="_blank" rel="noopener noreferrer">{row.objective_name}</a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.owner_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><HealthStatusBadge status={row.health_status} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.last_checkin_date || 'Chưa có'}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${row.days_overdue > 14 ? 'text-red-600' : (row.days_overdue > 7 ? 'text-yellow-600' : 'text-gray-600')}`}>
                                {row.days_overdue !== null ? `${row.days_overdue} ngày` : '-'}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.periodic_checkin_rate}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function ProcessTab({ data }) {
    if (!data) {
        return <div className="text-center p-8">Không có dữ liệu để hiển thị.</div>;
    }

    const { statCards, charts, table } = data;

    // Chart data setup
    const complianceByDeptData = {
        labels: charts?.checkin_compliance_by_dept?.map(d => d.department_name) || [],
        datasets: [{
            label: 'Tỷ lệ Tuân thủ Check-in (%)',
            data: charts?.checkin_compliance_by_dept?.map(d => d.compliance_rate) || [],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
        }]
    };

    const healthDistData = {
        labels: ['On Track', 'At Risk', 'Off Track'],
        datasets: [{
            data: [
                charts?.health_status_distribution?.on_track || 0, 
                charts?.health_status_distribution?.at_risk || 0, 
                charts?.health_status_distribution?.off_track || 0
            ],
            backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
        }]
    };
    
    const trendData = {
        labels: Object.keys(charts?.process_compliance_trend || {}),
        datasets: [{
            label: 'Số KR đã Check-in (Tích lũy)',
            data: Object.values(charts?.process_compliance_trend || {}),
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            fill: true,
            tension: 0.2
        }]
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard 
                    icon={<FiCheckSquare className="w-6 h-6" />}
                    title="Tỷ lệ KR có Check-in" 
                    value={`${statCards.check_in_rate}%`}
                    tooltip="Tỷ lệ phần trăm các Key Result có ít nhất một lần check-in trong chu kỳ." 
                />
                <StatCard 
                    icon={<FiLink className="w-6 h-6" />}
                    title="Tỷ lệ OKR đã Căn chỉnh" 
                    value={`${statCards.alignment_rate}%`}
                    tooltip="Tỷ lệ phần trăm các Mục tiêu (không phải cấp công ty) được căn chỉnh/liên kết với một Mục tiêu khác."
                />
                <StatCard 
                    icon={<FiLayers className="w-6 h-6" />}
                    title="Tỷ lệ Hoàn thành Thiết lập" 
                    value={`${statCards.setup_completion_rate}%`}
                    tooltip="Tỷ lệ phần trăm các Mục tiêu có ít nhất một Key Result được định nghĩa."
                />
                <StatCard 
                    icon={<FiRepeat className="w-6 h-6" />}
                    title="Tần suất Check-in TB/Người" 
                    value={`${statCards.avg_checkins_per_user}`}
                    tooltip="Số lần check-in trung bình trên mỗi người dùng (có sở hữu KR) trong chu kỳ này." 
                />
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <ChartWrapper title="Xếp hạng Tuân thủ Check-in theo Phòng ban">
                    {(charts?.checkin_compliance_by_dept || []).length > 0 ? (
                        <Bar data={complianceByDeptData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    ) : (
                        <EmptyState icon={FiBarChart2} title="Không có dữ liệu" />
                    )}
                </ChartWrapper>
                <ChartWrapper title="Phân bổ Trạng thái (Health) OKR">
                    {(charts?.health_status_distribution?.on_track + charts?.health_status_distribution?.at_risk + charts?.health_status_distribution?.off_track) > 0 ? (
                        <Doughnut data={healthDistData} options={{ responsive: true, maintainAspectRatio: false }} />
                    ) : (
                        <EmptyState icon={FiPieChart} title="Không có dữ liệu" />
                    )}
                </ChartWrapper>
                <ChartWrapper title="Xu hướng Tuân thủ Check-in">
                    {Object.keys(charts?.process_compliance_trend || {}).length > 0 ? (
                        <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
                    ) : (
                         <EmptyState icon={FiTrendingDown} title="Không có dữ liệu" />
                    )}
                </ChartWrapper>
            </div>

            {/* Table */}
            <ProcessTable tableData={table} />
        </div>
    );
}
