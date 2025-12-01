import React, { useCallback, useEffect, useMemo, useState } from "react";
import ObjectiveList from "./ObjectiveList.jsx";
import ObjectiveModal from "./ObjectiveModal.jsx";
import KeyResultModal from "./KeyResultModal.jsx";
import ToastComponent from "./ToastComponent.jsx";
import CheckInModal from "../components/CheckInModal";
import CheckInHistory from "../components/CheckInHistory";
import ErrorBoundary from "../components/ErrorBoundary";
import LinkOkrModal from "../components/LinkOkrModal.jsx";
import LinkRequestsPanel from "../components/LinkRequestsPanel";

const pickRelation = (link, camel, snake) =>
    (link && link[camel]) || (link && link[snake]) || null;

const normalizeLinkData = (link) => {
    if (!link || typeof link !== "object") return link;
    return {
        ...link,
        sourceObjective: pickRelation(link, "sourceObjective", "source_objective"),
        sourceKr: pickRelation(link, "sourceKr", "source_kr"),
        targetObjective: pickRelation(link, "targetObjective", "target_objective"),
        targetKr: pickRelation(link, "targetKr", "target_kr"),
        requester: pickRelation(link, "requester", "requester"),
        targetOwner: pickRelation(link, "targetOwner", "target_owner"),
        approver: pickRelation(link, "approver", "approver"),
    };
};

const normalizeLinksList = (list) =>
    Array.isArray(list) ? list.map((item) => normalizeLinkData(item)) : [];

