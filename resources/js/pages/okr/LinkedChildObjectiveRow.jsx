// src/components/okr/LinkedChildObjectiveRow.jsx
import React from "react";
import { LuAlignCenterHorizontal } from "react-icons/lu";

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
}) {
    const hasKRs = linkedObj.key_results?.length > 0;
    const expanded =
        openObj[`linked_obj_${linkedObj.objective_id}_${parentKrId}`];

    return (
        <>
            <tr className="bg-white border-l-4 border-blue-400">
                <td
                    colSpan={colSpanForKRs - 1} // Adjusted colSpan to remove 1 action column in ObjectiveList's perspective
                    className="px-12 py-3 border-r border-slate-200"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                            <LuAlignCenterHorizontal className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-slate-900">
                                {linkedObj.obj_title}
                            </span>
                            {hasKRs && (
                                <span className="text-xs text-slate-500">
                                    ({linkedObj.key_results.length} KR)
                                </span>
                            )}
                        </div>
                    </div>
                </td>
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
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
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
                            <td className="px-16 py-3 border-r border-slate-200">
                                <span className="font-medium text-slate-700 text-sm">
                                    {kr.kr_title}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-center border-r border-slate-200">
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
                            <td className="px-3 py-3 text-center border-r border-slate-200">
                                {getUnitText(kr.unit)}
                            </td>
                            <td className="px-3 py-3 text-center border-r border-slate-200">
                                {kr.current_value ?? ""}
                            </td>
                            <td className="px-3 py-3 text-center border-r border-slate-200">
                                {kr.target_value ?? ""}
                            </td>
                            <td className="px-3 py-3 text200 text-center border-r border-slate-200">
                                <div className="flex flex-col items-center">
                                    <span>
                                        {formatPercent(kr.progress_percent)}
                                    </span>
                                    <span
                                        className={`inline-flex items-center rounded-md px-0 py-0 text-[9px] font-semibold ${
                                            kr.status === "completed"
                                                ? "text-emerald-700"
                                                : kr.status === "active"
                                                ? "text-blue-700"
                                                : "text-slate-700"
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
