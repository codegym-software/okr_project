import React from "react";
import { FaBullseye, FaKey, FaLongArrowAltLeft, FaUserEdit } from "react-icons/fa";
import { RiAlignItemVerticalCenterLine } from "react-icons/ri";
import KRActionsMenu from "./KRActionsMenu";
import ObjectiveActionsMenu from "./ObjectiveActionsMenu";

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
    setCreatingFor,
    onOpenLinkModal,
    handleArchive,
    setEditingObjective,
    menuRefs,
    archiving,
    setEditingKR,
    handleArchiveKR,
    canCheckInKR,
    openCheckInModal,
    openCheckInHistory,
    setAssignModal,
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
                    </div>
                </td>
                {/* Cột Người thực hiện */}
                <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {linkedObj?.user ? (
                            <>
                                {linkedObj.user.avatar_url ? (
                                    <img
                                        src={linkedObj.user.avatar_url}
                                        alt={linkedObj.user.full_name}
                                        className="h-7 w-7 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                        {linkedObj.user.full_name?.[0] || "?"}
                                    </div>
                                )}
                                <span className="text-sm truncate max-w-[120px]">
                                    {linkedObj.user.full_name}
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
                            onClick={() => setCreatingFor?.(linkedObj)}
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
                                if (disableActions || linkedObj.level === "company") {
                                    return;
                                }
                                onOpenLinkModal?.({
                                    sourceType: "objective",
                                    source: linkedObj,
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
                                onClick={() => handleArchive?.(linkedObj.objective_id)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Lưu trữ"
                                disabled={disableActions || archiving === linkedObj.objective_id}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </button>
                        ) : (
                            <ObjectiveActionsMenu
                                obj={linkedObj}
                                onOpenLinkModal={onOpenLinkModal}
                                handleArchive={handleArchive}
                                archiving={archiving}
                                menuRefs={menuRefs}
                                openObj={openObj}
                                setOpenObj={setOpenObj}
                                disableActions={disableActions}
                                setEditingObjective={setEditingObjective}
                                onCancelLink={onCancelLink}
                                linkId={linkedObj.link?.link_id}
                            />
                        )}
                    </div>
                </td>
            </tr>

            {/* Render KR của Objective con */}
            {expanded &&
                linkedObj.key_results?.map((kr) => {
                    const actionsDisabled = true; // KR thuộc O liên kết: chỉ hiển thị, không thao tác
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

                            <td className="px-3 py-3">
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-full relative" style={{ minWidth: '120px', maxWidth: '120px' }}>
                                        {/* Progress bar container */}
                                        <div className="relative h-2 w-full bg-blue-100 rounded-full overflow-visible">
                                            {/* Phần đã fill */}
                                            <div
                                                className={`h-full rounded-full absolute left-0 transition-all duration-300 ${
                                                    kr.status === "completed"
                                                        ? "bg-emerald-600"
                                                        : kr.status === "on_track" || kr.status === "active"
                                                        ? "bg-blue-600"
                                                        : kr.status === "at_risk"
                                                        ? "bg-amber-500"
                                                        : kr.status === "in_trouble"
                                                        ? "bg-rose-600"
                                                        : "bg-slate-500"
                                                }`}
                                                style={{
                                                    width: `${Math.max(0, Math.min(100, kr.progress_percent || 0))}%`,
                                                }}
                                            ></div>
                                            {/* Handle tròn */}
                                            <div
                                                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white transition-all duration-300 ${
                                                    kr.status === "completed"
                                                        ? "border-emerald-600"
                                                        : kr.status === "on_track" || kr.status === "active"
                                                        ? "border-blue-600"
                                                        : kr.status === "at_risk"
                                                        ? "border-amber-500"
                                                        : kr.status === "in_trouble"
                                                        ? "border-rose-600"
                                                        : "border-slate-500"
                                                }`}
                                                style={{ left: `calc(${Math.max(0, Math.min(100, kr.progress_percent || 0))}% - 6px)` }}
                                            >
                                                {/* Text phần trăm trên handle */}
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                                    <span className={`text-xs font-semibold ${
                                                        kr.status === "completed"
                                                            ? "text-emerald-600"
                                                            : kr.status === "on_track" || kr.status === "active"
                                                            ? "text-blue-600"
                                                            : kr.status === "at_risk"
                                                            ? "text-amber-600"
                                                            : kr.status === "in_trouble"
                                                            ? "text-rose-600"
                                                            : "text-slate-600"
                                                    }`}>
                                                        {formatPercent(kr.progress_percent)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            kr.status === "completed"
                                                ? "text-emerald-700 bg-emerald-50"
                                                : kr.status === "on_track" || kr.status === "active"
                                                ? "text-blue-700 bg-blue-50"
                                                : kr.status === "at_risk"
                                                ? "text-amber-700 bg-amber-50"
                                                : kr.status === "in_trouble"
                                                ? "text-rose-700 bg-rose-50"
                                                : "text-slate-600 bg-slate-50"
                                        }`}
                                    >
                                        {getStatusText(kr.status)}
                                    </span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-end gap-1">
                                    {openCheckInModal && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (actionsDisabled || !canCheckInKR(kr) || disableActions) return;
                                                openCheckInModal({
                                                    ...kr,
                                                    objective_id: linkedObj.objective_id,
                                                });
                                            }}
                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={canCheckInKR(kr) ? "Check-in" : "Bạn không có quyền check-in"}
                                            disabled={true}
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
                                        onClick={() => {
                                            if (actionsDisabled) return;
                                            setAssignModal?.({ show: true, kr, objective: linkedObj, email: "", loading: false });
                                        }}
                                        className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Giao việc"
                                        disabled={true}
                                    >
                                        <FaUserEdit className="h-4 w-4" />
                                    </button>
                                    <KRActionsMenu
                                        kr={kr}
                                        objective={linkedObj}
                                        setEditingKR={setEditingKR}
                                        handleArchiveKR={handleArchiveKR}
                                        canCheckIn={canCheckInKR(kr)}
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
