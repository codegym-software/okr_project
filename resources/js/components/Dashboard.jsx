
import React, { useEffect, useMemo, useState } from "react";
import ObjectiveList from "../pages/ObjectiveList.jsx";
import ObjectiveModal from "../pages/ObjectiveModal.jsx";
import KeyResultModal from "../pages/KeyResultModal.jsx";
import ToastComponent from "../pages/ToastComponent.jsx";
import ErrorBoundary from "./ErrorBoundary";
import OKRBarChart from "./OKRBarChart";
import OKRTable from "./OKRTable";
import CheckInModal from "./CheckInModal";
import CheckInHistory from "./CheckInHistory";

export default function Dashboard() {
    const [items, setItems] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [cyclesList, setCyclesList] = useState([]);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const [editingKR, setEditingKR] = useState(null);
    const [creatingFor, setCreatingFor] = useState(null);
    const [creatingObjective, setCreatingObjective] = useState(false);
    const [editingObjective, setEditingObjective] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [cycleFilter, setCycleFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [myOKRFilter, setMyOKRFilter] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [pieChartData, setPieChartData] = useState([]);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [checkInModal, setCheckInModal] = useState({ open: false, keyResult: null });
    const [checkInHistory, setCheckInHistory] = useState({ open: false, keyResult: null });

    const loadStaticData = async () => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");

            const [resDept, resCycles, resLinks] = await Promise.all([
                fetch("/departments", {
                    headers: { Accept: "application/json" },
                }),
                fetch("/cycles", { headers: { Accept: "application/json" } }),
                fetch("/my-links", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
            ]);

            if (resDept.ok) {
                const deptData = await resDept.json();
                setDepartments(deptData.data || []);
            }

            if (resCycles.ok) {
                const cyclesData = await resCycles.json();
                setCyclesList(cyclesData.data || []);
            }

            if (resLinks.ok) {
                const linksData = await resLinks.json().catch((err) => {
                    console.error("Error parsing links:", err);
                    return { data: [] };
                });
                setLinks(linksData.data || []);
            }
        } catch (err) {
            console.error("Load static data error:", err);
        }
    };

    const load = async (pageNum = 1, filter = "", myOKR = false) => {
        try {
            setLoading(true);
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            if (!token) {
                setToast({
                    type: "error",
                    message: "Không tìm thấy CSRF token",
                });
                throw new Error("CSRF token not found");
            }

            // Tạo URL với filter
            let url = `/my-objectives?page=${pageNum}&dashboard=1&_t=${Date.now()}`;
            if (filter) {
                url += `&cycle_id=${filter}`;
            }
            if (myOKR) {
                url += `&my_okr=1`;
            }

            const resObj = await fetch(url, {
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": token,
                },
            });

            if (!resObj.ok) {
                console.error(
                    "Objectives API error:",
                    resObj.status,
                    resObj.statusText
                );
                setToast({
                    type: "error",
                    message: `Lỗi tải objectives: ${resObj.statusText}`,
                });
            }
            const objData = await resObj.json().catch((err) => {
                console.error("Error parsing objectives:", err);
                setToast({
                    type: "error",
                    message: "Lỗi phân tích dữ liệu objectives",
                });
                return { success: false, data: { data: [], last_page: 1 } };
            });
            // Normalize data: convert keyResults to key_results
            const list = Array.isArray(objData?.data?.data) ? objData.data.data : (Array.isArray(objData?.data) ? objData.data : []);
            const normalizedItems = Array.isArray(list)
                ? list.map(obj => ({
                    ...obj,
                    key_results: obj.key_results || obj.keyResults || []
                }))
                : [];
            if (resObj.ok && Array.isArray(list)) {
                setItems(normalizedItems);
                try { localStorage.setItem('my_objectives', JSON.stringify(normalizedItems)); } catch {}
                if (objData?.data?.last_page) setTotalPages(objData.data.last_page);
            } else {
                console.warn('Keeping previous objectives due to bad response');
            }

        } catch (err) {
            console.error("Load error:", err);
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
            setToast({
                type: "error",
                message: "Không thể tải dữ liệu. Vui lòng thử lại.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    useEffect(() => {
        load(page, cycleFilter, myOKRFilter);
    }, [page]);

    useEffect(() => {
        // Khi filter thay đổi, reset về trang 1 và reload
        setPage(1);
        load(1, cycleFilter, myOKRFilter);
    }, [cycleFilter]);

    useEffect(() => {
        // Khi My OKR filter thay đổi, reset về trang 1 và reload
        setPage(1);
        load(1, cycleFilter, myOKRFilter);
    }, [myOKRFilter]);

    useEffect(() => {
        // Khi Department filter thay đổi, reset về trang 1 và reload (filter client-side)
        setPage(1);
    }, [departmentFilter]);

    useEffect(() => {
        // Load static data một lần khi component mount
        loadStaticData();
        
        // Load current user
        const loadCurrentUser = async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                const res = await fetch("/api/profile", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    setCurrentUser(json.user);
                }
            } catch (err) {
                console.error("Error loading current user:", err);
            }
        };
        loadCurrentUser();
    }, []);

    const filteredItems = useMemo(
        () => {
            let result = Array.isArray(items) ? items : [];

            // Apply filters
            if (cycleFilter) {
                result = result.filter(item => 
                    String(item.cycle_id) === String(cycleFilter)
                );
            }

            if (departmentFilter) {
                result = result.filter(item => 
                    String(item.department_id) === String(departmentFilter)
                );
            }

            if (myOKRFilter && currentUser) {
                result = result.filter(item => 
                    String(item.user_id) === String(currentUser.user_id || currentUser.id)
                );
            }

            // No sorting as requested; keep server order
            return result;
        },
        [items, cycleFilter, departmentFilter, myOKRFilter, currentUser]
    );

    const sortedItems = useMemo(() => {
        const now = new Date();
        // Tính tổng tiến độ của tất cả OKR
        const totalProgress = filteredItems.reduce((sum, item) => {
            if (!item.key_results || item.key_results.length === 0) return sum;
            const itemProgress = item.key_results.reduce((krSum, kr) => {
                const percentage = kr.progress_percent !== null && kr.progress_percent !== undefined
                    ? parseFloat(kr.progress_percent)
                    : (kr.target_value > 0 ? (parseFloat(kr.current_value || 0) / parseFloat(kr.target_value)) * 100 : 0);
                return krSum + percentage;
            }, 0) / item.key_results.length;
            return sum + itemProgress;
        }, 0);
        const overallAvgProgress = filteredItems.length > 0 ? totalProgress / filteredItems.length : 0;

        // Sort by created_at descending (newest first) và thêm thông tin deadline
        return [...filteredItems].map(item => {
            // Tính overall progress cho item này (tỷ lệ % chung)
            let itemOverallProgress = 0;
            if (item.key_results && item.key_results.length > 0) {
                const itemProgress = item.key_results.reduce((krSum, kr) => {
                    const percentage = kr.progress_percent !== null && kr.progress_percent !== undefined
                        ? parseFloat(kr.progress_percent)
                        : (kr.target_value > 0 ? (parseFloat(kr.current_value || 0) / parseFloat(kr.target_value)) * 100 : 0);
                    return krSum + percentage;
                }, 0);
                itemOverallProgress = itemProgress / item.key_results.length;
            }

            // Kiểm tra quá hạn và tính deadline, priority dựa trên cycle end_date
            let isOverdue = false;
            let isUpcoming = false; // Sắp hết hạn (còn <= 7 ngày)
            let deadlineCharacter = '-';
            let priority = 'low'; // Mặc định là thấp

            if (item.cycle && item.cycle.end_date) {
                const endDate = new Date(item.cycle.end_date);
                isOverdue = endDate < now;
                
                // Format ngày hết hạn
                deadlineCharacter = endDate.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                // Tính mức độ ưu tiên và trạng thái dựa trên thời gian còn lại
                const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                
                if (isOverdue) {
                    priority = 'high'; // Quá hạn = ưu tiên cao
                } else if (daysRemaining <= 7 && daysRemaining > 0) {
                    priority = 'high'; // Còn <= 7 ngày = ưu tiên cao
                    isUpcoming = true; // Sắp hết hạn
                } else if (daysRemaining <= 30) {
                    priority = 'medium'; // Còn <= 30 ngày = ưu tiên trung bình
                } else {
                    priority = 'low'; // Còn > 30 ngày = ưu tiên thấp
                }
            }

            return {
                ...item,
                deadlineCharacter,
                isOverdue,
                isUpcoming,
                priority
            };
        }).sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Descending order
        });
    }, [filteredItems]);

    const handleCheckInSuccess = (keyResultData) => {
        if (keyResultData && keyResultData.kr_id) {
            // Cập nhật Key Result trong danh sách
            setItems((prev) =>
                prev.map((obj) => ({
                    ...obj,
                    key_results: (obj.key_results || []).map((kr) =>
                        kr.kr_id === keyResultData.kr_id ? { ...kr, ...keyResultData } : kr
                    ),
                }))
            );
        }
        
        // Hiển thị thông báo thành công
        setToast({
            type: "success",
            message: keyResultData?.progress_percent >= 100 
                ? "🎉 Chúc mừng! Key Result đã hoàn thành 100%."
                : "✅ Cập nhật tiến độ thành công!",
        });
        
        // Reload data để đảm bảo đồng bộ
        load(page, cycleFilter, myOKRFilter);
    };

    const openCheckInModal = (keyResult) => {
        console.log('Opening check-in modal for:', keyResult);
        console.log('Objective ID:', keyResult?.objective_id);
        setCheckInModal({ open: true, keyResult });
    };

    const openCheckInHistory = (keyResult) => {
        console.log('Opening check-in history for:', keyResult);
        console.log('Objective ID:', keyResult?.objective_id);
        setCheckInHistory({ open: true, keyResult });
    };

    // Tính toán dữ liệu cho pie chart
    useEffect(() => {
        if (sortedItems.length > 0) {
            const total = sortedItems.length;
            
            // Tính toán các trạng thái dựa trên progress của Key Results
            const completed = sortedItems.filter(item => {
                if (!item.key_results || item.key_results.length === 0) return false;
                return item.key_results.every(kr => parseFloat(kr.progress_percent || 0) >= 100);
            }).length;
            
            const inProgress = sortedItems.filter(item => {
                if (!item.key_results || item.key_results.length === 0) return false;
                const hasProgress = item.key_results.some(kr => parseFloat(kr.progress_percent || 0) > 0);
                const notCompleted = item.key_results.some(kr => parseFloat(kr.progress_percent || 0) < 100);
                return hasProgress && notCompleted;
            }).length;
            
            const draft = sortedItems.filter(item => {
                if (!item.key_results || item.key_results.length === 0) return true;
                return item.key_results.every(kr => parseFloat(kr.progress_percent || 0) === 0);
            }).length;
            
            const closed = Math.max(0, total - completed - inProgress - draft);

            setPieChartData([
                { label: "mục tiêu", value: inProgress, color: "#8b5cf6" },
                { label: "đã hoàn thành", value: completed, color: "#ec4899" },
                { label: "đã đóng", value: closed, color: "#06b6d4" },
                { label: "thực tế", value: draft, color: "#f59e0b" }
            ]);
        } else {
            setPieChartData([]);
        }
    }, [sortedItems]);

    return (
        <div className="min-h-screen bg-white">
            <ToastComponent
                type={toast.type}
                message={toast.message}
                onClose={() => setToast((prev) => ({ ...prev, message: "" }))}
            />
            
            {/* Main Content */}
            <div className="p-6 max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="bg-blue-50 px-6 py-4 rounded-lg mb-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">My OKR</h2>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                showFilters 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span>filter</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Filter Dropdown */}
                {showFilters && (
                    <div className="relative mb-6">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Chu kỳ</label>
                                    <select
                                        value={cycleFilter}
                                        onChange={(e) => setCycleFilter(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">-- Tất cả chu kỳ --</option>
                                        {cyclesList.map((cycle) => (
                                            <option key={cycle.cycle_id} value={cycle.cycle_id}>
                                                {cycle.cycle_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phòng ban</label>
                                    <select
                                        value={departmentFilter}
                                        onChange={(e) => setDepartmentFilter(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">-- Tất cả phòng ban --</option>
                                        {departments.map((dept) => (
                                            <option key={dept.department_id} value={dept.department_id}>
                                                {dept.d_name || dept.department_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex flex-col justify-end">
                                    <button
                                        onClick={() => {
                                            setCycleFilter('');
                                            setDepartmentFilter('');
                                            setMyOKRFilter(false);
                                        }}
                                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex items-center">
                                <input
                                    type="checkbox"
                                    id="myOKR"
                                    checked={myOKRFilter}
                                    onChange={(e) => setMyOKRFilter(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="myOKR" className="ml-2 text-sm text-gray-700">
                                    Chỉ hiển thị OKR của tôi
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{sortedItems.length}</div>
                        <div className="text-sm text-gray-600">Tổng OKR</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">
                            {pieChartData.find(d => d.label === "mục tiêu")?.value || 0}
                        </div>
                        <div className="text-sm text-gray-600">Đang thực hiện</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-pink-600">
                            {pieChartData.find(d => d.label === "đã hoàn thành")?.value || 0}
                        </div>
                        <div className="text-sm text-gray-600">Đã hoàn thành</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-amber-600">
                            {pieChartData.find(d => d.label === "thực tế")?.value || 0}
                        </div>
                        <div className="text-sm text-gray-600">Chưa bắt đầu</div>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-800">{error}</span>
                            <button 
                                onClick={() => {
                                    setError(null);
                                    load(page, cycleFilter, myOKRFilter);
                                }}
                                className="ml-auto text-red-600 hover:text-red-800 underline"
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                )}

                {/* Bar Chart Section */}
                {pieChartData.length > 0 && !error && (
                    <div className="mb-6">
                        <OKRBarChart 
                            okrData={pieChartData}
                        />
                    </div>
                )}
                {pieChartData.length === 0 && !error && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                        <div className="text-center text-gray-500">
                            <p>Không có dữ liệu để hiển thị biểu đồ</p>
                            <p className="text-sm">Số objectives: {sortedItems.length}</p>
                        </div>
                    </div>
                )}

                {/* OKR Table */}
                <OKRTable 
                    items={sortedItems}
                    departments={departments}
                    cyclesList={cyclesList}
                    loading={loading}
                    onViewOKR={(item) => {
                        // Navigate to objective detail page or open modal
                        console.log('View OKR:', item);
                        // You can implement navigation here
                    }}
                    onCheckIn={openCheckInModal}
                    onViewCheckInHistory={openCheckInHistory}
                    currentUser={currentUser}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex justify-center gap-2">
                <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300 hover:bg-blue-700 transition-colors"
                >
                    Trước
                </button>
                        <span className="text-sm text-slate-600 flex items-center px-4">
                    Trang {page} / {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300 hover:bg-blue-700 transition-colors"
                >
                    Sau
                </button>
                    </div>
                )}
            </div>
            {editingKR && (
                <KeyResultModal
                    editingKR={editingKR}
                    departments={departments}
                    cyclesList={cyclesList}
                    setEditingKR={setEditingKR}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={() => load(page, cycleFilter, myOKRFilter)}
                />
            )}
            {creatingFor && (
                <KeyResultModal
                    creatingFor={creatingFor}
                    departments={departments}
                    cyclesList={cyclesList}
                    setCreatingFor={setCreatingFor}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={() => load(page, cycleFilter, myOKRFilter)}
                />
            )}
            {creatingObjective && (
                <ObjectiveModal
                    creatingObjective={creatingObjective}
                    setCreatingObjective={setCreatingObjective}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={() => {
                        // Reset all filters when creating new objective to ensure it shows
                        setCycleFilter("");
                        setDepartmentFilter("");
                        setMyOKRFilter(false);
                        load(1, "", false); // Reload with no filters
                    }}
                />
            )}
            {editingObjective && (
                <ObjectiveModal
                    editingObjective={editingObjective}
                    setEditingObjective={setEditingObjective}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                    setLinks={setLinks}
                    reloadData={load}
                />
            )}

            {/* Check-in Modal */}
            <ErrorBoundary>
                <CheckInModal
                    open={checkInModal.open}
                    onClose={() => setCheckInModal({ open: false, keyResult: null })}
                    keyResult={checkInModal.keyResult}
                    objectiveId={checkInModal.keyResult?.objective_id}
                    onSuccess={handleCheckInSuccess}
                />
            </ErrorBoundary>

            {/* Check-in History Modal */}
            <ErrorBoundary>
                <CheckInHistory
                    open={checkInHistory.open}
                    onClose={() => setCheckInHistory({ open: false, keyResult: null })}
                    keyResult={checkInHistory.keyResult}
                    objectiveId={checkInHistory.keyResult?.objective_id}
                    onSuccess={handleCheckInSuccess}
                />
            </ErrorBoundary>

        </div>
    );
}
