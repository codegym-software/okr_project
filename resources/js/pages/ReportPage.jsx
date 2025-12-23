import React, { useEffect, useState, useMemo } from "react";
import { Select } from "../components/ui";
import ToastNotification from "../components/ToastNotification";
import SnapshotHistoryModal from '../components/reports/SnapshotHistoryModal';
import { CycleDropdown } from '../components/Dropdown';
import { exportTeamReportToExcel } from "../utils/reports/exportHelpers";
import { FiDownload, FiAlertTriangle, FiEye, FiTrendingUp, FiUsers, FiActivity, FiCheckCircle, FiClock, FiLink, FiUserX, FiSave, FiList, FiTrash2, FiChevronDown, FiChevronRight, FiTarget, FiBell, FiHexagon } from "react-icons/fi";
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
import { Bar, Line, Pie } from 'react-chartjs-2';

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

// --- HELPER COMPONENTS ---
const StatusBadge = ({ status }) => {
    const config = {
        completed: { color: "bg-green-100 text-green-700", text: "Hoàn thành" },
        on_track: { color: "bg-blue-50 text-blue-700", text: "Đúng tiến độ" },
        at_risk: { color: "bg-yellow-50 text-yellow-700", text: "Rủi ro" },
        behind: { color: "bg-red-50 text-red-700", text: "Chậm trễ" },
        pending: { color: "bg-gray-50 text-gray-600", text: "Chờ duyệt" }
    };
    const { color, text } = config[status] || config.pending;
    return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${color} border border-transparent`}>{text}</span>;
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={!isLoading ? onClose : undefined}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <FiBell className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">{title}</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">{message}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button 
                            type="button" 
                            disabled={isLoading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            onClick={onConfirm}
                        >
                            {isLoading ? 'Đang gửi...' : 'Gửi nhắc nhở'}
                        </button>
                        <button 
                            type="button" 
                            disabled={isLoading}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Hủy bỏ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};



// Row Component for Expandable Tree View (CLEAN TOGGLE - NO CONNECTORS)
const ComplianceRow = ({ item, level = 0, getOwner, onRemind }) => {
    const [expanded, setExpanded] = useState(false); // Default Collapsed
    const hasChildren = (item.children && item.children.length > 0) || (item.key_results && item.key_results.length > 0);
    const isUnit = (item.level || '').toLowerCase() === 'unit';
    
    // Indentation logic
    const basePadding = 24;
    const levelIndent = 32;
    const paddingLeft = basePadding + (level * levelIndent);

    return (
        <>
            <tr className={`hover:bg-slate-50 transition-colors text-sm border-b border-slate-100 ${level > 0 ? 'bg-slate-50/30' : 'bg-white'} relative`}>
                <td className="py-3 pr-6 text-left relative" style={{ paddingLeft: `${paddingLeft}px` }}>
                    <div className="flex items-start gap-2 relative z-10">
                        {hasChildren ? (
                            <button 
                                onClick={() => setExpanded(!expanded)}
                                className="mt-0.5 text-slate-500 hover:text-slate-700 transition-colors p-0.5 rounded hover:bg-slate-200 z-20 bg-white border border-slate-300 shadow-sm flex-shrink-0"
                            >
                                {expanded ? <FiChevronDown className="w-3 h-3" /> : <FiChevronRight className="w-3 h-3" />}
                            </button>
                        ) : (
                            <span className="w-5 h-5 flex-shrink-0"></span>
                        )}
                        
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                {isUnit && <span className="w-2 h-2 rounded-sm bg-indigo-600 flex-shrink-0"></span>}
                                {!isUnit && level > 0 && <FiHexagon className="w-3.5 h-3.5 text-slate-500" />}
                                <a href="#" className={`hover:text-blue-600 hover:underline line-clamp-2 ${isUnit ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`} title={item.obj_title}>{item.obj_title}</a>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-semibold tracking-wide mt-0.5 ml-0 uppercase">{isUnit ? 'PHÒNG BAN' : (level > 0 ? 'LIÊN KẾT CÁ NHÂN' : 'CÁ NHÂN')}</span>
                        </div>
                    </div>
                </td>

                <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                        <img src={getOwner(item.user_id).avatar || `https://ui-avatars.com/api/?name=${getOwner(item.user_id).name || 'U'}&background=random`} alt={getOwner(item.user_id).name} className="w-6 h-6 rounded-full border border-white shadow-sm" />
                        <span className="text-slate-600 truncate max-w-[100px] text-xs" title={getOwner(item.user_id).name}>{getOwner(item.user_id).name}</span>
                    </div>
                </td>

                <td className="px-6 py-3"><StatusBadge status={item.status} /></td>

                <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-none">
                            <div className={`h-full rounded-full ${item.progress >= 70 ? 'bg-green-500' : item.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8 text-right flex-none">{item.progress}%</span>
                    </div>
                </td>

                <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-none">
                            <div className={`h-full rounded-full ${item.personal_checkin_rate >= 80 ? 'bg-green-500' : item.personal_checkin_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.personal_checkin_rate || 0}%` }}></div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium w-8 text-right flex-none">{item.personal_checkin_rate || 0}%</span>
                    </div>
                </td>

                <td className="px-6 py-3 text-slate-500 text-xs">
                    {item.last_checkin_date ? new Date(item.last_checkin_date).toLocaleDateString('vi-VN') : 'Chưa check-in'}
                </td>

                <td className="px-6 py-3 text-center">
                    <span className="text-[10px] text-slate-300 italic">{isUnit ? 'Quản lý' : '-'}</span>
                </td>
            </tr>

            {expanded && (
                <>
                    {/* Render Key Results */}
                    {(item.key_results || []).map((kr, idx) => {
                        const krPaddingLeft = paddingLeft + levelIndent;
                        return (
                            <tr key={`kr-${kr.id}`} className="bg-white hover:bg-slate-50 transition-colors text-xs border-b border-slate-100">
                                <td className="py-2 pr-6 text-left relative" style={{ paddingLeft: `${krPaddingLeft}px` }}>
                                    <div className="flex items-center gap-2 text-slate-600 relative z-10">
                                        <FiTarget className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="truncate max-w-[300px]" title={kr.title}>{kr.title}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-medium border border-slate-200">KR</span>
                                    </div>
                                </td>
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-2 opacity-75">
                                        <img src={`https://ui-avatars.com/api/?name=${getOwner(kr.owner_id).name || 'U'}&background=random&size=16`} className="w-4 h-4 rounded-full" />
                                        <span className="text-slate-500 truncate max-w-[80px]">{getOwner(kr.owner_id).name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-2"><StatusBadge status={kr.status} /></td>
                                
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-none">
                                            <div className={`h-full rounded-full ${kr.progress >= 70 ? 'bg-green-500' : kr.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${kr.progress}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 w-8 text-right flex-none">{kr.progress}%</span>
                                    </div>
                                </td>

                                <td className="px-6 py-2 text-center text-slate-300">-</td>

                                <td className="px-6 py-2 text-slate-400">
                                    {kr.last_checkin_date ? new Date(kr.last_checkin_date).toLocaleDateString('vi-VN') : '-'}
                                </td>
                                
                                <td className="px-6 py-2 text-center">
                                    <button 
                                        className="text-[10px] px-2 py-1 bg-white border border-indigo-200 text-indigo-600 rounded hover:bg-indigo-50 transition-colors flex items-center gap-1 mx-auto whitespace-nowrap w-fit" 
                                        onClick={() => onRemind(kr.owner_id || item.user_id, getOwner(kr.owner_id || item.user_id).name)}
                                        title="Gửi thông báo nhắc nhở"
                                    >
                                        <FiBell className="w-3 h-3" />
                                        <span>Nhắc nhở</span>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}

                    {/* Render Child Objectives */}
                    {(item.children || []).map((child, idx) => (
                        <ComplianceRow 
                            key={child.objective_id} 
                            item={child} 
                            level={level + 1} 
                            getOwner={getOwner} 
                            onRemind={onRemind} 
                        />
                    ))}
                </>
            )}
        </>
    );
};

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [trendData, setTrendData] = useState([]); 
    const [departmentName, setDepartmentName] = useState("");
    const [departmentId, setDepartmentId] = useState(null);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState("performance");

    // Snapshot States
    const [isSaving, setIsSaving] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [savedReports, setSavedReports] = useState([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null); 
    
    // Remind Modal States
    const [remindModalOpen, setRemindModalOpen] = useState(false);
    const [userToRemind, setUserToRemind] = useState({ id: null, name: '' });
    const [isReminding, setIsReminding] = useState(false);

    // UI State
    const [toast, setToast] = useState({ message: null, type: null });

    // --- DATA FETCHING ---
    const loadReportData = async (cycleId) => {
        setLoading(true);
        setError(null);
        setSelectedSnapshot(null); 
        try {
            const res = await fetch(`/api/reports/my-team?cycle_id=${cycleId}`, { headers: { Accept: "application/json" } });
            const json = await res.json();
            if (json.success) {
                setReportData(json.data);
                setDepartmentName(json.department_name);
                setDepartmentId(json.department_id);
            } else {
                setError(json.message);
            }
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
        const fetchUserProfile = async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
                const headers = { Accept: 'application/json', 'X-CSRF-TOKEN': token };
                const res = await fetch('/api/profile', { headers });
                const json = await res.json();
                if (json.success) {
                    setCurrentUser(json.user);
                }
            } catch (e) {
                console.error("Error fetching user profile:", e);
            }
        };
        fetchUserProfile();
    }, []); // Run once on component mount

    useEffect(() => {
        if (selectedCycle) loadReportData(selectedCycle);
    }, [selectedCycle]);

    useEffect(() => {
        if (showHistoryModal && selectedCycle) {
            fetchSavedReports(selectedCycle);
        }
    }, [showHistoryModal, selectedCycle]);

    // --- ACTIONS ---
    const handleSaveSnapshot = async () => {
        if (!selectedCycle) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/reports/snapshots/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    report_type: 'team',
                    cycle_id: selectedCycle,
                    department_id: departmentId
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

    const fetchSavedReports = async (currentCycleId) => {
        try {
            let url = `/api/reports/snapshots/list?report_type=team&cycle_id=${currentCycleId}`;
            if (currentUser && currentUser.department_id) {
                url += `&department_id=${currentUser.department_id}`;
            }
            const res = await fetch(url);
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
            const res = await fetch(`/api/reports/snapshots/detail/${reportId}`);
            const json = await res.json();
            if (json.success) {
                const snap = json.data.snapshot_data;
                // Handle nested 'data' structure from API response snapshot
                setReportData(snap.data || snap);
                if (snap.department_name) setDepartmentName(snap.department_name);

                setSelectedSnapshot(json.data); 
                setToast({ message: `Đang xem: ${json.data.report_name}`, type: 'success' });
            }
        } catch (e) {
            setToast({ message: "Lỗi tải báo cáo lưu trữ", type: 'error' });
        } finally {
            setLoading(false);
        }
    };



    const handleExportExcel = () => {
        if (!reportData) return;
        const cycleName = cycles.find(c => String(c.cycle_id) === String(selectedCycle))?.cycle_name || "";
        exportTeamReportToExcel(reportData, departmentName, cycleName, (msg) => setToast({ message: msg, type: 'success' }), (msg) => setToast({ message: msg, type: 'error' }));
    };

    const openRemindModal = (userId, userName) => {
        setUserToRemind({ id: userId, name: userName });
        setRemindModalOpen(true);
    };

    const confirmRemind = async () => {
        if (!userToRemind.id) return;
        setIsReminding(true);
        try {
            const res = await fetch('/api/reports/remind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({ member_id: userToRemind.id, cycle_id: selectedCycle })
            });
            const json = await res.json();
            if (json.success) {
                setToast({ message: `Đã gửi nhắc nhở đến ${userToRemind.name}`, type: 'success' });
            } else {
                setToast({ message: json.message || "Lỗi khi gửi nhắc nhở", type: 'error' });
            }
        } catch (e) {
            setToast({ message: "Lỗi kết nối server", type: 'error' });
        } finally {
            setIsReminding(false);
            setRemindModalOpen(false);
        }
    };

    // --- TAB 1: PERFORMANCE LOGIC ---
    const stats = useMemo(() => {
        if (!reportData) return { avgProgress: 0, atRiskRate: 0, avgContribution: 0 };

        const members = reportData.members || [];
        const okrs = reportData.team_okrs || [];
        
        const flattenOkrs = (items) => {
            let result = [];
            items.forEach(item => {
                result.push(item);
                if (item.children) result = result.concat(flattenOkrs(item.children));
            });
            return result;
        };
        const allOkrs = flattenOkrs(okrs);
        const unitOkrs = allOkrs.filter(okr => (okr.level || '').toLowerCase() === 'unit');
        
        let totalProgress = 0;
        unitOkrs.forEach(okr => {
            totalProgress += Number(okr.progress || 0);
        });
        const avgProgress = unitOkrs.length > 0 ? (totalProgress / unitOkrs.length) : 0;

        let riskCount = 0;
        const riskStatuses = ['at_risk', 'behind', 'off_track', 'in_trouble'];
        unitOkrs.forEach(okr => {
            if (riskStatuses.includes((okr.status || '').toLowerCase())) {
                riskCount++;
            }
        });
        const atRiskRate = unitOkrs.length > 0 ? (riskCount / unitOkrs.length) * 100 : 0;

        const totalPersonalProgress = members.reduce((acc, m) => acc + (Number(m.average_completion) || 0), 0);
        const avgContribution = members.length > 0 ? (totalPersonalProgress / members.length) : 0;

        return { avgProgress, atRiskRate, avgContribution };
    }, [reportData]);

    const chartData = useMemo(() => {
        if (!reportData) return { bar: null, line: null };

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

    // --- TAB 2: COMPLIANCE LOGIC ---
    const complianceCharts = useMemo(() => {
        if (!reportData) return { complianceBar: null, statusDoughnut: null };

        const sortedByCompliance = [...(reportData.members || [])].sort((a, b) => (b.checkin_compliance_score || 0) - (a.checkin_compliance_score || 0));
        const complianceBarData = {
            labels: sortedByCompliance.map(m => m.full_name),
            datasets: [
                {
                    label: 'Điểm tuân thủ',
                    data: sortedByCompliance.map(m => m.checkin_compliance_score || 0),
                    backgroundColor: sortedByCompliance.map(m => {
                        const score = m.checkin_compliance_score || 0;
                        if (score >= 80) return 'rgba(34, 197, 94, 0.7)'; 
                        if (score >= 50) return 'rgba(234, 179, 8, 0.7)'; 
                        return 'rgba(239, 68, 68, 0.7)'; 
                    }),
                    borderRadius: 4,
                }
            ]
        };

        const statusCounts = { completed: 0, on_track: 0, at_risk: 0, behind: 0 };
        
        const countStatus = (status) => {
            const s = (status || 'on_track').toLowerCase();
            if (s === 'completed') statusCounts.completed++;
            else if (s === 'on_track') statusCounts.on_track++;
            else if (s === 'at_risk' || s === 'warning') statusCounts.at_risk++;
            else statusCounts.behind++;
        };

        (reportData.team_okrs || []).forEach(parent => {
            countStatus(parent.status);
            if (parent.children && parent.children.length > 0) {
                parent.children.forEach(child => countStatus(child.status));
            }
        });
        
        const statusDoughnutData = {
            labels: ['Hoàn thành', 'Đúng hạn', 'Rủi ro', 'Chậm trễ'],
            datasets: [
                {
                    data: [statusCounts.completed, statusCounts.on_track, statusCounts.at_risk, statusCounts.behind],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
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

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
            <div className="max-w-7xl mx-auto px-6 py-8">
                
                {/* 1. HEADER & CONTROLS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo cáo Thống kê Phòng ban</h1>
                            {selectedSnapshot && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">
                                    Đang xem: {selectedSnapshot.report_name}
                                </span>
                            )}
                        </div>
                        {departmentName && <p className="text-slate-500 text-sm mt-1">{departmentName}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        {!selectedSnapshot ? (
                            <>
                                <div className="w-48 mr-3">
                                    <CycleDropdown
                                        cyclesList={cycles}
                                        cycleFilter={selectedCycle}
                                        handleCycleChange={setSelectedCycle}
                                        disabled={!!selectedSnapshot}
                                    />
                                </div>
                                <div className="flex items-center gap-2"> {/* New wrapper div */}
                                    <button onClick={handleSaveSnapshot} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium">
                                        {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></span> : <FiSave className="w-4 h-4" />}
                                        <span>Tạo Snapshot</span>
                                    </button>
                                    <button onClick={() => fetchSavedReports(selectedCycle)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium">
                                        <FiList className="w-4 h-4" />
                                        <span>Lịch sử</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button onClick={() => { setSelectedSnapshot(null); loadReportData(selectedCycle); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
                                Quay lại Hiện tại
                            </button>
                        )}
                        <button onClick={handleExportExcel} disabled={!reportData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50">
                            <FiDownload className="w-4 h-4" />
                            <span>Xuất Excel</span>
                        </button>
                    </div>
                </div>

                {/* 2. NAVIGATION TABS */}
                <div className="border-b border-slate-200 mb-8">
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {[
                            { id: 'performance', label: 'Hiệu suất Phòng ban' },
                            { id: 'compliance', label: 'Quy trình đội ngũ' }
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                    {tab.label}
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Tiến độ Trung bình Phòng ban">Tiến độ Trung bình</h3>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0"><FiActivity className="w-5 h-5" /></div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{stats.avgProgress.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tỷ lệ Rủi ro</h3>
                                    <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600 flex-shrink-0"><FiAlertTriangle className="w-5 h-5" /></div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900">{stats.atRiskRate.toFixed(1)}%</span>
                                    <span className="text-sm text-slate-400 mb-1">trên tổng số OKR</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Đóng góp Trung bình mỗi Thành viên">Đóng góp/Thành viên</h3>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600 flex-shrink-0"><FiUsers className="w-5 h-5" /></div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{stats.avgContribution.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Tỷ lệ Liên kết với Công ty">Liên kết Công ty</h3>
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600 flex-shrink-0"><FiLink className="w-5 h-5" /></div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{reportData?.alignment_rate || 0}%</div>
                            </div>
                        </div>

                        {/* CHARTS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Xếp hạng Tiến độ theo Thành viên</h3>
                                <div className="h-64"><Bar data={chartData.bar} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} /></div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Tiến độ Phòng ban vs Kế hoạch</h3>
                                <div className="h-64"><Line data={{ ...chartData.line, datasets: chartData.line.datasets.map(ds => ({ ...ds, label: ds.label === 'Kế hoạch (Ideal)' ? 'Kế hoạch (Lý tưởng)' : ds.label })) }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) label += ': '; if (context.parsed.y !== null) label += context.parsed.y + '%'; if (!selectedSnapshot && context.datasetIndex === 0 && trendData && trendData[context.dataIndex]) { const count = trendData[context.dataIndex].okr_count; if (count !== undefined) return [label, `Số lượng OKR: ${count}`]; } return label; } } } }, scales: { y: { beginAtZero: true, max: 100 } } }} /></div>
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
                                                            <a href="#" className="font-medium text-blue-600 hover:underline line-clamp-2" title={okr.obj_title}>{okr.obj_title}</a>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <img src={owner.avatar || `https://ui-avatars.com/api/?name=${owner.name || 'U'}&background=random`} alt={owner.name} className="w-6 h-6 rounded-full" />
                                                                <span className="text-slate-700 truncate max-w-[100px]" title={owner.name}>{owner.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-indigo-50 text-indigo-600 border-indigo-100">P.BAN</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${okr.progress >= 70 ? 'bg-green-500' : okr.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${okr.progress}%` }}></div>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700">{okr.progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4"><StatusBadge status={okr.status} /></td>
                                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                                            {okr.parent_objective_title ? <span className="text-blue-600 cursor-pointer block truncate max-w-[150px]" title={okr.parent_objective_title}>{okr.parent_objective_title}</span> : <span className="text-slate-400 italic">Chưa có liên kết</span>}
                                                        </td>
                                                    </tr>
                                                );
                                        })}
                                        {(!reportData?.team_okrs || reportData.team_okrs.filter(okr => (okr.level || '').toLowerCase() === 'unit').length === 0) && (
                                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Không có dữ liệu OKR phòng ban nào trong chu kỳ này.</td></tr>
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
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <div><h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Tỷ lệ Check-in Key Results (Tuần)">Check-in KR (Tuần)</h3><p className="text-[10px] text-slate-400 mt-0.5">(% KR đã cập nhật tuần này)</p></div>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600 flex-shrink-0"><FiCheckCircle className="w-5 h-5" /></div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{reportData?.checkin_compliance_rate || 0}%</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <div><h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Số lượng Objective chưa được Check-in">Objective Chờ Cập nhật</h3><p className="text-[10px] text-slate-400 mt-0.5">(Chưa cập nhật tuần này)</p></div>
                                    <div className="p-2 bg-red-50 rounded-lg text-red-600 flex-shrink-0"><FiClock className="w-5 h-5" /></div>
                                </div>
                                <div className="flex items-end gap-2"><span className="text-3xl font-bold text-slate-900">{reportData?.missed_checkins_count || 0}</span><span className="text-sm text-slate-400 mb-1">mục tiêu</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <div><h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Tỷ lệ Liên kết Cá nhân với Phòng ban">Liên kết Nội bộ</h3><p className="text-[10px] text-slate-400 mt-0.5">(Tỷ lệ liên kết với phòng ban)</p></div>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0"><FiLink className="w-5 h-5" /></div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{reportData?.internal_alignment_rate || 0}%</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start">
                                    <div><h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider" title="Số lượng Nhân sự chưa Check-in">Nhân sự Chưa Check-in</h3><p className="text-[10px] text-slate-400 mt-0.5">(Trong tuần này)</p></div>
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600 flex-shrink-0"><FiUserX className="w-5 h-5" /></div>
                                </div>
                                <div className="flex items-end gap-2"><span className="text-3xl font-bold text-slate-900">{reportData?.members_without_checkin_count || 0}</span><span className="text-sm text-slate-400 mb-1">người</span></div>
                            </div>
                        </div>

                        {/* CHARTS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Mức độ Cập nhật KR Tuần này</h3>
                                <div className="h-64"><Bar data={complianceCharts.complianceBar} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} /></div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Phân bổ Trạng thái Sức khỏe OKR</h3>
                                <div className="h-64 flex justify-center"><Pie data={complianceCharts.statusDoughnut} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} /></div>
                            </div>
                        </div>

                        {/* DETAILED COMPLIANCE TABLE */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800">Chi tiết Sức khỏe Mục tiêu</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                            <th className="px-6 py-4 pl-6">Tên Mục tiêu</th>
                                            <th className="px-6 py-4">Người sở hữu</th>
                                            <th className="px-6 py-4">Tình trạng</th>
                                            <th className="px-6 py-4 w-32">Tiến độ</th>
                                            <th className="px-6 py-4 text-center">Tỷ lệ Check-in</th>
                                            <th className="px-6 py-4">Check-in gần nhất</th>
                                            <th className="px-6 py-4 text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reportData?.team_okrs || []).map((parent) => (
                                            <ComplianceRow key={parent.objective_id} item={parent} level={0} getOwner={getOwner} onRemind={openRemindModal} />
                                        ))}
                                        {(!reportData?.team_okrs || reportData.team_okrs.length === 0) && (
                                            <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Chưa có dữ liệu.</td></tr>
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
                <ToastNotification toast={toast} onClose={() => setToast({ message: null, type: null })} />
                <ConfirmModal isOpen={remindModalOpen} onClose={() => setRemindModalOpen(false)} onConfirm={confirmRemind} title="Xác nhận nhắc nhở" message={`Bạn có chắc chắn muốn gửi thông báo nhắc nhở check-in đến ${userToRemind.name} không?`} isLoading={isReminding} />
                <SnapshotHistoryModal
                    isOpen={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    snapshots={savedReports}
                    onViewSnapshot={loadSnapshot}
                    cyclesList={cycles}
                    modalCycleFilter={selectedCycle}
                    onModalCycleFilterChange={(value) => {
                        setSelectedCycle(value);
                    }}
                />
            </div>
        </div>
    );
}