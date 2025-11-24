// src/components/okr/KeyResultRow.jsx
import React from "react";
import { LuAlignCenterHorizontal } from "react-icons/lu";
import LinkedChildObjectiveRow from "./LinkedChildObjectiveRow";
import KRActionsMenu from "./KRActionsMenu";
import AlignmentBadge from "./AlignmentBadge";

export default function KeyResultRow({
    kr,
    objective,
    openObj,
    setOpenObj,
    setEditingKR,
    canCheckInKR,
    onCancelLink,
    setAssignModal,
    setAssigneeTooltip,
    getAssigneeInfo,
    formatPercent,
    getStatusText,
    getUnitText,
    menuRefs,
    openCheckInModal,
    openCheckInHistory,
}) {
    const isLinkedKR = kr.isLinked;
    const isLinkedObjective = kr.isLinkedObjective; // O→O
    const hasLinkedChildren = kr.linked_objectives?.length > 0;
    const expanded = openObj[`kr_${kr.kr_id}`];

    // Nếu là KR ảo từ liên kết O→O → render riêng
    if (isLinkedObjective) {
        return (
            <tr className="bg-gray-50">
                <td colSpan={7} className="px-8 py-3 border-r border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center">
                                {kr.key_results?.length > 0 && (
                                    <button
                                        onClick={() =>
                                            setOpenObj((prev) => ({
                                                ...prev,
                                                [`linked_obj_kr_${kr.kr_id}`]:
                                                    !prev[
                                                        `linked_obj_kr_${kr.kr_id}`
                                                    ],
                                            }))
                                        }
                                        className="p-0.5 hover:bg-slate-100 rounded"
                                    >
                                        <svg
                                            className={`h-4 w-4 text-slate-600 transition-transform ${
                                                openObj[
                                                    `linked_obj_kr_${kr.kr_id}`
                                                ]
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
                            <LuAlignCenterHorizontal className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-slate-900">
                                {kr.kr_title}
                            </span>
                            {kr.key_results?.length > 0 && (
                                <span className="text-xs text-slate-500">
                                    ({kr.key_results.length} KR)
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
                                    `Hủy liên kết với "${kr.kr_title}"?`
                                )
                            ) {
                                const keep = window.confirm(
                                    "Giữ quyền sở hữu cho OKR cấp cao?"
                                );
                                onCancelLink?.(kr.link.link_id, "", keep);
                            }
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Hủy liên kết"
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
        );
    }

    // KR thật
    const assigneeInfo = getAssigneeInfo(kr);

    return (
        <>
            <tr>
                <td className="px-8 py-3 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                        {hasLinkedChildren && (
                            <button
                                onClick={() =>
                                    setOpenObj((prev) => ({
                                        ...prev,
                                        [`kr_${kr.kr_id}`]:
                                            !prev[`kr_${kr.kr_id}`],
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
                        {isLinkedKR && (
                            <LuAlignCenterHorizontal
                                className="h-4 w-4 text-blue-500"
                                title="KR được liên kết"
                            />
                        )}
                        <span className="font-medium text-slate-900">
                            {kr.kr_title}
                        </span>
                    </div>
                </td>

                <td className="px-3 py-3 text-center border-r border-slate-200">
                    {kr.assigned_to ? (
                        <div
                            className="flex items-center justify-center gap-2 cursor-pointer"
                            onMouseEnter={(e) =>
                                setAssigneeTooltip({
                                    info: assigneeInfo,
                                    position:
                                        e.currentTarget.getBoundingClientRect(),
                                })
                            }
                            onMouseLeave={() => setAssigneeTooltip(null)}
                        >
                            {assigneeInfo.avatar ? (
                                <img
                                    src={assigneeInfo.avatar}
                                    alt={assigneeInfo.name}
                                    className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                                />
                            ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                                    {assigneeInfo.name?.[0] || "?"}
                                </div>
                            )}
                            <span className="max-w-[120px] truncate text-sm">
                                {assigneeInfo.name}
                            </span>
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs">
                            Chưa giao
                        </span>
                    )}
                </td>

                <td className="px-3 py-3 text-center border-r border-slate-200">
                    <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                            kr.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : kr.status === "active"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                        }`}
                    >
                        {getStatusText(kr.status)}
                    </span>
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
                <td className="px-3 py-3 text-center border-r border-slate-200">
                    {formatPercent(kr.progress_percent)}
                </td>

                <td className="px-3 py-3 text-center">
                    {isLinkedKR ? (
                        <button
                            onClick={() => {
                                if (
                                    window.confirm(
                                        `Hủy liên kết với "${kr.kr_title}"?`
                                    )
                                ) {
                                    const keep = window.confirm(
                                        "Giữ quyền sở hữu cho OKR cấp cao?"
                                    );
                                    onCancelLink?.(kr.link.link_id, "", keep);
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
                    ) : (
                        <KRActionsMenu
                            kr={kr}
                            objective={objective}
                            setEditingKR={setEditingKR}
                            canCheckIn={canCheckInKR(kr)}
                            openCheckInModal={openCheckInModal}
                            openCheckInHistory={openCheckInHistory}
                            setAssignModal={setAssignModal}
                            menuRefs={menuRefs}
                            openObj={openObj}
                            setOpenObj={setOpenObj}
                        />
                    )}
                </td>
            </tr>

            {/* Render Objective con liên kết vào KR này */}
            {hasLinkedChildren &&
                expanded &&
                kr.linked_objectives.map((linkedObj) => (
                    <LinkedChildObjectiveRow
                        key={`linked_${linkedObj.objective_id}`}
                        linkedObj={linkedObj}
                        parentKrId={kr.kr_id}
                        openObj={openObj}
                        setOpenObj={setOpenObj}
                        onCancelLink={onCancelLink}
                        getAssigneeInfo={getAssigneeInfo}
                        setAssigneeTooltip={setAssigneeTooltip}
                        formatPercent={formatPercent}
                        getStatusText={getStatusText}
                        getUnitText={getUnitText}
                    />
                ))}
        </>
    );
}
