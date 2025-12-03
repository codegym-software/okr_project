import React, { useEffect, useState, useMemo } from "react";
import { Select } from "../components/ui";
import { FiDownload, FiFilter, FiAlertCircle, FiCheckCircle, FiClock, FiTrendingUp, FiUsers, FiMoreHorizontal } from "react-icons/fi";

// --- MOCK DATA FOR UI DEVELOPMENT ---
// Dữ liệu giả lập để hiển thị khi chưa có API hoặc API lỗi, giúp UI luôn đẹp.
const MOCK_DATA = {
    team_average_completion: 68,
    total_okr_count: 12,
    at_risk_count: 3,
    check_in_rate: 85,
    progress_trend: [20, 35, 45, 50, 60, 65, 68], // 7 tuần gần nhất
    status_distribution: { on_track: 60, at_risk: 30, behind: 10 },
    members: [
        { user_id: 1, full_name: "Nguyễn Văn A", role: "Product Owner", average_completion: 75, last_checkin: "2023-10-25", okr_count: 3, avatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A&background=0D8ABC&color=fff" },
        { user_id: 2, full_name: "Trần Thị B", role: "Senior Dev", average_completion: 45, last_checkin: "2023-10-20", okr_count: 4, avatar: "https://ui-avatars.com/api/?name=Tran+Thi+B&background=FC5C7D&color=fff" },
        { user_id: 3, full_name: "Lê Hoàng C", role: "Designer", average_completion: 90, last_checkin: "2023-10-26", okr_count: 2, avatar: "https://ui-avatars.com/api/?name=Le+Hoang+C&background=6A9113&color=fff" },
    ]
};

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [departmentName, setDepartmentName] = useState("");
    const [error, setError] = useState(null);
    
    // Snapshot logic
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [reportName, setReportName] = useState("");
    const [creatingSnapshot, setCreatingSnapshot] = useState(false);

    // --- DATA FETCHING ---
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

    // --- DERIVED METRICS (Tính toán chỉ số từ dữ liệu thật) ---
    const metrics = useMemo(() => {
        const data = reportData || {};
        const teamOkrs = data.team_okrs || [];
        
        // Tính toán trạng thái
        let onTrack = 0, atRisk = 0, behind = 0;
        teamOkrs.forEach(okr => {
            if (okr.progress >= 70) onTrack++;
            else if (okr.progress >= 40) atRisk++;
            else behind++;
        });
        
        const total = teamOkrs.length || 1;
        
        return {
            avgProgress: data.team_average_completion || 0,
            totalOkrs: data.team_okrs?.length || 0,
            memberCount: data.members?.length || 0,
            onTrackPct: (onTrack / total) * 100,
            atRiskPct: (atRisk / total) * 100,
            behindPct: (behind / total) * 100,
            atRiskCount: atRisk + behind
        };
    }, [reportData]);

    // --- SUB-COMPONENTS ---

    const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, trend }) => (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">{value}</h3>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
        </div>
    );

    const ProgressBar = ({ value, color = "bg-indigo-600" }) => (
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }}></div>
        </div>
    );

    const StatusBadge = ({ progress }) => {
        if (progress >= 75) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Xuất sắc</span>;
        if (progress >= 50) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Ổn định</span>;
        if (progress >= 25) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Cần lưu ý</span>;
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Chậm trễ</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* 1. HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {departmentName ? `Báo cáo ${departmentName}` : "Báo cáo Hiệu suất Nhóm"}
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">Theo dõi tiến độ, rủi ro và hiệu suất thành viên trong chu kỳ này.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-48">
                            <Select
                                value={selectedCycle}
                                onChange={setSelectedCycle}
                                options={cycles.map(c => ({ value: String(c.cycle_id), label: c.cycle_name }))}
                                placeholder="Chọn chu kỳ"
                            />
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
                        >
                            <FiDownload className="w-4 h-4" />
                            Xuất báo cáo
                        </button>
                    </div>
                </div>

                {loading ? (
                   <div className="h-96 flex items-center justify-center text-slate-400">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                       Đang tải dữ liệu...
                   </div> 
                ) : (
                    <>
                        {/* 2. OVERVIEW STATS (BENTO GRID) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard 
                                title="Tiến độ trung bình" 
                                value={`${metrics.avgProgress.toFixed(1)}%`}
                                subtitle="So với kế hoạch toàn chu kỳ"
                                icon={FiTrendingUp}
                                colorClass="bg-indigo-500 text-indigo-600"
                                trend={2.5}
                            />
                            <StatCard 
                                title="OKRs Rủi ro" 
                                value={metrics.atRiskCount}
                                subtitle="Cần sự chú ý ngay lập tức"
                                icon={FiAlertCircle}
                                colorClass="bg-rose-500 text-rose-600"
                            />
                            <StatCard 
                                title="Thành viên" 
                                value={metrics.memberCount}
                                subtitle="Đang hoạt động trong chu kỳ này"
                                icon={FiUsers}
                                colorClass="bg-blue-500 text-blue-600"
                            />
                             <StatCard 
                                title="Tổng số OKR" 
                                value={metrics.totalOkrs}
                                subtitle="Mục tiêu cấp nhóm"
                                icon={FiCheckCircle}
                                colorClass="bg-emerald-500 text-emerald-600"
                            />
                        </div>

                        {/* 3. MAIN DASHBOARD AREA */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* LEFT: Status Distribution & Risks */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 h-full">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6">Phân bổ trạng thái</h3>
                                    
                                    {/* Custom Donut Chart Representation */}
                                    <div className="relative w-48 h-48 mx-auto mb-8">
                                        <div className="w-full h-full rounded-full border-[16px] border-slate-100 relative"
                                             style={{
                                                 background: `conic-gradient(
                                                     #10b981 0% ${metrics.onTrackPct}%, 
                                                     #f59e0b ${metrics.onTrackPct}% ${metrics.onTrackPct + metrics.atRiskPct}%, 
                                                     #f43f5e ${metrics.onTrackPct + metrics.atRiskPct}% 100%
                                                 )`
                                             }}
                                        >
                                             {/* Inner White Circle to make it a Donut */}
                                            <div className="absolute inset-0 m-4 bg-white rounded-full flex flex-col items-center justify-center">
                                                <span className="text-3xl font-bold text-slate-800">{metrics.totalOkrs}</span>
                                                <span className="text-xs text-slate-400 uppercase font-bold">OKRs</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <span className="text-slate-600">Đúng tiến độ</span>
                                            </div>
                                            <span className="font-semibold text-slate-900">{Math.round(metrics.onTrackPct)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <span className="text-slate-600">Rủi ro</span>
                                            </div>
                                            <span className="font-semibold text-slate-900">{Math.round(metrics.atRiskPct)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                                <span className="text-slate-600">Chậm trễ</span>
                                            </div>
                                            <span className="font-semibold text-slate-900">{Math.round(metrics.behindPct)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Team Members Leaderboard */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-slate-800">Hiệu suất thành viên</h3>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                                <FiFilter className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                                <FiMoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                                <tr>
                                                    <th className="px-6 py-4 text-left">Thành viên</th>
                                                    <th className="px-6 py-4 text-center">OKRs</th>
                                                    <th className="px-6 py-4 text-left w-1/3">Tiến độ</th>
                                                    <th className="px-6 py-4 text-left">Check-in cuối</th>
                                                    <th className="px-6 py-4 text-right">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reportData?.members?.map((member) => (
                                                    <tr key={member.user_id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img 
                                                                    src={member.avatar || `https://ui-avatars.com/api/?name=${member.full_name}&background=random`} 
                                                                    alt={member.full_name}
                                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                                />
                                                                <div>
                                                                    <div className="font-medium text-slate-900">{member.full_name}</div>
                                                                    <div className="text-xs text-slate-500">{member.role || "Member"}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                                                                {member.total_kr_contributed || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-sm font-medium text-slate-700">{member.average_completion?.toFixed(0)}%</span>
                                                                <StatusBadge progress={member.average_completion} />
                                                            </div>
                                                            <ProgressBar 
                                                                value={member.average_completion} 
                                                                color={member.average_completion < 50 ? 'bg-rose-500' : (member.average_completion < 80 ? 'bg-indigo-500' : 'bg-emerald-500')} 
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <FiClock className="w-4 h-4 text-slate-400" />
                                                                <span>{member.last_checkin || "Chưa check-in"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Nhắc nhở
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!reportData?.members || reportData.members.length === 0) && (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                                            Chưa có dữ liệu thành viên trong chu kỳ này
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. DETAILED OKR LIST (OPTIONAL EXPANSION) */}
                        {reportData?.team_okrs && reportData.team_okrs.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Chi tiết OKRs Nhóm</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {reportData.team_okrs.map(okr => (
                                        <div key={okr.objective_id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-slate-900 line-clamp-1" title={okr.obj_title}>{okr.obj_title}</h4>
                                                <span className={`text-sm font-bold ${okr.progress >= 70 ? 'text-emerald-600' : 'text-slate-600'}`}>{okr.progress}%</span>
                                            </div>
                                            <ProgressBar value={okr.progress} color="bg-slate-800" />
                                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                                <span>{okr.completed_kr_count}/{okr.key_results_count} KRs hoàn thành</span>
                                                <span className="px-2 py-1 rounded bg-white border border-slate-200">
                                                    {okr.level === 'team' ? 'Team' : 'Department'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* CREATE SNAPSHOT MODAL */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Tạo bản lưu báo cáo</h3>
                            <p className="text-slate-500 text-sm mb-4">Hệ thống sẽ lưu lại toàn bộ số liệu tại thời điểm này để bạn có thể xem lại trong tương lai.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên báo cáo</label>
                                    <input 
                                        type="text" 
                                        value={reportName}
                                        onChange={e => setReportName(e.target.value)}
                                        placeholder={`Ví dụ: Báo cáo tuần ${new Date().getMonth() + 1}`}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3 justify-end">
                                <button 
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    onClick={() => {
                                        alert("Tính năng đang được cập nhật trong giao diện mới!");
                                        setShowCreateModal(false);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Lưu báo cáo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

