import React, { useEffect, useMemo, useState } from "react";
import ObjectiveList from "./ObjectiveList.jsx";
import ObjectiveModal from "./ObjectiveModal.jsx";
import KeyResultModal from "./KeyResultModal.jsx";
import ToastComponent from "./ToastComponent.jsx";

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

    const load = async (pageNum = 1) => {
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

            const [resObj, resDept, resCycles, resLinks] = await Promise.all([
                fetch(`/my-objectives?page=${pageNum}`, {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
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
            setItems(Array.isArray(objData.data.data) ? objData.data.data : []);
            setTotalPages(objData.data.last_page || 1);

            if (!resDept.ok) {
                console.error(
                    "Departments API error:",
                    resDept.status,
                    resDept.statusText
                );
                setToast({
                    type: "error",
                    message: `Lỗi tải departments: ${resDept.statusText}`,
                });
            }
            const deptData = await resDept.json().catch((err) => {
                console.error("Error parsing departments:", err);
                return { data: [] };
            });
            setDepartments(deptData.data || []);

            if (!resCycles.ok) {
                console.error(
                    "Cycles API error:",
                    resCycles.status,
                    resCycles.statusText
                );
                setToast({
                    type: "error",
                    message: `Lỗi tải cycles: ${resCycles.statusText}`,
                });
            }
            const cyclesData = await resCycles.json().catch((err) => {
                console.error("Error parsing cycles:", err);
                return { data: [] };
            });
            setCyclesList(cyclesData.data || []);

            if (!resLinks.ok) {
                console.error(
                    "Links API error:",
                    resLinks.status,
                    resLinks.statusText
                );
                setToast({
                    type: "error",
                    message: `Lỗi tải links: ${resLinks.statusText}`,
                });
            }
            const linksData = await resLinks.json().catch((err) => {
                console.error("Error parsing links:", err);
                setToast({
                    type: "error",
                    message: "Lỗi phân tích dữ liệu liên kết",
                });
                return { data: [] };
            });
            setLinks(linksData.data || []);

            if (
                !Array.isArray(objData.data.data) ||
                objData.data.data.length === 0
            ) {
                setToast({
                    type: "warning",
                    message: "Không có objectives nào",
                });
            }
            if (deptData.data?.length === 0) {
                setToast({
                    type: "warning",
                    message: "Không có phòng ban nào",
                });
            }
            if (cyclesData.data?.length === 0) {
                setToast({ type: "warning", message: "Không có chu kỳ nào" });
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

    useEffect(() => {
        load(page);
    }, [page]);

    const sortedItems = useMemo(
        () => (Array.isArray(items) ? items : []),
        [items]
    );

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
        </div>
    );
}
