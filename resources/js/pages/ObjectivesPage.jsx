import React, { useEffect, useMemo, useState } from "react";
import ObjectiveList from "./ObjectiveList.jsx";
import ObjectiveModal from "./ObjectiveModal.jsx";
import KeyResultModal from "./KeyResultModal.jsx";
import ToastComponent from "./ToastComponent.jsx";
import CheckInModal from "../components/CheckInModal";
import CheckInHistory from "../components/CheckInHistory";
import ErrorBoundary from "../components/ErrorBoundary";

export default function ObjectivesPage() {
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

            const [resObj, resDept, resCycles, resUser] = await Promise.all([
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

            // Set links to empty array (endpoint not implemented yet)
            setLinks([]);

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

    const sortedItems = useMemo(
        () => (Array.isArray(items) ? items : []),
        [items]
    );

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
                openCheckInModal={openCheckInModal}
                openCheckInHistory={openCheckInHistory}
                currentUser={currentUser}
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                myOKRFilter={myOKRFilter}
                setMyOKRFilter={setMyOKRFilter}
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
                    setLinks={setLinks} // Thêm setLinks
                    reloadData={load} // Thêm hàm reloadData
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
