// src/components/okr/KeyResultRow.jsx
import React from "react";
import { FaKey, FaBullseye, FaLink } from "react-icons/fa";
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
    handleArchiveKR,
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
    colSpanForKRs,
}) {
    const isLinkedKR = kr.isLinked;
    const isLinkedObjective = kr.isLinkedObjective; // O→O
    const hasLinkedChildren = kr.linked_objectives?.length > 0;
    const expanded = openObj[`kr_${kr.kr_id}`];

    // Nếu là KR ảo từ liên kết O→O → render riêng
    if (isLinkedObjective) {
        const isExpanded = openObj[`linked_obj_kr_${kr.kr_id}`];
        return (
            <>
                <tr className="bg-white hover:bg-slate-50/70 transition-colors duration-150">
                    {/* Cột Tiêu đề */}
                    <td className="pl-12 py-3 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center">
                                {kr.key_results?.length > 0 && (
                                    <button
                                        onClick={() =>
                                            setOpenObj((prev) => ({
                                                ...prev,
                                                [`linked_obj_kr_${kr.kr_id}`]: !prev[`linked_obj_kr_${kr.kr_id}`],
                                            }))
                                        }
                                        className="p-0.5 hover:bg-slate-100 rounded"
                                    >
                                        <svg
                                            className={`h-4 w-4 text-slate-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <FaBullseye className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                            <div className="truncate">
                                <span className="font-medium text-slate-900">{kr.kr_title}</span>
                            </div>
                            {kr.key_results?.length > 0 && (
                                <span className="text-xs text-slate-500">({kr.key_results.length} KR)</span>
                            )}
                        </div>
                    </td>
                    {/* Cột Người thực hiện (Trống) */}
                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                    {/* Cột Tiến độ (Trống) */}
                    <td className="px-3 py-3 text-center border-r border-slate-200"></td>
                    {/* Cột Hành động */}
                    <td className="px-3 py-3 text-center">
                        <button
                            onClick={() => {
                                if (window.confirm(`Hủy liên kết với "${kr.kr_title}"?`)) {
                                    const keep = window.confirm("Giữ quyền sở hữu cho OKR cấp cao?");
                                    onCancelLink?.(kr.link.link_id, "", keep);
                                }
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Hủy liên kết"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </td>
                </tr>
                {isExpanded &&
                    kr.key_results?.map((sourceKr) => {
                        const info = getAssigneeInfo(sourceKr);
                        return (
                            <tr
                                key={`source_kr_${sourceKr.kr_id}`}
                                className="bg-white"
                            >
                                <td className="pl-20 pr-8 py-3 border-r border-slate-200 text-sm text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <FaKey className="h-4 w-4 text-amber-600 flex-shrink-0" title="Key Result" />
                                        {sourceKr.kr_title}
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                    {info.name ? (
                                        <div
                                            className="flex items-center justify-center gap-2 cursor-pointer"
                                            onMouseEnter={(e) =>
                                                setAssigneeTooltip({
                                                    info,
                                                    position:
                                                        e.currentTarget.getBoundingClientRect(),
                                                })
                                            }
                                            onMouseLeave={() =>
                                                setAssigneeTooltip(null)
                                            }
                                        >
                                            {info.avatar ? (
                                                <img
                                                    src={info.avatar}
                                                    alt={info.name}
                                                    className="h-7 w-7 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                                                    {info.name?.[0] || "?"}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs">
                                            Chưa giao
                                        </span>
                                    )}
                                </td>

                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                    <div className="flex flex-col items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                            <div
                                                className={`h-full rounded-full absolute left-0 ${
                                                    sourceKr.status === "completed" ? "bg-green-600" : "bg-blue-600"
                                                }`}
                                                style={{ width: `${sourceKr.progress_percent}%` }}
                                            ></div>
                                            {sourceKr.progress_percent > 0 && (
                                                            <span className="absolute left-1 text-white text-xs font-semibold z-10">
                                                                {formatPercent(sourceKr.progress_percent)}
                                                            </span>                                            )}
                                        </div>
                                        <span
                                            className={`inline-flex items-center rounded-md px-0 py-0 text-[9px] font-semibold ${
                                                sourceKr.status === "completed"
                                                    ? "text-emerald-700"
                                                    : sourceKr.status === "active"
                                                    ? "text-blue-700"
                                                    : "text-slate-700"
                                            } mt-1`}
                                        >
                                            {getStatusText(sourceKr.status)}
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

    // KR thật
    const assigneeInfo = getAssigneeInfo(kr);

    return (
        <>
            <tr className="bg-white hover:bg-slate-50/70 transition-colors duration-150">
                <td className="px-8 py-3 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="w-6 flex-shrink-0">
                            {hasLinkedChildren && (
                                <button
                                    onClick={() =>
                                        setOpenObj((prev) => ({
                                            ...prev,
                                            [`kr_${kr.kr_id}`]:
                                                !prev[`kr_${kr.kr_id}`],
                                        }))
                                    }
                                    className="p-1 rounded-lg hover:bg-slate-100 transition-all group"
                                >
                                    <svg
                                        className={`h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-transform ${
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
                        </div>
                        <FaKey className="h-4 w-4 text-amber-600 flex-shrink-0" title="Key Result"/>

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
                    <div className="flex flex-col items-center">
                        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                            <div
                                className={`h-full rounded-full absolute left-0 ${
                                    kr.status === "completed" ? "bg-green-600" : "bg-blue-600"
                                }`}
                                style={{ width: `${kr.progress_percent}%` }}
                            ></div>
                            {kr.progress_percent > 0 && (
                                                            <span className="absolute left-1 text-white text-xs font-semibold z-10">
                                                                {formatPercent(kr.progress_percent)}
                                                            </span>                            )}
                        </div>
                        <span
                            className={`inline-flex items-center rounded-md px-0 py-0 text-[9px] font-semibold ${
                                kr.status === "completed"
                                    ? "text-emerald-700"
                                    : kr.status === "active"
                                    ? "text-blue-700"
                                    : "text-slate-700"
                            } mt-1`}
                        >
                            {getStatusText(kr.status)}
                        </span>
                    </div>
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
                        <div className="flex items-center justify-center gap-1">
                            <button
                                onClick={() => setEditingKR(kr)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                title="Sửa"
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
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </button>
                            <KRActionsMenu
                                kr={kr}
                                objective={objective}
                                setEditingKR={setEditingKR}
                                handleArchiveKR={handleArchiveKR}
                                canCheckIn={canCheckInKR(kr)}
                                openCheckInModal={openCheckInModal}
                                openCheckInHistory={openCheckInHistory}
                                setAssignModal={setAssignModal}
                                menuRefs={menuRefs}
                                openObj={openObj}
                                setOpenObj={setOpenObj}
                            />
                        </div>
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
