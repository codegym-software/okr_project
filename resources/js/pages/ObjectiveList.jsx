import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { canCheckInKeyResult } from "../utils/checkinPermissions";
import { CycleDropdown } from "../components/Dropdown";
import Tabs from "../components/Tabs";
import ConfirmationModal from "../components/ConfirmationModal";
import ToastNotification from "../components/ToastNotification";
import AssignKeyResultModal from "../components/AssignKeyResultModal";
import ObjectiveArchive from "./ObjectiveArchive";
import { LuAlignCenterHorizontal } from "react-icons/lu";

export default function ObjectiveList({
    items,
    departments,
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
    hideFilters = false,
    setItems,
    onOpenLinkModal,
    onCancelLink,
}) {
    const [toast, setToast] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedItems, setArchivedItems] = useState([]);
    const [archivedCount, setArchivedCount] = useState(0);
    const [loadingArchived, setLoadingArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [archivingKR, setArchivingKR] = useState(null);
    const [unarchivingKR, setUnarchivingKR] = useState(null);
    const [deletingKR, setDeletingKR] = useState(null);
    const [assignModal, setAssignModal] = useState({
        show: false,
        kr: null,
        objective: null,
        email: "",
        loading: false,
    });
    const [assigneeTooltip, setAssigneeTooltip] = useState(null);

    const linkLookup = useMemo(() => {
        const byObjective = {};
        const byKr = {};
        const pickLatest = (existing, candidate) => {
            if (!existing) return candidate;
            const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
            const candidateTime = new Date(candidate.updated_at || candidate.created_at || 0).getTime();
            return candidateTime >= existingTime ? candidate : existing;
        };

        if (Array.isArray(links)) {
            links.forEach((link) => {
                // Chỉ map vào byObjective nếu link được tạo trực tiếp từ Objective (không có source_kr_id)
                // Nếu có source_kr_id, nghĩa là link được tạo từ KR, không nên hiển thị badge trên Objective cha
                if (link?.source_objective_id && !link?.source_kr_id) {
                    byObjective[link.source_objective_id] = pickLatest(
                        byObjective[link.source_objective_id],
                        link
                    );
                }
                // Map vào byKr nếu link được tạo từ KR
                if (link?.source_kr_id) {
                    byKr[link.source_kr_id] = pickLatest(byKr[link.source_kr_id], link);
                }
            });
        }
        return { byObjective, byKr };
    }, [links]);

    // Chuyển đổi childLinks thành virtual Key Results để hiển thị như KRs con
    const itemsWithLinkedChildren = useMemo(() => {
        if (!Array.isArray(childLinks) || childLinks.length === 0) {
            return items;
        }

        return items.map((obj) => {
            // Tìm các childLinks trỏ tới Objective này
            const linkedChildren = childLinks.filter((link) => {
                const targetObjectiveId = link.targetObjective?.objective_id || link.target_objective_id;
                const targetKrId = link.targetKr?.kr_id || link.target_kr_id;
                
                // Nếu link trỏ tới Objective này (không phải KR)
                if (targetObjectiveId === obj.objective_id && !targetKrId) {
                    return true;
                }
                return false;
            });

            if (linkedChildren.length === 0) {
                return obj;
            }

            // Chuyển đổi childLinks thành virtual Key Results
            const virtualKRs = linkedChildren.map((link) => {
                const sourceObjective = link.sourceObjective || link.source_objective;
                const sourceKr = link.sourceKr || link.source_kr;
                const ownerUser =
                    sourceKr?.assigned_user ||
                    sourceKr?.assignedUser ||
                    sourceObjective?.user ||
                    null;

                // Tạo virtual KR từ link
                return {
                    kr_id: `linked_${link.link_id}`, // ID giả để phân biệt
                    kr_title: sourceKr
                        ? `${sourceObjective?.obj_title || "Objective"} › ${sourceKr.kr_title || "Key Result"}`
                        : sourceObjective?.obj_title || "Linked Objective",
                    target_value: sourceKr?.target_value || 0,
                    current_value: sourceKr?.current_value || 0,
                    unit: sourceKr?.unit || "number",
                    status: sourceKr?.status || sourceObjective?.status || "active",
                    weight: sourceKr?.weight || 0,
                    progress_percent: sourceKr?.progress_percent || 0,
                    assigned_to: sourceKr?.assigned_to || sourceObjective?.user_id || null,
                    assigned_user: ownerUser,
                    isLinked: true, // Flag để phân biệt với KR thật
                    link: link, // Lưu link để có thể hủy liên kết
                };
            });

            // Thêm virtual KRs vào key_results của Objective
            return {
                ...obj,
                key_results: [
                    ...(obj.key_results || []),
                    ...virtualKRs,
                ],
            };
        });
    }, [items, childLinks]);

    const handleCancelFromSource = useCallback(
        (link) => {
            if (!link || !onCancelLink) return;
            if (!window.confirm("Bạn có chắc chắn muốn hủy yêu cầu/liên kết này?")) {
                return;
            }
            const isApproved = (link.status || "").toLowerCase() === "approved";
            if (isApproved) {
                const keepOwnership = window.confirm(
                    "OKR này đang sở hữu OKR con. Chọn OK để giữ quyền sở hữu cho OKR cấp cao."
                );
                onCancelLink(link.link_id, "", keepOwnership);
            } else {
                onCancelLink(link.link_id);
            }
        },
        [onCancelLink]
    );

    const renderLinkBadge = useCallback(
        (link) => {
            if (!link) return null;
            const status = (link.status || "").toLowerCase();
            const targetLabel = `${link.targetObjective?.obj_title || "Objective cấp cao"}${
                link.targetKr?.kr_title ? ` › ${link.targetKr.kr_title}` : ""
            }`;

            const baseClass =
                "mt-1 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold leading-4";
            const themes = {
                pending: "bg-amber-100 text-amber-800",
                needs_changes: "bg-orange-100 text-orange-700",
                approved: "bg-emerald-100 text-emerald-800",
                rejected: "bg-rose-100 text-rose-700",
                cancelled: "bg-slate-100 text-slate-500",
            };
            const theme = themes[status] || "bg-slate-100 text-slate-600";

            const buildActionButtons = () => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCancelFromSource(link);
                    }}
                    className="text-emerald-900 underline decoration-dotted underline-offset-2"
                >
                    Hủy
                </button>
            );

            if (status === "pending") {
                return (
                    <span className={`${baseClass} ${theme}`}>
                        Đang chờ duyệt liên kết với: {targetLabel}
                    </span>
                );
            }

            if (status === "needs_changes") {
                return (
                    <span className={`${baseClass} ${theme}`}>
                        Cần chỉnh sửa liên kết{link.decision_note ? ` • ${link.decision_note}` : ""}
                    </span>
                );
            }

            if (status === "approved") {
                return (
                    <span className={`${baseClass} ${theme}`}>
                        <span>Đã liên kết với: {targetLabel}</span>
                        {buildActionButtons()}
                    </span>
                );
            }

            if (status === "rejected") {
                return (
                    <span className={`${baseClass} ${theme}`}>
                        Liên kết bị từ chối{link.decision_note ? ` • ${link.decision_note}` : ""}
                    </span>
                );
            }

            if (status === "cancelled") {
                return (
                    <span className={`${baseClass} ${theme}`}>
                        Yêu cầu bị hủy
                        {link.decision_note ? ` • ${link.decision_note}` : ""}
                    </span>
                );
            }

            return null;
        },
        [handleCancelFromSource]
    );

    const canCheckInKR = (kr, objective) => {
        return canCheckInKeyResult(currentUser, kr, objective);
    };

    const handleOpenCheckIn = (kr, objective) => {
        if (!openCheckInModal) return;
        openCheckInModal({ ...kr, objective_id: objective.objective_id });
    };

    const handleOpenCheckInHistory = (kr, objective) => {
        if (!openCheckInHistory) return;
        openCheckInHistory({ ...kr, objective_id: objective.objective_id });
    };

    const [archiving, setArchiving] = useState(null);
    const [unarchiving, setUnarchiving] = useState(null);
    const [deleting, setDeleting] = useState(null);

    // === MODAL XÁC NHẬN CHUNG ===
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "OK",
        cancelText: "Hủy",
    });

    const openConfirm = (
        title,
        message,
        onConfirm,
        confirmText = "OK",
        cancelText = "Hủy"
    ) => {
        setConfirmModal({
            show: true,
            title,
            message,
            onConfirm,
            confirmText,
            cancelText,
        });
    };

    const closeConfirm = () => {
        setConfirmModal((prev) => ({ ...prev, show: false }));
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // === XỬ LÝ CLICK OUTSIDE ĐỂ ĐÓNG MENU ===
    const menuRefs = useRef({});

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Kiểm tra xem click có nằm trong bất kỳ menu nào không
            let clickedInsideMenu = false;
            
            Object.values(menuRefs.current).forEach((ref) => {
                if (ref && ref.contains(event.target)) {
                    clickedInsideMenu = true;
                }
            });

            // Nếu click ra ngoài tất cả menu, đóng tất cả menu
            if (!clickedInsideMenu) {
                setOpenObj((prev) => {
                    const newState = { ...prev };
                    // Đóng tất cả menu (các key bắt đầu bằng "menu_")
                    Object.keys(newState).forEach((key) => {
                        if (key.startsWith("menu_")) {
                            newState[key] = false;
                        }
                    });
                    return newState;
                });
            }
        };

        // Chỉ lắng nghe khi có menu đang mở
        const hasOpenMenu = Object.keys(openObj).some(
            (key) => key.startsWith("menu_") && openObj[key]
        );

        if (hasOpenMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [openObj, setOpenObj]);

    // === TẢI OKR LƯU TRỮ ===
    useEffect(() => {
        if (showArchived) {
            const fetchArchived = async () => {
                setLoadingArchived(true);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const params = new URLSearchParams({
                        archived: "1",
                        include_archived_kr: "1",
                    });
                    if (cycleFilter) params.append("cycle_id", cycleFilter);

                    const res = await fetch(`/my-objectives?${params}`, {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        setArchivedItems(json.data.data || []);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setLoadingArchived(false);
                }
            };
            fetchArchived();
        } else {
            setArchivedItems([]);
            setArchivedCount(0);
        }
    }, [showArchived, cycleFilter]);

    // === HELPER: Tìm quý hiện tại ===
    const getCurrentCycle = (cyclesList) => {
        const now = new Date();
        const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
        const currentYear = now.getFullYear();

        return cyclesList.find((cycle) => {
            const match = cycle.cycle_name.match(/Quý (\d+) năm (\d+)/);
            if (!match) return false;
            const quarter = parseInt(match[1]);
            const year = parseInt(match[2]);
            return quarter === currentQuarter && year === currentYear;
        });
    };

    // === 1. FRESH TRẠNG THÁI: XÓA cycle_id KHI VÀO TRANG ===
    useEffect(() => {
        const url = new URL(window.location);
        if (url.searchParams.has("cycle_id")) {
            url.searchParams.delete("cycle_id");
            window.history.replaceState({}, "", url);
        }
        setCycleFilter(null); // Reset filter
    }, []);

    // === 2. TỰ ĐỘNG CHỌN QUÝ HIỆN TẠI SAU KHI FRESH ===
    useEffect(() => {
        if (cycleFilter) return;

        const currentCycle = getCurrentCycle(cyclesList);
        if (currentCycle) {
            setCycleFilter(currentCycle.cycle_id);
            return;
        }

        if (items.length > 0 && items[0]?.cycle_id) {
            setCycleFilter(items[0].cycle_id);
        }
    }, [cycleFilter, cyclesList, items]);

    // === 3. CHỌN QUÝ: KHÔNG CẬP NHẬT URL ===
    const handleCycleChange = (newCycleId) => {
        setCycleFilter(newCycleId);
    };

    // === RELOAD CẢ 2 TAB TỪ SERVER ===
    const reloadBothTabs = useCallback(
        async (token) => {
            const baseParams = new URLSearchParams();
            if (cycleFilter) baseParams.append("cycle_id", cycleFilter);

            // Tab Hoạt động
            const activeRes = await fetch(`/my-objectives?${baseParams}`, {
                headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
            });
            const activeJson = await activeRes.json();
            if (activeJson.success) {
                setItems(activeJson.data.data || []);
            }

            // Tab Lưu trữ
            if (showArchived) {
                const archivedParams = new URLSearchParams({
                    archived: "1",
                    include_archived_kr: "1",
                });
                if (cycleFilter) archivedParams.append("cycle_id", cycleFilter);
                const archivedRes = await fetch(
                    `/my-objectives?${archivedParams}`,
                    {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    }
                );
                const archivedJson = await archivedRes.json();
                if (archivedJson.success) {
                    setArchivedItems(archivedJson.data.data || []);
                }
            }
        },
        [cycleFilter, showArchived, setItems]
    );

    // === LƯU TRỮ OKR ===
    const handleArchive = async (id) => {
        openConfirm(
            "Lưu trữ OKR",
            "Bạn sẽ không thể chỉnh sửa OKR này nữa.",
            async () => {
                setArchiving(id);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const res = await fetch(`/my-objectives/${id}/archive`, {
                        method: "POST",
                        headers: {
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                    });
                    const json = await res.json();
                    if (json.success) {
                        await reloadBothTabs(token);
                        setToast({ type: "success", message: json.message });
                    } else {
                        throw new Error(json.message);
                    }
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setArchiving(null);
                }
            },
            "Lưu trữ",
            "Hủy"
        );
    };

    // === LƯU TRỮ KR ===
    const handleArchiveKR = async (krId) => {
        openConfirm(
            "Lưu trữ Key Result",
            "Key Result sẽ được chuyển vào tab Lưu trữ.",
            async () => {
                setArchivingKR(krId);
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    const obj = items.find((o) =>
                        o.key_results?.some((kr) => kr.kr_id === krId)
                    );
                    if (!obj) throw new Error("Không tìm thấy OKR cha.");

                    const res = await fetch(
                        `/my-key-results/${obj.objective_id}/${krId}/archive`,
                        {
                            method: "POST",
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    );
                    const json = await res.json();
                    if (!json.success)
                        throw new Error(json.message || "Lưu trữ thất bại");

                    await reloadBothTabs(token);
                    setToast({ type: "success", message: json.message });
                } catch (err) {
                    setToast({ type: "error", message: err.message });
                } finally {
                    setArchivingKR(null);
                }
            }
        );
    };

    const openAssignModal = (kr, objective) => {
        setAssignModal({
            show: true,
            kr,
            objective,
            email: "",
            loading: false,
        });
    };

    const closeAssignModal = () => {
        setAssignModal((prev) => ({ ...prev, show: false }));
    };

    const handleAssignKR = async () => {
        const { kr, objective, email } = assignModal;

        // 1. Validate email
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setToast({ type: "error", message: "Vui lòng nhập email hợp lệ." });
            return;
        }

        // 2. Bật loading
        setAssignModal((prev) => ({ ...prev, loading: true }));

        try {
            // 3. Lấy CSRF token
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");

            if (!token) {
                throw new Error("Không tìm thấy CSRF token");
            }

            // 4. Gửi request
            const res = await fetch(
                `/my-key-results/${objective.objective_id}/${kr.kr_id}/assign`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ email }),
                }
            );

            // 5. Parse JSON (có thể lỗi nếu server trả HTML)
            let json;
            try {
                json = await res.json();
            } catch (parseErr) {
                throw new Error("Phản hồi từ server không hợp lệ");
            }

            // 6. Kiểm tra HTTP status + success
            if (!res.ok) {
                throw new Error(
                    json.message || `Lỗi ${res.status}: Giao việc thất bại`
                );
            }

            if (!json.success) {
                throw new Error(json.message || "Giao việc thất bại");
            }

            // Cập nhật giao diện ngay lập tức
            if (json.data?.assigned_to) {
                const assignee = json.data.assigned_to;

                setItems((prevItems) =>
                    prevItems.map((obj) => ({
                        ...obj,
                        key_results: obj.key_results.map((kr) =>
                            kr.kr_id === assignModal.kr.kr_id
                                ? {
                                      ...kr,
                                      assigned_to: assignee.user_id,
                                      assignee: assignee,
                                  }
                                : kr
                        ),
                    }))
                );
            }

            setToast({
                type: "success",
                message: json.message || "Giao việc thành công!",
            });
            closeAssignModal();
        } catch (err) {
            // 10. Xử lý lỗi
            console.error("Assign KR error:", err);
            setToast({
                type: "error",
                message: err.message || "Đã có lỗi xảy ra",
            });
        } finally {
            // 11. Tắt loading
            setAssignModal((prev) => ({ ...prev, loading: false }));
        }
    };

    // === HELPER FORMAT ===
    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "Bản nháp";
            case "active":
                return "Đang thực hiện";
            case "completed":
                return "Hoàn thành";
            default:
                return status || "";
        }
    };

    const getUnitText = (unit) => {
        switch (unit?.toLowerCase()) {
            case "number":
                return "Số lượng";
            case "percent":
                return "Phần trăm";
            case "completion":
                return "Hoàn thành";
            default:
                return unit || "";
        }
    };

    const getAssigneeInfo = (kr) => {
        if (!kr)
            return {
                name: "",
                avatar: null,
                department: null,
                email: "",
            };
        const user =
            kr.assigned_user ||
            kr.assignedUser ||
            kr.assignee ||
            null;

        if (user) {
            return {
                name:
                    user.full_name ||
                    user.fullName ||
                    user.name ||
                    user.username ||
                    user.email ||
                    `User ${user.user_id || ""}`,
                avatar:
                    user.avatar_url ||
                    user.avatar ||
                    user.profile_photo_url ||
                    user.profile_photo_path ||
                    user.photo_url ||
                    null,
                department:
                    user.department?.d_name ||
                    user.department?.name ||
                    user.department_name ||
                    user.department ||
                    null,
                email: user.email || "",
            };
        }

        return {
            name: kr.assigned_to || "",
            avatar: null,
            department: null,
            email: "",
        };
    };

    const handleAssigneeHover = (event, info) => {
        if (!info) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setAssigneeTooltip({
            info,
            position: {
                x: rect.left + rect.width / 2 + window.scrollX,
                y: rect.top + window.scrollY,
            },
        });
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                    <CycleDropdown
                        cyclesList={cyclesList}
                        cycleFilter={cycleFilter}
                        handleCycleChange={setCycleFilter}
                        dropdownOpen={dropdownOpen}
                        setDropdownOpen={setDropdownOpen}
                    />
                </div>

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

            {/* BẢNG OKR */}
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
                        {/* Loading */}
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

                        {/* Danh sách chính rỗng */}
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

                        {/* OKR Đang hoạt động */}
                        {!showArchived &&
                            !loading &&
                            itemsWithLinkedChildren.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    <tr
                                        className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td
                                            colSpan={7}
                                            className="px-3 py-3 border-r border-slate-200"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-1">
                                                    {obj.key_results &&
                                                        obj.key_results.length >
                                                            0 && (
                                                            <button
                                                                onClick={() =>
                                                                    setOpenObj(
                                                                        (
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            [obj.objective_id]:
                                                                                !prev[
                                                                                    obj
                                                                                        .objective_id
                                                                                ],
                                                                        })
                                                                    )
                                                                }
                                                                className="p-2 rounded-lg hover:bg-slate-100 transition-all duration-200 group"
                                                                title="Đóng/mở Key Results"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                    className={`w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-transform duration-200 ${
                                                                        openObj[
                                                                            obj
                                                                                .objective_id
                                                                        ]
                                                                            ? "rotate-90"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}

                                                    <span className="font-semibold text-slate-900 truncate">
                                                        {obj.obj_title}
                                                    </span>
                                                </div>
                                                {renderLinkBadge(
                                                    linkLookup.byObjective[obj.objective_id]
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <div className="flex items-center justify-center gap-1">
                                                    {onOpenLinkModal && (
                                                        <button
                                                            onClick={() =>
                                                                onOpenLinkModal({
                                                                    sourceType: "objective",
                                                                    source: obj,
                                                                })
                                                            }
                                                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                                            title="Liên kết với OKR cấp cao"
                                                        >
                                                            <svg
                                                                className="h-4 w-4"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.656-5.656l1.414-1.414M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 015.656 5.656l-1.414 1.414"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}
                                                <button
                                                    onClick={() =>
                                                        setEditingObjective({
                                                            ...obj,
                                                            level:
                                                                obj.level ||
                                                                "team",
                                                        })
                                                    }
                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Sửa Objective"
                                                >
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setCreatingFor(obj)
                                                    }
                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Thêm KR"
                                                >
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <circle
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            fill="none"
                                                        />
                                                        <path
                                                            d="M12 7V17M7 12H17"
                                                            stroke="currentColor"
                                                            strokeWidth="3"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleArchive(
                                                            obj.objective_id
                                                        )
                                                    }
                                                    disabled={
                                                        archiving ===
                                                        obj.objective_id
                                                    }
                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                    title="Lưu trữ OKR"
                                                >
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Key Results */}
                                    {openObj[obj.objective_id] &&
                                        obj.key_results?.map((kr) => {
                                            const isLinkedKR = kr.isLinked;
                                            return (
                                            <tr key={kr.kr_id}>
                                                <td className="px-8 py-3 border-r border-slate-200">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            {isLinkedKR && (
                                                                <LuAlignCenterHorizontal
                                                                    className="h-4 w-4 text-indigo-600 flex-shrink-0"
                                                                    title="Đã liên kết với OKR đích"
                                                                />
                                                            )}
                                                            <span className="font-medium text-slate-900">
                                                                {kr.kr_title}
                                                            </span>
                                                        </div>
                                                        {!isLinkedKR && renderLinkBadge(linkLookup.byKr[kr.kr_id])}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.assigned_to ||
                                                    kr.assigned_user ||
                                                    kr.assignedUser ||
                                                    kr.assignee ? (
                                                        (() => {
                                                            const info = getAssigneeInfo(kr);
                                                            const displayName = info.name || "";
                                                            const avatarSrc = info.avatar;
                                                            const initial =
                                                                displayName?.trim()?.charAt(0)?.toUpperCase() ||
                                                                (kr.assigned_to
                                                                    ? String(kr.assigned_to).charAt(0).toUpperCase()
                                                                    : "?");
                                                            return (
                                                                <div
                                                                    className="flex items-center justify-center gap-2"
                                                                    onMouseEnter={(e) => handleAssigneeHover(e, info)}
                                                                    onMouseLeave={() => setAssigneeTooltip(null)}
                                                                >
                                                                    {avatarSrc ? (
                                                                        <img
                                                                            src={avatarSrc}
                                                                            alt={displayName}
                                                                            className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                                                                            {initial}
                                                                        </div>
                                                                    )}
                                                                    <span className="max-w-[120px] truncate text-sm text-slate-700">
                                                                        {displayName || kr.assigned_to}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">
                                                            Chưa giao
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                            (
                                                                kr.status || ""
                                                            ).toUpperCase() ===
                                                            "COMPLETED"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : (
                                                                      kr.status ||
                                                                      ""
                                                                  ).toUpperCase() ===
                                                                  "ACTIVE"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {getStatusText(
                                                            kr.status
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {getUnitText(kr.unit)}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.current_value ?? ""}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {kr.target_value ?? ""}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-200">
                                                    {formatPercent(
                                                        kr.progress_percent
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {isLinkedKR ? (
                                                            // Virtual KR - chỉ hiển thị nút hủy liên kết
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm(`Bạn có chắc chắn muốn hủy liên kết với "${kr.kr_title}"?`)) {
                                                                        const keepOwnership = window.confirm(
                                                                            "OKR này đang sở hữu OKR con. Giữ quyền sở hữu cho OKR cấp cao?"
                                                                        );
                                                                        if (onCancelLink && kr.link) {
                                                                            onCancelLink(kr.link.link_id, "", keepOwnership);
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                                title="Hủy liên kết"
                                                            >
                                                                <svg
                                                                    className="h-4 w-4"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M6 18L18 6M6 6l12 12"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        ) : (
                                                            // KR thật - hiển thị các nút bình thường
                                                            <>
                                                                {onOpenLinkModal && (
                                                                    <button
                                                                        onClick={() =>
                                                                            onOpenLinkModal({
                                                                                sourceType: "kr",
                                                                                source: {
                                                                                    ...kr,
                                                                                    objective_id:
                                                                                        obj.objective_id,
                                                                                    objective_level:
                                                                                        obj.level,
                                                                                    obj_title:
                                                                                        obj.obj_title,
                                                                                },
                                                                            })
                                                                        }
                                                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                                                        title="Liên kết OKR cấp cao"
                                                                    >
                                                                        <svg
                                                                            className="h-4 w-4"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.656-5.656l1.414-1.414M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 015.656 5.656l-1.414 1.414"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() =>
                                                                        setEditingKR(kr)
                                                                    }
                                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                                                    title="Sửa KR"
                                                                >
                                                                    <svg
                                                                        className="h-4 w-4"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={
                                                                                2
                                                                            }
                                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                                {/* Menu 3 chấm dọc – ĐÃ SỬA Z-INDEX */}
                                                                {(openCheckInModal &&
                                                                    canCheckInKR(
                                                                        kr,
                                                                        obj
                                                                    )) ||
                                                                openCheckInHistory ||
                                                                onOpenLinkModal ? (
                                                                    <div 
                                                                        className="relative z-[1000]"
                                                                        ref={(el) => {
                                                                            menuRefs.current[`menu_${kr.kr_id}`] = el;
                                                                        }}
                                                                    >
                                                                        <button
                                                                            onClick={(
                                                                                e
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                const menuKey = `menu_${kr.kr_id}`;
                                                                                const isCurrentlyOpen = openObj[menuKey];
                                                                                
                                                                                // Đóng tất cả menu trước
                                                                                setOpenObj((prev) => {
                                                                                    const newState = { ...prev };
                                                                                    // Đóng tất cả menu khác
                                                                                    Object.keys(newState).forEach((key) => {
                                                                                        if (key.startsWith("menu_")) {
                                                                                            newState[key] = false;
                                                                                        }
                                                                                    });
                                                                                    // Mở menu hiện tại nếu nó đang đóng
                                                                                    if (!isCurrentlyOpen) {
                                                                                        newState[menuKey] = true;
                                                                                    }
                                                                                    return newState;
                                                                                });
                                                                            }}
                                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                                            title="Tùy chọn Check-in"
                                                                        >
                                                                            <svg
                                                                                className="h-4 w-4"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth={
                                                                                        2
                                                                                    }
                                                                                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                                                                />
                                                                            </svg>
                                                                        </button>
                                                                        {/* Dropdown Menu – z-index cao hơn */}
                                                                        {openObj[
                                                                            `menu_${kr.kr_id}`
                                                                        ] && (
                                                                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-[9999] py-1">
                                                                                {/* Giao việc */}
                                                                                <button
                                                                                    onClick={(
                                                                                        e
                                                                                    ) => {
                                                                                        e.stopPropagation();
                                                                                        openAssignModal(
                                                                                            kr,
                                                                                            obj
                                                                                        );
                                                                                        setOpenObj(
                                                                                            (
                                                                                                prev
                                                                                            ) => ({
                                                                                                ...prev,
                                                                                                [`menu_${kr.kr_id}`]: false,
                                                                                            })
                                                                                        );
                                                                                    }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                >
                                                                                    <svg
                                                                                        className="h-4 w-4"
                                                                                        fill="none"
                                                                                        viewBox="0 0 24 24"
                                                                                        stroke="currentColor"
                                                                                    >
                                                                                        <path
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                            strokeWidth={
                                                                                                2
                                                                                            }
                                                                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                                                        />
                                                                                    </svg>
                                                                                    Giao
                                                                                    việc
                                                                                </button>
                                                                                {/* Check-in */}
                                                                                {openCheckInModal &&
                                                                                    canCheckInKR(
                                                                                        kr,
                                                                                        obj
                                                                                    ) && (
                                                                                        <button
                                                                                            onClick={(
                                                                                                e
                                                                                            ) => {
                                                                                                e.stopPropagation();
                                                                                                handleOpenCheckIn(
                                                                                                    kr,
                                                                                                    obj
                                                                                                );
                                                                                                setOpenObj(
                                                                                                    (
                                                                                                        prev
                                                                                                    ) => ({
                                                                                                        ...prev,
                                                                                                        [`menu_${kr.kr_id}`]: false,
                                                                                                    })
                                                                                                );
                                                                                            }}
                                                                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                        >
                                                                                            <svg
                                                                                                className="h-4 w-4"
                                                                                                fill="none"
                                                                                                viewBox="0 0 24 24"
                                                                                                stroke="currentColor"
                                                                                            >
                                                                                                <path
                                                                                                    strokeLinecap="round"
                                                                                                    strokeLinejoin="round"
                                                                                                    strokeWidth={
                                                                                                        2
                                                                                                    }
                                                                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                                                />
                                                                                            </svg>
                                                                                            Check-in
                                                                                            Key
                                                                                            Result
                                                                                        </button>
                                                                                    )}

                                                                                {/* Lịch sử */}
                                                                                {openCheckInHistory && (
                                                                                    <button
                                                                                        onClick={(
                                                                                            e
                                                                                        ) => {
                                                                                            e.stopPropagation();
                                                                                            handleOpenCheckInHistory(
                                                                                                kr,
                                                                                                obj
                                                                                            );
                                                                                            setOpenObj(
                                                                                                (
                                                                                                    prev
                                                                                                ) => ({
                                                                                                    ...prev,
                                                                                                    [`menu_${kr.kr_id}`]: false,
                                                                                                })
                                                                                            );
                                                                                        }}
                                                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                    >
                                                                                        <svg
                                                                                            className="h-4 w-4"
                                                                                            fill="none"
                                                                                            viewBox="0 0 24 24"
                                                                                            stroke="currentColor"
                                                                                        >
                                                                                            <path
                                                                                                strokeLinecap="round"
                                                                                                strokeLinejoin="round"
                                                                                                strokeWidth={
                                                                                                    2
                                                                                                }
                                                                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                                            />
                                                                                        </svg>
                                                                                        Lịch
                                                                                        sử
                                                                                        Check-in
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : null}
                                                                <button
                                                                    onClick={() =>
                                                                        handleArchiveKR(
                                                                            kr.kr_id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        archivingKR ===
                                                                        kr.kr_id
                                                                    }
                                                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
                                                                    title="Lưu trữ Key Result"
                                                                >
                                                                    <svg
                                                                        className="h-4 w-4"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={
                                                                                2
                                                                            }
                                                                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                </React.Fragment>
                            ))}

                        {/* OKR Lưu trữ */}
                        {showArchived ? (
                            <ObjectiveArchive
                                archivedItems={archivedItems}
                                openObj={openObj}
                                setOpenObj={setOpenObj}
                                loadingArchived={loadingArchived}
                                showArchived={showArchived}
                                reloadBothTabs={reloadBothTabs}
                            />
                        ) : null}
                    </tbody>
                </table>
            </div>

            {/* === MODAL XÁC NHẬN === */}
            <ConfirmationModal
                confirmModal={confirmModal}
                closeConfirm={closeConfirm}
            />

            {/* === TOAST === */}
            <ToastNotification toast={toast} />

            {/* === MODAL GIAO VIỆC === */}
            <AssignKeyResultModal
                show={assignModal.show}
                kr={assignModal.kr}
                objective={assignModal.objective}
                email={assignModal.email}
                setEmail={(email) =>
                    setAssignModal((prev) => ({ ...prev, email }))
                }
                loading={assignModal.loading}
                onConfirm={handleAssignKR}
                onClose={closeAssignModal}
            />

            {assigneeTooltip && assigneeTooltip.info && (
                <div
                    className="pointer-events-none fixed z-[2000]"
                    style={{
                        left: assigneeTooltip.position.x,
                        top: assigneeTooltip.position.y - 12,
                    }}
                >
                    <div className="relative -translate-x-1/2 -translate-y-full rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-slate-100">
                        <div className="flex items-start gap-3">
                            {assigneeTooltip.info.avatar ? (
                                <img
                                    src={assigneeTooltip.info.avatar}
                                    alt={assigneeTooltip.info.name}
                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-700">
                                    {assigneeTooltip.info.name?.trim()?.charAt(0)?.toUpperCase() ||
                                        "?"}
                                </div>
                            )}
                            <div className="min-w-[180px] max-w-[240px]">
                                <p className="text-base font-semibold text-slate-900">
                                    {assigneeTooltip.info.name || "Không rõ tên"}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {assigneeTooltip.info.department || "Phòng ban: Chưa xác định"}
                                </p>
                                {assigneeTooltip.info.email && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        {assigneeTooltip.info.email}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-[1px_1px_2px_rgba(15,23,42,.15)]"></div>
                    </div>
                </div>
            )}
        </div>
    );
}
