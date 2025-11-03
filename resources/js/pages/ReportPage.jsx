import React, { useEffect, useState } from "react";
import { Select } from "../components/ui";
import LineChart from "../components/LineChart";
import BarChart from "../components/BarChart";

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");
    const [reportData, setReportData] = useState(null);
    const [departmentName, setDepartmentName] = useState(null);
    const [error, setError] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [showTrendChart, setShowTrendChart] = useState(true);
    const [showTeamOKRs, setShowTeamOKRs] = useState(true);
    const [showTeamMembers, setShowTeamMembers] = useState(true);

    // Load cycles
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
                    setSelectedCycle(String(data.data[0].cycle_id));
                }
            } catch (e) {
                console.error("Error loading cycles:", e);
            }
        })();
    }, []);

    // Load report data
    useEffect(() => {
        if (selectedCycle) {
            loadReportData(selectedCycle);
        }
    }, [selectedCycle]);

    const loadReportData = async (cycleId) => {
        setLoading(true);
        setError(null);
        try {
            const [reportRes, trendRes] = await Promise.all([
                fetch(`/api/reports/my-team?cycle_id=${cycleId}`, {
                    headers: { Accept: "application/json" },
                    credentials: "include",
                }),
                fetch(`/api/reports/progress-trend?cycle_id=${cycleId}`, {
                    headers: { Accept: "application/json" },
                    credentials: "include",
                })
            ]);

            const reportData = await reportRes.json();
            const trendData = await trendRes.json();

            if (reportData.success) {
                setReportData(reportData.data);
                setDepartmentName(reportData.department_name);
            } else {
                setError(reportData.message || "Không thể tải dữ liệu báo cáo");
            }

            if (trendData.success) {
                setTrendData(trendData.data || []);
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

    return (
        <div className="p-6">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {departmentName ? `Báo cáo ${departmentName}` : "Báo cáo nhóm của tôi"}
                    </h1>
                </div>

                {/* Filter */}
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

                {/* Loading */}
                {loading && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Report Content */}
                {!loading && reportData && (
                    <>
                        {/* Team Overview Card */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 mb-6 text-white shadow-lg">
                            <h2 className="text-xl font-bold mb-4">Tổng quan nhóm</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">Tỷ lệ hoàn thành trung bình</p>
                                    <p className="text-4xl font-bold mt-2">
                                        {reportData.team_average_completion.toFixed(1)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">Tổng số OKR</p>
                                    <p className="text-4xl font-bold mt-2">{reportData.total_okr_count}</p>
                                </div>
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">Số thành viên</p>
                                    <p className="text-4xl font-bold mt-2">{reportData.members?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Biểu đồ xu hướng tiến độ nhóm */}
                        {trendData.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                                <button
                                    onClick={() => setShowTrendChart(!showTrendChart)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Biểu đồ xu hướng tiến độ nhóm theo thời gian
                                    </h2>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                            showTrendChart ? 'transform rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {showTrendChart && (
                                    <div className="px-6 pb-6">
                                        <LineChart 
                                            data={trendData}
                                            title=""
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Team OKRs */}
                        {reportData.team_okrs && reportData.team_okrs.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                                <button
                                    onClick={() => setShowTeamOKRs(!showTeamOKRs)}
                                    className="w-full flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    <h2 className="text-xl font-bold text-gray-900">
                                        OKR cấp nhóm ({reportData.team_okrs.length})
                                    </h2>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                            showTeamOKRs ? 'transform rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {showTeamOKRs && (
                                    <>
                                
                                {/* Biểu đồ cột - Tiến độ OKR cấp nhóm */}
                                <div className="p-6 border-b border-gray-200">
                                    <BarChart 
                                        data={reportData.team_okrs.map(okr => ({
                                            label: okr.obj_title.length > 40 ? okr.obj_title.substring(0, 40) + '...' : okr.obj_title,
                                            value: okr.progress
                                        }))}
                                        title="Tiến độ các OKR cấp nhóm"
                                    />
                                </div>
                                
                                <div className="divide-y divide-gray-200">
                                    {reportData.team_okrs.map((okr) => (
                                        <div key={okr.objective_id} className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {okr.obj_title}
                                                        </h3>
                                                        {okr.level && (
                                                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                                                                {okr.level === 'team' ? 'Nhóm' : 'Phòng ban'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {okr.description && (
                                                        <p className="text-gray-600 text-sm mb-3">
                                                            {okr.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span>
                                                            Key Results: {okr.completed_kr_count}/
                                                            {okr.key_results_count}
                                                        </span>
                                                        <span className="capitalize">
                                                            Trạng thái: {getStatusFromProgress(okr.progress)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-6 text-right">
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {okr.progress}%
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
                                    ))}
                                </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Team Members */}
                        {reportData.members && reportData.members.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <button
                                    onClick={() => setShowTeamMembers(!showTeamMembers)}
                                    className="w-full flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Thành viên trong nhóm ({reportData.members.length})
                                    </h2>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                            showTeamMembers ? 'transform rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {showTeamMembers && (
                                    <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Thành viên
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Hoàn thành
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tỷ lệ hoàn thành
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tiến độ
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {reportData.members.map((member) => (
                                                <tr key={member.user_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900">
                                                            {member.full_name || "Chưa cập nhật"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {member.email}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                        <span className="text-green-600 font-medium">
                                                            {member.completed_okr_count} hoàn thành
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`text-sm font-bold ${getProgressTextColor(
                                                                member.average_completion
                                                            )}`}
                                                        >
                                                            {member.average_completion.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="w-20 bg-gray-200 rounded-full h-3">
                                                            <div
                                                                className={`h-3 rounded-full ${getProgressColor(
                                                                    member.average_completion
                                                                )}`}
                                                                style={{
                                                                    width: `${Math.min(
                                                                        member.average_completion,
                                                                        100
                                                                    )}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* No data message */}
                        {(!reportData.team_okrs || reportData.team_okrs.length === 0) &&
                            (!reportData.members || reportData.members.length === 0) && (
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


