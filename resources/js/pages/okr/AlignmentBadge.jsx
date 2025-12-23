// src/components/okr/AlignmentBadge.jsx
import React, { useState } from "react";
import ConfirmationModal from "../../components/ConfirmationModal";

export default function AlignmentBadge({ link, onCancelLink }) {
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });

    if (!link) return null;

    const targetArchived =
        link.targetObjective?.archived_at || link.targetKr?.archived_at;
    if (targetArchived) return null;

    const status = (link.status || "").toLowerCase();
    const targetLabel = `${link.targetObjective?.obj_title || "Objective"}${
        link.targetKr?.kr_title ? ` › ${link.targetKr.kr_title}` : ""
    }`;

    const themes = {
        pending: "bg-amber-100 text-amber-800",
        needs_changes: "bg-orange-100 text-orange-700",
        approved: "bg-emerald-100 text-emerald-800",
        rejected: "bg-rose-100 text-rose-700",
        cancelled: "bg-slate-100 text-slate-500",
    };

    return (
        <>
            <span
                className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold`}
            >
                {status === "pending" && `Đang chờ duyệt: ${targetLabel}`}
                {status === "approved" && (
                    <>
                        Đã liên kết với: {targetLabel}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModal({
                                    show: true,
                                    title: "Hủy liên kết",
                                    message: `Bạn có chắc chắn muốn hủy liên kết với "${targetLabel}"?`,
                                    confirmText: "Hủy liên kết",
                                    cancelText: "Hủy",
                                    onConfirm: () => {
                                        onCancelLink?.(link);
                                        setConfirmModal({ show: false });
                                    },
                                });
                            }}
                            className="underline decoration-dotted"
                        >
                            Hủy
                        </button>
                    </>
                )}
                {status === "rejected" &&
                    `Bị từ chối${
                        link.decision_note ? ` • ${link.decision_note}` : ""
                    }`}
                {status === "needs_changes" &&
                    `Cần chỉnh sửa${
                        link.decision_note ? ` • ${link.decision_note}` : ""
                    }`}
            </span>
            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={() => {
                    setConfirmModal({ show: false });
                }}
            />
        </>
    );
}
