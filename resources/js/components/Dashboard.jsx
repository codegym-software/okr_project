import React, { useEffect, useState } from "react";
import ProgressChart from "./ProgressChart";
import { FaBullseye, FaKey } from "react-icons/fa";

const getProgressColor = (percent) => {
    if (percent >= 80) return "bg-emerald-500"; 
    if (percent >= 50) return "bg-amber-400";   
    return "bg-rose-500";                      
};

const getProgressTextClass = (percent) => {
    if (percent >= 80) return "text-emerald-700 bg-emerald-50";
    if (percent >= 50) return "text-amber-700 bg-amber-50";
    return "text-rose-700 bg-rose-50";
};

function SimpleOkrList({ okrs, emptyText }) {
    if (!okrs || okrs.length === 0) {
        return <div className="text-sm text-slate-400 italic py-2">{emptyText}</div>;
    }

    return (
        <div className="space-y-4">
            {okrs.slice(0,3).map((okr) => {
                const rawProgress = okr.calculated_progress ?? okr.progress_percent ?? 0;
                const progress = parseFloat(rawProgress).toFixed(1);
                const progressValue = parseFloat(progress);               
                const colorClass = getProgressColor(progressValue);
                const parentLink = okr.source_links?.find(
                    (link) => link.target_objective
                );
                const parentObj = parentLink?.target_objective;
                
                return (
                    <div key={okr.objective_id} className="group flex flex-col gap-2 rounded-lg border border-transparent bg-slate-50 p-3 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                        {parentObj && (
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                                    Liên kết tới
                                </span>
                                <span className="text-xs text-slate-500 truncate" title={`Đóng góp cho: ${parentObj.obj_title}`}>
                                    {parentObj.obj_title}
                                </span>
                            </div>
                        )}
                        
                        {okr.department && (
                            <div className="mb-1">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                    {okr.department.d_name || okr.department.department_name}
                                </span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start gap-4">
                            <span className="text-sm font-medium text-slate-800 line-clamp-2">
                                {okr.obj_title}
                            </span>
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={`h-full ${colorClass}`}
                                style={{ width: `${progressValue}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            {okrs.length > 3 && (
                <p className="text-xs text-slate-400 text-center">Và {okrs.length - 3} mục tiêu khác...</p>
            )}
        </div>
    );
}



export default function Dashboard() {
    const [data, setData] = useState({
        user: null,
        myOkrs: [],
        deptOkrs: [],
        companyOkrs: [],
        weeklySummary: { checkedIn: 0, needCheckIn: 0, confidence: 0, risks: 0 },
        overdueKrs: [],
        riskKrs: [],
    });
    const [loading, setLoading] = useState(true);
    const [isMyObjectivesExpanded, setIsMyObjectivesExpanded] = useState(false);
    const [expandedObjectives, setExpandedObjectives] = useState({});
    const [isWarningSectionExpanded, setIsWarningSectionExpanded] = useState(false);

    useEffect(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        };
        
        if (token) {
            headers["X-CSRF-TOKEN"] = token;
        }

        fetch("/api/dashboard/overview", { headers })
            .then((res) => {
                if (!res.ok) {
                    if (res.status === 401) {
                        console.error("Unauthorized - redirecting to login");
                        window.location.href = "/login";
                        return null;
                    }
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((json) => {
                if (json) {
                    console.log("Dashboard data loaded:", json);
                    setData(json);
                }
            })
            .catch((err) => {
                console.error("Failed to load dashboard data", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Auto-expand objectives with at-risk KRs
    useEffect(() => {
        const newExpanded = {};
        (data.myOkrs || []).forEach(okr => {
            if (okr.key_results?.some(kr => isKrAtRisk(kr))) {
                newExpanded[okr.objective_id] = true;
            }
        });
        setExpandedObjectives(newExpanded);
    }, [data.myOkrs, data.overdueKrs]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-500">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    const calculateAvg = (list) => {
        if (!list || list.length === 0) return 0;
        const total = list.reduce((sum, item) => {
            const val = item.calculated_progress ?? item.progress_percent ?? 0;
            return sum + parseFloat(val);
        }, 0);
        return (total / list.length).toFixed(1);
    };

    const toggleObjectiveExpand = (objectiveId) => {
        setExpandedObjectives(prev => ({
            ...prev,
            [objectiveId]: !prev[objectiveId]
        }));
    };

    const isKrAtRisk = (kr) => {
        return data.overdueKrs?.some(overdueKr => overdueKr.kr_id === kr.kr_id) ?? false;
    };

    const avgPersonal = calculateAvg(data.myOkrs);
    const avgDept = calculateAvg(data.deptOkrs);
    const avgCompany = data.companyGlobalAvg ?? calculateAvg(data.companyOkrs);

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-20 mt-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                        Xin chào, {data.user?.full_name || data.user?.name || "Bạn"}! 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Hôm nay bạn đang đóng góp vào những mục tiêu lớn này.
                    </p>
                </div>
                <div className="hidden sm:block text-right">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                        Hôm nay
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                        {new Date().toLocaleDateString("vi-VN", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${data.user?.role?.role_name?.toLowerCase() === 'ceo' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                {data.user?.role?.role_name?.toLowerCase() !== 'ceo' && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Cá nhân</p>
                            <p className="text-xl font-bold text-slate-900">{avgPersonal}%</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Phòng ban</p>
                        <p className="text-xl font-bold text-slate-900">{avgDept}%</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Công ty</p>
                        <p className="text-xl font-bold text-slate-900">{avgCompany}%</p>
                    </div>
                </div>
            </div>

            {data.user?.role?.role_name?.toLowerCase() !== 'ceo' && (
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                🚀
                            </span>
                            Mục tiêu của tôi
                        </h2>
                        <div className="flex gap-2">
                            <a 
                            href="/my-objectives" 
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Check-in ngay
                        </a>
                        <a href="/my-objectives" className="sm:hidden text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center">
                            Xem tất cả &rarr;
                        </a>
                    </div>
                    </div>
                    
                    {(data.myOkrs || []).length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                            <table className="min-w-full table-fixed border-separate border-spacing-y-2">
                                <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 text-left">
                                            Tiêu đề
                                        </th>
                                        <th className="px-3 py-2 text-center" style={{width: '200px'}}>
                                            Tiến độ (%)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300">
                                    {(data.myOkrs || []).map((okr) => (
                                        <React.Fragment key={okr.objective_id}>
                                            {/* Objective row */}
                                            <tr className="bg-white transition duration-150 rounded-lg shadow-sm hover:shadow-md ring-1 ring-slate-100">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                                                                {(okr.key_results || []).length > 0 && (
                                                                    <button
                                                                        onClick={() => toggleObjectiveExpand(okr.objective_id)}
                                                                        className="p-2 rounded-lg hover:bg-slate-100 transition-all group"
                                                                    >
                                                                        <svg
                                                                            className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform ${
                                                                                expandedObjectives[okr.objective_id]
                                                                                    ? "rotate-90"
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
                                                                                d="M9 5l7 7-7 7"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <FaBullseye className="h-5 w-5 text-indigo-600 flex-shrink-0" title="Objective"/>
                                                            <span className="text-base font-semibold text-slate-800">
                                                                <a href={`/my-objectives/details/${okr.objective_id}`} className="hover:text-blue-700 transition-colors truncate">
                                                                    {okr.obj_title}
                                                                </a>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* KR rows */}
                                            {expandedObjectives[okr.objective_id] && (okr.key_results || []).map((kr) => (
                                                <tr key={kr.kr_id} className="bg-white transition duration-150 rounded-lg shadow-sm hover:shadow-md ring-1 ring-slate-100">
                                                    <td className="px-4 py-3 pl-12">
                                                        <div className="flex items-center gap-2">
                                                            <FaKey className="h-4 w-4 text-slate-500 flex-shrink-0 ml-8" title="Key Result"/>
                                                            <span className="text-sm font-medium text-slate-700">
                                                                <a href={`/my-objectives/key-result-details/${kr.kr_id}`} className="hover:text-blue-700 transition-colors truncate">
                                                                    {kr.kr_title}
                                                                </a>
                                                            </span>
                                                            {isKrAtRisk(kr) && (
                                                                <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0 text-[10px] font-medium text-red-700 border border-red-200">
                                                                    Rủi ro
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex w-full items-center justify-center">
                                                            {/* Progress bar + chấm tròn (giữ nguyên logic cũ) */}
                                                            <div className="relative w-full max-w-[150px]">
                                                                <div className="relative h-2 w-full bg-blue-100 rounded-full overflow-visible">
                                                                    <div
                                                                        className={`h-full rounded-full absolute left-0 transition-all duration-300 ${
                                                                            (kr.calculated_progress ?? kr.progress_percent ?? 0) >= 80
                                                                                ? "bg-emerald-500"
                                                                                : (kr.calculated_progress ?? kr.progress_percent ?? 0) >= 50
                                                                                ? "bg-amber-400"
                                                                                : "bg-rose-500"
                                                                        }`}
                                                                        style={{ width: `${Math.max(0, Math.min(100, kr.calculated_progress ?? kr.progress_percent ?? 0))}%` }}
                                                                    ></div>

                                                                    {(() => {
                                                                        const percent = Math.max(
                                                                            0,
                                                                            Math.min(100, kr.calculated_progress ?? kr.progress_percent ?? 0)
                                                                        );

                                                                        return (
                                                                            <>
                                                                                <div
                                                                                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white ${
                                                                                        percent >= 80
                                                                                            ? "border-emerald-500"
                                                                                            : percent >= 50
                                                                                            ? "border-amber-400"
                                                                                            : "border-rose-500"
                                                                                    }`}
                                                                                    style={{ left: `calc(${percent}% - 6px)` }}
                                                                                />

                                                                                <div
                                                                                    className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap ${
                                                                                        percent >= 80
                                                                                            ? "text-emerald-600"
                                                                                            : percent >= 50
                                                                                            ? "text-amber-600"
                                                                                            : "text-rose-600"
                                                                                    }`}
                                                                                    style={{ left: `calc(${percent}% - 6px)` }}
                                                                                >
                                                                                    {percent.toFixed(2)}%
                                                                                </div>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))} 
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                            <p className="text-slate-500 mb-4">Bạn chưa có OKR nào trong chu kỳ này.</p>
                            <a href="/my-objectives/create" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
                                + Tạo OKR Mới
                            </a>
                        </div>
                    )}
                </section>
            )}

            <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        📊
                    </span>
                    Tóm tắt nhanh tuần 
                </h2>

                <div>
                    <div className="flex flex-wrap gap-4 justify-between">
                        <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-5 py-4 flex-1 min-w-[200px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Check-in tuần này</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{data.weeklySummary.checkedIn}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-5 py-4 flex-1 min-w-[200px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Mức độ tự tin</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{data.weeklySummary.confidence}%</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-5 py-4 flex-1 min-w-[200px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Rủi ro cần xử lý</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{data.weeklySummary.risks}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            📈
                        </span>
                        Tiến độ theo tuần
                    </h2>
                </div>
                <ProgressChart />
            </section>

            <div className="grid gap-10 md:grid-cols-2">
                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 font-bold text-sm">
                                🏢
                            </span>
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Mục tiêu Phòng Ban</h2>
                                <p className="text-xs text-slate-500">Phạm vi team & bộ phận</p>
                            </div>
                        </div>
                        {data.user?.role?.role_name === 'manager' && (
                            <a href="/reports" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                                Xem chi tiết
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </a>
                        )}
                    </div>
                    <SimpleOkrList 
                        okrs={data.deptOkrs || []} 
                        emptyText="Chưa có mục tiêu phòng ban nào được công khai." 
                    />
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-bold text-sm">
                                🌏
                            </span>
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Mục tiêu Công Ty liên quan</h2>
                                <p className="text-xs text-slate-500">Các mục tiêu bạn đang trực tiếp đóng góp</p>
                            </div>
                        </div>
                        {['admin', 'ceo'].includes(data.user?.role?.role_name?.toLowerCase()) && (
                            <a href="/reports/company-overview" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline transition-colors">
                                Xem chi tiết
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </a>
                        )}
                    </div>
                    <SimpleOkrList 
                        okrs={data.companyOkrs || []} 
                        emptyText="Bạn chưa liên kết OKR nào tới mục tiêu Công ty." 
                    />
                </section>
            </div>

        </div>
    );
}