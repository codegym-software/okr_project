import React, { useEffect, useState, useMemo } from "react";
import { Select } from "../components/ui";
import { FiDownload, FiFilter, FiAlertCircle, FiCheckCircle, FiClock, FiTrendingUp, FiTrendingDown, FiMinus, FiUsers, FiMoreHorizontal } from "react-icons/fi";
import { HiChartPie, HiExclamationTriangle, HiUserGroup, HiDocumentCheck } from "react-icons/hi2";

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

    // --- MEMBER FILTER LOGIC ---
    const [memberSearch, setMemberSearch] = useState("");
    const [memberStatusFilter, setMemberStatusFilter] = useState("all"); // all, on_track, at_risk, behind
    const [showMemberFilter, setShowMemberFilter] = useState(false);

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

    // --- DERIVED METRICS ---
    
    // 1. Define activeOkrs FIRST to avoid ReferenceError
    const activeOkrs = useMemo(() => {
        if (!reportData?.team_okrs) return [];
        return reportData.team_okrs.filter(okr => okr.status !== 'archived');
    }, [reportData]);

    // 2. Define metrics using activeOkrs
    const metrics = useMemo(() => {
        const data = reportData || {};
        
        // Tính toán trạng thái dựa trên status từ API (Time-based)
        let onTrack = 0, atRisk = 0, behind = 0;
        let totalProgressSum = 0;
        
        activeOkrs.forEach(okr => {
            // Cộng tổng tiến độ để tính lại trung bình
            totalProgressSum += (Number(okr.progress) || 0);

            const s = okr.status; // Status từ API: completed, on_track, at_risk, behind, pending
            if (s === 'completed' || s === 'on_track') {
                onTrack++;
            } else if (s === 'at_risk') {
                atRisk++;
            } else if (s === 'behind') {
                behind++;
            }
        });
        
        const total = activeOkrs.length || 1;
        // Tự tính lại tiến độ trung bình dựa trên danh sách Active
        const calculatedAvg = activeOkrs.length > 0 ? (totalProgressSum / activeOkrs.length) : 0;
        
        // Tính toán chi tiết cho từng cấp độ (Dept vs Team)
        const deptOkrs = activeOkrs.filter(o => o.level !== 'team');
        const subTeamOkrs = activeOkrs.filter(o => o.level === 'team');
        
        const calcAvg = (list) => list.length ? (list.reduce((sum, item) => sum + (Number(item.progress) || 0), 0) / list.length) : 0;

        // Lấy danh sách Thành viên CHẬM TRỄ (behind) - Không giới hạn số lượng
        const riskMembers = (data.members || [])
            .filter(m => m.status === 'behind')
            .sort((a, b) => (a.average_completion || 0) - (b.average_completion || 0));

        return {
            avgProgress: calculatedAvg,
            expectedProgress: data.expected_progress || 0,
            totalOkrs: activeOkrs.length,
            memberCount: data.members?.length || 0,
            onTrackPct: (onTrack / total) * 100,
            atRiskPct: (atRisk / total) * 100,
            behindPct: (behind / total) * 100,
            atRiskCount: atRisk + behind,
            riskMembers: riskMembers,
            deptStats: { count: deptOkrs.length, avg: calcAvg(deptOkrs) },
            teamStats: { count: subTeamOkrs.length, avg: calcAvg(subTeamOkrs) }
        };
    }, [reportData, activeOkrs]);

    const filteredMembers = useMemo(() => {
        if (!reportData?.members) return [];
        return reportData.members.filter(member => {
            // Filter by Name
            const matchName = member.full_name.toLowerCase().includes(memberSearch.toLowerCase());
            
            // Filter by Status
            if (memberStatusFilter === 'all') return matchName;
            
            // Logic mapping status (fallback logic if API status is inconsistent)
            let status = member.status || 'pending';
            if (!member.status) {
                 if (member.average_completion >= 70) status = 'on_track';
                 else if (member.average_completion >= 40) status = 'at_risk';
                 else status = 'behind';
            }
            
            // Allow 'completed' to show in 'on_track' filter if desired, or strictly match
            const matchStatus = (status === memberStatusFilter) || 
                                (memberStatusFilter === 'on_track' && status === 'completed');

            return matchName && matchStatus;
        });
    }, [reportData, memberSearch, memberStatusFilter]);

    // --- SUB-COMPONENTS ---

    const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => {
        const colorStyles = {
            indigo: "bg-indigo-100 text-indigo-600",
            rose: "bg-rose-100 text-rose-600",
            blue: "bg-blue-100 text-blue-600",
            emerald: "bg-emerald-100 text-emerald-600",
        };
        const style = colorStyles[color] || "bg-slate-100 text-slate-600";

        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3.5 rounded-xl ${style} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6" />
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
    };

    const ProgressBar = ({ value, color = "bg-indigo-600" }) => (
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }}></div>
        </div>
    );

    const StatusBadge = ({ progress, status }) => {
        // Ưu tiên dùng status từ API (Time-based logic)
        if (status) {
            const config = {
                completed: { color: "bg-purple-100 text-purple-800", text: "Hoàn thành" },
                on_track: { color: "bg-emerald-100 text-emerald-800", text: "Đúng tiến độ" },
                at_risk: { color: "bg-amber-100 text-amber-800", text: "Rủi ro" },
                behind: { color: "bg-rose-100 text-rose-800", text: "Chậm trễ" },
                pending: { color: "bg-slate-100 text-slate-600", text: "Chưa bắt đầu" }
            };
            const { color, text } = config[status] || config.pending;
            return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>;
        }

        // Fallback logic cũ
        if (progress >= 100) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Hoàn thành</span>;
        if (progress >= 70) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Đúng tiến độ</span>;
        if (progress >= 40) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Rủi ro</span>;
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Chậm trễ</span>;
    };

    const CheckinStatusBadge = ({ status, lastCheckin }) => {
        const config = {
            good: { color: 'bg-emerald-100 text-emerald-700', icon: FiCheckCircle, text: 'Đều đặn' },
            warning: { color: 'bg-amber-100 text-amber-700', icon: FiClock, text: 'Cần nhắc' },
            late: { color: 'bg-rose-100 text-rose-700', icon: FiAlertCircle, text: 'Quá hạn' },
            no_data: { color: 'bg-slate-100 text-slate-500', icon: FiMinus, text: 'Chưa có' }
        };
        
        const { color, icon: Icon, text } = config[status] || config.no_data;

        return (
            <div className="flex flex-col items-start gap-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                    <Icon className="w-3 h-3" />
                    {text}
                </span>
                <span className="text-xs text-slate-400">{lastCheckin || 'Chưa check-in'}</span>
            </div>
        );
    };

    const ConfidenceTrendIcon = ({ trend }) => {
        if (trend === 'increasing') return <FiTrendingUp className="w-4 h-4 text-emerald-500" title="Mức độ tự tin đang tăng" />;
        if (trend === 'decreasing') return <FiTrendingDown className="w-4 h-4 text-rose-500" title="Mức độ tự tin đang giảm" />;
        return null; // Ẩn nếu ổn định để giao diện sạch hơn
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
                                icon={HiChartPie}
                                color="indigo"
                            />
                            <StatCard 
                                title="OKRs Rủi ro" 
                                value={metrics.atRiskCount}
                                subtitle="Cần sự chú ý ngay lập tức"
                                icon={HiExclamationTriangle}
                                color="rose"
                            />
                            <StatCard 
                                title="Thành viên" 
                                value={metrics.memberCount}
                                subtitle="Đang hoạt động trong chu kỳ này"
                                icon={HiUserGroup}
                                color="blue"
                            />
                             <StatCard 
                                title="Tổng số OKR" 
                                value={metrics.totalOkrs}
                                subtitle="Mục tiêu cấp nhóm"
                                icon={HiDocumentCheck}
                                color="emerald"
                            />
                        </div>

                        {/* 3. MAIN DASHBOARD AREA */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* LEFT: Health & Insights (Replaced Donut Chart) */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6">Sức khỏe & Phân bổ</h3>
                                    
                                    <div className="flex-1 space-y-8">
                                        {/* 1. Time & Pace Analysis */}
                                        <div>
                                            {(() => {
                                                const delta = metrics.avgProgress - metrics.expectedProgress;
                                                const isBehind = delta < 0;
                                                const absDelta = Math.abs(delta).toFixed(1);
                                                
                                                // Màu sắc cho con số chênh lệch
                                                let gapColor = isBehind ? 'text-rose-600' : 'text-emerald-600';
                                                let gapBg = isBehind ? 'bg-rose-50' : 'bg-emerald-50';
                                                let gapIcon = isBehind ? <FiAlertCircle className="w-5 h-5 text-rose-500" /> : <FiTrendingUp className="w-5 h-5 text-emerald-500" />;
                                                let gapText = isBehind ? 'Chậm hơn kế hoạch' : 'Vượt kế hoạch';

                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Đánh giá tiến độ</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-3xl font-bold ${gapColor}`}>
                                                                        {delta > 0 ? '+' : ''}{Math.abs(delta).toFixed(1)}%
                                                                    </span>
                                                                    <div className={`p-1.5 rounded-full ${gapBg}`}>
                                                                        {gapIcon}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs font-medium text-slate-500 mt-1">{gapText}</p>
                                                            </div>
                                                            
                                                            {/* Mini circular indicator for visual balance */}
                                                            <div className="relative w-16 h-16">
                                                                <svg className="w-full h-full transform -rotate-90">
                                                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                                                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                                                        strokeDasharray={175.9} 
                                                                        strokeDashoffset={175.9 - (175.9 * metrics.expectedProgress) / 100} 
                                                                        className="text-blue-500 transition-all duration-1000 ease-out" 
                                                                    />
                                                                </svg>
                                                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                                    <span className="text-[10px] font-bold text-slate-400">TIME</span>
                                                                    <span className="text-xs font-bold text-blue-600">{Math.round(metrics.expectedProgress)}%</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Time Bar Context */}
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian trôi qua</span>
                                                            </div>
                                                            <div className="h-2 bg-blue-50 rounded-full overflow-hidden relative">
                                                                {/* Thanh thời gian */}
                                                                <div 
                                                                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full opacity-30"
                                                                    style={{ width: `${Math.min(metrics.expectedProgress, 100)}%` }}
                                                                />
                                                                {/* Mốc tiến độ thực tế (Marker) */}
                                                                <div 
                                                                    className={`absolute top-0 h-full w-1 ${isBehind ? 'bg-rose-500' : 'bg-emerald-500'} z-10`}
                                                                    style={{ left: `${Math.min(metrics.avgProgress, 100)}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                                <span>Bắt đầu</span>
                                                                <span className="flex items-center gap-1">
                                                                    <span className={`w-2 h-2 rounded-full ${isBehind ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                                                    Thực tế: {metrics.avgProgress.toFixed(0)}%
                                                                </span>
                                                                <span>Kết thúc</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <hr className="border-slate-50" />

                                        {/* 2. Top Risk Members */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <HiExclamationTriangle className="text-amber-500 w-4 h-4" />
                                                Cần hỗ trợ
                                            </h4>
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                                {metrics.riskMembers.length > 0 ? metrics.riskMembers.map((member) => (
                                                    <div key={member.user_id} className="flex items-center gap-3">
                                                        <img 
                                                            src={member.avatar || `https://ui-avatars.com/api/?name=${member.full_name}&background=random`} 
                                                            alt={member.full_name}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate-100"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="font-medium text-slate-700 truncate" title={member.full_name}>
                                                                    {member.full_name}
                                                                </span>
                                                                <span className="font-bold text-rose-600">{member.average_completion?.toFixed(0)}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-rose-50 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-rose-500 rounded-full"
                                                                    style={{ width: `${member.average_completion}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg">
                                                        Tất cả thành viên đều ổn định!
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Detailed OKR List (Moved Up) */}
                            <div className="lg:col-span-2">
                                {activeOkrs && activeOkrs.length > 0 ? (
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
                                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                    <HiDocumentCheck className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800">Chi tiết OKRs Nhóm</h3>
                                            </div>
                                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                                {activeOkrs.length} Mục tiêu
                                            </span>
                                        </div>
                                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                            {activeOkrs.map((okr, index) => (
                                                <div key={okr.objective_id || index} className="p-6 hover:bg-slate-50 transition-colors group">
                                                    <div className="flex flex-col gap-4">
                                                        {/* Top Row: Title & Meta */}
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                                        <HiDocumentCheck className="w-3 h-3" />
                                                                        {okr.completed_kr_count}/{okr.key_results_count} Kết quả then chốt
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors" title={okr.obj_title}>
                                                                    {okr.obj_title}
                                                                </h4>
                                                            </div>
                                                            <StatusBadge progress={okr.progress} status={okr.status} />
                                                        </div>

                                                        {/* Bottom Row: Progress */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between text-xs text-slate-500">
                                                                <span>Tiến độ</span>
                                                                <span className="font-bold text-slate-900">{okr.progress}%</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        okr.progress >= 70 ? 'bg-emerald-500' : 
                                                                        okr.progress >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                                                    }`} 
                                                                    style={{ width: `${okr.progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-slate-100 text-slate-400 p-8">
                                        Chưa có dữ liệu OKR
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. TEAM MEMBERS LEADERBOARD (Moved Down - Full Width) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <HiUserGroup className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Hiệu suất thành viên</h3>
                                </div>
                                
                                {/* FILTER DROPDOWN */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowMemberFilter(!showMemberFilter)}
                                        className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                                            showMemberFilter || memberStatusFilter !== 'all' || memberSearch 
                                            ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100' 
                                            : 'hover:bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        <FiFilter className="w-4 h-4" />
                                        {(memberStatusFilter !== 'all' || memberSearch) && <span className="text-xs font-bold">Đang lọc</span>}
                                    </button>

                                    {showMemberFilter && (
                                        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 animate-in fade-in zoom-in duration-200 origin-top-right">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Tìm kiếm</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Nhập tên thành viên..." 
                                                        value={memberSearch}
                                                        onChange={(e) => setMemberSearch(e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Trạng thái</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { id: 'all', label: 'Tất cả', color: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                                                            { id: 'on_track', label: 'Ổn định', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                                                            { id: 'at_risk', label: 'Rủi ro', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                                                            { id: 'behind', label: 'Chậm trễ', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' }
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => setMemberStatusFilter(opt.id)}
                                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                    memberStatusFilter === opt.id 
                                                                    ? 'ring-2 ring-offset-1 ring-indigo-500 ' + opt.color 
                                                                    : 'opacity-60 hover:opacity-100 ' + opt.color
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Thành viên</th>
                                            <th className="px-6 py-4 text-center">OKRs</th>
                                            <th className="px-6 py-4 text-left w-1/3">Tiến độ</th>
                                            <th className="px-6 py-4 text-left">Check-in cuối</th>
                                            <th className="px-6 py-4 text-right">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredMembers.map((member) => (
                                            <tr key={member.user_id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img 
                                                            src={member.avatar || `https://ui-avatars.com/api/?name=${member.full_name}&background=random`} 
                                                            alt={member.full_name}
                                                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                                                        />
                                                        <div>
                                                            <div className="font-bold text-slate-900">{member.full_name}</div>
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
                                                        <span className="text-sm font-bold text-slate-700">{member.average_completion?.toFixed(0)}%</span>
                                                        <StatusBadge progress={member.average_completion} status={member.status} />
                                                    </div>
                                                    <ProgressBar 
                                                        value={member.average_completion} 
                                                        color={member.average_completion < 40 ? 'bg-rose-500' : (member.average_completion < 70 ? 'bg-amber-500' : 'bg-emerald-500')} 
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
                                        {filteredMembers.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <FiFilter className="w-8 h-8 opacity-20" />
                                                        <p>Không tìm thấy thành viên phù hợp</p>
                                                        {(memberSearch || memberStatusFilter !== 'all') && (
                                                            <button 
                                                                onClick={() => { setMemberSearch(''); setMemberStatusFilter('all'); }}
                                                                className="text-indigo-600 hover:underline text-sm mt-1"
                                                            >
                                                                Xóa bộ lọc
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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