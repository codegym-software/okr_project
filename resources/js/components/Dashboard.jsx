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
 * Component: Dòng OKR (List View Layout) - Thay thế cho Card
 */
function MyOkrRow({ okr }) {
    // Tìm parent (Mục tiêu cấp trên)
    const parentLink = okr.source_links?.find(
        (link) => link.target_objective
    );
    const parentObj = parentLink?.target_objective;

    // Tính toán tiến độ chung
    const objProgress = Math.round(okr.progress_percent || 0);
    const objColorClass = getProgressColor(objProgress);
    const objTextClass = getProgressTextClass(objProgress);

    return (
        <div className="border-b border-slate-100 py-6 first:pt-0 last:border-0 last:pb-0">
            {/* 1. Header: Objective Title & Meta */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                    {parentObj && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-1 mb-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                </svg>
                                Đóng góp cho
                            </span>
                            
                            {/* Hiển thị Tên Phòng Ban nếu có */}
                            {parentObj.department && (
                                <span className="font-bold text-slate-600 uppercase tracking-tight">
                                    [{parentObj.department.d_name || parentObj.department.department_name}]
                                </span>
                            )}
                            
                            <span className="font-medium text-slate-800 truncate max-w-[300px] border-b border-dotted border-slate-400 cursor-help" title={parentObj.obj_title}>
                                {parentObj.obj_title}
                            </span>
                        </div>
                    )}
                    <h3 className="text-lg font-bold text-slate-900 leading-snug hover:text-blue-700 transition-colors">
                        <a href={`/my-objectives/details/${okr.objective_id}`}>
                            {okr.obj_title}
                        </a>
                    </h3>
                </div>
                
                {/* Action & Status Box */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${objTextClass}`}>
                        {objProgress}%
                    </div>
                </div>
            </div>

            {/* 2. Key Results List - Clean Layout */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                {okr.key_results && okr.key_results.length > 0 ? (
                    okr.key_results.map((kr) => {
                        const krProgress = Math.round(kr.progress_percent || 0);
                        const krColor = getProgressColor(krProgress);
                        
                        // Xử lý hiển thị giá trị: 5/10 cái
                        const targetVal = kr.target_value ? parseFloat(kr.target_value) : 0;
                        const currentVal = kr.current_value ? parseFloat(kr.current_value) : 0;
                        const unit = kr.unit || ''; // Giả sử có trường unit, nếu không có để trống

                        return (
                            <div key={kr.kr_id || kr.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                                {/* Title */}
                                <div className="sm:col-span-5">
                                    <span className="text-sm font-medium text-slate-700 block truncate" title={kr.kr_title}>
                                        • {kr.kr_title}
                                    </span>
                                </div>

                                {/* Progress Bar & Values */}
                                <div className="sm:col-span-7 flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${krColor} rounded-full`} 
                                            style={{ width: `${krProgress}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[100px] justify-end">
                                        <span className="text-xs font-semibold text-slate-900">
                                            {currentVal} / {targetVal} {unit}
                                        </span>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${krProgress >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {krProgress}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-2">
                        <span className="text-xs text-slate-400 italic">Chưa có kết quả then chốt (Key Results) nào được tạo.</span>
                    </div>
                )}
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
                
                // Tìm parent (Mục tiêu cấp trên)
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
                        
                        {/* Hiển thị Department Name cho CEO/Admin xem tổng hợp */}
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
                    <div className="flex gap-2">
                         <a 
                            href="/my-objectives" 
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Check-in ngay
                        </a>
                        <a href="/my-objectives" className="sm:hidden text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center">
                            Xem tất cả &rarr;
                        </a>
                    </div>
                </div>
                
                {(data.myOkrs || []).length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 p-6">
                        {(data.myOkrs || []).map((okr) => (
                            <MyOkrRow key={okr.objective_id} okr={okr} />
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
                            <h2 className="text-base font-bold text-slate-800">Mục tiêu Công Ty liên quan</h2>
                            <p className="text-xs text-slate-500">Các mục tiêu bạn đang trực tiếp đóng góp</p>
                        </div>
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