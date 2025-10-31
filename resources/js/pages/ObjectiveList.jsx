import React, { useState, useEffect } from "react";
import { canCheckInKeyResult } from "../utils/checkinPermissions";

export default function ObjectiveList({
    items,
    departments,
    cyclesList,
    loading,
    openObj,
    setOpenObj,
    setCreatingFor,
    setEditingObjective,
    setEditingKR,
    setCreatingObjective,
    links,
    cycleFilter,
    setCycleFilter,
    openCheckInModal,
    openCheckInHistory,
    currentUser,
    hideFilters = false,
    setItems,
}) {
    const [toast, setToast] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedItems, setArchivedItems] = useState([]);
    const [archivedCount, setArchivedCount] = useState(0);
    const [loadingArchived, setLoadingArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentCycleId, setCurrentCycleId] = useState(null);

    // === TẢI OKR ĐÃ LƯU TRỮ ===
    useEffect(() => {
        if (showArchived) {
            const fetchArchived = async () => {
                setLoadingArchived(true);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const params = new URLSearchParams({ archived: "1" });
                    if (cycleFilter) params.append("cycle_id", cycleFilter);

                    const res = await fetch(`/my-objectives?${params}`, {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        setArchivedItems(json.data.data || []);
                        setArchivedCount(json.data.total || 0);
                    } else {
                        throw new Error(json.message || "Lỗi tải OKR lưu trữ");
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setLoadingArchived(false);
                }
            };
            fetchArchived();
        } else {
            setArchivedItems([]);
            setArchivedCount(0);
        }
    }, [showArchived, cycleFilter, setCycleFilter, setToast]);

    // === TỰ ĐỘNG CHỌN QUÝ HIỆN TẠI ===
useEffect(() => {
    // Chỉ chạy khi chưa có cycleFilter VÀ chưa có trong URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlCycleId = urlParams.get("cycle_id");

    // Nếu URL đã có cycle_id → ưu tiên dùng nó
    if (urlCycleId && !cycleFilter) {
        setCycleFilter(urlCycleId);
        return;
    }

    // Nếu đã có cycleFilter (do người dùng chọn) → không làm gì
    if (cycleFilter) {
        return;
    }

    // Nếu có currentCycleId từ server → dùng nó
    if (currentCycleId) {
        setCycleFilter(currentCycleId);
        return;
    }

    // Cuối cùng: dùng cycle_id của item đầu tiên
    if (items.length > 0) {
        const firstItemCycleId = items[0]?.cycle_id;
        if (firstItemCycleId) {
            setCycleFilter(firstItemCycleId);
        }
    }
}, [items, cycleFilter, currentCycleId]); // Loại bỏ setCycleFilter khỏi deps

    // === TRẠNG THÁI HÀNH ĐỘNG ===
    const [archiving, setArchiving] = useState(null);
    const [unarchiving, setUnarchiving] = useState(null);
    const [deleting, setDeleting] = useState(null);

    // === LƯU TRỮ OKR ===
    const handleArchive = async (id) => {
        if (!confirm("Lưu trữ OKR này? Bạn sẽ không thể chỉnh sửa nữa.")) return;
        setArchiving(id);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(`/my-objectives/${id}/archive`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
            });
            const json = await res.json();
            if (json.success) {
                const archivedItem = items.find(o => o.objective_id === id);
                setItems(prev => prev.filter(o => o.objective_id !== id));
                setArchivedItems(prev => [archivedItem, ...prev]); 
                setArchivedCount(prev => prev + 1); 
                setToast({ type: 'success', message: json.message });
            } else {
                throw new Error(json.message);
            }
        } catch (err) {
            setToast({ type: 'error', message: err.message });
        } finally {
            setArchiving(null);
        }
    };

    // === BỎ LƯU TRỮ ===
    const handleUnarchive = async (id) => {
        if (!confirm('Bỏ lưu trữ OKR này?')) return;
        setUnarchiving(id);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(`/my-objectives/${id}/unarchive`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
            });
            const json = await res.json();
            if (json.success) {
                const unarchivedItem = archivedItems.find(o => o.objective_id === id);
                setArchivedItems(prev => prev.filter(o => o.objective_id !== id));
                setItems(prev => [unarchivedItem, ...prev]); 
                setArchivedCount(prev => Math.max(0, prev - 1));
                setToast({ type: 'success', message: json.message });
            } else {
                throw new Error(json.message);
            }
        } catch (err) {
            setToast({ type: 'error', message: err.message });
        } finally {
            setUnarchiving(null);
        }
    };

    // === XÓA VĨNH VIỄN ===
    const handleDelete = async (id) => {
        if (!confirm('XÓA VĨNH VIỄN OKR này? Không thể khôi phục!')) return;
        setDeleting(id);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(`/my-objectives/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
            });
            const json = await res.json();
            if (json.success) {
                setArchivedItems(prev => prev.filter(o => o.objective_id !== id));
                setArchivedCount(prev => prev - 1);
                setToast({ type: 'success', message: json.message });
            } else {
                throw new Error(json.message);
            }
        } catch (err) {
            setToast({ type: 'error', message: err.message });
        } finally {
            setDeleting(null);
        }
    };

    // === HELPER FORMAT ===
    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case "draft": return "Bản nháp";
            case "active": return "Đang thực hiện";
            case "completed": return "Hoàn thành";
            default: return status || "";
        }
    };

    const getUnitText = (unit) => {
        switch (unit?.toLowerCase()) {
            case "number": return "Số lượng";
            case "percent": return "Phần trăm";
            case "completion": return "Hoàn thành";
            default: return unit || "";
        }
    };

    const calculateObjectiveProgress = (keyResults) => {
        if (!keyResults || keyResults.length === 0) return 0;
        const validKRs = keyResults.filter(kr => kr.target_value && Number(kr.target_value) > 0);
        if (validKRs.length === 0) return 0;
        const totalProgress = validKRs.reduce((sum, kr) => {
            const current = Number(kr.current_value) || 0;
            const target = Number(kr.target_value) || 0;
            const progress = target > 0 ? (current / target) * 100 : 0;
            return sum + Math.min(progress, 100);
        }, 0);
        return totalProgress / validKRs.length;
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <button
                            onClick={() => setDropdownOpen(prev => !prev)}
                            className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {cyclesList.find(c => String(c.cycle_id) === String(cycleFilter))?.cycle_name || "Chọn chu kỳ"}
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                                {cyclesList.map((cycle) => {
                                    const match = cycle.cycle_name.match(/Quý (\d+) năm (\d+)/);
                                    const quarter = match ? parseInt(match[1]) : null;
                                    const year = match ? parseInt(match[2]) : null;
                                    const now = new Date();
                                    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
                                    const currentYear = now.getFullYear();
                                    const isCurrent = quarter === currentQuarter && year === currentYear;

                                    return (
                                        <label
                                            key={cycle.cycle_id}
                                            className={`flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                                                String(cycleFilter) === String(cycle.cycle_id)
                                                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                    : isCurrent ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="cycle"
                                                value={cycle.cycle_id}
                                                checked={String(cycleFilter) === String(cycle.cycle_id)}
                                                onChange={(e) => {
                                                    setCycleFilter(e.target.value);
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                                    {cycle.cycle_name}
                                                    {isCurrent && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            Hiện tại
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex rounded-md border border-slate-300 overflow-hidden">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                !showArchived ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            Đang hoạt động
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                showArchived ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            Đã lưu trữ 
                        </button>
                    </div>

                    <button
                        onClick={() => setCreatingObjective(true)}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                        + Thêm Objective
                    </button>
                </div>
            </div>

            {/* BẢNG OKR */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left w-[30%] border-r border-slate-200">Tiêu đề</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">Phòng ban</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">Chu kỳ</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">Trạng thái</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">Đơn vị</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">Thực tế</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">Mục tiêu</th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">Tiến độ (%)</th>
                            <th className="px-3 py-2 text-center w-[12%]">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Loading */}
                        {!showArchived && loading && (
                            <tr>
                                <td colSpan={9} className="px-3 py-5 text-center text-slate-500">Đang tải...</td>
                            </tr>
                        )}

                        {/* Danh sách chính rỗng - chỉ khi KHÔNG showArchived */}
                        {!showArchived && !loading && items.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-3 py-5 text-center text-slate-500">Bạn chưa tạo OKR nào.</td>
                            </tr>
                        )}

                        {/* OKR Đang hoạt động */}
                        {!showArchived && !loading && items.map((obj, index) => (
                            <React.Fragment key={obj.objective_id}>
                                <tr className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${index > 0 ? "mt-4" : ""}`}>
                                    <td className="px-3 py-3 border-r border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setOpenObj(prev => ({ ...prev, [obj.objective_id]: !prev[obj.objective_id] }))}
                                                className="rounded-md border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 shadow-sm"
                                                title="Đóng/mở Key Results"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${openObj[obj.objective_id] ? "rotate-90" : ""}`}>
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <span className="font-medium text-slate-900 flex-1">{obj.obj_title}</span>
                                        </div>
                                    </td>

                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200">
                                        {cyclesList.find(c => String(c.cycle_id) === String(obj.cycle_id))?.cycle_name || ""}
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${(obj.status || "").toUpperCase() === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : (obj.status || "").toUpperCase() === "ACTIVE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                                            {getStatusText(obj.status)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200">
                                        {formatPercent(calculateObjectiveProgress(obj.key_results))}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => setEditingObjective({ ...obj, level: obj.level || "team" })} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Sửa Objective">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => setCreatingFor(obj)} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Thêm KR">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 7V17M7 12H17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleArchive(obj.objective_id)}
                                                disabled={archiving === obj.objective_id}
                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                title="Lưu trữ OKR"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Key Results */}
                                {openObj[obj.objective_id] && obj.key_results.map((kr) => (
                                    <tr key={kr.kr_id}>
                                        <td className="px-8 py-3 border-r border-slate-200">
                                            <span className="font-medium text-slate-900">{kr.kr_title}</span>
                                        </td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            {departments.find(d => String(d.department_id) === String(obj.department_id))?.d_name || "-"}
                                        </td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            {cyclesList.find(c => String(c.cycle_id) === String(kr.cycle_id))?.cycle_name || ""}
                                        </td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${(kr.status || "").toUpperCase() === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : (kr.status || "").toUpperCase() === "ACTIVE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                                                {getStatusText(kr.status)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">{getUnitText(kr.unit)}</td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">{kr.current_value ?? ""}</td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">{kr.target_value ?? ""}</td>
                                        <td className="px-3 py-3 text-center">{formatPercent(kr.progress_percent)}</td>
                                        <td className="px-3 py-3 text-center">
                                            <button onClick={() => setEditingKR(kr)} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Sửa KR">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}

                        {/* OKR ĐÃ LƯU TRỮ */}
                        {showArchived && loadingArchived && (
                            <tr>
                                <td colSpan={9} className="px-3 py-5 text-center text-slate-500">Đang tải...</td>
                            </tr>
                        )}

                        {showArchived && !loadingArchived && archivedItems.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-3 py-5 text-center text-slate-500">Không có OKR nào đã lưu trữ.</td>
                            </tr>
                        )}

                        {showArchived && !loadingArchived && archivedItems.map((obj, index) => (
                            <React.Fragment key={obj.objective_id}>
                                <tr className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${index > 0 ? "mt-4" : ""}`}>
                                    <td className="px-3 py-3 border-r border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900 flex-1">{obj.obj_title}</span>
                                        </div>
                                    </td>

                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200">
                                        {cyclesList.find(c => String(c.cycle_id) === String(obj.cycle_id))?.cycle_name || ""}
                                    </td>

                                    <td className="px-3 py-3 text-center border-r border-slate-200">
                                        <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700">
                                            Đã lưu trữ
                                        </span>
                                    </td>

                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                    <td className="px-3 py-3 text-center border-r border-slate-200">
                                        {formatPercent(calculateObjectiveProgress(obj.key_results))}
                                    </td>

                                    <td className="px-3 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {/* Nút Bỏ lưu trữ */}
                                            <button
                                                onClick={() => handleUnarchive(obj.objective_id)}
                                                disabled={unarchiving === obj.objective_id}
                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                title="Bỏ lưu trữ"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>

                                            {/* Nút Xóa vĩnh viễn */}
                                            <button
                                                onClick={() => handleDelete(obj.objective_id)}
                                                disabled={deleting === obj.objective_id}
                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                title="Xóa vĩnh viễn"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}