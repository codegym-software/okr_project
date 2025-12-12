import React, { useState } from "react";
import ConfirmationModal from "../../components/ConfirmationModal";

export default function ObjectiveActionsMenu({
    obj,
    onOpenLinkModal,
    handleArchive,
    archiving,
    menuRefs,
    openObj,
    setOpenObj,
    disableActions = false,
    setEditingObjective,
    onCancelLink,
    linkId,
}) {
    const menuKey = `menu_obj_${obj.objective_id}`;
    const isCompanyLevel = obj.level === "company";
    const hasLink = onCancelLink && linkId;
    
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });

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
                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Thêm tùy chọn"
                disabled={disableActions}
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
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
                            if (disableActions || hasLink) return;
                            setEditingObjective(obj);
                            setOpenObj((prev) => ({ ...prev, [menuKey]: false }));
                        }}
                        disabled={disableActions || hasLink}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
                            disableActions || hasLink
                                ? "text-slate-400 cursor-not-allowed opacity-50"
                                : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                        Sửa
                    </button>

                    <div className="my-1 h-px bg-slate-100"></div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (disableActions || hasLink) return;
                            handleArchive(obj.objective_id);
                            setOpenObj((prev) => ({ ...prev, [menuKey]: false }));
                        }}
                        disabled={disableActions || archiving === obj.objective_id || hasLink}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 ${
                            disableActions || hasLink 
                                ? "opacity-50 cursor-not-allowed" 
                                : "hover:bg-rose-50"
                        } disabled:opacity-40`}
                    >
                        Lưu trữ
                    </button>

                    {hasLink && (
                        <>
                            <div className="my-1 h-px bg-slate-100"></div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (disableActions) return;
                                    setOpenObj((prev) => ({ ...prev, [menuKey]: false }));
                                    // Hiển thị modal xác nhận hủy liên kết
                                    setConfirmModal({
                                        show: true,
                                        title: "Hủy liên kết",
                                        message: `Bạn có chắc chắn muốn hủy liên kết với "${obj.obj_title}"?`,
                                        confirmText: "Hủy liên kết",
                                        cancelText: "Hủy",
                                        onConfirm: () => {
                                            // Hủy liên kết trực tiếp (mặc định giữ quyền sở hữu)
                                            onCancelLink(linkId, "", true);
                                            setConfirmModal({ show: false });
                                        },
                                    });
                                }}
                                disabled={disableActions}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-orange-600 hover:bg-orange-50"
                            >
                                Hủy liên kết
                            </button>
                        </>
                    )}
                </div>
            )}
            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={() => {
                    setConfirmModal({ show: false });
                }}
            />
        </div>
    );
}
