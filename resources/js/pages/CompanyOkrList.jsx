// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";
import ObjectiveList from "./ObjectiveList"; // Corrected import

// Helper functions copied from ObjectivesPage.jsx
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
    const [childLinks, setChildLinks] = useState([]); // State for linked OKRs
    const [linksLoading, setLinksLoading] = useState(false); // Loading state for links

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/profile");
                const json = await res.json();
                if (res.ok) {
                    setCurrentUser(json);
                } else {
                    throw new Error(json.message || "Failed to fetch user");
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setToast({ type: "error", message: "Không thể tải thông tin người dùng." });
            }
        };
        fetchUser();
    }, []);

    // ============================================================
    // CHỌN QUÝ MẶC ĐỊNH
    // ============================================================
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();

                if (!Array.isArray(json.data) || json.data.length === 0) {
                    setToast({
                        type: "error",
                        message: "Không có dữ liệu quý",
                    });
                    setLoading(false);
                    return;
                }

                const cycles = json.data;
                setCyclesList(cycles);

                const today = new Date();
                today.setHours(0, 0, 0, 0); 

                let selectedCycle = null;

                for (const c of cycles) {
                    const start = c.start_date ? new Date(c.start_date) : null;
                    const end = c.end_date ? new Date(c.end_date) : null;

                    if (start && end) {
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);

                        if (today >= start && today <= end) {
                            selectedCycle = c;
                            break;
                        }
                    }
                }

                if (!selectedCycle) {
                    selectedCycle = cycles.reduce((best, c) => {
                        const start = c.start_date
                            ? new Date(c.start_date)
                            : null;
                        const end = c.end_date ? new Date(c.end_date) : null;

                        let refDate = today;
                        if (start && end) {
                            refDate = new Date(
                                (start.getTime() + end.getTime()) / 2
                            );
                        } else if (start) {
                            refDate = start;
                        } else if (end) {
                            refDate = end;
                        } else {
                            return !best || c.cycle_id > best.cycle_id
                                ? c
                                : best;
                        }

                        const diff = Math.abs(refDate - today);
                        return !best || diff < best.diff
                            ? { ...c, diff }
                            : best;
                    }, null);
                }

                setCycleFilter(selectedCycle?.cycle_id || cycles[0]?.cycle_id);
            } catch (err) {
                console.error(err);
                setToast({ type: "error", message: "Lỗi tải danh sách quý" });
                setLoading(false);
            }
        })();
    }, []);

    // ============================================================
    // LẤY OKR CÔNG TY VÀ CÁC LIÊN KẾT
    // ============================================================
    const fetchData = useCallback(async () => {
        if (!cycleFilter) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setLinksLoading(true);
        try {
            const params = new URLSearchParams({ cycle_id: cycleFilter });
            
            const [okrRes, linksRes] = await Promise.all([
                fetch(`/company-okrs?${params}`, { headers: { Accept: "application/json" } }),
                fetch(`/my-links`, { headers: { Accept: "application/json" } })
            ]);

            const okrJson = await okrRes.json();
            if (okrJson.success) {
                setItems(okrJson.data.data || []);
            } else {
                throw new Error("Không tải được OKR công ty");
            }

            const linksJson = await linksRes.json();
            if (linksJson.success) {
                setChildLinks(normalizeLinksList(linksJson.data?.children || []));
            } else {
                console.warn("Không thể tải dữ liệu liên kết");
                setChildLinks([]);
            }

        } catch (err) {
            setToast({ type: "error", message: err.message });
            setItems([]);
            setChildLinks([]);
        } finally {
            setLoading(false);
            setLinksLoading(false);
        }
    }, [cycleFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            <ObjectiveList
                items={items}
                cyclesList={cyclesList}
                loading={loading || linksLoading}
                openObj={openObj}
                setOpenObj={setOpenObj}
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                currentUser={currentUser}
                setItems={setItems}
                childLinks={childLinks} // Pass childLinks data
                linksLoading={linksLoading}
                // Stub interactive props as this is a read-only view for now
                setCreatingFor={() => {}}
                setEditingObjective={() => {}}
                setEditingKR={() => {}}
                setCreatingObjective={() => {}}
                openCheckInModal={() => {}}
                openCheckInHistory={() => {}}
                onOpenLinkModal={() => {}}
                onCancelLink={() => {}}
                hideFilters={false}
            />
            <ToastNotification toast={toast} />
        </div>
    );
}
