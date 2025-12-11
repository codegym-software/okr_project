import React, { useEffect, useState } from "react";
import { Select } from "../components/ui";
import ToastNotification from "../components/ToastNotification";
import ConfirmationModal from "../components/ConfirmationModal";
import { exportTeamReportToExcel } from "../utils/reports/exportHelpers";
import SnapshotModal from "../components/reports/SnapshotModal";
import SnapshotHistoryModal from "../components/reports/SnapshotHistoryModal";
import { loadSnapshots, loadSnapshot } from "../utils/reports/snapshotHelpers";
import TeamReportContent from "../components/reports/TeamReportContent";
import { FiDownload, FiArchive, FiList } from "react-icons/fi";

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [departmentName, setDepartmentName] = useState("");
    const [error, setError] = useState(null);
    const [canEditReport, setCanEditReport] = useState(false);
    
    // Snapshot logic
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
    const [reportName, setReportName] = useState("");
    
    // Snapshot History Logic
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [snapshotPage, setSnapshotPage] = useState(1);
    const [snapshotPagination, setSnapshotPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [modalCycleFilter, setModalCycleFilter] = useState("");

    // --- UI/UX ENHANCEMENTS ---
    const [toast, setToast] = useState({ message: null, type: null });
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "Xác nhận",
        cancelText: "Hủy"
    });
    const [remindingMap, setRemindingMap] = useState({}); // Track loading state per member ID

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
                // Fetch profile to check role
                const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
                const profileRes = await fetch('/api/profile', {
                    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token }
                });
                if (profileRes.ok) {
                    const data = await profileRes.json();
                    const role = data.user?.role?.role_name?.toLowerCase() || '';
                    // Allow Manager, Admin, CEO
                    const isManagerial = ['manager', 'admin', 'ceo', 'trưởng phòng', 'giám đốc'].some(r => role.includes(r));
                    setCanEditReport(isManagerial);
                }
            } catch (e) {
                console.error("Error checking role:", e);
            }
        })();
    }, []);

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

    const executeRemind = async (memberId) => {
        setRemindingMap(prev => ({ ...prev, [memberId]: true }));
        try {
            const res = await fetch("/api/reports/remind", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ""
                },
                body: JSON.stringify({ 
                    member_id: memberId,
                    cycle_id: selectedCycle 
                })
            });
            const data = await res.json();
            if (data.success) {
                setToast({ message: data.message, type: "success" });
            } else {
                setToast({ message: data.message || "Có lỗi xảy ra", type: "error" });
            }
        } catch (e) {
            console.error(e);
            setToast({ message: "Lỗi kết nối server", type: "error" });
        } finally {
            setRemindingMap(prev => ({ ...prev, [memberId]: false }));
        }
    };

    const handleRemindClick = (memberId, memberName) => {
        setConfirmModal({
            show: true,
            title: "Xác nhận nhắc nhở",
            message: `Bạn có chắc chắn muốn gửi thông báo nhắc nhở check-in đến ${memberName}?`,
            confirmText: "Gửi ngay",
            cancelText: "Hủy bỏ",
            onConfirm: () => executeRemind(memberId)
        });
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

    // --- SNAPSHOT FUNCTIONS ---
    
    const confirmCreateSnapshot = async () => {
        if (!reportName.trim()) {
            setToast({ message: "Vui lòng nhập tên báo cáo", type: "error" });
            return;
        }
        setIsCreatingSnapshot(true);
        try {
            const cycleId = selectedCycle;
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "";
            
            // Filter OKRs to match the Excel export logic (only active unit-level OKRs)
            const filteredOkrs = (reportData.team_okrs || []).filter(okr => okr.status !== 'archived' && okr.level === 'unit');

            // Recalculate metrics based on filtered list
            let onTrack = 0, atRisk = 0, behind = 0;
            let totalProgressSum = 0;
            filteredOkrs.forEach(okr => {
                totalProgressSum += (Number(okr.progress) || 0);
                const s = okr.status;
                if (s === 'completed' || s === 'on_track') onTrack++;
                else if (s === 'at_risk') atRisk++;
                else if (s === 'behind') behind++;
            });
            
            const total = filteredOkrs.length || 1;
            const calculatedAvg = filteredOkrs.length > 0 ? (totalProgressSum / filteredOkrs.length) : 0;

            const snapshotPayload = {
                ...reportData,
                team_okrs: filteredOkrs, // Override with filtered list
                total_okr_count: filteredOkrs.length, // Sync count
                team_average_completion: calculatedAvg, // Sync average
                
                // Add structure for SnapshotDetailView compatibility (and for future TeamSnapshotView)
                overall: {
                    totalObjectives: filteredOkrs.length,
                    averageProgress: calculatedAvg,
                    statusCounts: {
                        onTrack,
                        atRisk,
                        offTrack: behind
                    },
                    statusDistribution: {
                        onTrack: ((onTrack/total)*100).toFixed(1),
                        atRisk: ((atRisk/total)*100).toFixed(1),
                        offTrack: ((behind/total)*100).toFixed(1)
                    }
                },
                detailedData: {
                    objectives: filteredOkrs.map(okr => ({
                        ...okr,
                        progress_percent: okr.progress
                    }))
                },
                
                level: 'unit', // Tag as unit/department level
                department_name: departmentName,
            };

            const response = await fetch('/api/reports/snapshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    cycle_id: cycleId,
                    title: reportName.trim(),
                    data_snapshot: snapshotPayload,
                }),
            });

            const result = await response.json();
            if (result.success) {
                setToast({ message: "Đã lưu báo cáo thành công!", type: "success" });
                setShowCreateModal(false);
                setReportName("");
            } else {
                setToast({ message: result.message || "Lỗi khi lưu báo cáo", type: "error" });
            }
        } catch (e) {
            console.error(e);
            setToast({ message: "Lỗi kết nối server", type: "error" });
        } finally {
            setIsCreatingSnapshot(false);
        }
    };

    const loadSnapshotsList = async (page = 1, cycleId = null) => {
        const cId = cycleId || selectedCycle;
        if (!cId) return;
        
        // Use helper to load snapshots with filtering
        const filters = {
            level: 'unit',
            department_name: departmentName
        };
        
        const result = await loadSnapshots(cId, page, filters);
        
        setSnapshots(result.snapshots);
        setSnapshotPagination(result.pagination);
    };

    const handleViewSnapshots = () => {
        if (!showSnapshots) {
            setShowSnapshots(true);
            setSnapshotPage(1);
            setModalCycleFilter(selectedCycle); // Sync filter with current selection
            loadSnapshotsList(1, selectedCycle);
        } else {
            setShowSnapshots(false);
        }
    };

    const onLoadSnapshotDetail = async (id) => {
        const snap = await loadSnapshot(id);
        if (snap) {
            setSelectedSnapshot(snap);
        } else {
            setToast({ message: "Không thể tải chi tiết", type: "error" });
        }
    };

    const exportSnapshot = (snap) => {
        if (!snap || !snap.data_snapshot) return;
        const data = snap.data_snapshot;
        const cName = cycles.find(c => String(c.cycle_id) === String(snap.cycle_id))?.cycle_name || "";
        
        exportTeamReportToExcel(
            data,
            data.department_name || departmentName,
            cName,
            (msg) => setToast({ message: msg, type: 'success' }),
            (msg) => setToast({ message: msg, type: 'error' })
        );
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

                        {/* Button Group */}
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            {canEditReport && (
                                <>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        disabled={!reportData}
                                        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                                        title="Lưu báo cáo hiện tại"
                                    >
                                        <FiArchive className="w-4 h-4" />
                                        <span className="hidden sm:inline">Lưu báo cáo</span>
                                    </button>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                </>
                            )}
                            <button
                                onClick={handleViewSnapshots}
                                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md transition-colors text-sm font-medium"
                                title="Xem lịch sử báo cáo"
                            >
                                <FiList className="w-4 h-4" />
                                <span className="hidden sm:inline">Lịch sử</span>
                            </button>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <button 
                                onClick={handleExportExcel}
                                disabled={!reportData}
                                className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <FiDownload className="w-4 h-4" />
                                <span className="hidden sm:inline">Xuất Excel</span>
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                   <div className="h-96 flex items-center justify-center text-slate-400">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                       Đang tải dữ liệu...
                   </div> 
                ) : (
                    <TeamReportContent 
                        reportData={reportData}
                        onRemind={handleRemindClick}
                        remindingMap={remindingMap}
                        isReadOnly={false}
                    />
                )}

                <ToastNotification 
                    toast={toast}
                    onClose={() => setToast({ message: null, type: null })}
                />

                <ConfirmationModal 
                    confirmModal={confirmModal}
                    closeConfirm={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                />

                {/* MODALS */}
                <SnapshotModal
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        setReportName("");
                    }}
                    title={reportName}
                    onTitleChange={setReportName}
                    onSubmit={confirmCreateSnapshot}
                    isSubmitting={isCreatingSnapshot}
                    showLevelSelector={false} // Hide level selector for Team Report
                    level="unit"
                    onLevelChange={() => {}} 
                />

                {showSnapshots && (
                    <SnapshotHistoryModal
                        isOpen={showSnapshots}
                        onClose={() => {
                            setShowSnapshots(false);
                            setSelectedSnapshot(null);
                        }}
                        snapshots={snapshots}
                        snapshotLevelFilter="all" 
                        showLevelFilter={false} // Hide filter in team view
                        onSnapshotLevelChange={() => {}}
                        snapshotPage={snapshotPage}
                        snapshotPagination={snapshotPagination}
                        onPageChange={(page) => {
                            setSnapshotPage(page);
                            loadSnapshotsList(page, modalCycleFilter);
                        }}
                        onLoadSnapshot={onLoadSnapshotDetail}
                        selectedSnapshot={selectedSnapshot}
                        onBackToList={() => setSelectedSnapshot(null)}
                        onExportSnapshot={exportSnapshot}
                        modalCycleFilter={modalCycleFilter}
                        onModalCycleFilterChange={(val) => {
                            setModalCycleFilter(val);
                            loadSnapshotsList(1, val);
                        }}
                        cyclesList={cycles}
                    />
                )}
            </div>
        </div>
    );
}