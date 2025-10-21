import React, { useEffect, useMemo, useState } from "react";
import ObjectiveList from "../pages/ObjectiveList.jsx";
import ObjectiveModal from "../pages/ObjectiveModal.jsx";
import KeyResultModal from "../pages/KeyResultModal.jsx";
import ToastComponent from "../pages/ToastComponent.jsx";
import CheckInModal from "./CheckInModal";
import CheckInHistory from "./CheckInHistory";
import ErrorBoundary from "./ErrorBoundary";

export default function Dashboard() {
    const [items, setItems] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [cyclesList, setCyclesList] = useState([]);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const [editingKR, setEditingKR] = useState(null);
    const [creatingFor, setCreatingFor] = useState(null);
    const [creatingObjective, setCreatingObjective] = useState(false);
    const [editingObjective, setEditingObjective] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [cycleFilter, setCycleFilter] = useState("");
    const [myOKRFilter, setMyOKRFilter] = useState(false);
    const [checkInModal, setCheckInModal] = useState({ open: false, keyResult: null });
    const [checkInHistory, setCheckInHistory] = useState({ open: false, keyResult: null });
    const [currentUser, setCurrentUser] = useState(null);

    const loadStaticData = async () => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");

            const [resDept, resCycles, resLinks] = await Promise.all([
                fetch("/departments", {
                    headers: { Accept: "application/json" },
                }),
                fetch("/cycles", { headers: { Accept: "application/json" } }),
                fetch("/my-links", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
            ]);

            if (resDept.ok) {
                const deptData = await resDept.json();
                setDepartments(deptData.data || []);
            }

            if (resCycles.ok) {
                const cyclesData = await resCycles.json();
                setCyclesList(cyclesData.data || []);
            }

            if (resLinks.ok) {
                const linksData = await resLinks.json().catch((err) => {
                    console.error("Error parsing links:", err);
                    return { data: [] };
                });
                setLinks(linksData.data || []);
            }
        } catch (err) {
            console.error("Load static data error:", err);
        }
    };

    const load = async (pageNum = 1, filter = "", myOKR = false) => {
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

            // Tạo URL với filter
            let url = `/my-objectives?page=${pageNum}&dashboard=1`;
            if (filter) {
                url += `&cycle_id=${filter}`;
            }
            if (myOKR) {
                url += `&my_okr=1`;
            }

            const resObj = await fetch(url, {
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": token,
                },
            });

            if (!resObj.ok) {
                console.error(
                    "Objectives API error:",
                    resObj.status,
                    resObj.statusText
                );
                setToast({
                    type: "error",
                    message: `Lỗi tải objectives: ${resObj.statusText}`,
                });
            }
            const objData = await resObj.json().catch((err) => {
                console.error("Error parsing objectives:", err);
                setToast({
                    type: "error",
                    message: "Lỗi phân tích dữ liệu objectives",
                });
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
            if (resObj.ok && Array.isArray(list)) {
                setItems(normalizedItems);
                try { localStorage.setItem('my_objectives', JSON.stringify(normalizedItems)); } catch {}
                if (objData?.data?.last_page) setTotalPages(objData.data.last_page);
            } else {
                console.warn('Keeping previous objectives due to bad response');
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

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

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
        // Load static data một lần khi component mount
        loadStaticData();
        
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

    const sortedItems = useMemo(
        () => (Array.isArray(items) ? items : []),
        [items]
    );

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

    const handleCheckInSuccess = (keyResultData) => {
        if (keyResultData && keyResultData.kr_id) {
            // Cập nhật Key Result trong danh sách
            setItems((prev) =>
                prev.map((obj) => ({
                    ...obj,
                    key_results: (obj.key_results || []).map((kr) =>
                        kr.kr_id === keyResultData.kr_id ? { ...kr, ...keyResultData } : kr
                    ),
                }))
            );
        }
        
        // Hiển thị thông báo thành công
        setToast({
            type: "success",
            message: keyResultData?.progress_percent >= 100 
                ? "🎉 Chúc mừng! Key Result đã hoàn thành 100%."
                : "✅ Cập nhật tiến độ thành công!",
        });
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
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                myOKRFilter={myOKRFilter}
                setMyOKRFilter={setMyOKRFilter}
                openCheckInModal={openCheckInModal}
                openCheckInHistory={openCheckInHistory}
                currentUser={currentUser}
                title="Dashboard"
                hideFilters={false}
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
                    setLinks={setLinks}
                    reloadData={load}
                />
            )}

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
        </div>
    );
}
