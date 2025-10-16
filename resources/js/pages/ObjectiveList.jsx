// ObjectiveList.jsx
import React, { useState, useEffect } from "react";

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
    myOKRFilter,
    setMyOKRFilter,
}) {
    const [toast, setToast] = useState(null); // ← THÊM STATE TOAST

    // FETCH OBJECTIVES
    useEffect(() => {
        const fetchObjectives = async () => {
            try {
                const token = document
                    .querySelector('meta[name="csrf-token"]')
                    .getAttribute("content");
                const res = await fetch("/my-objectives", {
                    headers: {
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                });
                const json = await res.json();
                console.log("📦 OBJECTIVES DATA:", json); // ← DEBUG
                if (res.ok && json.success) {
                    setItems(json.data || []);
                } else {
                    throw new Error(json.message || "Lỗi khi lấy objectives");
                }
            } catch (err) {
                setToast({ type: "error", message: err.message });
            }
        };
        fetchObjectives();
    }, []); // ← CHẠY 1 LẦN KHI MOUNT

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

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex w-full items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                    Danh sách mục tiêu
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMyOKRFilter(!myOKRFilter)}
                        className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                            myOKRFilter
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                        {myOKRFilter ? "My OKR" : "Tất cả OKR"}
                    </button>
                    <select
                        value={cycleFilter}
                        onChange={(e) => setCycleFilter(e.target.value)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">-- Tất cả chu kỳ --</option>
                        {cyclesList.map((cycle) => (
                            <option key={cycle.cycle_id} value={cycle.cycle_id}>
                                {cycle.cycle_name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setCreatingObjective(true)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Thêm Objective
                    </button>
                </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 border-r border-slate-200 w-[25%] text-left">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[14%] text-center">
                                Phòng ban
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[13%] text-center">
                                Chu kỳ
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Trạng thái
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Đơn vị
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Thực tế
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Mục tiêu
                            </th>
                            <th className="px-3 py-2 w-[12%] text-center">
                                Tiến độ (%)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
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
                                            <div className="flex items-center gap-3">
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
                                                        className={`h-4 w-4 ${
                                                            openObj[
                                                                obj.objective_id
                                                            ]
                                                                ? "rotate-180"
                                                                : ""
                                                        }`}
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        console.log(
                                                            "🎯 SET EDIT:",
                                                            obj
                                                        ); // ← DEBUG
                                                        setEditingObjective({
                                                            ...obj,
                                                            level:
                                                                obj.level ||
                                                                "team", // ← DEFAULT LEVEL
                                                        });
                                                    }}
                                                    className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                                                    title="Sửa Objective"
                                                >
                                                    {obj.obj_title}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3"></td>
                                        <td className="px-3 py-3"></td>
                                        <td className="px-3 py-3"></td>
                                        <td className="px-3 py-3"></td>
                                        <td className="px-3 py-3"></td>
                                        <td className="px-3 py-3"></td>
                                        <td className="px-3 py-3">
                                            <button
                                                onClick={() =>
                                                    setCreatingFor(obj)
                                                }
                                                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                                                title="Thêm Key Result"
                                            >
                                                Thêm KR
                                            </button>
                                        </td>
                                    </tr>
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
