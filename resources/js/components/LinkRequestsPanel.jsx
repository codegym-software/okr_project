import React from "react";

export default function LinkRequestsPanel({
    incoming = [],
    children = [],
    loading = false,
    onApprove,
    onReject,
    onRequestChanges,
    onCancel,
}) {
    const handleReject = (linkId) => {
        const note = window.prompt("Nhập lý do từ chối yêu cầu liên kết:");
        if (!note) return;
        onReject?.(linkId, note);
    };

    const handleRequestChanges = (linkId) => {
        const note = window.prompt("Nhập yêu cầu chỉnh sửa trước khi duyệt:");
        if (!note) return;
        onRequestChanges?.(linkId, note);
    };

    const handleCancelChild = (linkId, label) => {
        const confirmUnlink = window.confirm(
            `Bạn có chắc chắn muốn hủy liên kết với "${label}"?`
        );
        if (!confirmUnlink) return;
        const keepOwnership = window.confirm(
            "OKR này đang sở hữu OKR con. Giữ quyền sở hữu cho OKR cấp cao?"
        );
        onCancel?.(linkId, "", keepOwnership);
    };

    if (!incoming.length && !children.length) {
        return null;
    }

    return (
        <div className="mt-10 space-y-6">
            {incoming.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                Yêu cầu liên kết đang chờ
                            </p>
                            <h3 className="text-lg font-bold text-amber-900">
                                {incoming.length} yêu cầu cần bạn phê duyệt
                            </h3>
                        </div>
                        {loading && (
                            <span className="text-xs text-amber-600">Đang cập nhật...</span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {incoming.map((link) => (
                            <div
                                key={link.link_id}
                                className="rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-amber-100"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-400">
                                            Nguồn
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {link.sourceObjective?.obj_title || "Objective"}{" "}
                                            {link.sourceKr && (
                                                <span className="text-slate-500">
                                                    › {link.sourceKr?.kr_title}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Người yêu cầu: {link.requester?.full_name || "Ẩn danh"}
                                        </p>
                                        {link.request_note && (
                                            <p className="mt-1 text-xs text-slate-600">
                                                Ghi chú: {link.request_note}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => onApprove?.(link.link_id)}
                                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                                        >
                                            Chấp thuận
                                        </button>
                                        <button
                                            onClick={() => handleRequestChanges(link.link_id)}
                                            className="rounded-full border border-amber-400 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                        >
                                            Yêu cầu chỉnh sửa
                                        </button>
                                        <button
                                            onClick={() => handleReject(link.link_id)}
                                            className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {children.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            OKR con đã liên kết
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">
                            {children.length} OKR đang thuộc quyền sở hữu của bạn
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {children.map((link) => (
                            <div
                                key={link.link_id}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="max-w-2xl">
                                        <p className="text-xs uppercase tracking-wide text-slate-400">
                                            OKR con
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {link.sourceObjective?.obj_title || "Objective"}{" "}
                                            {link.sourceKr && (
                                                <span className="text-slate-500">
                                                    › {link.sourceKr.kr_title}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Liên kết tới: {link.targetObjective?.obj_title || "Objective cao hơn"}
                                            {link.targetKr && (
                                                <span> › {link.targetKr.kr_title}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() =>
                                                handleCancelChild(
                                                    link.link_id,
                                                    link.sourceObjective?.obj_title ||
                                                        link.sourceKr?.kr_title
                                                )
                                            }
                                            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                                        >
                                            Hủy liên kết
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

