// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";
import ObjectiveList from "./ObjectiveList"; // Corrected import
import ObjectiveModal from "./ObjectiveModal.jsx"; // Import ObjectiveModal
import KeyResultModal from "./KeyResultModal.jsx"; // Import KeyResultModal

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

    // New state for advanced filtering
    const [filterType, setFilterType] = useState('company'); // 'company' or 'department'
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [departments, setDepartments] = useState([]);

    const isCeo = currentUser?.role?.role_name?.toLowerCase() === 'ceo'; // Determine if current user is CEO

    // Fetch initial data (user, cycles, departments)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, cyclesRes, deptsRes] = await Promise.all([
                    fetch("/api/profile"),
                    fetch("/cycles", { headers: { Accept: "application/json" } }),
                    fetch("/departments", { headers: { Accept: "application/json" } }),
                ]);

                if (userRes.ok) {
                    const userJson = await userRes.json();
                    setCurrentUser(userJson.user);
                }

                if (cyclesRes.ok) {
                    const cyclesJson = await cyclesRes.json();
                    const cycles = cyclesJson.data || [];
                    setCyclesList(cycles);
                    
                    // Set default cycle
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let selectedCycle = cycles.find(c => {
                        const start = c.start_date ? new Date(c.start_date) : null;
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

            } catch (err) {
                console.error("Failed to fetch initial data:", err);
                setToast({ type: "error", message: "Không thể tải dữ liệu ban đầu." });
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
                filter_type: filterType 
            });
            if (filterType === 'department' && selectedDepartment) {
                params.append('department_id', selectedDepartment);
            }
            
            const linkParams = new URLSearchParams({ cycle_id: cycleFilter });

            const [okrRes, linksRes] = await Promise.all([
                fetch(`/company-okrs?${params}`, { headers: { Accept: "application/json" } }),
                fetch(`/api/links?${linkParams}`, { headers: { Accept: "application/json" } })
            ]);

            if (okrRes.ok) {
                const okrJson = await okrRes.json();
                if (okrJson.success) {
                    setItems(okrJson.data.objectives.data || []);
                } else {
                    throw new Error(okrJson.message || "Không tải được OKR");
                }
            } else {
                 throw new Error("Lỗi mạng khi tải OKR");
            }


            if (linksRes.ok) {
                const linksJson = await linksRes.json();
                if (linksJson.success) {
                    setChildLinks(normalizeLinksList(linksJson.data?.children || []));
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
    }, [cycleFilter, filterType, selectedDepartment]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (type, value) => {
        if (type === 'company') {
            setFilterType('company');
            setSelectedDepartment('');
        } else if (type === 'department') {
            setFilterType('department');
            setSelectedDepartment(value);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Cycle Filter Dropdown */}
                    <CycleDropdown
                        cyclesList={cyclesList}
                        cycleFilter={cycleFilter}
                        handleCycleChange={setCycleFilter}
                        dropdownOpen={dropdownOpen}
                        setDropdownOpen={setDropdownOpen}
                    />
                    {/* OKR Filter Dropdown */}
                    <div className="relative">
                        <select 
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={filterType === 'company' ? 'company' : selectedDepartment}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'company') {
                                    handleFilterChange('company');
                                } else {
                                    handleFilterChange('department', val);
                                }
                            }}
                        >
                            <option value="company">Công ty</option>
                            {departments.map(dept => (
                                <option key={dept.department_id} value={dept.department_id}>
                                    {dept.d_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {isCeo && (
                    <button
                        onClick={() => setCreatingObjective(true)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Tạo Objective
                    </button>
                )}
            </div>
            
            <ObjectiveList
                items={items}
                loading={loading || linksLoading}
                openObj={openObj}
                setOpenObj={setOpenObj}
                currentUser={currentUser}
                setItems={setItems}
                childLinks={childLinks}
                linksLoading={linksLoading}
                // Pass functional props if CEO, otherwise pass no-ops
                setCreatingFor={isCeo ? setCreatingFor : () => {}}
                setEditingObjective={isCeo ? setEditingObjective : () => {}}
                setEditingKR={isCeo ? setEditingKR : () => {}}
                setCreatingObjective={() => {}} // This is handled by the button outside ObjectiveList
                openCheckInModal={() => {}}
                openCheckInHistory={() => {}}
                onOpenLinkModal={() => {}}
                onCancelLink={() => {}}
                hideFilters={true}
                disableActions={true}
            />

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

            <ToastNotification toast={toast} />
        </div>
    );
}
