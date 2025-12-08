// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";
import ObjectiveList from "./ObjectiveList"; // Corrected import
import ObjectiveModal from "./ObjectiveModal.jsx"; // Import ObjectiveModal
import KeyResultModal from "./KeyResultModal.jsx"; // Import KeyResultModal
import OkrTreeCanvas from "../components/okr/OkrTreeCanvas";
import {
    mergeChildLinksIntoObjectives,
    buildTreeFromObjectives,
} from "../utils/okrHierarchy";

const pickRelation = (link, camel, snake) =>
    (link && link[camel]) || (link && link[snake]) || null;

const normalizeLinkData = (link) => {
    if (!link || typeof link !== "object") return link;
    return {
        ...link,
        sourceObjective: pickRelation(
            link,
            "sourceObjective",
            "source_objective"
        ),
        sourceKr: pickRelation(link, "sourceKr", "source_kr"),
        targetObjective: pickRelation(
            link,
            "targetObjective",
            "target_objective"
        ),
        targetKr: pickRelation(link, "targetKr", "target_kr"),
        requester: pickRelation(link, "requester", "requester"),
        targetOwner: pickRelation(link, "targetOwner", "target_owner"),
        approver: pickRelation(link, "approver", "approver"),
    };
};

const normalizeLinksList = (list) =>
    Array.isArray(list) ? list.map((item) => normalizeLinkData(item)) : [];

