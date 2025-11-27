// src/components/okr/AlignmentBadge.jsx
import React from "react";

export default function AlignmentBadge({ link, onCancelLink }) {
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
        <span
            className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                themes[status] || "bg-slate-100 text-slate-600"
            }`}
        >
            {status === "pending" && `Đang chờ duyệt: ${targetLabel}`}
            {status === "approved" && (
                <>
                    Đã liên kết với: {targetLabel}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancelLink?.(link);
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
    );
}
