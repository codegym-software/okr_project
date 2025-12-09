// src/components/okr/KeyResultRow.jsx
import React from "react";
import { FaKey, FaBullseye, FaLink, FaLongArrowAltLeft, FaUserEdit } from "react-icons/fa";
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
    disableActions = false,
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
<td className="pl-12 pr-4 py-3">
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
                                                isExpanded ? "rotate-90" : ""
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
                            <div className="truncate flex items-center gap-1">
                                <FaBullseye
                                    className="h-5 w-5 text-indigo-500 flex-shrink-0"
                                    title="OKR được liên kết"
                                />
                                <span className="font-semibold text-slate-900 text-lg">
                                    {kr.kr_title}
                                </span>
                            </div>
                            {kr.key_results?.length > 0 && (
                                <span className="text-xs text-slate-500">
                                    ({kr.key_results.length} KR)
                                </span>
                            )}
                        </div>
                    </td>
                    {/* Cột Người thực hiện (Trống) */}
                    <td className="px-3 py-3 text-center"></td>
                    {/* Cột Tiến độ (Trống) */}
                    <td className="px-3 py-3 text-center"></td>
                    {/* Cột Hành động */}
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
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Hủy liên kết"
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
                {isExpanded &&
                    kr.key_results?.map((sourceKr) => {
                        const info = getAssigneeInfo(sourceKr);
                        return (
                            <tr
                                key={`source_kr_${sourceKr.kr_id}`}
                                className="bg-white"
                            >
                                <td className="pl-20 pr-8 py-3 text-base text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <FaKey
                                            className="h-4 w-4 text-amber-600 flex-shrink-0"
                                            title="Key Result"
                                        />
                                        <span className="font-semibold">
                                            {sourceKr.kr_title}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-center">
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
                                            <span className="max-w-[120px] truncate text-sm">
                                                {info.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs">
                                            Chưa giao
                                        </span>
                                    )}
                                                </td>
                                
                                                <td className="px-3 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="w-full bg-slate-100 rounded-full h-5 relative overflow-hidden border border-slate-200">
                                            <div
                                                className={`h-full rounded-full absolute left-0 transition-all duration-300 ${
                                                    sourceKr.status === "completed"
                                                        ? "bg-emerald-600"
                                                        : sourceKr.status === "active"
                                                        ? "bg-blue-600"
                                                        : "bg-slate-500"
                                                }`}
                                                style={{
                                                    width: `${Math.max(0, Math.min(100, sourceKr.progress_percent || 0))}%`,
                                                }}
                                            ></div>
                                            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold z-10 ${
                                                (sourceKr.progress_percent || 0) > 35 
                                                    ? "text-white" 
                                                    : "text-slate-700"
                                            }`} style={(sourceKr.progress_percent || 0) > 35 ? { textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,1)' } : {}}>
                                                {formatPercent(sourceKr.progress_percent)}
                                            </span>
                                        </div>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                sourceKr.status === "completed"
                                                    ? "text-emerald-700 bg-emerald-50"
                                                    : sourceKr.status === "active"
                                                    ? "text-blue-700 bg-blue-50"
                                                    : "text-slate-600 bg-slate-50"
                                            }`}
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
            <tr 
                className="bg-white hover:bg-slate-50/70 transition-colors duration-150"
                data-kr-id={kr.kr_id}
            >
                <td className="pl-12 pr-4 py-3">
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
                        <FaKey
                            className="h-4 w-4 text-amber-600 flex-shrink-0"
                            title="Key Result"
                        />

                        <a 
                            href={objective?.level === "person" 
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
                                style={{ width: `${Math.max(0, Math.min(100, kr.progress_percent || 0))}%` }}
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
                    ) : disableActions ? (
                        <div className="flex items-center justify-end gap-1">
                            <button
                                onClick={() => setAssignModal({ show: true, kr, objective, email: "", loading: false })}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Giao việc"
                                disabled={disableActions}
                            >
                                <FaUserEdit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setEditingKR(kr)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Sửa"
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
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleArchiveKR(kr.kr_id)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Lưu trữ"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-end gap-1">
                            {canCheckInKR(kr) && openCheckInModal && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openCheckInModal({
                                            ...kr,
                                            objective_id: objective.objective_id,
                                        });
                                    }}
                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Check-in"
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
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={() => setAssignModal({ show: true, kr, objective, email: "", loading: false })}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Giao việc"
                                disabled={disableActions}
                            >
                                <FaUserEdit className="h-4 w-4" />
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
                                disableActions={disableActions}
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
                        disableActions={disableActions}
                    />
                ))}
        </>
    );
}
