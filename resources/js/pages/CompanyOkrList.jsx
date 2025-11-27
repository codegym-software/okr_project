// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";

export default function CompanyOkrList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleFilter, setCycleFilter] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [cyclesList, setCyclesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // ============================================================
    // CHỌN QUÝ MẶC ĐỊNH DỰA TRÊN NGÀY (HOÀN TOÀN KHÔNG DỰA VÀO TÊN!)
    // ============================================================
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();

                if (!Array.isArray(json.data) || json.data.length === 0) {
                    setToast({
                        type: "error",
                        message: "Không có dữ liệu quý",
                    });
                    setLoading(false);
                    return;
                }

                const cycles = json.data;
                setCyclesList(cycles);

                const today = new Date();
                today.setHours(0, 0, 0, 0); // chuẩn hóa

                let selectedCycle = null;

                // Ưu tiên 1: Dùng start_date / end_date (nếu có)
                for (const c of cycles) {
                    const start = c.start_date ? new Date(c.start_date) : null;
                    const end = c.end_date ? new Date(c.end_date) : null;

                    if (start && end) {
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);

                        if (today >= start && today <= end) {
                            selectedCycle = c;
                            break;
                        }
                    }
                }

                // Ưu tiên 2: Nếu không có quý nào đang active → chọn quý gần nhất với hôm nay
                if (!selectedCycle) {
                    selectedCycle = cycles.reduce((best, c) => {
                        const start = c.start_date
                            ? new Date(c.start_date)
                            : null;
                        const end = c.end_date ? new Date(c.end_date) : null;

                        let refDate = today;
                        if (start && end) {
                            // Dùng ngày giữa quý làm tham chiếu
                            refDate = new Date(
                                (start.getTime() + end.getTime()) / 2
                            );
                        } else if (start) {
                            refDate = start;
                        } else if (end) {
                            refDate = end;
                        } else {
                            // Nếu không có ngày → dùng cycle_id lớn nhất (quý mới nhất)
                            return !best || c.cycle_id > best.cycle_id
                                ? c
                                : best;
                        }

                        const diff = Math.abs(refDate - today);
                        return !best || diff < best.diff
                            ? { ...c, diff }
                            : best;
                    }, null);
                }

                // An toàn tuyệt đối
                setCycleFilter(selectedCycle?.cycle_id || cycles[0]?.cycle_id);
            } catch (err) {
                console.error(err);
                setToast({ type: "error", message: "Lỗi tải danh sách quý" });
                setLoading(false);
            }
        })();
    }, []);

    // Xóa cycle_id trên URL
    useEffect(() => {
        const url = new URL(window.location);
        if (url.searchParams.has("cycle_id")) {
            url.searchParams.delete("cycle_id");
            window.history.replaceState({}, "", url);
        }
    }, []);

    // ============================================================
    // LẤY OKR CÔNG TY
    // ============================================================
    const fetchCompanyOkrs = useCallback(async () => {
        if (!cycleFilter) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({ cycle_id: cycleFilter });
            const res = await fetch(`/company-okrs?${params}`, {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();
            if (json.success) {
                setItems(json.data || []);
            }
        } catch (err) {
            setToast({ type: "error", message: "Không tải được OKR công ty" });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [cycleFilter]);

    useEffect(() => {
        fetchCompanyOkrs();
    }, [fetchCompanyOkrs]);

    // ============================================================
    // HELPER
    // ============================================================
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

    const currentCycleName =
        cyclesList.find((c) => c.cycle_id === cycleFilter)?.cycle_name ||
        "Đang tải...";

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
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
                                                            setOpenObj((p) => ({
                                                                ...p,
                                                                [obj.objective_id]:
                                                                    !p[
                                                                        obj
                                                                            .objective_id
                                                                    ],
                                                            }))
                                                        }
                                                        className="p-2 rounded-lg hover:bg-slate-100 transition-all group"
                                                    >
                                                        <svg
                                                            className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform ${
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
                                        <td className="px-3 py-3 text-center bg-gradient-to-r from-indigo-50 to-purple-50">
                                            —
                                        </td>
                                    </tr>

                                    {openObj[obj.objective_id] &&
                                        obj.key_results?.map((kr) => (
                                            <tr key={kr.kr_id}>
                                                <td className="px-8 py-3 border-r border-slate-200 font-medium text-slate-900">
                                                    {kr.kr_title}
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
