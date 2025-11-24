// src/components/okr/ObjectiveRow.jsx
import React from "react";
import AlignmentBadge from "./AlignmentBadge";
import KeyResultRow from "./KeyResultRow";

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
}) {
    const hasKRs = obj.key_results?.length > 0;

    return (
        <>
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                <td colSpan={7} className="px-3 py-3 border-r border-slate-200">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
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
                            <span className="font-semibold text-slate-900 truncate">
                                {obj.obj_title}
                            </span>
                        </div>
                        <AlignmentBadge
                            link={linkBadge}
                            onCancelLink={onCancelLink}
                        />
                    </div>
                </td>
                <td className="px-3 py-3 text-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-center gap-1">
                        {onOpenLinkModal && (
                            <button
                                onClick={() =>
                                    onOpenLinkModal({
                                        sourceType: "objective",
                                        source: obj,
                                    })
                                }
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Liên kết"
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
                                        d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.656-5.656l1.414-1.414M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 015.656 5.656l-1.414 1.414"
                                    />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={() => setEditingObjective(obj)}
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
                        <button
                            onClick={() => setCreatingFor(obj)}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            title="Thêm KR"
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
                            onClick={() => handleArchive(obj.objective_id)}
                            disabled={archiving === obj.objective_id}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                            title="Lưu trữ"
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
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                            </svg>
                        </button>
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
                    />
                ))}
        </>
    );
}
