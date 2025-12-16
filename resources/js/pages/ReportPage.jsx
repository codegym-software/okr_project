import React, { useEffect, useState, useMemo } from "react";
import { Select } from "../components/ui";
import ToastNotification from "../components/ToastNotification";
import { exportTeamReportToExcel } from "../utils/reports/exportHelpers";
import { FiDownload, FiAlertTriangle, FiEye, FiTrendingUp, FiUsers, FiActivity, FiCheckCircle, FiClock, FiLink, FiUserX, FiSave, FiList, FiTrash2 } from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [trendData, setTrendData] = useState([]); 
    const [departmentName, setDepartmentName] = useState("");
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("performance");

    // Snapshot States
    const [isSaving, setIsSaving] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [savedReports, setSavedReports] = useState([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null); // If viewing a snapshot

    // UI State
    const [toast, setToast] = useState({ message: null, type: null });

    // --- DATA FETCHING ---
    const loadReportData = async (cycleId) => {
        setLoading(true);
        setError(null);
        setSelectedSnapshot(null); // Reset snapshot view when cycle changes
        try {
            // Load main report
            const res = await fetch(`/api/reports/my-team?cycle_id=${cycleId}`, { headers: { Accept: "application/json" } });
            const json = await res.json();
            if (json.success) {
                setReportData(json.data);
                setDepartmentName(json.department_name);
            } else {
                setError(json.message);
            }

            // Load trend data
            await fetchTrendData(cycleId);

        } catch (e) {
            console.error("Error loading report:", e);
            setError("Lỗi kết nối server");
        } finally {
            setLoading(false);
        }
    };

    const fetchTrendData = async (cycleId) => {
        try {
            const res = await fetch(`/api/reports/progress-trend?cycle_id=${cycleId}`, { headers: { Accept: "application/json" } });
            const json = await res.json();
            if (json.success) {
                setTrendData(json.data || []);
            }
        } catch (e) {
            console.error("Error loading trend:", e);
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

    // --- SNAPSHOT ACTIONS ---
    const handleSaveSnapshot = async () => {
        if (!selectedCycle) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/reports/snapshots/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    // Add CSRF token if needed, or rely on cookie
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    report_type: 'team',
                    cycle_id: selectedCycle,
                    // Optional: prompt user for name/notes
                })
            });
            const json = await res.json();
            if (json.success) {
                setToast({ message: "Đã lưu báo cáo thành công!", type: 'success' });
            } else {
                setToast({ message: json.message || "Lỗi khi lưu báo cáo", type: 'error' });
            }
        } catch (e) {
            setToast({ message: "Lỗi kết nối server", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const fetchSavedReports = async () => {
        try {
            const res = await fetch(`/api/reports/snapshots/list?report_type=team&cycle_id=${selectedCycle}`);
            const json = await res.json();
            if (json.success) {
                setSavedReports(json.data);
                setShowHistoryModal(true);
            }
        } catch (e) {
            setToast({ message: "Không thể tải danh sách báo cáo", type: 'error' });
        }
    };

    const loadSnapshot = async (reportId) => {
        setLoading(true);
        setShowHistoryModal(false);
        try {
            const res = await fetch(`/api/reports/snapshots/${reportId}`);
            const json = await res.json();
            if (json.success) {
                setReportData(json.data.snapshot_data);
                setSelectedSnapshot(json.data); // Store metadata
                setToast({ message: `Đang xem: ${json.data.report_name}`, type: 'info' });
            }
        } catch (e) {
            setToast({ message: "Lỗi tải báo cáo lưu trữ", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const deleteReport = async (reportId) => {
        if(!confirm("Bạn có chắc chắn muốn xóa báo cáo này?")) return;
        try {
            const res = await fetch(`/api/reports/snapshots/${reportId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                }
            });
            if (res.ok) {
                setSavedReports(prev => prev.filter(r => r.report_id !== reportId));
                setToast({ message: "Đã xóa báo cáo", type: 'success' });
            }
        } catch (e) {
            setToast({ message: "Lỗi khi xóa", type: 'error' });
        }
    };

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

    // --- TAB 1: PERFORMANCE LOGIC ---
    const stats = useMemo(() => {
        if (!reportData) return { avgProgress: 0, atRiskRate: 0, avgContribution: 0 };

        const members = reportData.members || [];
        const okrs = reportData.team_okrs || [];
        
        // Filter for Unit (Department) level OKRs first
        const unitOkrs = okrs.filter(okr => (okr.level || '').toLowerCase() === 'unit');
        
        // 1. Avg Dept Progress
        let totalProgress = 0;
        unitOkrs.forEach(okr => {
            totalProgress += Number(okr.progress || 0);
        });
        const avgProgress = unitOkrs.length > 0 ? (totalProgress / unitOkrs.length) : 0;

        // 2. At Risk Rate
        let riskCount = 0;
        const riskStatuses = ['at_risk', 'behind', 'off_track', 'in_trouble'];
        
        unitOkrs.forEach(okr => {
            if (riskStatuses.includes((okr.status || '').toLowerCase())) {
                riskCount++;
            }
        });
        const atRiskRate = unitOkrs.length > 0 ? (riskCount / unitOkrs.length) * 100 : 0;

        // 3. Avg Contribution / User
        const totalPersonalProgress = members.reduce((acc, m) => acc + (Number(m.average_completion) || 0), 0);
        const avgContribution = members.length > 0 ? (totalPersonalProgress / members.length) : 0;

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
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4,
                }
            ]
        };

        // Line Chart: Progress vs Ideal
        // Note: When viewing a snapshot, trend data might not be available or might be static.
        // For now, we keep using the 'trendData' state which is fetched separately.
        // Ideally, snapshot should include trend data too.
        
        let lineLabels = [];
        let actualData = [];
        let idealData = [];

        const currentCycleInfo = cycles.find(c => String(c.cycle_id) === String(selectedCycle));
        
        if (currentCycleInfo && currentCycleInfo.start_date && currentCycleInfo.end_date) {
            const start = new Date(currentCycleInfo.start_date);
            const end = new Date(currentCycleInfo.end_date);
            const diffTime = Math.abs(end - start);
            const totalWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

            lineLabels = Array.from({ length: totalWeeks }, (_, i) => `Tuần ${i + 1}`);
            
            const step = 100 / (totalWeeks > 0 ? totalWeeks : 1);
            idealData = Array.from({ length: totalWeeks }, (_, i) => Math.min(100, (i + 1) * step));

            if (trendData && trendData.length > 0) {
                actualData = trendData.map(d => d.avg_progress);
            } else {
                const now = new Date();
                actualData = Array(totalWeeks).fill(null);
                actualData[0] = 0;

                if (now >= start) {
                    const elapsed = Math.abs(now - start);
                    const currentWeekIndex = Math.floor(elapsed / (1000 * 60 * 60 * 24 * 7));
                    const targetIndex = Math.min(currentWeekIndex, totalWeeks - 1);
                    actualData[targetIndex] = stats.avgProgress;
                } else {
                    actualData = []; 
                }
            }
        } else {
            lineLabels = ['Bắt đầu', 'Hiện tại', 'Kết thúc'];
            actualData = [0, stats.avgProgress, null];
            idealData = [0, reportData?.expected_progress || 0, 100];
        }
        
        const lineData = {
            labels: lineLabels,
            datasets: [
                {
                    label: 'Thực tế',
                    data: actualData,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.1,
                    fill: true,
                    spanGaps: true
                },
                {
                    label: 'Kế hoạch (Lý tưởng)',
                    data: idealData,
                    borderColor: 'rgba(148, 163, 184, 1)',
                    borderDash: [5, 5],
                    tension: 0,
                    pointRadius: 0
                }
            ]
        };

        return { bar: barData, line: lineData };
    }, [reportData, stats, trendData, cycles, selectedCycle]);

    // --- TAB 2: COMPLIANCE LOGIC (ISOLATED) ---
    const complianceCharts = useMemo(() => {
        if (!reportData) return { complianceBar: null, statusDoughnut: null };

        // 1. Compliance Ranking (Bar)
        const sortedByCompliance = [...(reportData.members || [])].sort((a, b) => (b.checkin_compliance_score || 0) - (a.checkin_compliance_score || 0));
        const complianceBarData = {
            labels: sortedByCompliance.map(m => m.full_name),
            datasets: [
                {
                    label: 'Điểm tuân thủ',
                    data: sortedByCompliance.map(m => m.checkin_compliance_score || 0),
                    backgroundColor: sortedByCompliance.map(m => {
                        const score = m.checkin_compliance_score || 0;
                        if (score >= 80) return 'rgba(34, 197, 94, 0.7)'; // Green
                        if (score >= 50) return 'rgba(234, 179, 8, 0.7)'; // Yellow
                        return 'rgba(239, 68, 68, 0.7)'; // Red
                    }),
                    borderRadius: 4,
                }
            ]
        };

        // 2. Status Distribution (Doughnut)
        const statusCounts = { completed: 0, on_track: 0, at_risk: 0, behind: 0 };
        (reportData.team_okrs || []).forEach(okr => {
            const s = (okr.status || 'on_track').toLowerCase();
            if (s === 'completed') statusCounts.completed++;
            else if (s === 'on_track') statusCounts.on_track++;
            else if (s === 'at_risk' || s === 'warning') statusCounts.at_risk++;
            else statusCounts.behind++;
        });
        
        const statusDoughnutData = {
            labels: ['Hoàn thành', 'Đúng hạn', 'Rủi ro', 'Chậm trễ'],
            datasets: [
                {
                    data: [statusCounts.completed, statusCounts.on_track, statusCounts.at_risk, statusCounts.behind],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)', // Green
                        'rgba(59, 130, 246, 0.8)', // Blue
                        'rgba(234, 179, 8, 0.8)', // Yellow
                        'rgba(239, 68, 68, 0.8)', // Red
                    ],
                    borderWidth: 0,
                }
            ]
        };

        return { complianceBar: complianceBarData, statusDoughnut: statusDoughnutData };
    }, [reportData]);


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
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo cáo Thống kê Phòng ban</h1>
                            {selectedSnapshot && (
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                                    Đang xem bản lưu: {new Date(selectedSnapshot.created_at).toLocaleString('vi-VN')}
                                </span>
                            )}
                        </div>
                        {departmentName && <p className="text-slate-500 text-sm mt-1">{departmentName}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        {!selectedSnapshot ? (
                            <>
                                <div className="w-48">
                                    <Select
                                        value={selectedCycle}
                                        onChange={setSelectedCycle}
                                        options={cycles.map(c => ({ value: String(c.cycle_id), label: c.cycle_name }))}
                                        placeholder="Chọn chu kỳ"
                                    />
                                </div>
                                <button
                                    onClick={fetchSavedReports}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Lịch sử báo cáo"
                                >
                                    <FiList className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSaveSnapshot}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
                                >
                                    {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></span> : <FiSave className="w-4 h-4" />}
                                    <span>Lưu</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => { setSelectedSnapshot(null); loadReportData(selectedCycle); }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
                            >
                                Quay lại Hiện tại
                            </button>
                        )}
                        
                        <button
                            onClick={handleExportExcel}
                            disabled={!reportData}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <FiDownload className="w-4 h-4" />
                            <span>Xuất Excel</span>
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
                                <div className="text-3xl font-bold text-slate-900">{stats.avgContribution.toFixed(1)}%</div>
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
                                                plugins: { 
                                                    legend: { position: 'bottom' },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: function(context) {
                                                                let label = context.dataset.label || '';
                                                                if (label) {
                                                                    label += ': ';
                                                                }
                                                                if (context.parsed.y !== null) {
                                                                    label += context.parsed.y + '%';
                                                                }
                                                                
                                                                // Show OKR Count for "Thực tế" dataset
                                                                // Only show count if NOT in snapshot view (since snapshot might not have trendData)
                                                                if (!selectedSnapshot && context.datasetIndex === 0 && trendData && trendData[context.dataIndex]) {
                                                                     const count = trendData[context.dataIndex].okr_count;
                                                                     if (count !== undefined) {
                                                                         return [label, `Số lượng OKR: ${count}`];
                                                                     }
                                                                }
                                                                return label;
                                                            }
                                                        }
                                                    }
                                                },
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
                ) : activeTab === 'compliance' ? (
                    // --- TAB 2: QUY TRÌNH & TUÂN THỦ ---
                    <div className="space-y-8">
                        
                        {/* COMPLIANCE STAT CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Card 1: Check-in Rate */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tỷ lệ Check-in Định kỳ</h3>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                        <FiCheckCircle className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{reportData?.checkin_compliance_rate || 0}%</div>
                            </div>

                            {/* Card 2: Missed Check-ins */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">OKR Lỡ Check-in</h3>
                                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                        <FiClock className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900">{reportData?.missed_checkins_count || 0}</span>
                                    <span className="text-sm text-slate-400 mb-1">mục tiêu</span>
                                </div>
                            </div>

                            {/* Card 3: Alignment Rate */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tỷ lệ Căn chỉnh</h3>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        <FiLink className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{reportData?.alignment_rate || 0}%</div>
                            </div>

                            {/* Card 4: Unchecked Members */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Thành viên chưa Check-in</h3>
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                                        <FiUserX className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900">{reportData?.members_without_checkin_count || 0}</span>
                                    <span className="text-sm text-slate-400 mb-1">người</span>
                                </div>
                            </div>
                        </div>

                        {/* CHARTS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Bar Chart: Compliance Ranking */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Xếp hạng Tuân thủ Check-in</h3>
                                <div className="h-64">
                                    {complianceCharts.complianceBar && (
                                        <Bar 
                                            data={complianceCharts.complianceBar} 
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

                            {/* Doughnut Chart: OKR Health */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Phân bổ Trạng thái Sức khỏe OKR</h3>
                                <div className="h-64 flex justify-center">
                                    {complianceCharts.statusDoughnut && (
                                        <Doughnut 
                                            data={complianceCharts.statusDoughnut} 
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { position: 'right' } }
                                            }} 
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* DETAILED COMPLIANCE TABLE */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800">Chi tiết Tuân thủ & Sức khỏe Mục tiêu</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                            <th className="px-6 py-4">Tên Mục tiêu</th>
                                            <th className="px-6 py-4">Người sở hữu</th>
                                            <th className="px-6 py-4">Tình trạng</th>
                                            <th className="px-6 py-4">Check-in gần nhất</th>
                                            <th className="px-6 py-4 text-center">Quá hạn (Ngày)</th>
                                            <th className="px-6 py-4 text-center">Tỷ lệ Check-in</th>
                                            <th className="px-6 py-4 text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reportData?.team_okrs || []).map((okr, index) => {
                                            const owner = getOwner(okr.user_id);
                                            const isOverdue = okr.days_overdue > 7 && okr.status !== 'completed';
                                            
                                            return (
                                                <tr key={index} className="hover:bg-slate-50 transition-colors text-sm">
                                                    <td className="px-6 py-4">
                                                        <a href="#" className="font-medium text-slate-900 hover:text-blue-600 hover:underline line-clamp-2" title={okr.obj_title}>
                                                            {okr.obj_title}
                                                        </a>
                                                        <span className="text-xs text-slate-400 block mt-1 uppercase">{okr.level}</span>
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
                                                        <StatusBadge status={okr.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {okr.last_checkin_date ? new Date(okr.last_checkin_date).toLocaleDateString('vi-VN') : 'Chưa check-in'}
                                                    </td>
                                                    <td className={`px-6 py-4 text-center font-bold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                                                        {okr.days_overdue > 0 ? okr.days_overdue : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${okr.personal_checkin_rate >= 80 ? 'bg-green-500' : okr.personal_checkin_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${okr.personal_checkin_rate || 0}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-xs text-slate-600">{okr.personal_checkin_rate || 0}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button 
                                                            className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors font-medium"
                                                            onClick={() => alert(`Nhắc nhở ${owner.name} check-in mục tiêu này!`)}
                                                        >
                                                            Nhắc nhở
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!reportData?.team_okrs || reportData.team_okrs.length === 0) && (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                                    Chưa có dữ liệu.
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
                
                {/* REPORTS HISTORY MODAL */}
                {showHistoryModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowHistoryModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Danh sách báo cáo đã lưu
                                        </h3>
                                        <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-500">✕</button>
                                    </div>
                                    <div className="mt-2 overflow-x-auto max-h-96">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên báo cáo</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người tạo</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {savedReports.map((report) => (
                                                    <tr key={report.report_id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {report.report_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {report.creator?.full_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {report.created_at_formatted}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button 
                                                                onClick={() => loadSnapshot(report.report_id)}
                                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                            >
                                                                Xem
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteReport(report.report_id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                <FiTrash2 />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {savedReports.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                                            Chưa có báo cáo nào được lưu.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
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