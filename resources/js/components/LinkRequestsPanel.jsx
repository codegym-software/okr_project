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
    const [noteInput, setNoteInput] = React.useState("");
    const [actionModal, setActionModal] = React.useState({
        show: false,
        linkId: null,
        type: "reject", // 'reject' | 'changes'
        title: "",
        placeholder: "",
    });

    const closeActionModal = () =>
        setActionModal({ show: false, linkId: null, type: "reject", title: "", placeholder: "" });

    const openActionModal = (linkId, type) => {
        setActionModal({
            show: true,
            linkId,
            type,
            title:
                type === "changes"
                    ? "Nhập yêu cầu chỉnh sửa trước khi duyệt"
                    : "Nhập lý do từ chối yêu cầu liên kết",
            placeholder: type === "changes" ? "Ví dụ: Cần cập nhật target value..." : "Ví dụ: Không phù hợp KPI năm nay...",
        });
    };

    const submitActionModal = () => {
        if (!noteInput.trim()) return;
        if (actionModal.type === "changes") {
            onRequestChanges?.(actionModal.linkId, noteInput.trim());
        } else {
            onReject?.(actionModal.linkId, noteInput.trim());
        }
        setNoteInput("");
        closeActionModal();
    };

    if (!incoming.length) {
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
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
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
                                        </div>
                                        <div className="sm:pl-6 sm:border-l sm:border-slate-200">
                                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                                Liên kết tới
                                            </p>
                                            <p className="text-sm font-semibold text-indigo-900">
                                                {link.targetObjective?.obj_title || "Objective cao hơn"}{" "}
                                                {link.targetKr && (
                                                    <span className="text-indigo-500">
                                                        › {link.targetKr?.kr_title}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {link.request_note && (
                                            <p className="text-xs text-slate-600 sm:ml-6">
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
                                            onClick={() => openActionModal(link.link_id, "changes")}
                                            className="rounded-full border border-amber-400 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                        >
                                            Yêu cầu chỉnh sửa
                                        </button>
                                        <button
                                            onClick={() => openActionModal(link.link_id, "reject")}
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

            {actionModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {actionModal.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Ghi chú sẽ được gửi tới người yêu cầu.
                            </p>
                        </div>
                        <textarea
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder={actionModal.placeholder}
                        />
                        <div className="mt-4 flex items-center justify-end gap-3">
                            <button
                                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                                onClick={() => {
                                    setNoteInput("");
                                    closeActionModal();
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={submitActionModal}
                                disabled={!noteInput.trim()}
                                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
