import React, { useEffect, useState } from "react";

/**
 * Utility: Tính màu dựa trên tiến độ
 */
const getProgressColor = (percent) => {
    if (percent >= 80) return "bg-emerald-500"; // Xanh lá (Tốt)
    if (percent >= 50) return "bg-amber-400";   // Vàng (Cảnh báo)
    return "bg-rose-500";                       // Đỏ (Nguy hiểm)
};

const getProgressTextClass = (percent) => {
    if (percent >= 80) return "text-emerald-700 bg-emerald-50";
    if (percent >= 50) return "text-amber-700 bg-amber-50";
    return "text-rose-700 bg-rose-50";
};

/**
 * Component: Thẻ OKR Cá nhân (Interactive) - Redesigned
 */
function MyOkrCard({ okr }) {
    // Tìm parent (Mục tiêu cấp trên mà OKR này đóng góp vào)
    const parentLink = okr.source_links?.find(
        (link) => link.target_objective
    );
    const parentObj = parentLink?.target_objective;

    // Tính toán tiến độ chung của Objective
    const objProgress = Math.round(okr.progress_percent || 0);
    const objColorClass = getProgressColor(objProgress);
    const objTextClass = getProgressTextClass(objProgress);

    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md overflow-hidden">
            {/* Header: Sự đóng góp (Alignment) - Giữ nguyên để tạo động lực */}
            {parentObj && (
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Đóng góp cho: <span className="text-slate-700 normal-case ml-1">{parentObj.obj_title}</span>
                    </span>
                </div>
            )}

            <div className="p-5 flex flex-col h-full">
                {/* Objective Title */}
                <div className="mb-4">
                    <div className="flex justify-between items-start gap-4">
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">
                            {okr.obj_title}
                        </h3>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${objTextClass}`}>
                            {objProgress}%
                        </span>
                    </div>
                    {/* Overall Progress Bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full ${objColorClass} transition-all duration-500 ease-out`}
                            style={{ width: `${objProgress}%` }}
                        />
                    </div>
                </div>

                {/* Key Results List */}
                <div className="flex-1 space-y-4 mt-2">
                    {okr.key_results && okr.key_results.length > 0 ? (
                        okr.key_results.map((kr) => {
                            const krProgress = Math.round(kr.progress_percent || 0);
                            const krColor = getProgressColor(krProgress);
                            
                            return (
                                <div key={kr.kr_id || kr.id} className="group">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors line-clamp-2">
                                            • {kr.kr_title}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                                            {krProgress}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${krColor} opacity-70 group-hover:opacity-100 transition-all`} 
                                            style={{ width: `${krProgress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-xs text-slate-400 italic">Chưa có kết quả then chốt (Key Results)</p>
                    )}
                </div>

                {/* Action Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <a
                        href={`/my-objectives/details/${okr.objective_id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all active:scale-95 border border-slate-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Check-in Tiến độ
                    </a>
                </div>
            </div>
        </div>
    );
}

/**
 * Component: Danh sách rút gọn (Read Only)
 */
function SimpleOkrList({ okrs, emptyText }) {
    if (!okrs || okrs.length === 0) {
        return <div className="text-sm text-slate-400 italic py-2">{emptyText}</div>;
    }

    return (
        <div className="space-y-4">
            {okrs.map((okr) => {
                const progress = Math.round(okr.progress_percent || 0);
                const colorClass = getProgressColor(progress);
                
                return (
                    <div key={okr.objective_id} className="group flex flex-col gap-2 rounded-lg border border-transparent bg-slate-50 p-3 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                        <div className="flex justify-between items-start gap-4">
                            <span className="text-sm font-medium text-slate-800 line-clamp-2">
                                {okr.obj_title}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={`h-full ${colorClass}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState({
        user: null,
        myOkrs: [],
        deptOkrs: [],
        companyOkrs: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lấy CSRF token từ meta tag nếu có (dự phòng)
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

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-20">
            {/* Header */}
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

            {/* KHU VỰC 1: CỦA TÔI (Highlight) */}
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            🚀
                        </span>
                        Mục tiêu của tôi
                    </h2>
                    <a href="/my-objectives" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        Quản lý tất cả &rarr;
                    </a>
                </div>
                
                {(data.myOkrs || []).length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                        {(data.myOkrs || []).map((okr) => (
                            <MyOkrCard key={okr.objective_id} okr={okr} />
                        ))}
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

            <div className="grid gap-10 md:grid-cols-2">
                {/* KHU VỰC 2: PHÒNG BAN (Read Only) */}
                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 font-bold text-sm">
                            🏢
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Mục tiêu Phòng Ban</h2>
                            <p className="text-xs text-slate-500">Phạm vi team & bộ phận</p>
                        </div>
                    </div>
                    <SimpleOkrList 
                        okrs={data.deptOkrs || []} 
                        emptyText="Chưa có mục tiêu phòng ban nào được công khai." 
                    />
                </section>

                {/* KHU VỰC 3: CÔNG TY (Read Only) */}
                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-bold text-sm">
                            🌏
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Mục tiêu Công Ty</h2>
                            <p className="text-xs text-slate-500">Tầm nhìn & chiến lược chung</p>
                        </div>
                    </div>
                    <SimpleOkrList 
                        okrs={data.companyOkrs || []} 
                        emptyText="Chưa có mục tiêu cấp công ty nào." 
                    />
                </section>
            </div>

            {/* DEBUG SECTION - REMOVE AFTER FIX */}
            <div className="mt-10 p-4 bg-gray-100 rounded text-xs font-mono text-gray-600 overflow-auto">
                <p><strong>Debug Info:</strong></p>
                <p>User: {data.user ? `${data.user.full_name} (ID: ${data.user.user_id}, Dept: ${data.user.department_id})` : 'Loading...'}</p>
                <p>My OKRs: {(data.myOkrs || []).length}</p>
                <p>Dept OKRs: {(data.deptOkrs || []).length}</p>
                <p>Company OKRs: {(data.companyOkrs || []).length}</p>
            </div>
        </div>
    );
}