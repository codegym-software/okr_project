import React, { useEffect, useState } from "react";
import { Select } from "../components/ui";
import BarChart from "../components/BarChart";

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [departmentName, setDepartmentName] = useState(null);
    const [error, setError] = useState(null);
    const [showTeamOKRs, setShowTeamOKRs] = useState(true);
    const [showTeamMembers, setShowTeamMembers] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/reports/cycles", {
                    headers: { Accept: "application/json" },
                    credentials: "include",
                });
                const data = await res.json();
                if (data.success && data.data.length > 0) {
                    setCycles(data.data);
                    const defaultCycleId =
                        data.meta?.default_cycle_id ?? data.data[0].cycle_id;
                    setSelectedCycle(String(defaultCycleId));
                }
            } catch (e) {
                console.error("Error loading cycles:", e);
                setError("Không thể tải danh sách chu kỳ.");
            }
        })();
    }, []);

    useEffect(() => {
        if (selectedCycle) {
            loadReportData(selectedCycle);
        }
    }, [selectedCycle]);

    const loadReportData = async (cycleId) => {
        setLoading(true);
        setError(null);
        try {
            const reportRes = await fetch(
                `/api/reports/my-team?cycle_id=${cycleId}`,
                {
                    headers: { Accept: "application/json" },
                    credentials: "include",
                }
            );
            const reportJson = await reportRes.json();

            if (reportJson.success) {
                setReportData(reportJson.data);
                setDepartmentName(reportJson.department_name);
            } else {
                setError(
                    reportJson.message || "Không thể tải dữ liệu báo cáo"
                );
            }
        } catch (e) {
            console.error("Error loading report:", e);
            setError("Lỗi khi tải dữ liệu báo cáo");
        } finally {
            setLoading(false);
        }
    };

    const getProgressColor = (progress) => {
        if (progress >= 100) return "bg-green-500";
        if (progress >= 75) return "bg-blue-500";
        if (progress >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getProgressTextColor = (progress) => {
        if (progress >= 100) return "text-green-700";
        if (progress >= 75) return "text-blue-700";
        if (progress >= 50) return "text-yellow-700";
        return "text-red-700";
    };

    const getStatusFromProgress = (progress) => {
        if (progress >= 100) return "Hoàn thành";
        if (progress >= 75) return "Tiến hành tốt";
        if (progress >= 50) return "Đang tiến hành";
        if (progress > 0) return "Mới bắt đầu";
        return "Chưa bắt đầu";
    };

    const hasNoData =
        !reportData ||
        ((!reportData.team_okrs || reportData.team_okrs.length === 0) &&
            (!reportData.members || reportData.members.length === 0));

    return (
        <div className="p-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {departmentName
                            ? `Báo cáo ${departmentName}`
                            : "Báo cáo nhóm của tôi"}
                    </h1>
                </div>

                <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Chọn chu kỳ:
                    </label>
                    <div className="mt-2">
                        <Select
                            value={selectedCycle}
                            onChange={setSelectedCycle}
                            placeholder="Chọn chu kỳ"
                            options={cycles.map((cycle) => ({
                                value: String(cycle.cycle_id),
                                label: cycle.cycle_name,
                            }))}
                        />
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {!loading && reportData && (
                    <>
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 mb-6 text-white shadow-lg">
                            <h2 className="text-xl font-bold mb-4">
                                Tổng quan nhóm
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">
                                        Tỷ lệ hoàn thành trung bình
                                    </p>
                                    <p className="text-4xl font-bold mt-2">
                                        {reportData.team_average_completion?.toFixed?.(
                                            1
                                        ) ?? 0}
                                        %
                                    </p>
                                </div>
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">
                                        Tổng số OKR
                                    </p>
                                    <p className="text-4xl font-bold mt-2">
                                        {reportData.total_okr_count || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">
                                        Số thành viên
                                    </p>
                                    <p className="text-4xl font-bold mt-2">
                                        {reportData.members?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {reportData.team_okrs &&
                            reportData.team_okrs.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                                    <button
                                        onClick={() =>
                                            setShowTeamOKRs(!showTeamOKRs)
                                        }
                                        className="w-full flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <h2 className="text-xl font-bold text-gray-900">
                                            OKR cấp nhóm (
                                            {reportData.team_okrs.length})
                                        </h2>
                                        <svg
                                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                                showTeamOKRs
                                                    ? "transform rotate-180"
                                                    : ""
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

                                    {showTeamOKRs && (
                                        <>
                                            <div className="p-6 border-b border-gray-200">
                                                <BarChart
                                                    data={reportData.team_okrs.map(
                                                        (okr) => ({
                                                            label:
                                                                okr.obj_title
                                                                    .length > 40
                                                                    ? okr.obj_title.substring(
                                                                          0,
                                                                          40
                                                                      ) + "..."
                                                                    : okr.obj_title,
                                                            value: okr.progress,
                                                        })
                                                    )}
                                                    title="Tiến độ các OKR cấp nhóm"
                                                />
                                            </div>

                                            <div className="divide-y divide-gray-200">
                                                {reportData.team_okrs.map(
                                                    (okr) => (
                                                        <div
                                                            key={
                                                                okr.objective_id
                                                            }
                                                            className="p-6"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                                            {
                                                                                okr.obj_title
                                                                            }
                                                                        </h3>
                                                                        {okr.level && (
                                                                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                                                                                {okr.level ===
                                                                                "team"
                                                                                    ? "Nhóm"
                                                                                    : "Phòng ban"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {okr.description && (
                                                                        <p className="text-gray-600 text-sm mb-3">
                                                                            {
                                                                                okr.description
                                                                            }
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                                        <span>
                                                                            Số Key
                                                                            Result
                                                                            hoàn
                                                                            thành:{" "}
                                                                            {
                                                                                okr.completed_kr_count
                                                                            }
                                                                            /
                                                                            {
                                                                                okr.key_results_count
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="ml-6 text-right">
                                                                    <div className="text-2xl font-bold text-gray-900">
                                                                        {
                                                                            okr.progress
                                                                        }
                                                                        %
                                                                    </div>
                                                                    <div className="w-24 bg-gray-200 rounded-full h-3 mt-2">
                                                                        <div
                                                                            className={`h-3 rounded-full ${getProgressColor(
                                                                                okr.progress
                                                                            )}`}
                                                                            style={{
                                                                                width: `${Math.min(
                                                                                    okr.progress,
                                                                                    100
                                                                                )}%`,
                                                                            }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                        {reportData.members &&
                            reportData.members.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <button
                                        onClick={() =>
                                            setShowTeamMembers(
                                                !showTeamMembers
                                            )
                                        }
                                        className="w-full flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Thành viên (
                                            {reportData.members.length})
                                        </h2>
                                        <svg
                                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                                showTeamMembers
                                                    ? "transform rotate-180"
                                                    : ""
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

                                    {showTeamMembers && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-600">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left">
                                                            Thành viên
                                                        </th>
                                                        <th className="px-6 py-3 text-center">
                                                            Số KR đóng góp
                                                        </th>
                                                        <th className="px-6 py-3 text-center">
                                                            Hoàn thành (KR)
                                                        </th>
                                                        <th className="px-6 py-3 text-center">
                                                            Tỷ lệ hoàn thành
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.members.map(
                                                        (member) => (
                                                            <tr
                                                                key={
                                                                    member.user_id
                                                                }
                                                                className="border-t border-slate-100"
                                                            >
                                                                <td className="px-6 py-3 text-slate-900 font-semibold">
                                                                    {member.full_name ||
                                                                        "Chưa cập nhật"}
                                                                </td>
                                                                <td className="px-6 py-3 text-center text-slate-700">
                                                                    {member.total_kr_contributed ?? 0}{" "}
                                                                    KR
                                                                </td>
                                                                <td className="px-6 py-3 text-center">
                                                                    <span className="font-semibold text-emerald-600">
                                                                        {member.completed_kr_count ?? 0}{" "}
                                                                        KR
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3 text-center">
                                                                    <span
                                                                        className={`font-semibold ${getProgressTextColor(
                                                                            member.average_completion
                                                                        )}`}
                                                                    >
                                                                        {member.average_completion?.toFixed?.(
                                                                            1
                                                                        ) ?? 0}
                                                                        %
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                        {hasNoData && (
                            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                <p className="text-gray-500">
                                    Chưa có dữ liệu OKR trong chu kỳ này
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

