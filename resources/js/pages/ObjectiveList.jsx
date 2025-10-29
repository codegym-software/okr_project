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
    setItems, // Bắt buộc có
}) {
    const [toast, setToast] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedItems, setArchivedItems] = useState([]);
    const [archivedCount, setArchivedCount] = useState(0);
    const [loadingArchived, setLoadingArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentCycleId, setCurrentCycleId] = useState(null);

    useEffect(() => {
        const fetchOKRs = async () => {
            const res = await fetch("/my-objectives");
            const json = await res.json();
            if (json.success) {
                setItems(json.data.data);
                setCurrentCycleId(json.current_cycle_id);
            }
        };
        fetchOKRs();
    }, []);

    // === LOAD OKR ĐÃ LƯU TRỮ KHI CHUYỂN TAB ===
    useEffect(() => {
        if (showArchived) {
            const fetchArchived = async () => {
                setLoadingArchived(true);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const params = new URLSearchParams({ archived: "1" });
                    if (cycleFilter) {
                        params.append("cycle_id", cycleFilter);
                    }

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

                        // TỰ ĐỘNG CHỌN QUÝ HIỆN TẠI NẾU CHƯA CÓ
                        if (json.current_cycle_id && !cycleFilter) {
                            setCycleFilter(json.current_cycle_id);
                        }
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

    // === TỰ ĐỘNG CHỌN QUÝ HIỆN TẠI KHI VÀO TRANG ===
    useEffect(() => {
        if (items.length > 0 && !cycleFilter) {
            const urlParams = new URLSearchParams(window.location.search);
            const urlCycleId = urlParams.get("cycle_id");

            if (urlCycleId) {
                setCycleFilter(urlCycleId);
                return;
            }

            // ƯU TIÊN: DÙNG current_cycle_id TỪ BACKEND (nếu có)
            // → Bạn PHẢI truyền currentCycleId từ component cha
            if (currentCycleId) {
                setCycleFilter(currentCycleId);
                return;
            }

            // Fallback: chỉ dùng items[0] nếu không có current_cycle_id
            const firstItemCycleId = items[0]?.cycle_id;
            if (firstItemCycleId) {
                setCycleFilter(firstItemCycleId);
            }
        }
    }, [items, cycleFilter, setCycleFilter, currentCycleId]);

    // === FORMAT HELPER ===
    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "Bản nháp";
            case "active":
                return "Đang thực hiện";
            case "completed":
                return "Hoàn thành";
            default:
                return status || "";
        }
    };

    const getUnitText = (unit) => {
        switch (unit?.toLowerCase()) {
            case "number":
                return "Số lượng";
            case "percent":
                return "Phần trăm";
            case "completion":
                return "Hoàn thành";
            default:
                return unit || "";
        }
    };

    const calculateObjectiveProgress = (keyResults) => {
        if (!keyResults || keyResults.length === 0) return 0;
        const validKRs = keyResults.filter(
            (kr) => kr.target_value && Number(kr.target_value) > 0
        );
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
            {/* HEADER: CHỈ CÒN FILTER CHU KỲ + NÚT TẠO */}
            <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Dropdown chu kỳ */}
                    <div className="relative w-64">
                        <button
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <span className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                {cyclesList.find(
                                    (c) =>
                                        String(c.cycle_id) ===
                                        String(cycleFilter)
                                )?.cycle_name || "Chọn chu kỳ"}
                            </span>
                            <svg
                                className={`w-4 h-4 transition-transform ${
                                    dropdownOpen ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                                {cyclesList.map((cycle) => {
                                    const match =
                                        cycle.cycle_name.match(
                                            /Quý (\d+) năm (\d+)/
                                        );
                                    const quarter = match
                                        ? parseInt(match[1])
                                        : null;
                                    const year = match
                                        ? parseInt(match[2])
                                        : null;
                                    const now = new Date();
                                    const currentQuarter = Math.ceil(
                                        (now.getMonth() + 1) / 3
                                    );
                                    const currentYear = now.getFullYear();
                                    const isCurrent =
                                        quarter === currentQuarter &&
                                        year === currentYear;

                                    return (
                                        <label
                                            key={cycle.cycle_id}
                                            className={`flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                                                String(cycleFilter) ===
                                                String(cycle.cycle_id)
                                                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                    : isCurrent
                                                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="cycle"
                                                value={cycle.cycle_id}
                                                checked={
                                                    String(cycleFilter) ===
                                                    String(cycle.cycle_id)
                                                }
                                                onChange={(e) => {
                                                    setCycleFilter(
                                                        e.target.value
                                                    );
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

                <button
                    onClick={() => setCreatingObjective(true)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                    + Thêm Objective
                </button>
            </div>

            {/* BẢNG OKR */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left w-[30%]">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Phòng ban
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Chu kỳ
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Trạng thái
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Đơn vị
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Thực tế
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Mục tiêu
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Tiến độ (%)
                            </th>
                            <th className="px-3 py-2 text-center w-[10%]">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading && items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Bạn chưa tạo OKR nào.
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            items.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    <tr
                                        className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        setOpenObj((prev) => ({
                                                            ...prev,
                                                            [obj.objective_id]:
                                                                !prev[
                                                                    obj
                                                                        .objective_id
                                                                ],
                                                        }))
                                                    }
                                                    className="rounded-md border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 shadow-sm"
                                                    title="Đóng/mở Key Results"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                        className={`h-4 w-4 transition-transform ${
                                                            openObj[
                                                                obj.objective_id
                                                            ]
                                                                ? "rotate-90"
                                                                : ""
                                                        }`}
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                                <span className="font-medium text-slate-900 flex-1">
                                                    {obj.obj_title}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            {departments.find(
                                                (d) =>
                                                    String(d.department_id) ===
                                                    String(obj.department_id)
                                            )?.d_name || "-"}
                                        </td>

                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            {cyclesList.find(
                                                (c) =>
                                                    String(c.cycle_id) ===
                                                    String(obj.cycle_id)
                                            )?.cycle_name || ""}
                                        </td>

                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            <span
                                                className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                    (
                                                        obj.status || ""
                                                    ).toUpperCase() ===
                                                    "COMPLETED"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : (
                                                              obj.status || ""
                                                          ).toUpperCase() ===
                                                          "ACTIVE"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {getStatusText(obj.status)}
                                            </span>
                                        </td>

                                        <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                                        <td className="px-3 py-3 text-center border-r border-slate-200">
                                            {formatPercent(
                                                calculateObjectiveProgress(
                                                    obj.key_results
                                                )
                                            )}
                                        </td>

                                        <td className="px-3 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        setEditingObjective({
                                                            ...obj,
                                                            level:
                                                                obj.level ||
                                                                "team",
                                                        })
                                                    }
                                                    className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                    title="Chỉnh sửa Objective"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setCreatingFor(obj)
                                                    }
                                                    className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                    title="Thêm Key Result"
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-4 h-4"
                                                    >
                                                        <circle
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            fill="none"
                                                        />
                                                        <path
                                                            d="M12 7V17M7 12H17"
                                                            stroke="currentColor"
                                                            strokeWidth="3"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* KEY RESULTS */}
                                    {openObj[obj.objective_id] &&
                                        obj.key_results.map((kr) => (
                                            <tr key={kr.kr_id}>
                                                <td className="px-8 py-3 border-r border-slate-200">
                                                    <button
                                                        onClick={() =>
                                                            setEditingKR(kr)
                                                        }
                                                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                        title="Sửa Key Result"
                                                    >
                                                        {kr.kr_title || ""}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                    {departments.find(
                                                        (d) =>
                                                            String(
                                                                d.department_id
                                                            ) ===
                                                            String(
                                                                obj.department_id
                                                            )
                                                    )?.d_name || "-"}
                                                </td>
                                                <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                    {cyclesList.find(
                                                        (c) =>
                                                            String(
                                                                c.cycle_id
                                                            ) ===
                                                            String(kr.cycle_id)
                                                    )?.cycle_name || ""}
                                                </td>
                                                <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                            (
                                                                kr.status || ""
                                                            ).toUpperCase() ===
                                                            "COMPLETED"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : (
                                                                      kr.status ||
                                                                      ""
                                                                  ).toUpperCase() ===
                                                                  "ACTIVE"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {getStatusText(
                                                            kr.status
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                    {getUnitText(kr.unit)}
                                                </td>
                                                <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                    {kr.current_value ?? ""}
                                                </td>
                                                <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                    {kr.target_value ?? ""}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {formatPercent(
                                                        kr.progress_percent
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() =>
                                                            setEditingKR(kr)
                                                        }
                                                        className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                        title="Sửa Key Result"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                            />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </React.Fragment>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
