// src/components/okr/KeyResultRow.jsx
import React from "react";
import { FaKey, FaBullseye, FaLongArrowAltLeft, FaUserEdit } from "react-icons/fa";
import { RiAlignItemVerticalCenterLine } from "react-icons/ri";
import { LuAlignCenterHorizontal } from "react-icons/lu";
import LinkedChildObjectiveRow from "./LinkedChildObjectiveRow";
import KRActionsMenu from "./KRActionsMenu";
import AlignmentBadge from "./AlignmentBadge";
import ObjectiveActionsMenu from "./ObjectiveActionsMenu";

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
    setCreatingFor,
    onOpenLinkModal,
    handleArchive,
    setEditingObjective,
    archiving,
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
                    {/* Cột Người sở hữu */}
                    <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            {kr.link?.sourceObjective?.user ? (
                                <>
                                    {kr.link.sourceObjective.user.avatar_url ? (
                                        <img
                                            src={kr.link.sourceObjective.user.avatar_url}
                                            alt={kr.link.sourceObjective.user.full_name}
                                            className="h-7 w-7 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                            {kr.link.sourceObjective.user.full_name?.[0] || "?"}
                                        </div>
                                    )}
                                    <span className="text-sm truncate max-w-[120px]">
                                        {kr.link.sourceObjective.user.full_name}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs text-slate-400">Chưa có</span>
                            )}
                        </div>
                    </td>
                    {/* Cột Tiến độ */}
                    <td className="px-3 py-3 text-center">
                        
                    </td>
                    {/* Cột Hành động */}
                    <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-end gap-1">
                            <button
                                onClick={() => setCreatingFor?.(kr)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Thêm KR"
                                disabled={true}
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        fill="none"
                                    />
                                    <path
                                        d="M12 7V17M7 12H17"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (disableActions || kr.level === "company") {
                                        return;
                                    }
                                    onOpenLinkModal?.({
                                        sourceType: "objective",
                                        source: kr.link?.sourceObjective || kr.link?.source_objective || kr,
                                    });
                                }}
                                disabled={true}
                                title="Liên kết OKR"
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                            <RiAlignItemVerticalCenterLine className="h-4 w-4" />
                            </button>
                            {disableActions ? (
                                <button
                                    onClick={() => handleArchive?.(kr.link?.sourceObjective?.objective_id)}
                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Lưu trữ"
                                    disabled={archiving === kr.link?.sourceObjective?.objective_id}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </button>
                            ) : (
                                <ObjectiveActionsMenu
                                    obj={kr.link?.sourceObjective || kr.link?.source_objective || {
                                        objective_id: kr.link?.link_id,
                                        obj_title: kr.kr_title,
                                        level: kr.link?.sourceObjective?.level || kr.link?.source_objective?.level || "unit",
                                    }}
                                    onOpenLinkModal={onOpenLinkModal}
                                    handleArchive={handleArchive}
                                    archiving={archiving}
                                    menuRefs={menuRefs}
                                    openObj={openObj}
                                    setOpenObj={setOpenObj}
                                    disableActions={disableActions}
                                    setEditingObjective={setEditingObjective}
                                    onCancelLink={onCancelLink}
                                    linkId={kr.link?.link_id}
                                />
                            )}
                        </div>
                    </td>
                </tr>
                {isExpanded &&
                    kr.key_results?.map((sourceKr) => {
                        const info = getAssigneeInfo(sourceKr);
                        const actionsDisabled = true; // KR con của O liên kết: chỉ hiển thị, không thao tác
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
                                <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-end gap-1">
                                        {openCheckInModal && ( 
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    return; // khóa thao tác
                                                }}
                                                disabled
                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Check-in"
                                            >
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                return; // khóa thao tác
                                            }}
                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Giao việc"
                                            disabled
                                        >
                                            <FaUserEdit className="h-4 w-4" />
                                        </button>
                                        <KRActionsMenu
                                            kr={sourceKr}
                                            objective={kr.link?.sourceObjective}
                                            setEditingKR={setEditingKR}
                                            handleArchiveKR={handleArchiveKR}
                                            canCheckIn={false}
                                            openCheckInModal={openCheckInModal}
                                            openCheckInHistory={openCheckInHistory}
                                            setAssignModal={setAssignModal}
                                            menuRefs={menuRefs}
                                            openObj={openObj}
                                            setOpenObj={setOpenObj}
                                            disableActions={true} 
                                        />
                                    </div>
                                </td>
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
                            {openCheckInModal && (
                                <button
                                    onClick={() => openCheckInModal({
                                        ...kr,
                                        objective_id: objective.objective_id,
                                    })}
                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Check-in"
                                    disabled={disableActions}
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
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
                    ) : (
                        <div className="flex items-center justify-end gap-1">
                            {openCheckInModal && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canCheckInKR(kr) || disableActions) return;
                                        openCheckInModal({
                                            ...kr,
                                            objective_id: objective.objective_id,
                                        });
                                    }}
                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={canCheckInKR(kr) ? "Check-in" : "Bạn không có quyền check-in"}
                                    disabled={!canCheckInKR(kr) || disableActions}
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
                        setCreatingFor={setCreatingFor}
                        onOpenLinkModal={onOpenLinkModal}
                        handleArchive={handleArchive}
                        setEditingObjective={setEditingObjective}
                        menuRefs={menuRefs}
                        archiving={archiving}
                        setEditingKR={setEditingKR}
                        handleArchiveKR={handleArchiveKR}
                        canCheckInKR={canCheckInKR}
                        openCheckInModal={openCheckInModal}
                        openCheckInHistory={openCheckInHistory}
                        setAssignModal={setAssignModal}
                    />
                ))}
        </>
    );
}
