import React, { useEffect, useMemo, useState, useRef } from "react";
import ConfirmationModal from "./ConfirmationModal";
import { getStatusText, formatPercent } from "../pages/okr/utils/formatters";

const LEVEL_OPTIONS = [
    { value: "", label: "Tất cả cấp bậc" },
    { value: "company", label: "Cấp công ty" },
    { value: "unit", label: "Phòng ban" },
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
    onCancelLink,
}) {
    const [filters, setFilters] = useState({
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
    const noteTextareaRef = useRef(null);
    const [existingLink, setExistingLink] = useState(null);
    const [cancellingLink, setCancellingLink] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });

    const sourceLevel = useMemo(() => {
        if (!source) return "person";
        if (sourceType === "objective") {
            return source.level || "person";
        }
        return source.objective_level || source.objective?.level || "person";
    }, [source, sourceType]);

    // Tính toán các level có thể liên kết dựa trên source level
    const allowedTargetLevels = useMemo(() => {
        // Quy tắc: 
        // - Phòng ban (unit) chỉ được liên kết lên công ty (company)
        // - Cá nhân (person) chỉ được liên kết lên phòng ban (unit)
        // - Team có thể liên kết lên unit hoặc company
        switch (sourceLevel) {
            case 'person':
                return ['unit']; // Cá nhân chỉ liên kết lên phòng ban
            case 'unit':
                return ['company']; // Phòng ban chỉ liên kết lên công ty
            case 'team':
                return ['unit', 'company']; // Team có thể liên kết lên unit hoặc company
            case 'company':
                return []; // Công ty không thể liên kết lên đâu
            default:
                return ['unit', 'company']; // Mặc định
        }
    }, [sourceLevel]);

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

    // Fetch existing link information
    useEffect(() => {
        const fetchExistingLink = async () => {
            if (!open || !sourceId || sourceType !== "objective") {
                setExistingLink(null);
                return;
            }
            
            try {
                const res = await fetch("/my-links", {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();
                
                if (json.success && json.data) {
                    // Tìm link hiện tại của Objective này (chỉ lấy approved hoặc pending)
                    const link = json.data.outgoing?.find(
                        (l) =>
                            l.source_type === "objective" &&
                            l.source_objective_id === sourceId &&
                            l.status !== "cancelled" &&
                            l.status !== "rejected" &&
                            l.status !== "needs_changes"
                    );
                    setExistingLink(link || null);
                }
            } catch (err) {
                console.error("Fetch existing link error:", err);
                setExistingLink(null);
            }
        };
        
        fetchExistingLink();
    }, [open, sourceId, sourceType]);

    useEffect(() => {
        if (open) {
            setPage(1);
            setNote("");
            
            // Đọc query params để khôi phục selected target
            const urlParams = new URLSearchParams(window.location.search);
            const targetIdParam = urlParams.get('target_id');
            const targetTypeParam = urlParams.get('target_type');
            
            if (targetIdParam && targetTypeParam && items.length > 0) {
                // Tìm target trong danh sách items
                let foundTarget = null;
                for (const objective of items) {
                    if (targetTypeParam === 'objective' && String(objective.objective_id) === String(targetIdParam)) {
                        foundTarget = {
                            type: 'objective',
                            id: objective.objective_id,
                            label: objective.obj_title,
                            parent: objective.obj_title,
                            status: objective.status,
                            level: objective.level,
                        };
                        break;
                    } else if (targetTypeParam === 'kr' && objective.key_results) {
                        const foundKR = objective.key_results.find(kr => String(kr.kr_id) === String(targetIdParam));
                        if (foundKR) {
                            foundTarget = {
                                type: 'kr',
                                id: foundKR.kr_id,
                                label: `${objective.obj_title} › ${foundKR.kr_title}`,
                                parent: objective.obj_title,
                                status: foundKR.status,
                                level: objective.level,
                            };
                            break;
                        }
                    }
                }
                
                if (foundTarget) {
                    setSelectedTarget(foundTarget);
                } else {
                    // Nếu không tìm thấy target từ URL, reset selection
                    setSelectedTarget(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('target_id');
                    url.searchParams.delete('target_type');
                    window.history.replaceState({}, '', url.toString());
                }
            } else {
                // Nếu không có target params, reset selection
                setSelectedTarget(null);
            }
        } else {
            // Khi đóng modal, reset selection
            setSelectedTarget(null);
        }
    }, [open, items]);

    useEffect(() => {
        fetchTargets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, page, filters.keyword, sourceId, sourceType, sourceLevel]);

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
        
        // Cập nhật URL với target_id và target_type
        const url = new URL(window.location.href);
        url.searchParams.set('target_id', String(id));
        url.searchParams.set('target_type', type);
        window.history.replaceState({}, '', url.toString());
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

        if (!note || note.trim() === "") {
            setError("Vui lòng nhập thông điệp gửi chủ OKR cấp cao.");
            // Scroll và focus vào textarea với offset để không che phần "Đã chọn"
            if (noteTextareaRef.current) {
                setTimeout(() => {
                    const textareaElement = noteTextareaRef.current;
                    // Tìm scroll container (modal content area)
                    const scrollContainer = textareaElement.closest('.overflow-y-auto');
                    
                    if (scrollContainer) {
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const textareaRect = textareaElement.getBoundingClientRect();
                        
                        // Tính toán vị trí scroll với offset để phần "Đã chọn" (ở bottom) vẫn hiển thị
                        // Offset = chiều cao ước tính của phần "Đã chọn" + padding
                        const offset = 150;
                        const relativeTop = textareaRect.top - containerRect.top + scrollContainer.scrollTop;
                        const targetScrollTop = relativeTop - offset;
                        
                        scrollContainer.scrollTo({
                            top: Math.max(0, targetScrollTop),
                            behavior: 'smooth'
                        });
                    } else {
                        // Fallback: dùng scrollIntoView với block: 'start' và offset
                        textareaElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start',
                            inline: 'nearest'
                        });
                    }
                    
                    // Đợi scroll xong rồi mới focus
                    setTimeout(() => {
                        noteTextareaRef.current?.focus();
                    }, 400);
                }, 100);
            }
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

            // Xóa target params khi submit thành công
            const url = new URL(window.location.href);
            url.searchParams.delete('target_id');
            url.searchParams.delete('target_type');
            window.history.replaceState({}, '', url.toString());

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
                            {existingLink ? (
                                <>
                                    Đã liên kết đến:{" "}
                                    {existingLink.target_type === "objective"
                                        ? (existingLink.target_objective?.obj_title || existingLink.targetObjective?.obj_title || `Objective (ID: ${existingLink.target_objective_id})`)
                                        : existingLink.target_kr || existingLink.targetKr
                                        ? ((existingLink.target_kr || existingLink.targetKr)?.kr_title || `Key Result (ID: ${existingLink.target_kr_id})`)
                                        : `OKR (ID: ${existingLink.target_objective_id || existingLink.target_kr_id})`}
                                </>
                            ) : (
                                "Chưa liên kết"
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {existingLink && onCancelLink && (
                            <button
                                onClick={() => {
                                    setConfirmModal({
                                        show: true,
                                        title: "Hủy liên kết",
                                        message: `Bạn có chắc chắn muốn hủy liên kết với "${existingLink.target_type === "objective" ? (existingLink.target_objective?.obj_title || existingLink.targetObjective?.obj_title || "Objective") : ((existingLink.target_kr || existingLink.targetKr)?.kr_title || "Key Result")}"?`,
                                        confirmText: "Hủy liên kết",
                                        cancelText: "Hủy",
                                        onConfirm: () => {
                                            setCancellingLink(true);
                                            try {
                                                onCancelLink(existingLink.link_id || existingLink.id, "", true);
                                                setExistingLink(null);
                                                setConfirmModal({ show: false });
                                                setTimeout(() => {
                                                    onClose?.();
                                                }, 500);
                                            } catch (err) {
                                                console.error("Cancel link error:", err);
                                            } finally {
                                                setCancellingLink(false);
                                            }
                                        },
                                    });
                                }}
                                disabled={cancellingLink}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                            >
                                {cancellingLink ? "Đang hủy..." : "Hủy liên kết"}
                            </button>
                        )}
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
                </div>

                <div className="flex flex-col gap-5 px-6 py-5 overflow-y-auto max-h-[calc(90vh-260px)]">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="space-y-5">
                            <div>
                                <form
                                    onSubmit={handleKeywordSearch}
                                >
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Tìm kiếm OKR
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={filters.keyword}
                                            onChange={(e) =>
                                                setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                                            }
                                            placeholder="Nhập tên Objective hoặc Key Result để tìm kiếm"
                                            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                                        >
                                            Tìm
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    <span className="ml-1 text-red-500">* </span>
                                    Thông điệp gửi chủ OKR cấp cao
                                </label>
                                <textarea
                                    ref={noteTextareaRef}
                                    value={note}
                                    onChange={(e) => {
                                        setNote(e.target.value);
                                        if (error && e.target.value.trim() !== "") {
                                            setError("");
                                        }
                                    }}
                                    rows={4}
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-y"
                                    placeholder="Ví dụ: Chúng tôi sẽ đóng góp vào mục tiêu tăng doanh thu..."
                                />
                                {error && error.includes("thông điệp") && (
                                    <p className="mt-1.5 text-sm text-red-600 font-medium">
                                        {error}
                                    </p>
                                )}
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Vui lòng mô tả cách OKR của bạn sẽ đóng góp vào OKR cấp cao hơn
                                </p>
                            </div>
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

                            {items.map((objective) => {
                                const getLevelText = (level) => {
                                    const levelMap = {
                                        'company': 'Công ty',
                                        'unit': 'Phòng ban',
                                        'person': 'Cá nhân'
                                    };
                                    return levelMap[level?.toLowerCase()] || level?.toUpperCase() || 'Cấp độ';
                                };

                                const isObjectiveSelected = selectedTarget?.id === objective.objective_id &&
                                    selectedTarget?.type === "objective";

                                return (
                                    <div
                                        key={objective.objective_id}
                                        className={`rounded-xl border-2 transition-all ${
                                            isObjectiveSelected
                                                ? "border-indigo-500 bg-indigo-50/50 shadow-md"
                                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                        } p-5`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                                        {getLevelText(objective.level)}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                                                        objective.status === 'on_track' || objective.status === 'active'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : objective.status === 'at_risk'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : objective.status === 'behind'
                                                            ? 'bg-red-100 text-red-700'
                                                            : objective.status === 'completed'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {getStatusText(objective.status) || "Chưa xác định"}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-900 mb-2">
                                                    {objective.obj_title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span>{objective.user?.full_name || "Chưa có người sở hữu"}</span>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <button
                                                    onClick={() => handleSelectTarget("objective", objective)}
                                                    className={`rounded-lg border-2 px-5 py-2.5 text-sm font-semibold transition-all ${
                                                        isObjectiveSelected
                                                            ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                                                            : "border-slate-300 bg-white text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600"
                                                    }`}
                                                >
                                                    Chọn Mục tiêu
                                                </button>
                                            </div>
                                        </div>

                                        {objective.key_results?.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                    </svg>
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        Kết quả then chốt
                                                    </p>
                                                    <span className="text-xs text-slate-500">
                                                        ({objective.key_results.filter(kr => kr.kr_id != null).length})
                                                    </span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    {objective.key_results
                                                        .filter((kr) => kr.kr_id != null)
                                                        .map((kr) => {
                                                            const isSelected =
                                                                selectedTarget?.id === kr.kr_id &&
                                                                selectedTarget?.type === "kr";
                                                            return (
                                                                <div
                                                                    key={kr.kr_id}
                                                                    className={`rounded-lg border-2 px-4 py-3 transition-all ${
                                                                        isSelected
                                                                            ? "border-indigo-500 bg-indigo-50/50 shadow-sm"
                                                                            : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                                                                    } flex items-center justify-between gap-4`}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold text-slate-900 mb-1">
                                                                            {kr.kr_title}
                                                                        </p>
                                                                        <div className="flex items-center gap-3 text-xs text-slate-600">
                                                                            <span className="flex items-center gap-1">
                                                                                <span className="font-medium">Trạng thái:</span>
                                                                                <span className={`font-semibold ${
                                                                                    kr.status === 'on_track' || kr.status === 'active'
                                                                                        ? 'text-blue-600'
                                                                                        : kr.status === 'at_risk'
                                                                                        ? 'text-amber-600'
                                                                                        : kr.status === 'in_trouble'
                                                                                        ? 'text-red-600'
                                                                                        : kr.status === 'completed'
                                                                                        ? 'text-emerald-600'
                                                                                        : 'text-slate-600'
                                                                                }`}>
                                                                                    {getStatusText(kr.status) || "Không rõ"}
                                                                                </span>
                                                                            </span>
                                                                            <span className="text-slate-400">•</span>
                                                                            <span className="flex items-center gap-1">
                                                                                <span className="font-medium">Tiến độ:</span>
                                                                                <span className="font-semibold text-indigo-600">
                                                                                    {formatPercent(kr.progress_percent || 0)}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleSelectTarget("kr", {
                                                                                ...kr,
                                                                                obj_title: objective.obj_title,
                                                                                level: objective.level,
                                                                            })
                                                                        }
                                                                        className={`rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all flex-shrink-0 ${
                                                                            isSelected
                                                                                ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                                                                                : "border-slate-300 bg-white text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600"
                                                                        }`}
                                                                    >
                                                                        Chọn Kết quả
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
            {error && !error.includes("thông điệp") && <p className="text-sm text-rose-600">{error}</p>}
            {selectedTarget ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900 mb-2">Đã chọn</p>
                    <p className="mb-1">
                        {selectedTarget.type === "objective" ? "Mục tiêu" : "Kết quả then chốt"}:{" "}
                        <span className="font-medium text-slate-900">{selectedTarget.label}</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>
                            Cấp: <span className="font-semibold text-slate-700">
                                {selectedTarget.level === 'company' ? 'Công ty' :
                                 selectedTarget.level === 'unit' ? 'Phòng ban' :
                                 selectedTarget.level === 'team' ? 'Nhóm' :
                                 selectedTarget.level === 'person' ? 'Cá nhân' :
                                 selectedTarget.level?.toUpperCase() || 'N/A'}
                            </span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                            Trạng thái: <span className="font-semibold text-slate-700">
                                {getStatusText(selectedTarget.status) || selectedTarget.status || 'Chưa xác định'}
                            </span>
                        </span>
                    </div>
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
            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={() => {
                    setConfirmModal({ show: false });
                }}
            />
        </div>
    );
}

