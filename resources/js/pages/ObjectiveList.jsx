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

    const menuRefs = useRef({});

    // === LINK LOOKUP & VIRTUAL ITEMS ===
    const linkLookup = useMemo(() => {
        /* giữ nguyên logic cũ */
    }, [links]);
    const itemsWithLinkedChildren = useMemo(() => {
        /* giữ nguyên logic cũ */
    }, [items, childLinks]);

    // === RELOAD BOTH TABS ===
    const reloadBothTabs = useCallback(
        async (token) => {
            /* giữ nguyên */
        },
        [cycleFilter, showArchived, setItems]
    );

    // === ARCHIVE HANDLERS ===
    const handleArchive = async (id) => {
        /* giữ nguyên logic */
    };
    const handleAssignKR = async () => {
        /* giữ nguyên logic */
    };

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
        /* giữ nguyên */
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
                                    setCreatingFor={setCreatingFor}
                                    onOpenLinkModal={onOpenLinkModal}
                                    handleArchive={handleArchive}
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
