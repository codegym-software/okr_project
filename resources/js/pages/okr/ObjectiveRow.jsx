// src/components/okr/ObjectiveRow.jsx
import React from "react";
import { Link } from '@inertiajs/react';
import { FaBullseye } from "react-icons/fa";
import { RiAlignItemVerticalCenterLine } from "react-icons/ri";
import AlignmentBadge from "./AlignmentBadge";
import KeyResultRow from "./KeyResultRow";
import ObjectiveActionsMenu from "./ObjectiveActionsMenu";

export default function ObjectiveRow({
    obj,
    openObj,
    setOpenObj,
    linkBadge,
    setEditingObjective,
    setEditingKR,
    setCreatingFor,
    onOpenLinkModal,
    handleArchive,
    handleArchiveKR,
    archiving,
    menuRefs,
    onCancelLink,
    canCheckInKR,
    openCheckInModal,
    openCheckInHistory,
    setAssignModal,
    setAssigneeTooltip,
    getAssigneeInfo,
    formatPercent,
    getStatusText,
    getUnitText,
    disableActions = false,
}) {
    const hasKRs = obj.key_results?.length > 0;
    const owner = obj.user;
    const progress = Math.max(0, Math.min(100, obj.progress_percent || 0));

    return (
        <>
            <tr 
                className="bg-white transition duration-150 rounded-lg shadow-sm hover:shadow-md ring-1 ring-slate-100"
                data-objective-id={obj.objective_id}
            >
                <td className="px-4 py-3">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                                {hasKRs && (
                                    <button
                                        onClick={() =>
                                            setOpenObj((prev) => ({
                                                ...prev,
                                                [obj.objective_id]:
                                                    !prev[obj.objective_id],
                                            }))
                                        }
                                        className="p-2 rounded-lg hover:bg-slate-100 transition-all group"
                                    >
                                        <svg
                                            className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform ${
                                                openObj[obj.objective_id]
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
                            <FaBullseye className="h-5 w-5 text-indigo-600 flex-shrink-0" title="Objective"/>
                            <a 
                                href={obj.level === "person" 
                                    ? `/my-objectives/details/${obj.objective_id}`
                                    : `/company-okrs/detail/${obj.objective_id}`
                                }
                                className="font-semibold text-slate-900 truncate text-lg hover:text-blue-600"
                            >
                                {obj.obj_title}
                            </a>
                        </div>
                        <AlignmentBadge
                            link={linkBadge}
                            onCancelLink={onCancelLink}
                        />
                    </div>
                </td>
                <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {owner ? (
                            <>
                                {owner.avatar_url ? (
                                    <img
                                        src={owner.avatar_url}
                                        alt={owner.full_name}
                                        className="h-7 w-7 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                        {owner.full_name?.[0] || "?"}
                                    </div>
                                )}
                                <span className="text-sm truncate max-w-[120px]">
                                    {owner.full_name}
                                </span>
                            </>
                        ) : (
                            <span className="text-xs text-slate-400">Chưa có</span>
                        )}
                    </div>
                </td>
                <td className="px-3 py-3 text-center">
                    
                </td>
                <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-end gap-1">
                        <button
                            onClick={() => setCreatingFor(obj)}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Thêm KR"
                            disabled={disableActions}
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
                                if (disableActions || obj.level === "company") {
                                    return;
                                }
                                onOpenLinkModal({
                                    sourceType: "objective",
                                    source: obj,
                                });
                            }}
                            disabled={disableActions || obj.level === "company"}
                            title={
                                obj.level === "company"
                                    ? "OKR cấp công ty không thể làm mục tiêu liên kết."
                                    : "Liên kết OKR"
                            }
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RiAlignItemVerticalCenterLine className="h-4 w-4" />
                        </button>
                        
                        {disableActions ? (
                            <button
                                onClick={() => handleArchive(obj.objective_id)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Lưu trữ"
                                disabled={archiving === obj.objective_id}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </button>
                        ) : (
                            <ObjectiveActionsMenu
                                obj={obj}
                                onOpenLinkModal={onOpenLinkModal}
                                handleArchive={handleArchive}
                                archiving={archiving}
                                menuRefs={menuRefs}
                                openObj={openObj}
                                setOpenObj={setOpenObj}
                                disableActions={disableActions}
                                setEditingObjective={setEditingObjective}
                                onCancelLink={onCancelLink}
                                linkId={linkBadge?.link_id}
                            />
                        )}
                    </div>
                </td>
            </tr>

            {openObj[obj.objective_id] &&
                obj.key_results?.map((kr) => (
                    <KeyResultRow
                        key={kr.kr_id}
                        kr={kr}
                        objective={obj}
                        openObj={openObj}
                        setOpenObj={setOpenObj}
                        setEditingKR={setEditingKR}
                        handleArchiveKR={handleArchiveKR}
                        canCheckInKR={canCheckInKR} // truyền tiếp xuống
                        openCheckInModal={openCheckInModal}
                        openCheckInHistory={openCheckInHistory}
                        onCancelLink={onCancelLink}
                        setAssignModal={setAssignModal}
                        setAssigneeTooltip={setAssigneeTooltip}
                        getAssigneeInfo={getAssigneeInfo}
                        formatPercent={formatPercent}
                        getStatusText={getStatusText}
                        getUnitText={getUnitText}
                        menuRefs={menuRefs}
                        colSpanForKRs={7} // NEW PROP
                        disableActions={disableActions}
                        setCreatingFor={setCreatingFor}
                        onOpenLinkModal={onOpenLinkModal}
                        handleArchive={handleArchive}
                        setEditingObjective={setEditingObjective}
                        archiving={archiving}
                    />
                ))}
        </>
    );
}
