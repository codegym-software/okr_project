// components/objective-list/ArchivedTabContent.jsx
import React, { useState, useEffect } from "react";
import ToastNotification from "../components/ToastNotification"; // giữ nguyên đường dẫn hiện tại của bạn
import ConfirmationModal from "../components/ConfirmationModal"; // giữ nguyên

export default function ObjectiveArchive({
    archivedItems,
    openObj,
    setOpenObj,
    loadingArchived,
    showArchived,
    reloadBothTabs, // nhận từ parent để reload sau khi thành công
}) {
    // === STATE RIÊNG CHO TAB LƯU TRỮ ===
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });
    const [processing, setProcessing] = useState({ type: "", id: null }); // unarchiving | deleting | unarchivingKR | deletingKR

    // Auto hide toast
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

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

    // === HÀM XỬ LÝ RIÊNG CHO TAB NÀY ===
    const handleUnarchive = async (objectiveId) => {
        openConfirm(
            "Bỏ lưu trữ OKR",
            "OKR sẽ được khôi phục vào danh sách hoạt động.",
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
                    if (json.success) {
                        await reloadBothTabs(token);
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
            "Bỏ lưu trữ"
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
                        await reloadBothTabs(token);
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
            "Bỏ lưu trữ Key Result",
            "Key Result sẽ quay lại danh sách hoạt động.",
            async () => {
                setProcessing({ type: "unarchivingKR", id: krId });
                const obj = archivedItems.find((o) =>
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
                    if (json.success) {
                        await reloadBothTabs(token);
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
            "Bỏ lưu trữ"
        );
    };

    const handleDeleteKR = async (krId) => {
        openConfirm(
            "XÓA VĨNH VIỄN",
            "Key Result sẽ bị xóa hoàn toàn, không thể khôi phục!",
            async () => {
                setProcessing({ type: "deletingKR", id: krId });
                const obj = archivedItems.find((o) =>
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
                        await reloadBothTabs(token);
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

    // Kiểm tra trạng thái đang xử lý
    const isProcessing = (type, id) =>
        processing.type === type && processing.id === id;

    return (
        <>
            {/* ===== NỘI DUNG HIỂN THỊ (giữ nguyên 100% form cũ của bạn) ===== */}
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

            {showArchived && !loadingArchived && archivedItems.length === 0 && (
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
                    {/* Case 1: Objective bị lưu trữ hoàn toàn */}
                    {archivedItems
                        .filter((obj) => obj.archived_at !== null)
                        .map((obj, index) => (
                            <React.Fragment key={obj.objective_id}>
                                <tr
                                    className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                        index > 0 ? "mt-4" : ""
                                    }`}
                                >
                                    <td
                                        colSpan={7}
                                        className="px-3 py-3 border-r border-slate-200"
                                    >
                                        <div className="flex items-center gap-1">
                                            {obj.key_results?.some(
                                                (kr) => kr.archived_at
                                            ) && (
                                                <button
                                                    onClick={() =>
                                                        setOpenObj((prev) => ({
                                                            ...prev,
                                                            [obj.objective_id]:
                                                                !prev[
                                                                    obj
                                                                        .objective_id
                                                                ],
                                                        }))
                                                    }
                                                    className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-all duration-200 group"
                                                >
                                                    <svg
                                                        className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-all duration-300 ${
                                                            openObj[
                                                                obj.objective_id
                                                            ] ?? false
                                                                ? "rotate-90"
                                                                : ""
                                                        }`}
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                        />
                                                    </svg>
                                                </button>
                                            )}
                                            <span className="font-semibold text-slate-900 truncate">
                                                {obj.obj_title}
                                            </span>
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
                                                disabled={isProcessing(
                                                    "unarchiving",
                                                    obj.objective_id
                                                )}
                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                title="Bỏ lưu trữ"
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
                                                            strokeWidth={2}
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
                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
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
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* KR của Objective đã lưu trữ */}
                                {(openObj[obj.objective_id] ?? false) &&
                                    obj.key_results
                                        ?.filter((kr) => kr.archived_at)
                                        .map((kr) => (
                                            <tr
                                                key={kr.kr_id}
                                                className="bg-gray-50"
                                            >
                                                <td className="px-8 py-2 italic text-gray-600">
                                                    {kr.kr_title}
                                                </td>
                                                <td colSpan={6}></td>
                                                <td className="text-center py-2">
                                                    <div className="flex justify-center gap-2">
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
                                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
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
                                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
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
                                                </td>
                                            </tr>
                                        ))}
                            </React.Fragment>
                        ))}

                    {/* Case 2: Chỉ KR bị lưu trữ */}
                    {archivedItems
                        .filter(
                            (obj) =>
                                obj.archived_at === null &&
                                obj.key_results?.some((kr) => kr.archived_at)
                        )
                        .map((obj, index) => {
                            const archivedKRs = obj.key_results.filter(
                                (kr) => kr.archived_at
                            );
                            return (
                                <React.Fragment
                                    key={`archived-kr-${obj.objective_id}`}
                                >
                                    <tr
                                        className={`bg-gradient-to-r from-yellow-50 to-orange-50 border-t-2 border-yellow-300 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td
                                            colSpan={7}
                                            className="px-3 py-3 border-r border-slate-200"
                                        >
                                            <div className="flex items-center gap-1">
                                                {archivedKRs.length > 0 && (
                                                    <button
                                                        onClick={() =>
                                                            setOpenObj(
                                                                (prev) => ({
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
                                                    >
                                                        <svg
                                                            className={`w-3.5 h-3.5 text-orange-500 group-hover:text-orange-700 transition-all duration-300 ${
                                                                openObj[
                                                                    obj
                                                                        .objective_id
                                                                ] ?? false
                                                                    ? "rotate-90"
                                                                    : ""
                                                            }`}
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                                <span className="font-semibold text-slate-900 truncate">
                                                    {obj.obj_title}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>

                                    {openObj[obj.objective_id] &&
                                        archivedKRs.map((kr) => (
                                            <tr
                                                key={kr.kr_id}
                                                className="bg-gray-50"
                                            >
                                                <td className="px-8 py-2 italic text-gray-600">
                                                    {kr.kr_title}
                                                </td>
                                                <td colSpan={6}></td>
                                                <td className="text-center py-2">
                                                    <div className="flex justify-center gap-2">
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
                                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
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
                                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
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
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1- 1h-4a1 1 0 00-1 1v3M4 7h16"
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

            {/* Toast & Confirm Modal chỉ dùng cho tab này */}
            <ToastNotification toast={toast} />
            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={closeConfirm}
            />
        </>
    );
}
