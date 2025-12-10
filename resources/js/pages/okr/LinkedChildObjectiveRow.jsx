import React from "react";
import { FaBullseye, FaKey, FaLongArrowAltLeft, FaUserEdit } from "react-icons/fa";
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
                        {hasKRs && (
                            <span className="text-xs text-slate-500">
                                ({linkedObj.key_results.length} KR)
                            </span>
                        )}
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
                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172m-.915-2.06c.071-.044.14-.087.207-.13.312-.192.646-.358 1-.497.647-.253 1.348-.372 2.052-.372h.001c.704 0 1.405.119 2.052.372.354.139.688.305 1 .497.067.043.136.086.207.13l-.915-2.06z"
                                />
                            </svg>
                        </button>
                        
                        {disableActions ? (
                            <button
                                onClick={() => handleArchive?.(linkedObj.objective_id)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Lưu trữ"
                                disabled={archiving === linkedObj.objective_id}
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
