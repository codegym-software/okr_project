import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";
import ConfirmationModal from "../components/ConfirmationModal";
import { FaBullseye, FaKey } from "react-icons/fa";
import { formatPercent, getStatusText } from "./okr/utils/formatters";

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

export default function ArchivedOkrsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleFilter, setCycleFilter] = useState(null);
    const [cyclesList, setCyclesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });
    const [processing, setProcessing] = useState({ type: "", id: null });
    const openConfirm = (title, message, onConfirm, confirmText = "OK") => {
        setConfirmModal({
            show: true,
            title,
            message,
            onConfirm,
            confirmText,
            cancelText: "Hủy",
        });
    };
    const closeConfirm = () =>
        setConfirmModal((prev) => ({ ...prev, show: false }));

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, cyclesRes] = await Promise.all([
                    fetch("/api/profile"),
                    fetch("/cycles", {
                        headers: { Accept: "application/json" },
                    }),
                ]);

                if (userRes.ok) {
                    const userJson = await userRes.json();
                    setCurrentUser(userJson.user);
                }

                if (cyclesRes.ok) {
                    const cyclesJson = await cyclesRes.json();
                    const cycles = cyclesJson.data || [];
                    setCyclesList(cycles);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let selectedCycle = cycles.find((c) => {
                        const start = c.start_date
                            ? new Date(c.start_date)
                            : null;
                        const end = c.end_date ? new Date(c.end_date) : null;
                        return start && end && today >= start && today <= end;
                    });
                    if (!selectedCycle && cycles.length > 0) {
                        selectedCycle = cycles[0];
                    }
                    setCycleFilter(selectedCycle?.cycle_id || null);
                }
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
                setToast({
                    type: "error",
                    message: "Không thể tải dữ liệu ban đầu.",
                });
            }
        };
        fetchInitialData();
    }, []);

    const fetchData = useCallback(async () => {
        if (cycleFilter === null) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                cycle_id: cycleFilter,
                archived: "1",
                include_archived_kr: "1",
            });

            const res = await fetch(`/my-objectives?${params}`, {
                headers: { Accept: "application/json" },
            });

            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setItems(json.data.data || []);
                } else {
                    throw new Error(
                        json.message || "Không thể tải OKR lưu trữ"
                    );
                }
            } else {
                throw new Error("Lỗi mạng khi tải OKR lưu trữ");
            }
        } catch (err) {
            setToast({ type: "error", message: err.message });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [cycleFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUnarchive = async (objectiveId) => {
        openConfirm(
            "Phục hồi Objective",
            "Mục tiêu này sẽ được chuyển lại vào danh sách OKR đang hoạt động.",
            async () => {
                setProcessing({ type: "unarchiving", id: objectiveId });
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(
                        `/my-objectives/${objectiveId}/unarchive`,
                        {
                            method: "POST",
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    );
                    const json = await res.json();
                    if (!res.ok || json.success === false)
                        throw new Error(json.message || "Lỗi không xác định");
                    setToast({
                        type: "success",
                        message: json.message || "Phục hồi thành công!",
                    });
                    await fetchData();
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setProcessing({ type: "", id: null });
                    closeConfirm();
                }
            },
            "Phục hồi"
        );
    };

    const handleDelete = async (objectiveId) => {
        openConfirm(
            "XÓA VĨNH VIỄN",
            "OKR sẽ bị xóa hoàn toàn, không thể khôi phục!",
            async () => {
                setProcessing({ type: "deleting", id: objectiveId });
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(`/my-objectives/${objectiveId}`, {
                        method: "DELETE",
                        headers: {
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        await fetchData();
                        setToast({ type: "success", message: json.message });
                    } else throw new Error(json.message);
                } catch (err) {
                    setToast({
                        type: "error",
                        message: err.message || "Có lỗi xảy ra",
                    });
                } finally {
                    setProcessing({ type: "", id: null });
                    closeConfirm();
                }
            },
            "Xóa vĩnh viễn"
        );
    };

    const handleUnarchiveKR = async (krId) => {
        openConfirm(
            "Phục hồi Key Result",
            "KR này sẽ được chuyển lại vào danh sách OKR đang hoạt động.",
            async () => {
                setProcessing({ type: "unarchivingKR", id: krId });
                const obj = items.find((o) =>
                    o.key_results?.some((kr) => kr.kr_id === krId)
                );
                if (!obj) {
                    setToast({
                        type: "error",
                        message: "Không tìm thấy Objective chứa KR này.",
                    });
                    closeConfirm();
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
                    if (!res.ok || json.success === false)
                        throw new Error(json.message || "Lỗi không xác định");
                    setToast({
                        type: "success",
                        message: json.message || "Phục hồi thành công!",
                    });
                    await fetchData();
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setProcessing({ type: "", id: null });
                    closeConfirm();
                }
            },
            "Phục hồi"
        );
    };

    const handleDeleteKR = async (krId) => {
        openConfirm(
            "XÓA VĨNH VIỄN",
            "Key Result sẽ bị xóa hoàn toàn, không thể khôi phục!",
            async () => {
                setProcessing({ type: "deletingKR", id: krId });
                const obj = items.find((o) =>
                    o.key_results?.some((kr) => kr.kr_id === krId)
                );
                if (!obj)
                    return setToast({
                        type: "error",
                        message: "Không tìm thấy OKR",
                    });

                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
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
                        await fetchData();
                        setToast({ type: "success", message: json.message });
                    } else throw new Error(json.message);
                } catch (err) {
                    setToast({
                        type: "error",
                        message: err.message || "Có lỗi xảy ra",
                    });
                } finally {
                    setProcessing({ type: "", id: null });
                    closeConfirm();
                }
            },
            "Xóa vĩnh viễn"
        );
    };

    const isProcessing = (type, id) =>
        processing.type === type && processing.id === id;

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            <h1 className="text-2xl font-bold mb-4">OKR Lưu trữ</h1>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <CycleDropdown
                        cyclesList={cyclesList}
                        cycleFilter={cycleFilter}
                        handleCycleChange={setCycleFilter}
                        dropdownOpen={dropdownOpen}
                        setDropdownOpen={setDropdownOpen}
                    />
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 table-fixed">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left">Tiêu đề</th>
                            <th
                                className="px-3 py-2 text-center"
                                style={{ width: "180px" }}
                            >
                                Người thực hiện
                            </th>
                            <th
                                className="px-3 py-2 text-center"
                                style={{ width: "150px" }}
                            ></th>
                            <th
                                className="px-3 py-2 text-center"
                                style={{ width: "150px" }}
                            >
                                Tiến độ (%)
                            </th>
                            <th
                                className="px-3 py-2 text-center"
                                style={{ width: "100px" }}
                            >
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan="4"
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải danh sách lưu trữ...
                                </td>
                            </tr>
                        )}

                        {!loading && (!items || items.length === 0) && (
                            <tr>
                                <td
                                    colSpan="4"
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Không có OKR nào trong kho lưu trữ.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            items.map((obj) => (
                                <React.Fragment
                                    key={`archived-obj-${obj.objective_id}`}
                                >
                                    <tr
                                        className={`transition-colors duration-150 ${
                                            obj.archived_at
                                                ? "bg-slate-200/30"
                                                : "bg-white"
                                        } hover:bg-slate-50/70`}
                                    >
                                        {/* Cột "Tiêu đề" (kéo dài 3 cột) */}
                                        <td colSpan={3} className="px-3 py-3">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
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
                                                                className="p-2 rounded-lg hover:bg-slate-100 transition-all group"
                                                            >
                                                                <svg
                                                                    className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform ${
                                                                        openObj[
                                                                            obj
                                                                                .objective_id
                                                                        ]
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
                                                                        strokeWidth={
                                                                            2
                                                                        }
                                                                        d="M9 5l7 7-7 7"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <FaBullseye
                                                        className={`h-5 w-5 flex-shrink-0 ${
                                                            obj.archived_at
                                                                ? "text-slate-500"
                                                                : "text-indigo-600"
                                                        }`}
                                                        title="Objective"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span
                                                            className={`font-semibold truncate ${
                                                                obj.archived_at
                                                                    ? "text-slate-600 italic"
                                                                    : "text-slate-900"
                                                            }`}
                                                        >
                                                            {obj.obj_title}
                                                        </span>
                                                        {obj.archived_at && (
                                                            <span className="text-slate-500 text-xs italic">
                                                                Lưu trữ ngày:{" "}
                                                                {formatDate(
                                                                    obj.archived_at
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {obj.archived_at && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                handleUnarchive(
                                                                    obj.objective_id
                                                                )
                                                            }
                                                            disabled={isProcessing(
                                                                "unarchiving",
                                                                obj.objective_id
                                                            )}
                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                            title="Phục hồi Objective"
                                                        >
                                                            {isProcessing(
                                                                "unarchiving",
                                                                obj.objective_id
                                                            ) ? (
                                                                "..."
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
                                                                handleDelete(
                                                                    obj.objective_id
                                                                )
                                                            }
                                                            disabled={isProcessing(
                                                                "deleting",
                                                                obj.objective_id
                                                            )}
                                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-40"
                                                            title="Xóa vĩnh viễn"
                                                        >
                                                            {isProcessing(
                                                                "deleting",
                                                                obj.objective_id
                                                            ) ? (
                                                                "..."
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
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {openObj[obj.objective_id] &&
                                        obj.key_results
                                            ?.filter((kr) => kr.archived_at)
                                            .map((kr) => (
                                                <tr
                                                    key={`archived-kr-${kr.kr_id}`}
                                                    className="bg-white hover:bg-slate-50/70 transition-colors duration-150"
                                                >
                                                    {/* Cột Tiêu đề KR */}
                                                    <td className="px-8 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 flex-shrink-0"></div>
                                                            <FaKey
                                                                className="h-4 w-4 text-slate-500 flex-shrink-0"
                                                                title="Key Result"
                                                            />
                                                            <span className="font-medium text-slate-600 italic">
                                                                {kr.kr_title}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* Cột Người thực hiện */}
                                                    <td className="px-3 py-3 text-center text-sm text-slate-500">
                                                        {kr.assigned_user
                                                            ?.name || ""}
                                                    </td>
                                                    {/* Cột Tiến độ */}
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-full bg-gray-300 rounded-full h-4 relative overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full absolute left-0 bg-slate-500"
                                                                    style={{
                                                                        width: `${kr.progress_percent}%`,
                                                                    }}
                                                                ></div>
                                                                {kr.progress_percent >
                                                                    0 && (
                                                                    <span className="absolute left-1 text-white text-xs font-semibold z-10">
                                                                        {formatPercent(
                                                                            kr.progress_percent
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="inline-flex items-center rounded-md px-0 py-0 text-[9px] font-semibold text-slate-500 mt-1">
                                                                {getStatusText(
                                                                    kr.status
                                                                )}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                            <span className="text-slate-500 text-xs italic">
                                                                Lưu trữ:{" "}
                                                                {formatDate(
                                                                    kr.archived_at
                                                                )}
                                                            </span>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <button
                                                                    onClick={() =>
                                                                        handleUnarchiveKR(
                                                                            kr.kr_id
                                                                        )
                                                                    }
                                                                    disabled={isProcessing(
                                                                        "unarchivingKR",
                                                                        kr.kr_id
                                                                    )}
                                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                                    title="Phục hồi Key Result"
                                                                >
                                                                    {isProcessing(
                                                                        "unarchivingKR",
                                                                        kr.kr_id
                                                                    ) ? (
                                                                        "..."
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
                                                                    disabled={isProcessing(
                                                                        "deletingKR",
                                                                        kr.kr_id
                                                                    )}
                                                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-40"
                                                                    title="Xóa vĩnh viễn"
                                                                >
                                                                    {isProcessing(
                                                                        "deletingKR",
                                                                        kr.kr_id
                                                                    ) ? (
                                                                        "..."
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
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                </React.Fragment>
                            ))}
                    </tbody>
                </table>
            </div>

            <ToastNotification toast={toast} onClose={() => setToast(null)} />
            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={closeConfirm}
            />
        </div>
    );
}
