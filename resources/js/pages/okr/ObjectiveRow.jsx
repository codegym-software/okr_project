// src/components/okr/ObjectiveRow.jsx
import React from "react";
import { Link } from '@inertiajs/react';
import { FaBullseye } from "react-icons/fa";
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
    colSpanForObjectiveHeader,
    disableActions = false,
}) {
    const hasKRs = obj.key_results?.length > 0;

    return (
        <>
            <tr 
                className="bg-white hover:bg-slate-50/70 transition-colors duration-150"
                data-objective-id={obj.objective_id}
            >
                <td colSpan={colSpanForObjectiveHeader} className="px-4 py-3">
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
                                setEditingObjective={setEditingObjective} // Pass down the editing function
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
                    />
                ))}
        </>
    );
}
