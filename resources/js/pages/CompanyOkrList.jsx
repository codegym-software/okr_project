// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import Tabs from "../components/Tabs";
import ToastNotification from "../components/ToastNotification";

export default function CompanyOkrList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleFilter, setCycleFilter] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [cyclesList, setCyclesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch cycles
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();
                if (Array.isArray(json.data)) setCyclesList(json.data);
            } catch (err) {
                setToast({
                    type: "error",
                    message: "Không tải được danh sách quý",
                });
            }
        })();
    }, []);

    // Tự động chọn quý hiện tại
    useEffect(() => {
        if (cycleFilter || cyclesList.length === 0) return;

        const now = new Date();
        const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
        const currentYear = now.getFullYear();

        const current = cyclesList.find((c) => {
            const m = c.cycle_name.match(/Quý (\d+) năm (\d+)/);
            return m && +m[1] === currentQuarter && +m[2] === currentYear;
        });

        if (current) setCycleFilter(current.cycle_id);
    }, [cyclesList, cycleFilter]);

    // Fetch company OKRs
    const fetchCompanyOkrs = useCallback(async () => {
        if (!cycleFilter) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ cycle_id: cycleFilter });
            const res = await fetch(`/company-okrs?${params}`, {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();
            if (json.success) {
                setItems(json.data || []);
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

    useEffect(() => {
        fetchCompanyOkrs();
    }, [fetchCompanyOkrs]);

    // Helper
    const formatPercent = (v) =>
        Number.isFinite(+v) ? `${(+v).toFixed(1)}%` : "0%";
    const getStatusText = (s) => {
        switch ((s || "").toLowerCase()) {
            case "draft":
                return "Bản nháp";
            case "active":
                return "Đang thực hiện";
            case "completed":
                return "Hoàn thành";
            default:
                return s || "";
        }
    };
    const getUnitText = (u) => {
        switch ((u || "").toLowerCase()) {
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
                return u || "";
        }
    };

    // Tên quý hiện tại để hiển thị đẹp
    const currentCycleName =
        cyclesList.find((c) => c.cycle_id === cycleFilter)?.cycle_name ||
        "Chọn quý";

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            {/* Header – copy 100% từ ObjectiveList */}
            <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                    <CycleDropdown
                        cyclesList={cyclesList}
                        cycleFilter={cycleFilter}
                        handleCycleChange={setCycleFilter}
                        dropdownOpen={dropdownOpen}
                        setDropdownOpen={setDropdownOpen}
                        selectedLabel={currentCycleName}
                    />
                </div>
            </div>

            {/* Bảng – copy hoàn toàn từ ObjectiveList, chỉ đổi màu + bỏ hết hành động */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left w-[30%] border-r border-slate-200">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Người thực hiện
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
                            <th className="px-3 py-2 text-center w-[12%]">
                                Hành động
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-10 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-10 text-center text-slate-500"
                                >
                                    Chưa có OKR công ty nào trong quý này.
                                </td>
                            </tr>
                        ) : (
                            items.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    {/* Objective row – gradient tím giống trang công ty */}
                                    <tr
                                        className={`bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td
                                            colSpan={7}
                                            className="px-3 py-3 border-r border-slate-200"
                                        >
                                            <div className="flex items-center gap-1">
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
                                                        className="p-2 rounded-lg hover:bg-slate-100 transition-all duration-200 group"
                                                        title="Đóng/mở Key Results"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                            className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform duration-200 ${
                                                                openObj[
                                                                    obj
                                                                        .objective_id
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
                                                )}

                                                <span className="font-semibold text-slate-900">
                                                    [
                                                    {obj.level === "company"
                                                        ? "CÔNG TY"
                                                        : obj.department
                                                              ?.department_name ||
                                                          obj.level.toUpperCase()}
                                                    ] {obj.obj_title}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Cột hành động – để trống */}
                                        <td className="px-3 py-3 text-center bg-gradient-to-r from-indigo-50 to-purple-50">
                                            —
                                        </td>
                                    </tr>

                                    {/* Key Results */}
                                    {openObj[obj.objective_id] &&
                                        obj.key_results?.map((kr) => (
                                            <tr key={kr.kr_id}>
                                                <td className="px-8 py-3 border-r border-slate-200">
                                                    <span className="font-medium text-slate-900">
                                                        {kr.kr_title}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.assignee?.fullName ||
                                                        kr.assigned_to ||
                                                        "Chưa giao"}
                                                </td>
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
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {getUnitText(kr.unit)}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.current_value ?? 0}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.target_value}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {formatPercent(
                                                        kr.progress_percent
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center text-slate-400">
                                                    —
                                                </td>
                                            </tr>
                                        ))}
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
