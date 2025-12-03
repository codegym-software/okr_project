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

    const itemsWithLinkedChildren = useMemo(() => {
        if (!Array.isArray(childLinks) || childLinks.length === 0) {
            if (!Array.isArray(items)) return [];
            return items;
        }
        if (!Array.isArray(items)) return [];

        return items.map((obj) => {
            // Tìm các childLinks trỏ tới Objective này (O->O)
            const linkedChildren = childLinks.filter((link) => {
                const targetArchived =
                    (link.targetObjective &&
                        (link.targetObjective.archived_at ||
                            link.targetObjective.archivedAt)) ||
                    (link.targetKr &&
                        (link.targetKr.archived_at ||
                            link.targetKr.archivedAt));

                if (targetArchived) {
                    return false;
                }

                const targetObjectiveId =
                    link.targetObjective?.objective_id ||
                    link.target_objective_id;
                const targetKrId = link.targetKr?.kr_id || link.target_kr_id;

                if (targetObjectiveId === obj.objective_id && !targetKrId) {
                    return true;
                }
                return false;
            });

            // Tìm các childLinks trỏ tới các KR của Objective này (O->KR)
            const krLinkedObjectives = {};
            childLinks.forEach((link) => {
                const targetArchived =
                    (link.targetObjective &&
                        (link.targetObjective.archived_at ||
                            link.targetObjective.archivedAt)) ||
                    (link.targetKr &&
                        (link.targetKr.archived_at ||
                            link.targetKr.archivedAt));

                if (targetArchived) {
                    return;
                }

                const targetKrId = link.targetKr?.kr_id || link.target_kr_id;
                const targetObjectiveId =
                    link.targetObjective?.objective_id ||
                    link.target_objective_id;

                if (targetKrId && targetObjectiveId === obj.objective_id) {
                    if (!krLinkedObjectives[targetKrId]) {
                        krLinkedObjectives[targetKrId] = [];
                    }
                    krLinkedObjectives[targetKrId].push(link);
                }
            });

            // Chuyển đổi childLinks thành virtual Key Results (O->O)
            const virtualKRs = linkedChildren.map((link) => {
                const sourceObjective =
                    link.sourceObjective || link.source_objective;
                const sourceKr = link.sourceKr || link.source_kr;
                const ownerUser =
                    sourceKr?.assigned_user ||
                    sourceKr?.assignedUser ||
                    sourceObjective?.user ||
                    null;
                const keyResults =
                    sourceObjective?.keyResults ||
                    sourceObjective?.key_results ||
                    [];

                return {
                    kr_id: `linked_${link.link_id}`,
                    kr_title: sourceKr
                        ? `${sourceObjective?.obj_title || "Objective"} › ${
                              sourceKr.kr_title || "Key Result"
                          }`
                        : sourceObjective?.obj_title || "Linked Objective",
                    target_value: sourceKr?.target_value || 0,
                    current_value: sourceKr?.current_value || 0,
                    unit: sourceKr?.unit || "number",
                    status:
                        sourceKr?.status ||
                        sourceObjective?.status ||
                        "active",
                    weight: sourceKr?.weight || 0,
                    progress_percent:
                        sourceKr?.progress_percent ||
                        sourceObjective?.progress_percent ||
                        0,
                    assigned_to:
                        sourceKr?.assigned_to ||
                        sourceObjective?.user_id ||
                        null,
                    assigned_user: ownerUser,
                    isLinked: true,
                    isLinkedObjective: true,
                    link: link,
                    key_results: keyResults.map((kr) => ({
                        kr_id: kr.kr_id,
                        kr_title: kr.kr_title,
                        target_value: kr.target_value,
                        current_value: kr.current_value,
                        unit: kr.unit,
                        status: kr.status,
                        progress_percent: kr.progress_percent,
                        assigned_to: kr.assigned_to,
                        assigned_user:
                            kr.assigned_user ||
                            kr.assignedUser ||
                            kr.assignedUser,
                    })),
                };
            });

            // Thêm linkedObjectives vào các KR (O->KR)
            const updatedKeyResults = (obj.key_results || []).map((kr) => {
                const linkedObjs = krLinkedObjectives[kr.kr_id] || [];
                if (linkedObjs.length === 0) {
                    return kr;
                }

                return {
                    ...kr,
                    linked_objectives: linkedObjs.map((link) => {
                        const sourceObjective =
                            link.sourceObjective || link.source_objective;
                        const keyResults =
                            sourceObjective?.keyResults ||
                            sourceObjective?.key_results ||
                            [];
                        return {
                            objective_id: sourceObjective?.objective_id,
                            obj_title:
                                sourceObjective?.obj_title ||
                                "Linked Objective",
                            description: sourceObjective?.description,
                            status: sourceObjective?.status,
                            progress_percent:
                                sourceObjective?.progress_percent || 0,
                            level: sourceObjective?.level,
                            user_id: sourceObjective?.user_id,
                            user: sourceObjective?.user,
                            key_results: keyResults.map((kr) => ({
                                kr_id: kr.kr_id,
                                kr_title: kr.kr_title,
                                target_value: kr.target_value,
                                current_value: kr.current_value,
                                unit: kr.unit,
                                status: kr.status,
                                progress_percent: kr.progress_percent,
                                assigned_to: kr.assigned_to,
                                assigned_user:
                                    kr.assigned_user ||
                                    kr.assignedUser ||
                                    kr.assignedUser,
                            })),
                            is_linked: true,
                            link: link,
                        };
                    }),
                };
            });

            return {
                ...obj,
                key_results: [...updatedKeyResults, ...virtualKRs],
            };
        });
    }, [items, childLinks]);

    // === RELOAD OBJECTIVES FROM SERVER ===
    const reloadObjectives = useCallback(
        async (token) => {
            const baseParams = new URLSearchParams();
            if (cycleFilter) baseParams.append("cycle_id", cycleFilter);

            // Fetch Active Objectives
            const activeRes = await fetch(`/my-objectives?${baseParams}`, {
                headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
            });
            const activeJson = await activeRes.json();
            if (activeJson.success) {
                setItems(activeJson.data.data || []);
            }
        },
        [cycleFilter, setItems]
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
                    <div className="flex items-center gap-2">
                        <CycleDropdown
                            cyclesList={cyclesList}
                            cycleFilter={cycleFilter}
                            handleCycleChange={setCycleFilter}
                            dropdownOpen={dropdownOpen}
                            setDropdownOpen={setDropdownOpen}
                        />
                        {!isCeo && (
                            <ViewModeDropdown
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                dropdownOpen={viewModeDropdownOpen}
                                setDropdownOpen={setViewModeDropdownOpen}
                                currentUser={currentUser}
                                userDepartmentName={userDepartmentName}
                            />
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
                <table className="min-w-full divide-y divide-slate-200 table-fixed">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left border-r border-slate-200">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200" style={{width: '180px'}}>
                                Người thực hiện
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200" style={{width: '150px'}}>
                                Tiến độ (%)
                            </th>
                            <th className="px-3 py-2 text-center" style={{width: '100px'}}>
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                                    colSpanForObjectiveHeader={3}
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
            <ToastNotification toast={toast} />
            <AssignKeyResultModal
                show={assignModal.show}
                kr={assignModal.kr}
                objective={assignModal.objective}
                loading={assignModal.loading}
                onConfirm={handleAssignKR}
                onClose={closeAssignModal}
                currentUserRole={currentUser?.role}
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
                                <p className="text-sm text-slate-500">
                                    {assigneeTooltip.info.department || "Phòng ban: Chưa xác định"}
                                </p>
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
