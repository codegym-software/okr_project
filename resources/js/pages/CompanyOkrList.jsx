// src/components/CompanyOkrList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";
import ObjectiveList from "./ObjectiveList"; // Assuming text.txt is ObjectiveList.jsx

export default function CompanyOkrList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleFilter, setCycleFilter] = useState(null);
    const [openObj, setOpenObj] = useState({});
    const [cyclesList, setCyclesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

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
                setToast({
                    type: "error",
                    message: "Không thể tải thông tin người dùng.",
                });
            }
        };
        fetchUser();
    }, []);

    // ============================================================
    // CHỌN QUÝ MẶC ĐỊNH DỰA TRÊN NGÀY (HOÀN TOÀN KHÔNG DỰA VÀO TÊN!)
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
                today.setHours(0, 0, 0, 0); // chuẩn hóa

                let selectedCycle = null;

                // Ưu tiên 1: Dùng start_date / end_date (nếu có)
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

                // Ưu tiên 2: Nếu không có quý nào đang active → chọn quý gần nhất với hôm nay
                if (!selectedCycle) {
                    selectedCycle = cycles.reduce((best, c) => {
                        const start = c.start_date
                            ? new Date(c.start_date)
                            : null;
                        const end = c.end_date ? new Date(c.end_date) : null;

                        let refDate = today;
                        if (start && end) {
                            // Dùng ngày giữa quý làm tham chiếu
                            refDate = new Date(
                                (start.getTime() + end.getTime()) / 2
                            );
                        } else if (start) {
                            refDate = start;
                        } else if (end) {
                            refDate = end;
                        } else {
                            // Nếu không có ngày → dùng cycle_id lớn nhất (quý mới nhất)
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

                // An toàn tuyệt đối
                setCycleFilter(selectedCycle?.cycle_id || cycles[0]?.cycle_id);
            } catch (err) {
                console.error(err);
                setToast({ type: "error", message: "Lỗi tải danh sách quý" });
                setLoading(false);
            }
        })();
    }, []);

    // Xóa cycle_id trên URL
    useEffect(() => {
        const url = new URL(window.location);
        if (url.searchParams.has("cycle_id")) {
            url.searchParams.delete("cycle_id");
            window.history.replaceState({}, "", url);
        }
    }, []);

    // ============================================================
    // LẤY OKR CÔNG TY
    // ============================================================
    const fetchCompanyOkrs = useCallback(async () => {
        if (!cycleFilter) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({ cycle_id: cycleFilter });
            const res = await fetch(`/company-okrs?${params}`, {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();
            if (json.success) {
                setItems(json.data.data || []); // Adjusted for pagination
            }
        } catch (err) {
            setToast({ type: "error", message: "Không tải được OKR công ty" });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [cycleFilter]);

    useEffect(() => {
        fetchCompanyOkrs();
    }, [fetchCompanyOkrs]);

    return (
        <div className="mx-auto w-full max-w-6xl mt-8">
            <ObjectiveList
                items={items}
                cyclesList={cyclesList}
                loading={loading}
                openObj={openObj}
                setOpenObj={setOpenObj}
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                currentUser={currentUser}
                setItems={setItems}
                // Stub interactive props since this is a read-only view
                setCreatingFor={() => {}}
                setEditingObjective={() => {}}
                setEditingKR={() => {}}
                setCreatingObjective={() => {}}
                openCheckInModal={() => {}}
                openCheckInHistory={() => {}}
                onOpenLinkModal={() => {}}
                onCancelLink={() => {}}
                hideFilters={false} // You might want to control this
            />
            <ToastNotification toast={toast} />
        </div>
    );
}
