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
    const [cycleFilter, setCycleFilter] = useState("");
    const [myOKRFilter, setMyOKRFilter] = useState(false);

    const load = async (pageNum = 1, cycle = "", myOKR = false) => {
        try {
            setLoading(true);
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            if (!token) {
                setToast({
                    type: "error",
                    message: "Không tìm thấy CSRF token",
                });
                throw new Error("CSRF token not found");
            }

            let url = `/my-objectives?page=${pageNum}`;
            if (cycle) url += `&cycle_id=${cycle}`;
            if (myOKR) url += `&my_okr=true`;

            const [resObj, resDept, resCycles, resUser, resLinks] = await Promise.all([
                fetch(url, {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
                fetch("/departments", {
                    headers: { Accept: "application/json" },
                }),
                fetch("/cycles", { headers: { Accept: "application/json" } }),
                fetch("/api/profile", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
                fetch("/my-links", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
            ]);

            if (!resObj.ok) {
                console.error(
                    "Objectives API error:",
                    resObj.status,
                    resObj.statusText
                );
            }
            const objData = await resObj.json().catch((err) => {
                console.error("Error parsing objectives:", err);
                return { success: false, data: { data: [], last_page: 1 } };
            });
            
            // Normalize data: convert keyResults to key_results
            const list = Array.isArray(objData?.data?.data) ? objData.data.data : (Array.isArray(objData?.data) ? objData.data : []);
            const normalizedItems = Array.isArray(list)
                ? list.map(obj => ({
                    ...obj,
                    key_results: obj.key_results || obj.keyResults || []
                }))
                : [];
            
            if (resObj.ok && objData.success !== false) {
                console.log('📥 Server response OK, items count:', normalizedItems.length);
                
                // Luôn cập nhật state với data mới từ server
                setItems(normalizedItems);
                
                // Lưu vào localStorage
                try { 
                    localStorage.setItem('my_objectives', JSON.stringify(normalizedItems)); 
                    console.log('💾 Saved to localStorage:', normalizedItems.length, 'objectives');
                    
                    // Verify save
                    const verify = localStorage.getItem('my_objectives');
                    if (verify) {
                        const verifyParsed = JSON.parse(verify);
                        console.log('✅ Verified cache has:', verifyParsed.length, 'objectives');
                    }
                } catch (e) {
                    console.error('❌ Failed to save to localStorage:', e);
                }
                
                if (objData?.data?.last_page) setTotalPages(objData.data.last_page);
            } else {
                console.warn('⚠️ Bad response from server, keeping cached data');
                console.log('Response status:', resObj.status, 'Success flag:', objData.success);
                // Không xóa cache và không clear items khi có lỗi
            }

            const deptData = await resDept.json().catch((err) => {
                console.error("Error parsing departments:", err);
                return { data: [] };
            });
            if (resDept.ok) {
                setDepartments(deptData.data || []);
            } else {
                console.error("Departments API error:", resDept.status, resDept.statusText);
                setDepartments([]);
            }

            const cyclesData = await resCycles.json().catch((err) => {
                console.error("Error parsing cycles:", err);
                return { data: [] };
            });
            if (resCycles.ok) {
                setCyclesList(cyclesData.data || []);
            } else {
                console.error("Cycles API error:", resCycles.status, resCycles.statusText);
                setCyclesList([]);
            }

            const linksJson = await resLinks.json().catch((err) => {
                console.error("Error parsing links:", err);
                return { data: { outgoing: [], incoming: [], children: [] } };
            });
            if (resLinks.ok && linksJson.success !== false) {
                setLinks(normalizeLinksList(linksJson.data?.outgoing || []));
                setIncomingLinks(normalizeLinksList(linksJson.data?.incoming || []));
                setChildLinks(normalizeLinksList(linksJson.data?.children || []));
            } else {
                console.warn("Không thể tải dữ liệu liên kết");
                setLinks([]);
                setIncomingLinks([]);
                setChildLinks([]);
            }

            // Parse user data (optional, không ảnh hưởng objectives)
            if (resUser && resUser.ok) {
                const userData = await resUser.json().catch((err) => {
                    console.error("Error parsing user:", err);
                    return null;
                });
                if (userData && userData.user) {
                    setCurrentUser(userData.user);
                    console.log('👤 Current user loaded:', userData.user.email);
                } else {
                    console.warn('⚠️ User data format unexpected:', userData);
                }
            } else {
                console.warn('⚠️ Failed to fetch user profile, continuing without it');
            }
        } catch (err) {
            console.error("Load error:", err);
            setToast({
                type: "error",
                message: "Không thể tải dữ liệu. Vui lòng thử lại.",
            });
        } finally {
            setLoading(false);
        }
    };

    const refreshLinks = useCallback(async () => {
        try {
            setLinksLoading(true);
            const res = await fetch("/my-links", {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();
            if (res.ok && json.success !== false) {
                setLinks(normalizeLinksList(json.data?.outgoing || []));
                setIncomingLinks(normalizeLinksList(json.data?.incoming || []));
                setChildLinks(normalizeLinksList(json.data?.children || []));
            }
        } catch (err) {
            console.error("Refresh links error:", err);
        } finally {
            setLinksLoading(false);
        }
    }, []);

    // Load cache chỉ 1 lần khi component mount
    useEffect(() => {
        try {
            const cached = localStorage.getItem('my_objectives');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log('✅ Loaded from cache:', parsed.length, 'objectives');
                    setItems(parsed);
                } else {
                    console.log('⚠️ Cache is empty');
                }
            } else {
                console.log('⚠️ No cache found');
            }
        } catch (e) {
            console.error('❌ Error loading from cache:', e);
        }
    }, []);

    // Load data từ server khi page thay đổi
    useEffect(() => {
        load(page, cycleFilter, myOKRFilter);
    }, [page]);

    useEffect(() => {
        // Khi filter thay đổi, reset về trang 1 và reload
        setPage(1);
        load(1, cycleFilter, myOKRFilter);
    }, [cycleFilter]);

    useEffect(() => {
        // Khi My OKR filter thay đổi, reset về trang 1 và reload
        setPage(1);
        load(1, cycleFilter, myOKRFilter);
    }, [myOKRFilter]);

    useEffect(() => {
        // Load current user
        const loadCurrentUser = async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                const res = await fetch("/api/profile", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    setCurrentUser(json.user);
                }
            } catch (err) {
                console.error("Error loading current user:", err);
            }
        };
        loadCurrentUser();
    }, []);

    // Auto-open check-in modal nếu có thông tin từ CheckInReminderBanner
    useEffect(() => {
        // Chỉ chạy khi không còn loading và đã có items
        if (loading || items.length === 0) return;

        try {
            const autoOpenData = localStorage.getItem('autoOpenCheckIn');
            if (!autoOpenData) return;

            const autoOpen = JSON.parse(autoOpenData);
            console.log('🔔 Auto-opening check-in modal for:', autoOpen);

            // Tìm Key Result trong items
            let foundKR = null;
            for (const obj of items) {
                if (obj.objective_id === autoOpen.objective_id) {
                    const kr = (obj.key_results || []).find(k => k.kr_id === autoOpen.kr_id);
                    if (kr) {
                        foundKR = {
                            ...kr,
                            objective_id: obj.objective_id,
                        };
                        break;
                    }
                }
            }

            if (foundKR) {
                // Đợi một chút để đảm bảo component đã render xong
                setTimeout(() => {
                    openCheckInModal(foundKR);
                    // Xóa localStorage sau khi đã mở modal
                    localStorage.removeItem('autoOpenCheckIn');
                }, 500);
            } else {
                console.warn('🔔 Key Result not found in items, clearing autoOpen');
                localStorage.removeItem('autoOpenCheckIn');
            }
        } catch (error) {
            console.error('🔔 Error auto-opening check-in modal:', error);
            localStorage.removeItem('autoOpenCheckIn');
        }
    }, [items, loading]);

    const sortedItems = useMemo(
        () => (Array.isArray(items) ? items : []),
        [items]
    );

    const handleCheckInSuccess = (keyResultData) => {
        if (keyResultData && keyResultData.kr_id) {
            setItems((prevItems) => {
                return prevItems.map((obj) => {
                    if (obj.objective_id === checkInModal.keyResult?.objective_id) {
                        let newObjectiveStatus = obj.status;
                        if (newObjectiveStatus === "draft") {
                            newObjectiveStatus = "active";
                        }

                        const updatedKeyResults = (obj.key_results || []).map((kr) => {
                            if (kr.kr_id === keyResultData.kr_id) {
                                let newKRStatus = keyResultData.status;
                                if (newKRStatus === "draft") {
                                    newKRStatus = "active";
                                }
                                return { ...kr, ...keyResultData, status: newKRStatus };
                            }
                            return kr;
                        });

                        return {
                            ...obj,
                            status: newObjectiveStatus,
                            key_results: updatedKeyResults,
                        };
                    }
                    return obj;
                });
            });
        }
        
        // Hiển thị thông báo thành công
        setToast({
            type: "success",
            message: keyResultData?.progress_percent >= 100 
                ? "🎉 Chúc mừng! Key Result đã hoàn thành 100%."
                : "✅ Cập nhật tiến độ thành công!",
        });
    };

    const handleOpenLinkModal = (payload) => {
        setLinkModal({
            open: true,
            source: payload?.source || null,
            sourceType: payload?.sourceType || "objective",
        });
    };

    const closeLinkModal = () => {
        setLinkModal({ open: false, source: null, sourceType: "objective" });
    };

    const syncLinkCollections = useCallback(
        (link) => {
            if (!link) return;
            const normalized = normalizeLinkData(link);
            const userId = currentUser?.user_id;

            if (!userId) {
                setLinks((prev) => [normalized, ...prev.filter((item) => item.link_id !== normalized.link_id)]);
                return;
            }

            const isRequester = normalized.requested_by === userId;
            const isTargetOwner = normalized.target_owner_id === userId;
            const status = (normalized.status || "").toLowerCase();

            setLinks((prev) => {
                const filtered = prev.filter((item) => item.link_id !== normalized.link_id);
                if (isRequester && status !== "cancelled") {
                    return [normalized, ...filtered];
                }
                return filtered;
            });

            setIncomingLinks((prev) => {
                const filtered = prev.filter((item) => item.link_id !== normalized.link_id);
                if (isTargetOwner && (status === "pending" || status === "needs_changes")) {
                    return [normalized, ...filtered];
                }
                return filtered;
            });

            setChildLinks((prev) => {
                const filtered = prev.filter((item) => item.link_id !== normalized.link_id);
                if (isTargetOwner && status === "approved") {
                    return [normalized, ...filtered];
                }
                return filtered;
            });
        },
        [currentUser]
    );

    const handleLinkRequestSuccess = (link) => {
        syncLinkCollections(link);
        setToast({
            type: "success",
            message: "Đã gửi yêu cầu liên kết. Chờ phê duyệt.",
        });
    };

    const performLinkAction = useCallback(
        async (linkId, action, payload = {}, fallbackMessage = "Đã cập nhật trạng thái liên kết") => {
            try {
                const token = document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content");
                if (!token) throw new Error("Không tìm thấy CSRF token");

                const res = await fetch(`/my-links/${linkId}/${action}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                    body: JSON.stringify(payload),
                });
                const json = await res.json();
                if (!res.ok || json.success === false) {
                    throw new Error(json.message || "Không thể cập nhật trạng thái liên kết");
                }
                const updatedLink = normalizeLinkData(json.data);
                syncLinkCollections(updatedLink);
                setToast({
                    type: "success",
                    message: json.message || fallbackMessage,
                });
                return json.data;
            } catch (err) {
                console.error(`Link action ${action} error:`, err);
                setToast({
                    type: "error",
                    message: err.message || "Không thể xử lý yêu cầu liên kết",
                });
                throw err;
            }
        },
        [refreshLinks, syncLinkCollections]
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
        console.log('Opening check-in modal for:', keyResult);
        console.log('Objective ID:', keyResult?.objective_id);
        setCheckInModal({ open: true, keyResult });
    };

    const openCheckInHistory = (keyResult) => {
        console.log('Opening check-in history for:', keyResult);
        console.log('Objective ID:', keyResult?.objective_id);
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
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                myOKRFilter={myOKRFilter}
                setMyOKRFilter={setMyOKRFilter}
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
                    setLinks={setLinks} // Thêm setLinks
                    reloadData={load} // Thêm hàm reloadData
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

            {/* Check-in Modal */}
            <ErrorBoundary>
                <CheckInModal
                    open={checkInModal.open}
                    onClose={() => setCheckInModal({ open: false, keyResult: null })}
                    keyResult={checkInModal.keyResult}
                    objectiveId={checkInModal.keyResult?.objective_id}
                    onSuccess={handleCheckInSuccess}
                />
            </ErrorBoundary>

            {/* Check-in History Modal */}
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
