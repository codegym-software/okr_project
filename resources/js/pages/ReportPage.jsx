import React, { useEffect, useState, useMemo } from "react";
import { Select } from "../components/ui";
import ToastNotification from "../components/ToastNotification";
import { exportTeamReportToExcel } from "../utils/reports/exportHelpers";
import { FiDownload, FiAlertTriangle, FiEye, FiTrendingUp, FiUsers, FiActivity } from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [departmentName, setDepartmentName] = useState("");
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("performance");

    // UI State
    const [toast, setToast] = useState({ message: null, type: null });

    // --- DATA FETCHING ---
    const loadReportData = async (cycleId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/reports/my-team?cycle_id=${cycleId}`, { headers: { Accept: "application/json" } });
            const json = await res.json();
            if (json.success) {
                setReportData(json.data);
                setDepartmentName(json.department_name);
            } else {
                setError(json.message);
            }
        } catch (e) {
            console.error("Error loading report:", e);
            setError("Lỗi kết nối server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/reports/cycles", { headers: { Accept: "application/json" } });
                const data = await res.json();
                if (data.success && data.data.length > 0) {
                    setCycles(data.data);
                    const defaultCycleId = data.meta?.default_cycle_id ?? data.data[0].cycle_id;
                    setSelectedCycle(String(defaultCycleId));
                }
            } catch (e) {
                console.error("Error loading cycles:", e);
            }
        })();
    }, []);

    useEffect(() => {
        if (selectedCycle) loadReportData(selectedCycle);
    }, [selectedCycle]);

    const handleExportExcel = () => {
        if (!reportData) return;
        const cycleName = cycles.find(c => String(c.cycle_id) === String(selectedCycle))?.cycle_name || "";
        
        exportTeamReportToExcel(
            reportData,
            departmentName,
            cycleName,
            (msg) => setToast({ message: msg, type: 'success' }),
            (msg) => setToast({ message: msg, type: 'error' })
        );
    };

    // --- CALCULATIONS & PROPS ---
    const stats = useMemo(() => {
        if (!reportData) return { avgProgress: 0, atRiskRate: 0, avgContribution: 0 };

        const members = reportData.members || [];
        const okrs = reportData.team_okrs || [];
        
        // Filter for Unit (Department) level OKRs first
        // Ensure case-insensitive comparison and handle potential missing level
        const unitOkrs = okrs.filter(okr => (okr.level || '').toLowerCase() === 'unit');
        
        // 1. Avg Dept Progress
        // Use pre-calculated or calculate from Unit OKRs
        let totalProgress = 0;
        unitOkrs.forEach(okr => {
            totalProgress += Number(okr.progress || 0);
        });
        const avgProgress = unitOkrs.length > 0 ? (totalProgress / unitOkrs.length) : 0;

        // 2. At Risk Rate (Percentage of Department Objectives At Risk or Behind)
        // Includes 'at_risk', 'behind', 'off_track', 'in_trouble' to capture all negative statuses
        let riskCount = 0;
        const riskStatuses = ['at_risk', 'behind', 'off_track', 'in_trouble'];
        
        unitOkrs.forEach(okr => {
            if (riskStatuses.includes((okr.status || '').toLowerCase())) {
                riskCount++;
            }
        });
        const atRiskRate = unitOkrs.length > 0 ? (riskCount / unitOkrs.length) * 100 : 0;

        // 3. Avg Contribution / User
        const totalContribution = members.reduce((acc, m) => acc + (Number(m.total_kr_contributed) || 0), 0);
        const avgContribution = members.length > 0 ? (totalContribution / members.length) : 0;

        return { avgProgress, atRiskRate, avgContribution };
    }, [reportData]);

    const chartData = useMemo(() => {
        if (!reportData) return { bar: null, line: null };

        // Bar Chart: Member Ranking
        const sortedMembers = [...(reportData.members || [])].sort((a, b) => (b.average_completion || 0) - (a.average_completion || 0));
        const barData = {
            labels: sortedMembers.map(m => m.full_name),
            datasets: [
                {
                    label: 'Tiến độ (%)',
                    data: sortedMembers.map(m => m.average_completion || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue-500
                    borderRadius: 4,
                }
            ]
        };

        // Line Chart: Progress vs Ideal
        // Simulating a timeline since we might not have daily history
        const idealProgress = reportData.expected_progress || 0;
        const currentProgress = stats.avgProgress;
        
        const lineData = {
            labels: ['Bắt đầu', 'Hiện tại', 'Kết thúc'],
            datasets: [
                {
                    label: 'Thực tế',
                    data: [0, currentProgress, null], // Null for end if not reached
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Kế hoạch (Ideal)',
                    data: [0, idealProgress, 100],
                    borderColor: 'rgba(148, 163, 184, 1)', // Slate-400
                    borderDash: [5, 5],
                    tension: 0,
                    pointRadius: 0
                }
            ]
        };

        return { bar: barData, line: lineData };
    }, [reportData, stats]);

    const getOwner = (userId) => {
        if (!reportData?.members) return { name: 'Unknown', avatar: null };
        const user = reportData.members.find(m => m.user_id === userId);
        return user ? { name: user.full_name, avatar: user.avatar } : { name: 'Unknown', avatar: null };
    };

    const StatusBadge = ({ status }) => {
        const config = {
            completed: { color: "bg-green-100 text-green-700", text: "Hoàn thành" },
            on_track: { color: "bg-green-100 text-green-700", text: "Đúng tiến độ" },
            at_risk: { color: "bg-yellow-100 text-yellow-700", text: "Rủi ro" },
            behind: { color: "bg-red-100 text-red-700", text: "Chậm trễ" },
            pending: { color: "bg-gray-100 text-gray-600", text: "Chờ duyệt" }
        };
        const { color, text } = config[status] || config.pending;
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{text}</span>;
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
            <div className="max-w-7xl mx-auto px-6 py-8">
                
                {/* 1. HEADER & CONTROLS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo cáo Thống kê Phòng ban</h1>
                        {departmentName && <p className="text-slate-500 text-sm mt-1">{departmentName}</p>}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-48">
                            <Select
                                value={selectedCycle}
                                onChange={setSelectedCycle}
                                options={cycles.map(c => ({ value: String(c.cycle_id), label: c.cycle_name }))}
                                placeholder="Chọn chu kỳ"
                            />
                        </div>
                        <button
                            onClick={handleExportExcel}
                            disabled={!reportData}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <FiDownload className="w-4 h-4" />
                            <span>Xuất Dữ liệu</span>
                        </button>
                    </div>
                </div>

                {/* 2. NAVIGATION TABS */}
                <div className="border-b border-slate-200 mb-8">
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {['Hiệu suất', 'Tuân thủ Quy trình', 'Chất lượng & Cấu trúc'].map((tab) => {
                            const key = tab === 'Hiệu suất' ? 'performance' : (tab === 'Tuân thủ Quy trình' ? 'compliance' : 'quality');
                            const isActive = activeTab === key;
                            
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(key)}
                                    className={`
                                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                        ${isActive
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                                    `}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* 3. MAIN CONTENT */}
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                        Đang tải dữ liệu...
                    </div>
                ) : activeTab === 'performance' ? (
                    <div className="space-y-8">
                        
                        {/* STAT CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tiến độ TB Phòng ban</h3>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        <FiActivity className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{stats.avgProgress.toFixed(1)}%</div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tỷ lệ Rủi ro</h3>
                                    <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                                        <FiAlertTriangle className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900">{stats.atRiskRate.toFixed(1)}%</span>
                                    <span className="text-sm text-slate-400 mb-1">trên tổng số OKR</span>
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Đóng góp TB/Thành viên</h3>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                        <FiUsers className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{stats.avgContribution.toFixed(1)}</div>
                            </div>
                        </div>

                        {/* CHARTS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Bar Chart */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Xếp hạng Tiến độ theo Thành viên</h3>
                                <div className="h-64">
                                    {chartData.bar && (
                                        <Bar 
                                            data={chartData.bar} 
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: { y: { beginAtZero: true, max: 100 } }
                                            }} 
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Line Chart */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Tiến độ Phòng ban vs Kế hoạch</h3>
                                <div className="h-64">
                                    {chartData.line && (
                                        <Line 
                                            data={{
                                                ...chartData.line,
                                                datasets: chartData.line.datasets.map(ds => ({
                                                    ...ds,
                                                    label: ds.label === 'Kế hoạch (Ideal)' ? 'Kế hoạch (Lý tưởng)' : ds.label
                                                }))
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { position: 'bottom' } },
                                                scales: { y: { beginAtZero: true, max: 100 } }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* DETAILED DATA TABLE */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800">Chi tiết Hiệu suất (OKR Phòng ban)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                            <th className="px-6 py-4">Tên Mục tiêu</th>
                                            <th className="px-6 py-4">Chủ sở hữu</th>
                                            <th className="px-6 py-4">Cấp độ</th>
                                            <th className="px-6 py-4 w-1/6">Tiến độ</th>
                                            <th className="px-6 py-4">Trạng thái</th>
                                            <th className="px-6 py-4">Liên kết</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData?.team_okrs
                                            ?.filter(okr => (okr.level || '').toLowerCase() === 'unit')
                                            .map((okr, index) => {
                                                const owner = getOwner(okr.user_id);
                                                
                                                return (
                                                    <tr key={index} className="hover:bg-slate-50 transition-colors text-sm">
                                                        <td className="px-6 py-4">
                                                            <a href="#" className="font-medium text-blue-600 hover:underline line-clamp-2" title={okr.obj_title}>
                                                                {okr.obj_title}
                                                            </a>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <img 
                                                                    src={owner.avatar || `https://ui-avatars.com/api/?name=${owner.name || 'U'}&background=random`} 
                                                                    alt={owner.name} 
                                                                    className="w-6 h-6 rounded-full"
                                                                />
                                                                <span className="text-slate-700 truncate max-w-[100px]" title={owner.name}>
                                                                    {owner.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-indigo-50 text-indigo-600 border-indigo-100">
                                                                P.BAN
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full ${okr.progress >= 70 ? 'bg-green-500' : okr.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                                        style={{ width: `${okr.progress}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700">{okr.progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge status={okr.status} />
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                                            {/* Placeholder for Linked To */}
                                                            {okr.parent_objective_title ? (
                                                                <span className="text-blue-600 cursor-pointer block truncate max-w-[150px]" title={okr.parent_objective_title}>
                                                                    {okr.parent_objective_title}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                        })}
                                        {(!reportData?.team_okrs || reportData.team_okrs.filter(okr => (okr.level || '').toLowerCase() === 'unit').length === 0) && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                                    Không có dữ liệu OKR phòng ban nào trong chu kỳ này.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="h-96 flex items-center justify-center bg-white rounded-xl border border-slate-200 border-dashed">
                        <div className="text-center text-slate-400">
                            <p className="text-lg font-medium mb-1">Sắp ra mắt</p>
                            <p className="text-sm">Chức năng này đang được phát triển.</p>
                        </div>
                    </div>
                )}
                
                {/* Toast Notification */}
                <ToastNotification 
                    toast={toast}
                    onClose={() => setToast({ message: null, type: null })}
                />
            </div>
        </div>
    );
}