export default function CompanyOkrList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleFilter, setCycleFilter] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [cyclesList, setCyclesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [childLinks, setChildLinks] = useState([]);
    const [linksLoading, setLinksLoading] = useState(false);
    const [creatingObjective, setCreatingObjective] = useState(false); // New state
    const [editingObjective, setEditingObjective] = useState(null);
    const [editingKR, setEditingKR] = useState(null);
    const [creatingFor, setCreatingFor] = useState(null);
    const [displayMode, setDisplayMode] = useState("table");
    const [treeLayout, setTreeLayout] = useState("horizontal");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    // New state for advanced filtering
    const [filterType, setFilterType] = useState("company"); // 'company' or 'department'
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [departments, setDepartments] = useState([]);

    const isCeo = currentUser?.role?.role_name?.toLowerCase() === "ceo"; // Determine if current user is CEO

    // Fetch initial data (user, cycles, departments)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, cyclesRes, deptsRes] = await Promise.all([
                    fetch("/api/profile"),
                    fetch("/cycles", {
                        headers: { Accept: "application/json" },
                    }),
                    fetch("/departments", {
                        headers: { Accept: "application/json" },
                    }),
                ]);

                if (userRes.ok) {
                    const userJson = await userRes.json();
                    setCurrentUser(userJson.user);
                }

                // Biến dùng chung cho logic chọn chu kỳ
                let cycles = [];
                let selectedCycle = null;

                if (cyclesRes.ok) {
                    const cyclesJson = await cyclesRes.json();
                    cycles = cyclesJson.data || [];
                    setCyclesList(cycles);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    selectedCycle = cycles.find((c) => {
                        const start = c.start_date
                            ? new Date(c.start_date)
                            : null;
                        const end = c.end_date ? new Date(c.end_date) : null;
                        return start && end && today >= start && today <= end;
                    });

                    if (!selectedCycle && cycles.length > 0) {
                        selectedCycle = cycles[0];
                    }
                    setCycleFilter(selectedCycle?.cycle_id || null);
                }

                if (deptsRes.ok) {
                    const deptsJson = await deptsRes.json();
                    setDepartments(deptsJson.data || []);
                }

                // An toàn tuyệt đối: đảm bảo luôn có cycle hoặc tắt loading
                if (selectedCycle?.cycle_id) {
                    setCycleFilter(selectedCycle.cycle_id);
                } else if (cycles[0]?.cycle_id) {
                    setCycleFilter(cycles[0].cycle_id);
                    setToast({
                        type: "warning",
                        message:
                            "Không tìm thấy quý phù hợp. Vui lòng chọn quý thủ công.",
                    });
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
                setToast({
                    type: "error",
                    message: "Không thể tải dữ liệu ban đầu.",
                });
            }
        };
        fetchInitialData();
    }, []);

    // Fetch OKR data when filters change
    const fetchData = useCallback(async () => {
        if (cycleFilter === null) return;

        setLoading(true);
        setLinksLoading(true);
        try {
            const params = new URLSearchParams({
                cycle_id: cycleFilter,
                filter_type: filterType,
                page,
            });
            if (filterType === "department" && selectedDepartment) {
                params.append("department_id", selectedDepartment);
            }

            const linkParams = new URLSearchParams({ cycle_id: cycleFilter });

            const [okrRes, linksRes] = await Promise.all([
                fetch(`/company-okrs?${params}`, {
                    headers: { Accept: "application/json" },
                }),
                fetch(`/api/links?${linkParams}`, {
                    headers: { Accept: "application/json" },
                }),
            ]);

            if (okrRes.ok) {
                const okrJson = await okrRes.json();
                if (okrJson.success) {
                    const objectiveData = okrJson.data.objectives || {};
                    setItems(objectiveData.data || []);
                    setPagination({
                        current_page: objectiveData.current_page || 1,
                        last_page: objectiveData.last_page || 1,
                        total:
                            objectiveData.total ||
                            objectiveData.data?.length ||
                            0,
                    });
                } else {
                    throw new Error(okrJson.message || "Không tải được OKR");
                }
            } else {
                throw new Error("Lỗi mạng khi tải OKR");
            }

            if (linksRes.ok) {
                const linksJson = await linksRes.json();
                if (linksJson.success) {
                    setChildLinks(
                        normalizeLinksList(linksJson.data?.children || [])
                    );
                }
            }
        } catch (err) {
            setToast({ type: "error", message: err.message });
            setItems([]);
            setChildLinks([]);
        } finally {
            setLoading(false);
            setLinksLoading(false);
        }
    }, [cycleFilter, filterType, selectedDepartment, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCycleSelection = useCallback((value) => {
        setPage(1);
        setCycleFilter(value);
    }, []);

    const handleFilterChange = (type, value) => {
        if (type === "company") {
            setFilterType("company");
            setSelectedDepartment("");
        } else if (type === "department") {
            setFilterType("department");
            setSelectedDepartment(value);
        }
        setPage(1);
    };

    const enrichedItems = useMemo(
        () => mergeChildLinksIntoObjectives(items, childLinks),
        [items, childLinks]
    );

    const treeNodes = useMemo(
        () => buildTreeFromObjectives(enrichedItems),
        [enrichedItems]
    );

    const [treeRootId, setTreeRootId] = useState(null);

    useEffect(() => {
        if (!enrichedItems.length) {
            setTreeRootId(null);
            return;
        }
        if (
            !treeRootId ||
            !enrichedItems.some(
                (obj) => String(obj.objective_id) === String(treeRootId)
            )
        ) {
            setTreeRootId(enrichedItems[0].objective_id);
        }
    }, [enrichedItems, treeRootId]);

    const treeDataForRender = useMemo(() => {
        if (!treeNodes.length) return [];
        if (!treeRootId) return treeNodes;
        return treeNodes.filter(
            (node) =>
                String(node.objective_id || node.id) === String(treeRootId)
        );
    }, [treeNodes, treeRootId]);

    // Đồng bộ tree state vào query params
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (displayMode === "tree") {
                url.searchParams.set("display", "tree");
                if (treeRootId) {
                    url.searchParams.set(
                        "root_objective_id",
                        String(treeRootId)
                    );
                } else {
                    url.searchParams.delete("root_objective_id");
                }
                url.searchParams.set("tree_layout", treeLayout);
            } else {
                url.searchParams.delete("display");
                url.searchParams.delete("root_objective_id");
                url.searchParams.delete("tree_layout");
            }
            window.history.replaceState({}, "", url.toString());
        } catch (e) {
            console.error("Failed to sync company tree params", e);
        }
    }, [displayMode, treeRootId, treeLayout]);

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            <div className="flex justify-end">
                <div className="flex items-center gap-2">
                    {displayMode === "tree" && (
                        <button
                            type="button"
                            onClick={() =>
                                setTreeLayout((prev) =>
                                    prev === "horizontal"
                                        ? "vertical"
                                        : "horizontal"
                                )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            title={
                                treeLayout === "horizontal"
                                    ? "Chuyển sang hiển thị dọc"
                                    : "Chuyển sang hiển thị ngang"
                            }
                        >
                            <svg
                                className="h-4 w-4 text-slate-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                            </svg>
                            {treeLayout === "horizontal"
                                ? "Xem ngang"
                                : "Xem dọc"}
                        </button>
                    )}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                        <button
                            type="button"
                            onClick={() => setDisplayMode("table")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                                displayMode === "table"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            Dạng bảng
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("tree")}
                            className={`ml-1 px-3 py-1.5 text-xs font-medium rounded-md ${
                                displayMode === "tree"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            Dạng cây
                        </button>
                    </div>
                </div>
            </div>
            <div className="mb-4 flex items-center justify-between gap-4">
                {displayMode === "tree" ? (
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">
                            Objective gốc
                        </label>
                        <select
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={treeRootId || ""}
                            onChange={(e) => setTreeRootId(e.target.value)}
                        >
                            {enrichedItems.map((obj) => (
                                <option
                                    key={obj.objective_id}
                                    value={obj.objective_id}
                                >
                                    {obj.obj_title}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div />
                )}
            </div>

            {displayMode === "table" && (
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-600 leading-none">
                                Chu kỳ OKR
                            </span>
                            <CycleDropdown
                                cyclesList={cyclesList}
                                cycleFilter={cycleFilter}
                                handleCycleChange={handleCycleSelection}
                                dropdownOpen={dropdownOpen}
                                setDropdownOpen={setDropdownOpen}
                            />
                        </div>
                        <div className="relative flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-600 leading-none">
                                Phạm vi OKR
                            </span>
                            <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={
                                    filterType === "company"
                                        ? "company"
                                        : selectedDepartment
                                }
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "company") {
                                        handleFilterChange("company");
                                    } else {
                                        handleFilterChange("department", val);
                                    }
                                }}
                            >
                                <option value="company">Công ty</option>
                                {departments.map((dept) => (
                                    <option
                                        key={dept.department_id}
                                        value={dept.department_id}
                                    >
                                        {dept.d_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {isCeo && (
                        <button
                            onClick={() => setCreatingObjective(true)}
                            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-all duration-200"
                        >
                            Thêm Objective
                        </button>
                    )}
                </div>
            )}

            {displayMode === "table" ? (
                <ObjectiveList
                    items={items}
                    loading={loading || linksLoading}
                    openObj={openObj}
                    setOpenObj={setOpenObj}
                    currentUser={currentUser}
                    setItems={setItems}
                    childLinks={childLinks}
                    linksLoading={linksLoading}
                    setCreatingFor={isCeo ? setCreatingFor : () => {}}
                    setEditingObjective={isCeo ? setEditingObjective : () => {}}
                    setEditingKR={isCeo ? setEditingKR : () => {}}
                    setCreatingObjective={() => {}}
                    openCheckInModal={() => {}}
                    openCheckInHistory={() => {}}
                    onOpenLinkModal={() => {}}
                    onCancelLink={() => {}}
                    hideFilters={true}
                    disableActions={true}
                />
            ) : (
                <OkrTreeCanvas
                    data={treeDataForRender}
                    loading={loading || linksLoading}
                    emptyMessage="Không có OKR nào phù hợp trong danh sách hiện tại"
                    height={640}
                    showLayoutToggle={false}
                    layoutDirection={treeLayout}
                    onLayoutDirectionChange={setTreeLayout}
                />
            )}

            {pagination.total > 0 && pagination.last_page > 1 && (
                <div className="mt-4 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={page === 1}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                page === 1
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from(
                                { length: pagination.last_page },
                                (_, i) => i + 1
                            ).map((pageNumber) => {
                                if (
                                    pageNumber === 1 ||
                                    pageNumber === pagination.last_page ||
                                    (pageNumber >= page - 1 &&
                                        pageNumber <= page + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNumber}
                                            onClick={() => setPage(pageNumber)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                page === pageNumber
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            {pageNumber}
                                        </button>
                                    );
                                } else if (
                                    pageNumber === page - 2 ||
                                    pageNumber === page + 2
                                ) {
                                    return (
                                        <span
                                            key={pageNumber}
                                            className="px-2 text-gray-400"
                                        >
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() =>
                                setPage((prev) =>
                                    Math.min(pagination.last_page, prev + 1)
                                )
                            }
                            disabled={page === pagination.last_page}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                page === pagination.last_page
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Modals for CEO actions */}
            {isCeo && creatingObjective && (
                <ObjectiveModal
                    creatingObjective={creatingObjective}
                    setCreatingObjective={setCreatingObjective}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={fetchData}
                />
            )}
            {isCeo && editingObjective && (
                <ObjectiveModal
                    editingObjective={editingObjective}
                    setEditingObjective={setEditingObjective}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={fetchData}
                />
            )}
            {isCeo && editingKR && (
                <KeyResultModal
                    editingKR={editingKR}
                    setEditingKR={setEditingKR}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                />
            )}
            {isCeo && creatingFor && (
                <KeyResultModal
                    creatingFor={creatingFor}
                    setCreatingFor={setCreatingFor}
                    departments={departments}
                    cyclesList={cyclesList}
                    setItems={setItems}
                    setToast={setToast}
                    currentUser={currentUser}
                />
            )}

            <ToastNotification toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}
