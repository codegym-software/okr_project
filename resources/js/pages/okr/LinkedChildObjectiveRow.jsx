import React from "react";
import { FaBullseye, FaKey, FaLongArrowAltLeft } from "react-icons/fa";

export default function LinkedChildObjectiveRow({
    linkedObj,
    parentKrId,
    openObj,
    setOpenObj,
    onCancelLink,
    getAssigneeInfo,
    setAssigneeTooltip,
    formatPercent,
    getStatusText,
    getUnitText,
    colSpanForKRs,
    disableActions = false,
}) {
    const hasKRs = linkedObj.key_results?.length > 0;
    const expanded =
        openObj[`linked_obj_${linkedObj.objective_id}_${parentKrId}`];

    return (
        <>
            <tr className="bg-white">
                {/* Cột Tiêu đề */}
                <td className="pl-20 pr-4 py-3">
                    <div className="flex items-center gap-1">
                        {hasKRs && (
                            <button
                                onClick={() =>
                                    setOpenObj((prev) => ({
                                        ...prev,
                                        [`linked_obj_${linkedObj.objective_id}_${parentKrId}`]:
                                            !prev[
                                                `linked_obj_${linkedObj.objective_id}_${parentKrId}`
                                            ],
                                    }))
                                }
                                className="p-0.5 hover:bg-slate-100 rounded"
                            >
                                <svg
                                    className={`h-4 w-4 text-slate-600 transition-transform ${
                                        expanded ? "rotate-90" : ""
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
                        <FaBullseye
                            className="h-5 w-5 text-indigo-500 flex-shrink-0"
                            title="Objective được liên kết"
                        />
                        <a 
                            href={linkedObj.level === "person" 
                                ? `/my-objectives/details/${linkedObj.objective_id}`
                                : `/company-okrs/detail/${linkedObj.objective_id}`
                            }
                            className="font-semibold text-slate-900 text-lg hover:text-blue-600"
                        >
                            {linkedObj.obj_title}
                        </a>
                        {hasKRs && (
                            <span className="text-xs text-slate-500">
                                ({linkedObj.key_results.length} KR)
                            </span>
                        )}
                    </div>
                </td>
                {/* Cột Người thực hiện (empty) */}
                <td className="px-3 py-3 text-center">
                    {/* Giữ trống */}
                </td>
                {/* Cột Tiến độ (empty) */}
                <td className="px-3 py-3 text-center">
                    {/* Giữ trống */}
                </td>
                {/* Cột Hành động */}
                <td className="px-3 py-3 text-center">
                    <button
                        onClick={() => {
                            if (
                                window.confirm(
                                    `Hủy liên kết với "${linkedObj.obj_title}"?`
                                )
                            ) {
                                const keep =
                                    window.confirm("Giữ quyền sở hữu?");
                                onCancelLink?.(
                                    linkedObj.link.link_id,
                                    "",
                                    keep
                                );
                            }
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={disableActions}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </td>
            </tr>

            {/* Render KR của Objective con */}
            {expanded &&
                linkedObj.key_results?.map((kr) => {
                    const userInfo = getAssigneeInfo(kr);
                    return (
                        <tr key={kr.kr_id} className="bg-white">
                            <td className="pl-32 pr-4 py-3">
                                <div className="flex items-center gap-2">
                                    <FaKey
                                        className="h-4 w-4 text-amber-600 flex-shrink-0"
                                        title="Key Result"
                                    />
                                    <a 
                                        href={linkedObj.level === "person" 
                                            ? `/my-objectives/key-result-details/${kr.kr_id}`
                                            : `/company-okrs/detail/kr/${kr.kr_id}`
                                        }
                                        className="font-semibold text-slate-900 text-base hover:text-blue-600"
                                    >
                                        {kr.kr_title}
                                    </a>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                                {kr.assigned_to ? (
                                    <div className="flex items-center justify-center gap-2">
                                        {userInfo.avatar ? (
                                            <img
                                                src={userInfo.avatar}
                                                alt=""
                                                className="h-7 w-7 rounded-full"
                                            />
                                        ) : (
                                            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                                {userInfo.name[0]}
                                            </div>
                                        )}
                                        <span className="text-sm truncate max-w-[100px]">
                                            {userInfo.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400">
                                        Chưa giao
                                    </span>
                                )}
                            </td>

                            <td className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-full bg-slate-100 rounded-full h-5 relative overflow-hidden border border-slate-200">
                                        <div
                                            className={`h-full rounded-full absolute left-0 transition-all duration-300 ${
                                                kr.status === "completed"
                                                    ? "bg-emerald-600"
                                                    : kr.status === "active"
                                                    ? "bg-blue-600"
                                                    : "bg-slate-500"
                                            }`}
                                            style={{
                                                width: `${Math.max(0, Math.min(100, kr.progress_percent || 0))}%`,
                                            }}
                                        ></div>
                                        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold z-10 ${
                                            (kr.progress_percent || 0) > 35 
                                                ? "text-white" 
                                                : "text-slate-700"
                                        }`} style={(kr.progress_percent || 0) > 35 ? { textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,1)' } : {}}>
                                            {formatPercent(kr.progress_percent)}
                                        </span>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            kr.status === "completed"
                                                ? "text-emerald-700 bg-emerald-50"
                                                : kr.status === "active"
                                                ? "text-blue-700 bg-blue-50"
                                                : "text-slate-600 bg-slate-50"
                                        }`}
                                    >
                                        {getStatusText(kr.status)}
                                    </span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-center"></td>
                        </tr>
                    );
                })}
        </>
    );
}
