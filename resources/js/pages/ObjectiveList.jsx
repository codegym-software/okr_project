// src/components/okr/ObjectiveList.jsx
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { CycleDropdown } from "../components/Dropdown";
import Tabs from "../components/Tabs";
import ConfirmationModal from "../components/ConfirmationModal";
import ToastNotification from "../components/ToastNotification";
import AssignKeyResultModal from "../components/AssignKeyResultModal";
import ObjectiveArchive from "./ObjectiveArchive";
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
    openCheckInModal,
    openCheckInHistory,
    currentUser,
    setItems,
    onOpenLinkModal,
    onCancelLink,
    handleAssignKR,
    handleArchive,
    handleArchiveKR,
}) {
    const [toast, setToast] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedItems, setArchivedItems] = useState([]);
    const [loadingArchived, setLoadingArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [assignModal, setAssignModal] = useState({
        show: false,
        kr: null,
        objective: null,
        email: "",
        loading: false,
    });
    const [assigneeTooltip, setAssigneeTooltip] = useState(null);
    const [archiving, setArchiving] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        cancelText: "Hủy",
        confirmText: "Xác nhận",
        onConfirm: () => {},
    });

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

    // === RELOAD BOTH TABS ===
    const reloadBothTabs = useCallback(async () => {
        setLoading(true);
        setLoadingArchived(true);

        const fetchActive = fetch(
            `/my-objectives?cycle_id=${cycleFilter || ""}`
        )
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setItems(json.data.data);
                }
            });

        const fetchArchived = fetch(
            `/my-objectives?cycle_id=${cycleFilter || ""}&archived=1`
        )
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setArchivedItems(json.data.data);
                }
            });

        await Promise.all([fetchActive, fetchArchived]);

        setLoading(false);
        setLoadingArchived(false);
    }, [cycleFilter]);

    // === CLICK OUTSIDE TO CLOSE MENUS ===
    useEffect(() => {
        /* giữ nguyên logic */
    }, [openObj, setOpenObj]);

    // === CYCLE AUTO SELECT ===
    useEffect(() => {
        /* giữ nguyên 3 effect chọn cycle */
    }, [cycleFilter, cyclesList, items]);

    // === LOAD ARCHIVED ===
    useEffect(() => {
        if (showArchived) {
            const loadArchived = async () => {
                setLoadingArchived(true);
                try {
                    const response = await fetch(
                        `/my-objectives?cycle_id=${
                            cycleFilter || ""
                        }&archived=1`
                    );
                    const json = await response.json();
                    if (json.success) {
                        setArchivedItems(json.data.data || []);
                    }
                } catch (error) {
                    console.error("Failed to load archived items:", error);
                    setArchivedItems([]);
                } finally {
                    setLoadingArchived(false);
                }
            };
            loadArchived();
        }
    }, [showArchived, cycleFilter]);

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex w-full items-center justify-between">
                <CycleDropdown
                    cyclesList={cyclesList}
                    cycleFilter={cycleFilter}
                    handleCycleChange={setCycleFilter}
                    dropdownOpen={dropdownOpen}
                    setDropdownOpen={setDropdownOpen}
                />
                <Tabs
                    showArchived={showArchived}
                    setShowArchived={setShowArchived}
                    setCreatingObjective={setCreatingObjective}
                />
            </div>

            {linksLoading && (
                <div className="mb-3 flex items-center gap-2 text-xs text-indigo-600">
                    <span className="h-2 w-2 animate-ping rounded-full bg-indigo-500"></span>
                    <span>Đang cập nhật trạng thái liên kết...</span>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left w-[30%] border-r border-slate-200">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 text-center border-r border-slate-200 w-[12%]">
                                Người thực hiện
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
                        {/* Loading & Empty States */}
                        {!showArchived && loading && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!showArchived && !loading && items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Bạn chưa tạo OKR nào.
                                </td>
                            </tr>
                        )}

                        {/* Active OKRs */}
                        {!showArchived &&
                            !loading &&
                            itemsWithLinkedChildren.map((obj) => (
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
                                    handleArchiveKR={handleArchiveKR}
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
                                />
                            ))}

                        {/* Archived */}
                        {showArchived && (
                            <ObjectiveArchive
                                archivedItems={archivedItems}
                                openObj={openObj}
                                setOpenObj={setOpenObj}
                                loadingArchived={loadingArchived}
                                reloadBothTabs={reloadBothTabs}
                            />
                        )}
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
                email={assignModal.email}
                setEmail={(e) =>
                    setAssignModal((prev) => ({ ...prev, email: e }))
                }
                loading={assignModal.loading}
                onConfirm={handleAssignKR}
                onClose={() =>
                    setAssignModal((prev) => ({ ...prev, show: false }))
                }
            />
            <AssigneeTooltip tooltip={assigneeTooltip} />
        </div>
    );
}
