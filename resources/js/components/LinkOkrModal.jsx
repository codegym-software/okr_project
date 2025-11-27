import React, { useEffect, useMemo, useState } from "react";

const LEVEL_OPTIONS = [
    { value: "", label: "Tất cả cấp bậc" },
    { value: "company", label: "Cấp công ty" },
    { value: "unit", label: "Phòng ban" },
    { value: "team", label: "Nhóm" },
    { value: "person", label: "Cá nhân" },
];

const STATUS_OPTIONS = [
    { value: "", label: "Mọi trạng thái" },
    { value: "active", label: "Đang thực hiện" },
    { value: "completed", label: "Hoàn thành" },
    { value: "draft", label: "Bản nháp" },
];

export default function LinkOkrModal({
    open,
    onClose,
    source,
    sourceType = "objective",
    onSuccess,
}) {
    const [filters, setFilters] = useState({
        level: "",
        status: "",
        keyword: "",
    });
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [note, setNote] = useState("");

    const sourceLevel = useMemo(() => {
        if (!source) return "person";
        if (sourceType === "objective") {
            return source.level || "person";
        }
        return source.objective_level || source.objective?.level || "person";
    }, [source, sourceType]);

    const sourceId = useMemo(() => {
        if (!source) return null;
        return sourceType === "objective" ? source.objective_id : source.kr_id;
    }, [source, sourceType]);

    const fetchTargets = async () => {
        if (!open || !sourceId) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({
                source_type: sourceType,
                source_id: sourceId,
                source_level: sourceLevel,
                page: page.toString(),
            });

            if (filters.level) params.append("level", filters.level);
            if (filters.status) params.append("status", filters.status);
            if (filters.keyword) params.append("keyword", filters.keyword);

            const res = await fetch(`/my-links/available-targets?${params.toString()}`, {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();

            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Không thể tải danh sách OKR cấp cao");
            }

            setItems(json.data?.items || []);
            setMeta(json.data?.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            console.error("Fetch targets error:", err);
            setError(err.message || "Không thể tải danh sách OKR cấp cao");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setPage(1);
            setSelectedTarget(null);
            setNote("");
        }
    }, [open]);

    useEffect(() => {
        fetchTargets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, page, filters.level, filters.status]);

    const handleKeywordSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchTargets();
    };

    const handleSelectTarget = (type, entity) => {
        const id = type === "objective" ? entity.objective_id : entity.kr_id;
        
        if (!id) {
            console.error("Missing ID for selected target:", { type, entity });
            setError("Không thể xác định ID của OKR đã chọn. Vui lòng thử lại.");
            return;
        }

        setSelectedTarget({
            type,
            id: id,
            label:
                type === "objective"
                    ? entity.obj_title
                    : `${entity.obj_title || entity.objective_title || ""} › ${entity.kr_title}`,
            parent: entity.obj_title || entity.objective_title || "",
            status: entity.status,
            level: entity.level || entity.objective_level,
        });
        setError(""); // Clear any previous errors
    };

    const handleSubmit = async () => {
        if (!selectedTarget || !sourceId) {
            setError("Vui lòng chọn OKR cấp cao để liên kết.");
            return;
        }

        if (!selectedTarget.id) {
            setError("Không thể xác định ID của OKR đã chọn. Vui lòng chọn lại.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            if (!token) throw new Error("Không tìm thấy CSRF token");

            // Ensure IDs are numbers if they're numeric strings
            const targetId = selectedTarget.id ? (isNaN(selectedTarget.id) ? selectedTarget.id : Number(selectedTarget.id)) : null;
            const srcId = sourceId ? (isNaN(sourceId) ? sourceId : Number(sourceId)) : null;

            if (!targetId) {
                setError("Không thể xác định ID của OKR đã chọn. Vui lòng chọn lại.");
                setSubmitting(false);
                return;
            }

            const res = await fetch("/my-links/store", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": token,
                },
                body: JSON.stringify({
                    source_type: sourceType,
                    source_id: srcId,
                    target_type: selectedTarget.type,
                    target_id: targetId,
                    note,
                }),
            });

            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Gửi yêu cầu liên kết thất bại");
            }

            if (typeof onSuccess === "function") {
                onSuccess(json.data);
            }

            onClose?.();
        } catch (err) {
            console.error("Submit link error:", err);
            setError(err.message || "Không thể gửi yêu cầu liên kết");
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500 tracking-wide">
                            Liên kết OKR với cấp cao hơn
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">
                            {sourceType === "objective" ? source?.obj_title : source?.kr_title}
                        </h3>
                        <p className="text-sm text-slate-500">
                            Nguồn: {sourceType === "objective" ? "Objective" : "Key Result"} • Cấp{" "}
                            {sourceLevel?.toUpperCase()}
                        </p>
                    </div>
                    <button
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                        onClick={onClose}
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col gap-5 px-6 py-5 overflow-y-auto max-h-[calc(90vh-260px)]">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-700">Bộ lọc liên kết</p>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Cấp bậc</label>
                                <select
                                    value={filters.level}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, level: e.target.value }))
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                >
                                    {LEVEL_OPTIONS.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Trạng thái</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, status: e.target.value }))
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                >
                                    {STATUS_OPTIONS.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <form
                                onSubmit={handleKeywordSearch}
                                className="md:col-span-2 lg:col-span-2"
                            >
                                <label className="text-xs font-medium text-slate-500">Từ khóa</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={filters.keyword}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                                        }
                                        placeholder="Tên Objective hoặc Key Result"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                                    >
                                        Tìm
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="mt-4">
                            <label className="text-xs font-medium text-slate-500">
                                Thông điệp gửi chủ OKR cấp cao
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                placeholder="Ví dụ: Chúng tôi sẽ đóng góp vào mục tiêu tăng doanh thu..."
                            />
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="space-y-3">
                            {loading && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                                    Đang tải danh sách OKR cấp cao...
                                </div>
                            )}

                            {!loading && items.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                                    Không tìm thấy OKR phù hợp với bộ lọc hiện tại.
                                </div>
                            )}

                            {items.map((objective) => (
                                <div
                                    key={objective.objective_id}
                                    className={`rounded-2xl border ${
                                        selectedTarget?.id === objective.objective_id &&
                                        selectedTarget?.type === "objective"
                                            ? "border-indigo-500 bg-indigo-50/70"
                                            : "border-slate-200 bg-white"
                                    } p-4 shadow-sm`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                [{objective.level?.toUpperCase() || "LEVEL"}]{" "}
                                                {objective.status || "Chưa xác định"}
                                            </p>
                                            <h4 className="text-base font-semibold text-slate-900">
                                                {objective.obj_title}
                                            </h4>
                                            <p className="text-sm text-slate-500">
                                                Người sở hữu: {objective.user?.full_name || "Không rõ"}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleSelectTarget("objective", objective)}
                                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                    selectedTarget?.id === objective.objective_id &&
                                                    selectedTarget?.type === "objective"
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-slate-900 text-white hover:bg-slate-700"
                                                }`}
                                            >
                                                Chọn Objective
                                            </button>
                                        </div>
                                    </div>

                                    {objective.key_results?.length > 0 && (
                                        <div className="mt-4 rounded-lg bg-slate-50 p-3">
                                            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                                                Key Results
                                            </p>
                                            <div className="space-y-2">
                                                {objective.key_results
                                                    .filter((kr) => kr.kr_id != null) // Filter out KRs without ID
                                                    .map((kr) => {
                                                        const isSelected =
                                                            selectedTarget?.id === kr.kr_id &&
                                                            selectedTarget?.type === "kr";
                                                        return (
                                                            <div
                                                                key={kr.kr_id}
                                                                className={`rounded-lg border px-3 py-2 text-sm ${
                                                                    isSelected
                                                                        ? "border-indigo-500 bg-white"
                                                                        : "border-transparent"
                                                                } flex items-center justify-between gap-3`}
                                                            >
                                                                <div>
                                                                    <p className="font-semibold text-slate-800">
                                                                        {kr.kr_title}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        Trạng thái: {kr.status || "Không rõ"} • Tiến độ{" "}
                                                                        {Number(kr.progress_percent || 0).toFixed(0)}%
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        handleSelectTarget("kr", {
                                                                            ...kr,
                                                                            obj_title: objective.obj_title,
                                                                            level: objective.level,
                                                                        })
                                                                    }
                                                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                                                        isSelected
                                                                            ? "border-indigo-500 bg-indigo-500 text-white"
                                                                            : "border-slate-300 text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
                                                                    }`}
                                                                >
                                                                    Chọn KR
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {meta.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
                                <span>
                                    Trang {meta.current_page} / {meta.last_page} • Tổng {meta.total} OKR
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        Trước
                                    </button>
                                    <button
                                        disabled={page === meta.last_page}
                                        onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                                        className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-6 py-4">
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {selectedTarget ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Đã chọn</p>
                    <p>
                        {selectedTarget.type === "objective" ? "Objective" : "Key Result"}:{" "}
                        <span className="font-medium">{selectedTarget.label}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                        Cấp {selectedTarget.level?.toUpperCase()} • Trạng thái {selectedTarget.status}
                    </p>
                </div>
            ) : (
                <p className="text-sm text-slate-500">
                    Vui lòng chọn Objective hoặc Key Result cấp cao để gửi yêu cầu.
                </p>
            )}

            <div className="flex items-center justify-end gap-3">
                <button
                    className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                    onClick={onClose}
                >
                    Đóng
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedTarget}
                    className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {submitting ? "Đang gửi..." : "Gửi yêu cầu liên kết"}
                </button>
            </div>
        </div>
            </div>
        </div>
    );
}