export default function ObjectivesPage() {
    const [items, setItems] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [cyclesList, setCyclesList] = useState([]);
    const [links, setLinks] = useState([]);
    const [incomingLinks, setIncomingLinks] = useState([]);
    const [childLinks, setChildLinks] = useState([]);
    const [linkModal, setLinkModal] = useState({
        open: false,
        source: null,
        sourceType: "objective",
    });
    const [linksLoading, setLinksLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const [editingKR, setEditingKR] = useState(null);
    const [creatingFor, setCreatingFor] = useState(null);
    const [creatingObjective, setCreatingObjective] = useState(false);
    const [editingObjective, setEditingObjective] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [checkInModal, setCheckInModal] = useState({ open: false, keyResult: null });
    const [checkInHistory, setCheckInHistory] = useState({ open: false, keyResult: null });
    const [currentUser, setCurrentUser] = useState(null);
    const [userDepartmentName, setUserDepartmentName] = useState('');
    const [cycleFilter, setCycleFilter] = useState(null);
    const [myOKRFilter, setMyOKRFilter] = useState(false);
    const [viewMode, setViewMode] = useState('levels'); // 'levels' or 'personal'

    // Set default view mode for members
    useEffect(() => {
        if (currentUser?.role?.role_name?.toLowerCase() === 'member') {
            setViewMode('personal');
        }
    }, [currentUser?.user_id]);

    // Effect to select the default cycle on initial load
    useEffect(() => {
        const selectDefaultCycle = async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
                });
                const json = await res.json();

                if (!Array.isArray(json.data) || json.data.length === 0) {
                    setToast({ type: "error", message: "Không có dữ liệu chu kỳ" });
                    return;
                }

                const cycles = json.data;
                setCyclesList(cycles);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let selectedCycle = cycles.find(c => {
                    const start = c.start_date ? new Date(c.start_date) : null;
                    const end = c.end_date ? new Date(c.end_date) : null;
                    if (start && end) {
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);
                        return today >= start && today <= end;
                    }
                    return false;
                });

                if (!selectedCycle) {
                    selectedCycle = cycles.reduce((best, c) => {
                        const start = c.start_date ? new Date(c.start_date) : null;
                        const end = c.end_date ? new Date(c.end_date) : null;
                        let refDate = start || end || new Date(c.created_at);
                        const diff = Math.abs(refDate - today);
                        return !best || diff < best.diff ? { ...c, diff } : best;
                    }, null);
                }
                
                if(selectedCycle) {
                    setCycleFilter(selectedCycle.cycle_id);
                } else if (cycles.length > 0) {
                    setCycleFilter(cycles[0].cycle_id);
                }

            } catch (err) {
                console.error(err);
                setToast({ type: "error", message: "Lỗi tải danh sách chu kỳ" });
            }
        };
        selectDefaultCycle();
    }, []);


    const load = async (pageNum = 1, cycle, myOKR = false, view = 'levels') => {
        if (cycle === null) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            if (!token) {
                throw new Error("CSRF token not found");
            }

            let url = `/my-objectives?page=${pageNum}&view_mode=${view}`;
            if (cycle) url += `&cycle_id=${cycle}`;
            if (myOKR) url += `&my_okr=true`;

            const [resObj, resDept, resUser, resLinks] = await Promise.all([
                fetch(url, { headers: { Accept: "application/json", "X-CSRF-TOKEN": token } }),
                fetch("/departments", { headers: { Accept: "application/json" } }),
                fetch("/api/profile", { headers: { Accept: "application/json", "X-CSRF-TOKEN": token } }),
                fetch("/my-links", { headers: { Accept: "application/json", "X-CSRF-TOKEN": token } }),
            ]);

            const objData = await resObj.json();
            if (resObj.ok && objData.success) {
                setItems(objData.data.data || []);
                setTotalPages(objData.data.last_page || 1);
                setUserDepartmentName(objData.user_department_name || '');
            } else {
                throw new Error(objData.message || "Không thể tải OKR");
            }

            const deptData = await resDept.json();
            if (resDept.ok) setDepartments(deptData.data || []);

            if (resUser.ok) {
                const userData = await resUser.json();
                if (userData.success) setCurrentUser(userData.user);
            }
            
            const linksJson = await resLinks.json();
            if (resLinks.ok && linksJson.success) {
                setLinks(normalizeLinksList(linksJson.data?.outgoing || []));
                setIncomingLinks(normalizeLinksList(linksJson.data?.incoming || []));
                setChildLinks(normalizeLinksList(linksJson.data?.children || []));
            }

        } catch (err) {
            console.error("Load error:", err);
            setToast({ type: "error", message: err.message || "Không thể tải dữ liệu." });
        } finally {
            setLoading(false);
        }
    };

    const refreshLinks = useCallback(async () => {
        // ... (implementation is fine)
    }, []);

    // Main data loading effect
    useEffect(() => {
        if (cycleFilter !== null) {
            load(page, cycleFilter, myOKRFilter, viewMode);
        }
    }, [page, cycleFilter, myOKRFilter, viewMode]);

    // Reset page to 1 when filters change
    useEffect(() => {
        if (page !== 1) setPage(1);
    }, [cycleFilter, myOKRFilter, viewMode]);

    const sortedItems = useMemo(
        () => (Array.isArray(items) ? items : []),
        [items]
    );

    const handleCheckInSuccess = (keyResultData) => {
        // ... (implementation is fine)
    };

    const handleOpenLinkModal = (payload) => {
        // ... (implementation is fine)
    };

    const closeLinkModal = () => {
        // ... (implementation is fine)
    };

    const syncLinkCollections = useCallback(
        (link) => {
            // ... (implementation is fine)
        },
        [currentUser]
    );

    const handleLinkRequestSuccess = (link) => {
        // ... (implementation is fine)
    };

    const performLinkAction = useCallback(
        async (linkId, action, payload = {}, fallbackMessage = "Đã cập nhật trạng thái liên kết") => {
            // ... (implementation is fine)
        },
        [syncLinkCollections]
    );

    const handleCancelLink = (linkId, reason = "", keepOwnership = true) =>
        performLinkAction(linkId, "cancel", { reason, keep_ownership: keepOwnership }, "Đã hủy liên kết");

    const handleApproveLink = (linkId, note = "") =>
        performLinkAction(linkId, "approve", { note }, "Đã chấp thuận yêu cầu");

    const handleRejectLink = (linkId, note) =>
        performLinkAction(linkId, "reject", { note }, "Đã từ chối yêu cầu");

    const handleRequestChanges = (linkId, note) =>
        performLinkAction(linkId, "request-changes", { note }, "Đã yêu cầu chỉnh sửa");

    const openCheckInModal = (keyResult) => {
        setCheckInModal({ open: true, keyResult });
    };

    const openCheckInHistory = (keyResult) => {
        setCheckInHistory({ open: true, keyResult });
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    return (
        <div className="px-4 py-6">
            <ToastComponent
                type={toast.type}
                message={toast.message}
                onClose={() => setToast((prev) => ({ ...prev, message: "" }))}
            />
            <ObjectiveList
                items={sortedItems}
                setItems={setItems}
                departments={departments}
                cyclesList={cyclesList}
                loading={loading}
                openObj={openObj}
                setOpenObj={setOpenObj}
                setCreatingFor={setCreatingFor}
                setEditingObjective={setEditingObjective}
                setEditingKR={setEditingKR}
                setCreatingObjective={setCreatingObjective}
                links={links}
                childLinks={childLinks}
                linksLoading={linksLoading}
                openCheckInModal={openCheckInModal}
                openCheckInHistory={openCheckInHistory}
                currentUser={currentUser}
                userDepartmentName={userDepartmentName}
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                myOKRFilter={myOKRFilter}
                setMyOKRFilter={setMyOKRFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onOpenLinkModal={handleOpenLinkModal}
                onCancelLink={handleCancelLink}
                reloadData={load}
            />
            <div className="mt-4 flex justify-center gap-2">
                <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                    Trước
                </button>
                <span className="text-sm text-slate-600">
                    Trang {page} / {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                    Sau
                </button>
            </div>
            {editingKR && (
                <KeyResultModal
                    editingKR={editingKR}
                    departments={departments}
                    cyclesList={cyclesList}
                    setEditingKR={setEditingKR}
                    setItems={setItems}
                    setToast={setToast}
                />
            )}
            {creatingFor && (
                <KeyResultModal
                    creatingFor={creatingFor}
                    departments={departments}
                    cyclesList={cyclesList}
                    setCreatingFor={setCreatingFor}
                    setItems={setItems}
                    setToast={setToast}
                    currentUser={currentUser}
                />
            )}
            {creatingObjective && (
                <ObjectiveModal
                    creatingObjective={creatingObjective}
                    setCreatingObjective={setCreatingObjective}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                />
            )}
            {editingObjective && (
                <ObjectiveModal
                    editingObjective={editingObjective}
                    setEditingObjective={setEditingObjective}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={load}
                />
            )}

            <LinkRequestsPanel
                incoming={incomingLinks}
                children={childLinks}
                loading={linksLoading}
                onApprove={handleApproveLink}
                onReject={handleRejectLink}
                onRequestChanges={handleRequestChanges}
                onCancel={handleCancelLink}
            />

            <ErrorBoundary>
                <CheckInModal
                    open={checkInModal.open}
                    onClose={() => setCheckInModal({ open: false, keyResult: null })}
                    keyResult={checkInModal.keyResult}
                    objectiveId={checkInModal.keyResult?.objective_id}
                    onSuccess={handleCheckInSuccess}
                />
            </ErrorBoundary>

            <ErrorBoundary>
                <CheckInHistory
                    open={checkInHistory.open}
                    onClose={() => setCheckInHistory({ open: false, keyResult: null })}
                    keyResult={checkInHistory.keyResult}
                    objectiveId={checkInHistory.keyResult?.objective_id}
                />
            </ErrorBoundary>

            {linkModal.open && (
                <LinkOkrModal
                    open={linkModal.open}
                    onClose={closeLinkModal}
                    source={linkModal.source}
                    sourceType={linkModal.sourceType}
                    onSuccess={handleLinkRequestSuccess}
                />
            )}
        </div>
    );
}
