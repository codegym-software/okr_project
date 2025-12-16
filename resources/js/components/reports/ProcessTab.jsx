import React from 'react';
import StatCard from './StatCard';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import EmptyState from './EmptyState';
import { FiBarChart2, FiPieChart, FiTrendingDown, FiCheckSquare, FiLink, FiLayers, FiRepeat } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const createGradient = (ctx, area, colorStops) => {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    colorStops.forEach(stop => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
};

// A flexible wrapper that provides a title and a relative container for the chart
const ChartWrapper = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col ${className}`}>
        <h3 className="font-semibold text-lg mb-4 text-gray-800 flex-shrink-0">{title}</h3>
        <div className="relative flex-grow min-h-0">
            {children}
        </div>
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

const tooltipOptions = {
    backgroundColor: '#fff',
    titleColor: '#333',
    bodyColor: '#666',
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 10,
    usePointStyle: true,
};

export default function ProcessTab({ data }) {
    if (!data) {
        return <div className="text-center p-8">Không có dữ liệu để hiển thị.</div>;
    }

    const { statCards, charts, table } = data;
    
    // --- Chart 1: Compliance by Dept (Bar) ---
    const complianceByDeptData = {
        labels: charts?.checkin_compliance_by_dept?.map(d => d.department_name) || [],
        datasets: [{
            label: 'Tỷ lệ Tuân thủ (%)',
            data: charts?.checkin_compliance_by_dept?.map(d => d.compliance_rate) || [],
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
        }]
    };
    const complianceByDeptOptions = {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { ...tooltipOptions, callbacks: {
                label: ctx => `Tuân thủ: ${ctx.parsed.x?.toFixed(2) || 0}%`
            }}
        },
        scales: { x: { beginAtZero: true, max: 100, grid: { drawBorder: false } }, y: { grid: { display: false } } }
    };
    // Calculate a dynamic height for the canvas, ensuring it's not too small
    const barCanvasHeight = Math.max(280, (complianceByDeptData.labels.length || 1) * 35);


    // --- Chart 2: Health Distribution (Doughnut) ---
    const healthDistData = {
        labels: ['On Track', 'At Risk', 'Off Track'],
        datasets: [{
            data: [
                charts?.health_status_distribution?.on_track || 0, 
                charts?.health_status_distribution?.at_risk || 0, 
                charts?.health_status_distribution?.off_track || 0
            ],
            backgroundColor: ['rgba(22, 163, 74, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(220, 38, 38, 0.7)'],
            borderColor: ['rgb(22, 163, 74)', 'rgb(245, 158, 11)', 'rgb(220, 38, 38)'],
            borderWidth: 2,
            hoverOffset: 4,
        }]
    };
    const healthDistOptions = {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 15 } },
            tooltip: { ...tooltipOptions, callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.parsed || 0} mục tiêu`
            }}
        }
    };

    // --- Chart 3: Compliance Trend (Line) ---
    const trendData = {
        labels: Object.keys(charts?.process_compliance_trend || {}),
        datasets: [{
            label: 'Số KR đã Check-in (Tích lũy)',
            data: Object.values(charts?.process_compliance_trend || {}),
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: (context) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return null;
                return createGradient(ctx, chartArea, [{ offset: 0, color: 'rgba(139, 92, 246, 0)' }, { offset: 1, color: 'rgba(139, 92, 246, 0.4)' }]);
            },
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgb(139, 92, 246)',
        }]
    };
    const trendOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { ...tooltipOptions }
        },
        scales: { y: { grid: { drawBorder: false } }, x: { grid: { display: false } } }
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={<FiCheckSquare className="w-6 h-6" />} title="Tỷ lệ KR có Check-in" value={`${statCards.check_in_rate}%`} tooltip="Tỷ lệ phần trăm các Key Result có ít nhất một lần check-in trong chu kỳ." />
                <StatCard icon={<FiLink className="w-6 h-6" />} title="Tỷ lệ OKR đã Căn chỉnh" value={`${statCards.alignment_rate}%`} tooltip="Tỷ lệ phần trăm các Mục tiêu (không phải cấp công ty) được căn chỉnh/liên kết với một Mục tiêu khác." />
                <StatCard icon={<FiLayers className="w-6 h-6" />} title="Tỷ lệ Hoàn thành Thiết lập" value={`${statCards.setup_completion_rate}%`} tooltip="Tỷ lệ phần trăm các Mục tiêu có ít nhất một Key Result được định nghĩa." />
                <StatCard icon={<FiRepeat className="w-6 h-6" />} title="Tần suất Check-in TB/Người" value={`${statCards.avg_checkins_per_user}`} tooltip="Số lần check-in trung bình trên mỗi người dùng (có sở hữu KR) trong chu kỳ này." />
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: '28rem' }}>
                <ChartWrapper title="Xếp hạng Tuân thủ Check-in theo Phòng ban">
                    {(charts?.checkin_compliance_by_dept || []).length > 0 ? (
                        <div className="absolute inset-0 overflow-y-auto pr-2">
                            <div style={{ height: `${barCanvasHeight}px` }}>
                                <Bar data={complianceByDeptData} options={complianceByDeptOptions} />
                            </div>
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full"><EmptyState icon={FiBarChart2} title="Không có dữ liệu" /></div>
                    )}
                </ChartWrapper>

                <ChartWrapper title="Phân bổ Trạng thái (Health) OKR">
                    {(charts?.health_status_distribution?.on_track + charts?.health_status_distribution?.at_risk + charts?.health_status_distribution?.off_track) > 0 ? (
                        <div className="absolute inset-0">
                            <Doughnut data={healthDistData} options={healthDistOptions} />
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full"><EmptyState icon={FiPieChart} title="Không có dữ liệu" /></div>
                    )}
                </ChartWrapper>
                
                <ChartWrapper title="Xu hướng Tuân thủ Check-in">
                    {Object.keys(charts?.process_compliance_trend || {}).length > 0 ? (
                        <div className="absolute inset-0">
                            <Line data={trendData} options={trendOptions} />
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full"><EmptyState icon={FiTrendingDown} title="Không có dữ liệu" /></div>
                    )}
                </ChartWrapper>
            </div>

            {/* Table */}
            <ProcessTable tableData={table} />
        </div>
    );
}
