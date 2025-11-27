// src/components/okr/KRActionsMenu.jsx
import React from "react";

export default function KRActionsMenu({
    kr,
    objective,
    setEditingKR,
    handleArchiveKR,
    canCheckIn,
    openCheckInModal,
    openCheckInHistory,
    setAssignModal,
    menuRefs,
    openObj,
    setOpenObj,
}) {
    const menuKey = `menu_${kr.kr_id}`;

    return (
        <div
            className="relative"
            ref={(el) => (menuRefs.current[menuKey] = el)}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenObj((prev) => {
                        const next = { ...prev };
                        Object.keys(next).forEach(
                            (k) => k.startsWith("menu_") && (next[k] = false)
                        );
                        next[menuKey] = !prev[menuKey];
                        return next;
                    });
                }}
                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
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
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                </svg>
            </button>

            {openObj[menuKey] && (
                <div 
                    className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
                    style={{ zIndex: 50 }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAssignModal({
                                show: true,
                                kr,
                                objective,
                                email: "",
                                loading: false,
                            });
                            setOpenObj((prev) => ({
                                ...prev,
                                [menuKey]: false,
                            }));
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Giao việc
                    </button>
                    {canCheckIn && openCheckInModal && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openCheckInModal({
                                    ...kr,
                                    objective_id: objective.objective_id,
                                });
                                setOpenObj((prev) => ({
                                    ...prev,
                                    [menuKey]: false,
                                }));
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            Check-in Key Result
                        </button>
                    )}
                    {openCheckInHistory && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openCheckInHistory({
                                    ...kr,
                                    objective_id: objective.objective_id,
                                });
                                setOpenObj((prev) => ({
                                    ...prev,
                                    [menuKey]: false,
                                }));
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            Lịch sử Check-in
                        </button>
                    )}
                    <div className="my-1 h-px bg-slate-100"></div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveKR(kr.kr_id);
                            setOpenObj((prev) => ({
                                ...prev,
                                [menuKey]: false,
                            }));
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                        Lưu trữ
                    </button>
                </div>
            )}
        </div>
    );
}
