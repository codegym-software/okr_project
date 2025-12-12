import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { CycleDropdown, ViewModeDropdown } from "../components/Dropdown";
import Tabs from "../components/Tabs";
import ConfirmationModal from "../components/ConfirmationModal";
import ToastNotification from "../components/ToastNotification";
import AssignKeyResultModal from "../components/AssignKeyResultModal";
import ObjectiveRow from "./okr/ObjectiveRow";
import AssigneeTooltip from "./okr/AssigneeTooltip";
import { canCheckInKeyResult } from "../utils/checkinPermissions";
import {
    formatPercent,
    getStatusText,
    getUnitText,
    getAssigneeInfo,
} from "./okr/utils/formatters";
import { mergeChildLinksIntoObjectives } from "../utils/okrHierarchy";

export default function ObjectiveList({
    items,
    cyclesList,
    loading,
    openObj,
    setOpenObj,
    setCreatingFor,
    setEditingObjective,
    setEditingKR,
    setCreatingObjective,
    links,
    childLinks = [],
    linksLoading = false,
    cycleFilter,
    setCycleFilter,
    departmentFilter,
    setDepartmentFilter,
    viewMode,
    setViewMode,
    userDepartmentName,
    openCheckInModal,
    openCheckInHistory,
    currentUser,
    setItems,
    onOpenLinkModal,
    onCancelLink,
    hideFilters = false,
    disableActions = false,
    departments = [],
}) {
    const [toast, setToast] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [viewModeDropdownOpen, setViewModeDropdownOpen] = useState(false);
    const [assignModal, setAssignModal] = useState({
        show: false,
        kr: null,
        objective: null,
        loading: false,
    });
    const [assigneeTooltip, setAssigneeTooltip] = useState(null);
    const [archiving, setArchiving] = useState(null);
    const [archivingKR, setArchivingKR] = useState(null);

    const role = currentUser?.role?.role_name?.toLowerCase();
    const isCeo = role === 'ceo';

    const openAssignModal = (kr, objective) => {
        setAssignModal({
            show: true,
            kr,
            objective,
            loading: false,
        });
    };

    const closeAssignModal = () => {
        setAssignModal((prev) => ({ ...prev, show: false }));
    };

    const handleAssignKR = async (userId) => {
        const { kr, objective } = assignModal;

        if (!userId) {
            setToast({ type: "error", message: "Vui lòng chọn người nhận." });
            return;
        }

        setAssignModal((prev) => ({ ...prev, loading: true }));

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");

            if (!token) {
                throw new Error("Không tìm thấy CSRF token");
            }

            const res = await fetch(
                `/my-key-results/${objective.objective_id}/${kr.kr_id}/assign`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ user_id: userId }),
                }
            );

            let json;
            try {
                json = await res.json();
            } catch (parseErr) {
                throw new Error("Phản hồi từ server không hợp lệ");
            }

            if (!res.ok || !json.success) {
                throw new Error(
                    json.message || `Lỗi ${res.status}: Giao việc thất bại`
                );
            }

            const updatedObjective = json.data.objective;
            if (updatedObjective) {
                setItems(prevItems => 
                    prevItems.map(item => 
                        item.objective_id === updatedObjective.objective_id ? updatedObjective : item
                    )
                );
            }

            setToast({
                type: "success",
                message: json.message || "Giao việc thành công!",
            });
            closeAssignModal();
        } catch (err) {
            console.error("Assign KR error:", err);
            setToast({
                type: "error",
                message: err.message || "Đã có lỗi xảy ra",
            });
        } finally {
            setAssignModal((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleAssigneeHover = (event, info) => {
        if (!info) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setAssigneeTooltip({
            info,
            position: {
                x: rect.left + rect.width / 2 + window.scrollX,
                y: rect.top + window.scrollY,
            },
        });
    };

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


    const menuRefs = useRef({});

    // === LINK LOOKUP & VIRTUAL ITEMS ===
    const linkLookup = useMemo(() => {
        if (!links || !Array.isArray(links)) {
            return { byObjective: {}, byKeyResult: {} };
        }
        const byObjective = {};
        const byKeyResult = {};

        links.forEach((link) => {
            const sourceObjId =
                link.sourceObjective?.objective_id ||
                link.source_objective?.objective_id;
            const targetObjId =
                link.targetObjective?.objective_id ||
                link.target_objective?.objective_id;
            const sourceKrId =
                link.sourceKr?.key_result_id || link.source_kr?.key_result_id;
            const targetKrId =
                link.targetKr?.key_result_id || link.target_kr?.key_result_id;

            if (sourceObjId) {
                if (!byObjective[sourceObjId]) byObjective[sourceObjId] = [];
                byObjective[sourceObjId].push(link);
            }
            if (targetObjId) {
                if (!byObjective[targetObjId]) byObjective[targetObjId] = [];
                byObjective[targetObjId].push(link);
            }
            if (sourceKrId) {
                if (!byKeyResult[sourceKrId]) byKeyResult[sourceKrId] = [];
                byKeyResult[sourceKrId].push(link);
            }
            if (targetKrId) {
                if (!byKeyResult[targetKrId]) byKeyResult[targetKrId] = [];
                byKeyResult[targetKrId].push(link);
            }
        });

        return { byObjective, byKeyResult };
    }, [links]);

    const itemsWithLinkedChildren = useMemo(
        () => mergeChildLinksIntoObjectives(items, childLinks),
        [items, childLinks]
    );

    // === RELOAD OBJECTIVES FROM SERVER ===
    const reloadObjectives = useCallback(
        async (token) => {
            const baseParams = new URLSearchParams();
            if (cycleFilter) baseParams.append("cycle_id", cycleFilter);
            if (departmentFilter) baseParams.append("department_id", departmentFilter);

            // Fetch Active Objectives
            const activeRes = await fetch(`/my-objectives?${baseParams}`, {
                headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
            });
            const activeJson = await activeRes.json();
            if (activeJson.success) {
                setItems(activeJson.data.data || []);
            }
        },
        [cycleFilter, departmentFilter, setItems]
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
                        await reloadObjectives(token);
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

    // === LƯU TRỮ KR ===
    const handleArchiveKR = async (krId, objectiveId) => {
        if (!objectiveId) {
            setToast({ type: "error", message: "Không thể xác định OKR cha." });
            return;
        }
        openConfirm(
            "Lưu trữ Key Result",
            "Key Result sẽ được chuyển vào tab Lưu trữ.",
            async () => {
                setArchivingKR(krId);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");

                    const res = await fetch(
                        `/my-key-results/${objectiveId}/${krId}/archive`,
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

                    await reloadObjectives(token);
                    setToast({ type: "success", message: json.message });
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setArchivingKR(null);
                }
            },
            "Lưu trữ"
        );
    };

    // === CLICK OUTSIDE TO CLOSE MENUS ===
    useEffect(() => {
        /* giữ nguyên logic */
    }, [openObj, setOpenObj]);

    // === CYCLE AUTO SELECT ===
    useEffect(() => {
        /* giữ nguyên 3 effect chọn cycle */
    }, [cycleFilter, cyclesList, items]);

    // === TẢI OKR LƯU TRỮ ===

    // useEffect for archived items removed.


    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Conditional rendering for the entire filter bar */}
            {!hideFilters && (
            <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-600 leading-none">
                                Chu kỳ OKR
                            </span>
                    <CycleDropdown
                        cyclesList={cyclesList}
                        cycleFilter={cycleFilter}
                        handleCycleChange={setCycleFilter}
                        dropdownOpen={dropdownOpen}
                        setDropdownOpen={setDropdownOpen}
                    />
                </div>
                        {role !== 'ceo' && role !== 'admin' && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-600 leading-none">
                                    Phạm vi OKR
                                </span>
                                <ViewModeDropdown
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    dropdownOpen={viewModeDropdownOpen}
                                    setDropdownOpen={setViewModeDropdownOpen}
                                    currentUser={currentUser}
                                    userDepartmentName={userDepartmentName}
                                    setDepartmentFilter={setDepartmentFilter}
                                />
                            </div>
                        )}
                    </div>
                <Tabs
                    setCreatingObjective={setCreatingObjective}
                />
            </div>
            )}


            {linksLoading && (
                <div className="mb-3 flex items-center gap-2 text-xs text-indigo-600">
                    <span className="h-2 w-2 animate-ping rounded-full bg-indigo-500"></span>
                    <span>Đang cập nhật trạng thái liên kết...</span>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 text-center" style={{width: '180px'}}>
                                Người sở hữu
                            </th>
                            <th className="px-3 py-2 text-center" style={{width: '150px'}}>
                                Tiến độ (%)
                            </th>
                            <th className="px-3 py-2 text-center" style={{width: '100px'}}>
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {/* Loading & Empty States */}
                        {loading && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading && items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Bạn chưa tạo OKR nào.
                                </td>
                            </tr>
                        )}

                        {/* Active OKRs */}

 

                        {!loading &&
                            itemsWithLinkedChildren.map((obj, index) => (

                                <ObjectiveRow
                                    key={obj.objective_id}
                                    obj={obj}
                                    openObj={openObj}
                                    setOpenObj={setOpenObj}
                                    linkBadge={
                                        linkLookup.byObjective[obj.objective_id]
                                    }
                                    setEditingObjective={setEditingObjective}
                                    setEditingKR={setEditingKR}
                                    setCreatingFor={setCreatingFor}
                                    onOpenLinkModal={onOpenLinkModal}
                                    handleArchive={handleArchive}
                                    handleArchiveKR={(krId) => handleArchiveKR(krId, obj.objective_id)}
                                    archiving={archiving}
                                    currentUser={currentUser}
                                    openCheckInModal={openCheckInModal}
                                    openCheckInHistory={openCheckInHistory}
                                    onCancelLink={onCancelLink}
                                    setAssignModal={setAssignModal}
                                    setAssigneeTooltip={setAssigneeTooltip}
                                    menuRefs={menuRefs}
                                    canCheckInKR={(kr) =>
                                        canCheckInKeyResult(
                                            currentUser,
                                                                kr,
                                                                obj
                                        )
                                    }
                                    formatPercent={formatPercent}
                                    getStatusText={getStatusText}
                                    getUnitText={getUnitText}
                                    getAssigneeInfo={getAssigneeInfo}
                                    // The ObjectiveRow itself will now handle its colSpan based on props
                                    disableActions={disableActions}
                                />

                            ))}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={() =>
                    setConfirmModal((prev) => ({ ...prev, show: false }))
                }
            />
            <ToastNotification toast={toast} onClose={() => setToast(null)} />
            <AssignKeyResultModal
                show={assignModal.show}
                kr={assignModal.kr}
                objective={assignModal.objective}
                loading={assignModal.loading}
                onConfirm={handleAssignKR}
                onClose={closeAssignModal}
                currentUserRole={currentUser?.role}
                currentUser={currentUser}
                departments={departments}
            />
            {assigneeTooltip && assigneeTooltip.info && (
                <div
                    className="pointer-events-none fixed z-[2000]"
                    style={{
                        left: assigneeTooltip.position.x,
                        top: assigneeTooltip.position.y - 12,
                    }}
                >
                    <div className="relative -translate-x-1/2 -translate-y-full rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-slate-100">
                        <div className="flex items-start gap-3">
                            {assigneeTooltip.info.avatar ? (
                                <img
                                    src={assigneeTooltip.info.avatar}
                                    alt={assigneeTooltip.info.name}
                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-700">
                                    {assigneeTooltip.info.name?.trim()?.charAt(0)?.toUpperCase() ||
                                        "?"}
                                </div>
                            )}
                            <div className="min-w-[180px] max-w-[240px]">
                                <p className="text-base font-semibold text-slate-900">
                                    {assigneeTooltip.info.name || "Không rõ tên"}
                                </p>
                                {assigneeTooltip.info.role !== 'admin' && assigneeTooltip.info.role !== 'ceo' && (
                                    <p className="text-sm text-slate-500">
                                        {assigneeTooltip.info.department || "Phòng ban: Chưa xác định"}
                                    </p>
                                )}
                                {assigneeTooltip.info.email && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        {assigneeTooltip.info.email}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-[1px_1px_2px_rgba(15,23,42,.15)]"></div>
                    </div>
                </div>
            )}
        </div>
    );
}
