// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import Tabs from "../components/Tabs";
import ToastNotification from "../components/ToastNotification";

export default function CompanyOkrList({
    cyclesList: initialCycles = [],
    currentUser,
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleFilter, setCycleFilter] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [overallProgress, setOverallProgress] = useState(0);
    const [fetchedCycles, setFetchedCycles] = useState([]);
    const cyclesList = initialCycles?.length ? initialCycles : fetchedCycles;

    useEffect(() => {
        if (initialCycles?.length) {
            return;
        }
        (async () => {
            try {
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();
                if (Array.isArray(json.data)) {
                    setCyclesList(json.data);
                }
            } catch (error) {
                console.error("Failed to load cycles", error);
            }
        })();
    }, [initialCycles]);

    // Tải OKR toàn công ty
    const fetchCompanyOkrs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (cycleFilter) params.append("cycle_id", cycleFilter);

            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            const res = await fetch(`/company-okrs?${params}`, {
                headers: {
                    Accept: "application/json",
                    // "X-CSRF-TOKEN": token || "",
                },
                credentials: "omit",
            });
            const json = await res.json();

            if (json.success) {
                setItems(json.data); // ← json.data là mảng Objective
                // Tính overall progress từ client (vì backend không trả)
                const total = json.data.reduce((acc, obj) => {
                    const avgKR =
                        obj.key_results?.length > 0
                            ? obj.key_results.reduce(
                                  (s, kr) => s + (kr.progress_percent || 0),
                                  0
                              ) / obj.key_results.length
                            : 0;
                    return acc + avgKR;
                }, 0);
                setOverallProgress(
                    json.data.length > 0 ? total / json.data.length : 0
                );
            } else {
                throw new Error(json.message || "Lỗi tải dữ liệu");
            }
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Không tải được OKR công ty",
            });
        } finally {
            setLoading(false);
        }
    }, [cycleFilter]);

    // Tự động chọn quý hiện tại (giống hệt ObjectiveList)
    useEffect(() => {
        if (!cycleFilter && cyclesList.length > 0) {
            const now = new Date();
            const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
            const currentYear = now.getFullYear();

            const current = cyclesList.find((c) => {
                const match = c.cycle_name.match(/Quý (\d+) năm (\d+)/);
                return (
                    match &&
                    parseInt(match[1]) === currentQuarter &&
                    parseInt(match[2]) === currentYear
                );
            });

            if (current) setCycleFilter(current.cycle_id);
        }
    }, [cyclesList, cycleFilter]);

    // Load dữ liệu
    useEffect(() => {
        fetchCompanyOkrs();
    }, [fetchCompanyOkrs]);

    // Helper format (giống hệt ObjectiveList)
    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(1)}%` : "0%";
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
            case "bai":
            case "bài":
                return "Bài";
            default:
                return unit || "";
        }
    };

    const getLevelBadge = (level) => {
        const map = {
            company: "bg-purple-100 text-purple-800",
            unit: "bg-blue-100 text-blue-800",
            team: "bg-green-100 text-green-800",
            person: "bg-gray-100 text-gray-800",
        };
        return map[level] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Header */}
            {/* ... (Giữ nguyên phần Header) ... */}

            {/* Tabs giả (chỉ để giữ layout giống) */}
            <div className="mb-4">
                <Tabs showArchived={false} setShowArchived={() => {}} />
            </div>

            {/* Bảng OKR - Cập nhật để khớp ObjectiveList */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    {/* === BẮT ĐẦU CHỈNH SỬA THEAD === */}
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            {/* 1. Tiêu đề (30%) */}
                            <th className="px-3 py-2 text-left w-[30%] border-r border-slate-200">
                                Tiêu đề
                            </th>
                            {/* (ĐÃ XÓA CỘT CẤP ĐỘ) */}
                            {/* 2. Người thực hiện (12%) */}
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Người thực hiện
                            </th>
                            {/* 3. Trạng thái (12%) */}
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Trạng thái
                            </th>
                            {/* 4. Đơn vị (10%) */}
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Đơn vị
                            </th>
                            {/* 5. Thực tế (10%) */}
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Thực tế
                            </th>
                            {/* 6. Mục tiêu (10%) */}
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Mục tiêu
                            </th>
                            {/* 7. Tiến độ (%) (10%) */}
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Tiến độ (%)
                            </th>
                            {/* 8. Hành động (12%) - CỘT MỚI */}
                            <th className="px-3 py-2 text-center w-[12%]">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    {/* === KẾT THÚC CHỈNH SỬA THEAD === */}

                    <tbody className="divide-y divide-slate-100">
                        {/* ... (Giữ nguyên phần loading/empty state) ... */}

                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Chưa có OKR nào trong quý này.
                                </td>
                            </tr>
                        ) : (
                            items.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    {/* === BẮT ĐẦU CHỈNH SỬA OBJECTIVE ROW === */}
                                    <tr
                                        className={`bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-200`}
                                    >
                                        <td
                                            colSpan={7}
                                            className="px-3 py-3 border-r border-slate-200"
                                        >
                                            {" "}
                                            {/* colSpan=7 */}
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    {obj.key_results?.length >
                                                        0 && (
                                                        <button
                                                            onClick={() =>
                                                                setOpenObj(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [obj.objective_id]:
                                                                            !prev[
                                                                                obj
                                                                                    .objective_id
                                                                            ],
                                                                    })
                                                                )
                                                            }
                                                            className="p-2 rounded-lg hover:bg-slate-100 transition-all"
                                                        >
                                                            <svg
                                                                className={`w-4 h-4 text-slate-600 transition-transform ${
                                                                    openObj[
                                                                        obj
                                                                            .objective_id
                                                                    ]
                                                                        ? "rotate-90"
                                                                        : ""
                                                                }`}
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <span className="font-bold text-slate-900">
                                                        [
                                                        {obj.level === "company"
                                                            ? "CÔNG TY"
                                                            : obj.department
                                                                  ?.department_name ||
                                                              obj.level.toUpperCase()}
                                                        ] {obj.obj_title}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Cột Hành động (cột thứ 8) */}
                                        <td className="px-3 py-3 text-center bg-gradient-to-r from-indigo-50 to-purple-50">
                                            {/* Nội dung hành động (trống) */}
                                        </td>
                                    </tr>
                                    {/* === KẾT THÚC CHỈNH SỬA OBJECTIVE ROW === */}

                                    {/* === BẮT ĐẦU CHỈNH SỬA KEY RESULTS ROW === */}
                                    {openObj[obj.objective_id] &&
                                        obj.key_results?.map((kr) => (
                                            <tr key={kr.kr_id}>
                                                {/* 1. Tiêu đề (30%) */}
                                                <td className="px-8 py-3 border-r border-slate-200">
                                                    <span className="font-medium text-slate-800">
                                                        {kr.kr_title}
                                                    </span>
                                                </td>
                                                {/* (ĐÃ XÓA CỘT CẤP ĐỘ ỨNG VỚI CỘT THỨ 2 BAN ĐẦU) */}

                                                {/* 2. Người thực hiện (12%) - CỘT MỚI (CHUYỂN VỊ TRÍ) */}
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.assignee?.fullName ||
                                                        kr.assigned_to ||
                                                        "Chưa giao"}
                                                </td>
                                                {/* 3. Trạng thái (12%) - CỘT MỚI (CHUYỂN VỊ TRÍ) */}
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                            kr.status ===
                                                            "completed"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : kr.status ===
                                                                  "active"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {getStatusText(
                                                            kr.status
                                                        )}
                                                    </span>
                                                </td>
                                                {/* 4. Đơn vị (10%) - CỘT MỚI (CHUYỂN VỊ TRÍ) */}
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {getUnitText(kr.unit)}
                                                </td>
                                                {/* 5. Thực tế (10%) - CỘT MỚI (CHUYỂN VỊ TRÍ) */}
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.current_value ?? 0}
                                                </td>
                                                {/* 6. Mục tiêu (10%) - CỘT MỚI (CHUYỂN VỊ TRÍ) */}
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.target_value}
                                                </td>
                                                {/* 7. Tiến độ (%) (10%) - CỘT MỚI (CHUYỂN VỊ TRÍ) */}
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {formatPercent(
                                                        kr.progress_percent
                                                    )}
                                                </td>
                                                {/* 8. Hành động (12%) - CỘT MỚI (THÊM VÀO CUỐI) */}
                                                <td className="px-3 py-3 text-center">
                                                    {/* Placeholder cho Hành động */}
                                                </td>
                                            </tr>
                                        ))}
                                    {/* === KẾT THÚC CHỈNH SỬA KEY RESULTS ROW === */}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ToastNotification toast={toast} />
        </div>
    );
}
