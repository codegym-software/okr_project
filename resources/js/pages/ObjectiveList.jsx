import React, { useState, useEffect, useCallback } from "react";
import { canCheckInKeyResult } from "../utils/checkinPermissions";

export default function ObjectiveList({
    items,
    departments,
    cyclesList,
    loading,
    openObj,
    setOpenObj,
    setCreatingFor,
    setEditingObjective,
    setEditingKR,
    setCreatingObjective,
    links,
    cycleFilter,
    setCycleFilter,
    openCheckInModal,
    openCheckInHistory,
    currentUser,
    hideFilters = false,
    setItems,
}) {
    const [toast, setToast] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedItems, setArchivedItems] = useState([]);
    const [archivedCount, setArchivedCount] = useState(0);
    const [loadingArchived, setLoadingArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentCycleId, setCurrentCycleId] = useState(null);
    const [archivingKR, setArchivingKR] = useState(null);
    const [unarchivingKR, setUnarchivingKR] = useState(null);
    const [deletingKR, setDeletingKR] = useState(null);

    const canCheckInKR = (kr, objective) => {
        return canCheckInKeyResult(currentUser, kr, objective);
    };

    const handleOpenCheckIn = (kr, objective) => {
        if (!openCheckInModal) return;
        openCheckInModal({ ...kr, objective_id: objective.objective_id });
    };

    const handleOpenCheckInHistory = (kr, objective) => {
        if (!openCheckInHistory) return;
        openCheckInHistory({ ...kr, objective_id: objective.objective_id });
    };
    const [archiving, setArchiving] = useState(null);
    const [unarchiving, setUnarchiving] = useState(null);
    const [deleting, setDeleting] = useState(null);

    // === MODAL XÁC NHẬN CHUNG ===
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });

    const openConfirm = (
        title,
        message,
        onConfirm,
        confirmText = "OK",
        cancelText = "Hủy"
    ) => {
        setConfirmModal({
            show: true,
            title,
            message,
            onConfirm,
            confirmText,
            cancelText,
        });
    };

    const closeConfirm = () => {
        setConfirmModal((prev) => ({ ...prev, show: false }));
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // === TẢI OKR LƯU TRỮ ===
    useEffect(() => {
        if (showArchived) {
            const fetchArchived = async () => {
                setLoadingArchived(true);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const params = new URLSearchParams({
                        archived: "1",
                        include_archived_kr: "1",
                    });
                    if (cycleFilter) params.append("cycle_id", cycleFilter);

                    const res = await fetch(`/my-objectives?${params}`, {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        setArchivedItems(json.data.data || []);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setLoadingArchived(false);
                }
            };
            fetchArchived();
        } else {
            setArchivedItems([]);
            setArchivedCount(0);
        }
    }, [showArchived, cycleFilter]);

    // === TỰ ĐỘNG CHỌN QUÝ HIỆN TẠI ===
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlCycleId = urlParams.get("cycle_id");

        if (urlCycleId && !cycleFilter) {
            setCycleFilter(urlCycleId);
            return;
        }

        if (cycleFilter) return;

        if (currentCycleId) {
            setCycleFilter(currentCycleId);
            return;
        }

        if (items.length > 0) {
            const firstItemCycleId = items[0]?.cycle_id;
            if (firstItemCycleId) setCycleFilter(firstItemCycleId);
        }
    }, [items, cycleFilter, currentCycleId]);

    // === RELOAD CẢ 2 TAB TỪ SERVER (dùng chung) ===
    const reloadBothTabs = useCallback(
        async (token) => {
            const baseParams = new URLSearchParams();
            if (cycleFilter) baseParams.append("cycle_id", cycleFilter);

            // 1. Tab Hoạt động: chỉ KR chưa lưu trữ
            const activeParams = new URLSearchParams(baseParams);
            const activeRes = await fetch(`/my-objectives?${activeParams}`, {
                headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
            });
            const activeJson = await activeRes.json();
            if (activeJson.success) {
                setItems(activeJson.data.data || []);
            }

            // 2. Tab Lưu trữ: tất cả KR (nếu đang mở)
            if (showArchived) {
                const archivedParams = new URLSearchParams({
                    archived: "1",
                    include_archived_kr: "1",
                });
                if (cycleFilter) archivedParams.append("cycle_id", cycleFilter);
                const archivedRes = await fetch(
                    `/my-objectives?${archivedParams}`,
                    {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    }
                );
                const archivedJson = await archivedRes.json();
                if (archivedJson.success) {
                    setArchivedItems(archivedJson.data.data || []);
                }
            }
        },
        [cycleFilter, showArchived, setItems]
    );

    // === LƯU TRỮ OKR ===
    const handleArchive = async (id) => {
        openConfirm(
            "Lưu trữ OKR",
            "Bạn sẽ không thể chỉnh sửa OKR này nữa.",
            async () => {
                setArchiving(id);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(`/my-objectives/${id}/archive`, {
                        method: "POST",
                        headers: {
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        await reloadBothTabs(token);
                        setToast({ type: "success", message: json.message });
                    } else {
                        throw new Error(json.message);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setArchiving(null);
                }
            },
            "Lưu trữ",
            "Hủy"
        );
    };

    // === BỎ LƯU TRỮ OKR ===
    const handleUnarchive = async (id) => {
        openConfirm(
            "Bỏ lưu trữ OKR",
            "OKR sẽ được khôi phục vào danh sách hoạt động.",
            async () => {
                setUnarchiving(id);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(`/my-objectives/${id}/unarchive`, {
                        method: "POST",
                        headers: {
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        await reloadBothTabs(token);
                        setToast({ type: "success", message: json.message });
                    } else {
                        throw new Error(json.message);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setUnarchiving(null);
                }
            }
        );
    };

    // === XÓA VĨNH VIỄN OKR ===
    const handleDelete = async (id) => {
        openConfirm(
            "XÓA VĨNH VIỄN",
            "OKR sẽ bị xóa hoàn toàn, không thể khôi phục!",
            async () => {
                setDeleting(id);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(`/my-objectives/${id}`, {
                        method: "DELETE",
                        headers: {
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        await reloadBothTabs(token);
                        setToast({ type: "success", message: json.message });
                    } else {
                        throw new Error(json.message);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setDeleting(null);
                }
            },
            "Xóa vĩnh viễn",
            "Hủy"
        );
    };

    // === LƯU TRỮ KR ===
    const handleArchiveKR = async (krId) => {
        openConfirm(
            "Lưu trữ Key Result",
            "Key Result sẽ được chuyển vào tab Lưu trữ.",
            async () => {
                setArchivingKR(krId);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const obj = items.find((o) =>
                        o.key_results?.some((kr) => kr.kr_id === krId)
                    );
                    if (!obj) throw new Error("Không tìm thấy OKR cha.");

                    const res = await fetch(
                        `/my-key-results/${obj.objective_id}/${krId}/archive`,
                        {
                            method: "POST",
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    );
                    const json = await res.json();
                    if (!json.success)
                        throw new Error(json.message || "Lưu trữ thất bại");

                    await reloadBothTabs(token);
                    setToast({ type: "success", message: json.message });
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setArchivingKR(null);
                }
            }
        );
    };

    // === BỎ LƯU TRỮ KR ===
    const handleUnarchiveKR = async (krId) => {
        openConfirm(
            "Bỏ lưu trữ Key Result",
            "Key Result sẽ quay lại danh sách hoạt động.",
            async () => {
                setUnarchivingKR(krId);
                const obj = archivedItems.find((o) =>
                    o.key_results?.some((kr) => kr.kr_id === krId)
                );
                if (!obj) {
                    setToast({
                        type: "error",
                        message: "Không tìm thấy OKR cha.",
                    });
                    setUnarchivingKR(null);
                    return;
                }

                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(
                        `/my-key-results/${obj.objective_id}/${krId}/unarchive`,
                        {
                            method: "POST",
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    );
                    const json = await res.json();
                    if (!json.success)
                        throw new Error(json.message || "Bỏ lưu trữ thất bại");

                    await reloadBothTabs(token);
                    setToast({ type: "success", message: json.message });
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setUnarchivingKR(null);
                }
            }
        );
    };

    // === XÓA VĨNH VIỄN KR ===
    const handleDeleteKR = async (krId) => {
        openConfirm(
            "XÓA VĨNH VIỄN",
            "Key Result sẽ bị xóa hoàn toàn, không thể khôi phục!",
            async () => {
                setDeletingKR(krId);
                const obj = archivedItems.find((o) =>
                    o.key_results?.some((kr) => kr.kr_id === krId)
                );
                if (!obj) {
                    setToast({
                        type: "error",
                        message: "Không tìm thấy OKR cha.",
                    });
                    setDeletingKR(null);
                    return;
                }

                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    // SỬA URL ĐÚNG TẠI ĐÂY
                    const res = await fetch(
                        `/my-key-results/destroy/${obj.objective_id}/${krId}`,
                        {
                            method: "DELETE",
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    );
                    const json = await res.json();

                    if (json.success) {
                        await reloadBothTabs(token);
                        setToast({ type: "success", message: json.message });
                    } else {
                        throw new Error(json.message);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setDeletingKR(null);
                }
            },
            "Xóa vĩnh viễn",
            "Hủy"
        );
    };

    // === HELPER FORMAT ===
    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "Bản nháp";
            case "active":
                return "Đang thực hiện";
            case "completed":
                return "Hoàn thành";
            default:
                return status || "";
        }
    };

    const getUnitText = (unit) => {
        switch (unit?.toLowerCase()) {
            case "number":
                return "Số lượng";
            case "percent":
                return "Phần trăm";
            case "completion":
                return "Hoàn thành";
            default:
                return unit || "";
        }
    };

    const calculateObjectiveProgress = (keyResults) => {
        if (!keyResults || keyResults.length === 0) return 0;
        const validKRs = keyResults.filter(
            (kr) => kr.target_value && Number(kr.target_value) > 0
        );
        if (validKRs.length === 0) return 0;
        const totalProgress = validKRs.reduce((sum, kr) => {
            const current = Number(kr.current_value) || 0;
            const target = Number(kr.target_value) || 0;
            const progress = target > 0 ? (current / target) * 100 : 0;
            return sum + Math.min(progress, 100);
        }, 0);
        return totalProgress / validKRs.length;
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative w-40">
                        <button
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <span className="flex items-center gap-2">
                                {cyclesList.find(
                                    (c) =>
                                        String(c.cycle_id) ===
                                        String(cycleFilter)
                                )?.cycle_name || "Chọn chu kỳ"}
                            </span>
                            <svg
                                className={`w-4 h-4 transition-transform ${
                                    dropdownOpen ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                                {cyclesList.map((cycle) => {
                                    const match =
                                        cycle.cycle_name.match(
                                            /Quý (\d+) năm (\d+)/
                                        );
                                    const quarter = match
                                        ? parseInt(match[1])
                                        : null;
                                    const year = match
                                        ? parseInt(match[2])
                                        : null;
                                    const now = new Date();
                                    const currentQuarter = Math.ceil(
                                        (now.getMonth() + 1) / 3
                                    );
                                    const currentYear = now.getFullYear();
                                    const isCurrent =
                                        quarter === currentQuarter &&
                                        year === currentYear;

                                    return (
                                        <label
                                            key={cycle.cycle_id}
                                            className={`flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                                                String(cycleFilter) ===
                                                String(cycle.cycle_id)
                                                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                    : isCurrent
                                                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="cycle"
                                                value={cycle.cycle_id}
                                                checked={
                                                    String(cycleFilter) ===
                                                    String(cycle.cycle_id)
                                                }
                                                onChange={(e) => {
                                                    setCycleFilter(
                                                        e.target.value
                                                    );
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                                    {cycle.cycle_name}
                                                    {isCurrent && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            Hiện tại
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex rounded-md border border-slate-300 overflow-hidden">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                !showArchived
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            Hoạt động
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                showArchived
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            Lưu trữ
                        </button>
                    </div>

                    <button
                        onClick={() => setCreatingObjective(true)}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                        + Thêm Objective
                    </button>
                </div>
            </div>

            {/* BẢNG OKR */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left w-[30%] border-r border-slate-200">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Phòng ban
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Trạng thái
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Đơn vị
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Thực tế
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Mục tiêu
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[10%]">
                                Tiến độ (%)
                            </th>
                            <th className="px-3 py-2 text-center w-[12%]">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Loading */}
                        {!showArchived && loading && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}

                        {/* Danh sách chính rỗng */}
                        {!showArchived && !loading && items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Bạn chưa tạo OKR nào.
                                </td>
                            </tr>
                        )}

                        {/* OKR Đang hoạt động */}
                        {!showArchived &&
                            !loading &&
                            items.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    <tr
                                        className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td colSpan={7} className="px-3 py-3 border-r border-slate-200">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-1">
                                                    {obj.key_results &&
                                                        obj.key_results.length >
                                                            0 && (
                                                            <button
                                                                onClick={() =>
                                                                    setOpenObj(
                                                                        (
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            [obj.objective_id]:
                                                                                !prev[
                                                                                    obj
                                                                                        .objective_id
                                                                                ],
                                                                        })
                                                                    )
                                                                }
                                                                className="p-2 rounded-lg hover:bg-slate-100 transition-all duration-200 group"
                                                                title="Đóng/mở Key Results"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                    className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform duration-200 ${
                                                                        openObj[
                                                                            obj
                                                                                .objective_id
                                                                        ]
                                                                            ? "rotate-90"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}

                                                    <span className="font-semibold text-slate-900 truncate">
                                                        {obj.obj_title}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() =>
                                                        setEditingObjective({
                                                            ...obj,
                                                            level:
                                                                obj.level ||
                                                                "team",
                                                        })
                                                    }
                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Sửa Objective"
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
                                                    onClick={() =>
                                                        setCreatingFor(obj)
                                                    }
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
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleArchive(
                                                            obj.objective_id
                                                        )
                                                    }
                                                    disabled={
                                                        archiving ===
                                                        obj.objective_id
                                                    }
                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                    title="Lưu trữ OKR"
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

                                    {/* Key Results */}
                                    {openObj[obj.objective_id] &&
                                        obj.key_results?.map((kr) => (
                                            <tr key={kr.kr_id}>
                                                <td className="px-8 py-3 border-r border-slate-200">
                                                    <span className="font-medium text-slate-900">
                                                        {kr.kr_title}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {departments.find(
                                                        (d) =>
                                                            String(
                                                                d.department_id
                                                            ) ===
                                                            String(
                                                                obj.department_id
                                                            )
                                                    )?.d_name || "-"}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                            (
                                                                kr.status || ""
                                                            ).toUpperCase() ===
                                                            "COMPLETED"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : (
                                                                      kr.status ||
                                                                      ""
                                                                  ).toUpperCase() ===
                                                                  "ACTIVE"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {getStatusText(
                                                            kr.status
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {getUnitText(kr.unit)}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.current_value ?? ""}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.target_value ?? ""}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {formatPercent(
                                                        kr.progress_percent
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {openCheckInModal &&
                                                            canCheckInKR(kr, obj) && (
                                                        <button
                                                            onClick={() =>
                                                                        handleOpenCheckIn(
                                                                kr,
                                                                obj
                                                                        )
                                                                    }
                                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                                    title="Check-in Key Result"
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
                                                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                                />
                                                                            </svg>
                                                                        </button>
                                                            )}
                                                        {openCheckInHistory && (
                                                                                <button
                                                                onClick={() =>
                                                                    handleOpenCheckInHistory(
                                                                                            kr,
                                                                                            obj
                                                                    )
                                                                }
                                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                                title="Lịch sử Check-in"
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
                                                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                                        />
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                            <button
                                                            onClick={() =>
                                                                setEditingKR(kr)
                                                            }
                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                            title="Sửa KR"
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
                                                            onClick={() =>
                                                                handleArchiveKR(
                                                                    kr.kr_id
                                                                )
                                                            }
                                                            disabled={
                                                                archivingKR ===
                                                                kr.kr_id
                                                            }
                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                            title="Lưu trữ KR"
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
                                        ))}
                                </React.Fragment>
                            ))}

                        {/* OKR Lưu trữ */}
                        {showArchived && loadingArchived && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}

                        {showArchived &&
                            !loadingArchived &&
                            archivedItems.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-3 py-5 text-center text-slate-500"
                                    >
                                        Không có OKR nào Lưu trữ.
                                    </td>
                                </tr>
                            )}

                        {showArchived && !loadingArchived && (
                            <>
                                {/* Case 1: Objective bị lưu trữ toàn bộ */}
                                {archivedItems
                                    .filter((obj) => obj.archived_at !== null)
                                    .map((obj, index) => (
                                        <React.Fragment key={obj.objective_id}>
                                            <tr
                                                className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                                    index > 0 ? "mt-4" : ""
                                                }`}
                                            >
                                                <td colSpan={7} className="px-3 py-3 border-r border-slate-200">
                                                    <div className="flex items-center">
                                                        <div className="flex items-center gap-1">
                                                            {obj.key_results?.some(
                                                                (kr) =>
                                                                    kr.archived_at
                                                            ) && (
                                                                <button
                                                                    onClick={() =>
                                                                        setOpenObj(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                [obj.objective_id]:
                                                                                    !prev[
                                                                                        obj
                                                                                            .objective_id
                                                                                    ],
                                                                            })
                                                                        )
                                                                    }
                                                                    className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-all duration-200 group"
                                                                    title="Đóng/mở Key Results đã lưu trữ"
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 20 20"
                                                                        fill="currentColor"
                                                                        className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-all duration-300 ${
                                                                            openObj[
                                                                                obj
                                                                                    .objective_id
                                                                            ] ??
                                                                            false
                                                                                ? "rotate-90"
                                                                                : "rotate-0"
                                                                        }`}
                                                                    >
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                            clipRule="evenodd"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            )}

                                                            <span className="font-semibold text-slate-900 truncate">
                                                                {obj.obj_title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center bg-gradient-to-r from-blue-50 to-indigo-50">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                handleUnarchive(
                                                                    obj.objective_id
                                                                )
                                                            }
                                                            disabled={
                                                                unarchiving ===
                                                                obj.objective_id
                                                            }
                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                            title="Bỏ lưu trữ"
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
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                                />
                                                            </svg>
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    obj.objective_id
                                                                )
                                                            }
                                                            disabled={
                                                                deleting ===
                                                                obj.objective_id
                                                            }
                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                            title="Xóa vĩnh viễn"
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
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Hiển thị KR lưu trữ của Objective đã lưu trữ */}
                                            {(openObj[obj.objective_id] ??
                                                false) &&
                                                obj.key_results
                                                    ?.filter(
                                                        (kr) => kr.archived_at
                                                    )
                                                    ?.map((kr) => (
                                                        <tr
                                                            key={kr.kr_id}
                                                            className="bg-gray-50"
                                                        >
                                                            <td className="px-8 py-2 italic text-gray-600">
                                                                {kr.kr_title}
                                                            </td>
                                                            <td
                                                                colSpan={6}
                                                            ></td>
                                                            <td className="text-center py-2">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleUnarchiveKR(
                                                                                kr.kr_id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            unarchivingKR ===
                                                                            kr.kr_id
                                                                        }
                                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 transition-colors relative"
                                                                        title="Bỏ lưu trữ Key Result"
                                                                    >
                                                                        {unarchivingKR ===
                                                                        kr.kr_id ? (
                                                                            <svg
                                                                                className="h-4 w-4 animate-spin"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <circle
                                                                                    cx="12"
                                                                                    cy="12"
                                                                                    r="10"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="4"
                                                                                    className="opacity-25"
                                                                                />
                                                                                <path
                                                                                    fill="currentColor"
                                                                                    d="M4 12a8 8 0 018-8v8z"
                                                                                    className="opacity-75"
                                                                                />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg
                                                                                className="h-4 w-4"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth={
                                                                                        2
                                                                                    }
                                                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteKR(
                                                                                kr.kr_id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            deletingKR ===
                                                                            kr.kr_id
                                                                        }
                                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 transition-colors relative"
                                                                        title="Xóa vĩnh viễn Key Result"
                                                                    >
                                                                        {deletingKR ===
                                                                        kr.kr_id ? (
                                                                            <svg
                                                                                className="h-4 w-4 animate-spin"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <circle
                                                                                    cx="12"
                                                                                    cy="12"
                                                                                    r="10"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="4"
                                                                                    className="opacity-25"
                                                                                />
                                                                                <path
                                                                                    fill="currentColor"
                                                                                    d="M4 12a8 8 0 018-8v8z"
                                                                                    className="opacity-75"
                                                                                />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg
                                                                                className="h-4 w-4"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth={
                                                                                        2
                                                                                    }
                                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                        </React.Fragment>
                                    ))}

                                {/* Case 2: Chỉ có KR lưu trữ (Objective KHÔNG lưu trữ) */}
                                {archivedItems
                                    .filter(
                                        (obj) =>
                                            obj.archived_at === null &&
                                            obj.key_results?.some(
                                                (kr) => kr.archived_at
                                            )
                                    )
                                    .map((obj, index) => {
                                        const archivedKRs =
                                            obj.key_results.filter(
                                                (kr) => kr.archived_at
                                            );
                                        const hasArchivedKRs =
                                            archivedKRs.length > 0;

                                        return (
                                            <React.Fragment
                                                key={`archived-kr-${obj.objective_id}`}
                                            >
                                                <tr
                                                    className={`bg-gradient-to-r from-yellow-50 to-orange-50 border-t-2 border-yellow-300 ${
                                                        index > 0 ? "mt-4" : ""
                                                    }`}
                                                >
                                                    <td colSpan={7} className="px-3 py-3 border-r border-slate-200">
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-1">
                                                                {hasArchivedKRs && (
                                                                    <button
                                                                        onClick={() =>
                                                                            setOpenObj(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [obj.objective_id]:
                                                                                        !(
                                                                                            prev[
                                                                                                obj
                                                                                                    .objective_id
                                                                                            ] ??
                                                                                            false
                                                                                        ),
                                                                                })
                                                                            )
                                                                        }
                                                                        className="flex-shrink-0 p-1 rounded-md hover:bg-orange-100 transition-all duration-200 group"
                                                                        title="Đóng/mở Key Results đã lưu trữ"
                                                                    >
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            viewBox="0 0 20 20"
                                                                            fill="currentColor"
                                                                            className={`w-3.5 h-3.5 text-orange-500 group-hover:text-orange-700 transition-all duration-300 ${
                                                                                openObj[
                                                                                    obj
                                                                                        .objective_id
                                                                                ] ??
                                                                                false
                                                                                    ? "rotate-90"
                                                                                    : "rotate-0"
                                                                            }`}
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                )}

                                                                <span className="font-semibold text-slate-900 truncate">
                                                                    {
                                                                        obj.obj_title
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td
                                                        className="text-center text-slate-400 py-3 bg-gradient-to-r from-yellow-50 to-orange-50"
                                                    >
                                                        Objective đang hoạt động
                                                        – {archivedKRs.length}{" "}
                                                        Key Result đã lưu trữ
                                                    </td>
                                                </tr>

                                                {openObj[obj.objective_id] &&
                                                    archivedKRs.map((kr) => (
                                                        <tr
                                                            key={kr.kr_id}
                                                            className="bg-gray-50"
                                                        >
                                                            <td className="px-8 py-2 italic text-gray-600">
                                                                {kr.kr_title}{" "}
                                                                <span className="text-orange-600 text-xs"></span>
                                                            </td>
                                                            <td
                                                                colSpan={6}
                                                            ></td>
                                                            <td className="text-center py-2">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleUnarchiveKR(
                                                                                kr.kr_id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            unarchivingKR ===
                                                                            kr.kr_id
                                                                        }
                                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 transition-colors relative"
                                                                        title="Bỏ lưu trữ Key Result"
                                                                    >
                                                                        {unarchivingKR ===
                                                                        kr.kr_id ? (
                                                                            <svg
                                                                                className="h-4 w-4 animate-spin"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <circle
                                                                                    cx="12"
                                                                                    cy="12"
                                                                                    r="10"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="4"
                                                                                    className="opacity-25"
                                                                                />
                                                                                <path
                                                                                    fill="currentColor"
                                                                                    d="M4 12a8 8 0 018-8v8z"
                                                                                    className="opacity-75"
                                                                                />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg
                                                                                className="h-4 w-4"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth={
                                                                                        2
                                                                                    }
                                                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteKR(
                                                                                kr.kr_id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            deletingKR ===
                                                                            kr.kr_id
                                                                        }
                                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 transition-colors relative"
                                                                        title="Xóa vĩnh viễn Key Result"
                                                                    >
                                                                        {deletingKR ===
                                                                        kr.kr_id ? (
                                                                            <svg
                                                                                className="h-4 w-4 animate-spin"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <circle
                                                                                    cx="12"
                                                                                    cy="12"
                                                                                    r="10"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="4"
                                                                                    className="opacity-25"
                                                                                />
                                                                                <path
                                                                                    fill="currentColor"
                                                                                    d="M4 12a8 8 0 018-8v8z"
                                                                                    className="opacity-75"
                                                                                />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg
                                                                                className="h-4 w-4"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth={
                                                                                        2
                                                                                    }
                                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </React.Fragment>
                                        );
                                    })}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* === MODAL XÁC NHẬN – ĐẶT CUỐI RETURN === */}
            {confirmModal.show && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {confirmModal.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-5">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeConfirm}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                            >
                                {confirmModal.cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    confirmModal.onConfirm();
                                    closeConfirm();
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 duration-300">
                    <div
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm transition-all ${
                            toast.type === "success"
                                ? "bg-emerald-600"
                                : "bg-red-600"
                        }`}
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {toast.type === "success" ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            )}
                        </svg>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
