
import React, { useEffect, useMemo, useState } from "react";
import ObjectiveModal from "../pages/ObjectiveModal.jsx";
import KeyResultModal from "../pages/KeyResultModal.jsx";
import ToastComponent from "../pages/ToastComponent.jsx";
import ErrorBoundary from "./ErrorBoundary";
import OKRTable from "./OKRTable";
import CheckInHistory from "./CheckInHistory";
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import PieChart from "./PieChart";

export default function Dashboard() {
    const [items, setItems] = useState([]);
    const [allItems, setAllItems] = useState([]); // Lưu tất cả items đã tải
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
    const [itemsPerPage] = useState(5); // Số items hiển thị mỗi trang (client-side)
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [checkInHistory, setCheckInHistory] = useState({ open: false, keyResult: null });
    const [activeTab, setActiveTab] = useState('my'); // 'my', 'department', 'company'
    const [teamTrendRange, setTeamTrendRange] = useState("month"); // 'day' | 'week' | 'month'
    const teamTrendOptions = [
        { value: "day", label: "Ngày" },
        { value: "week", label: "Tuần" },
        { value: "month", label: "Tháng" },
    ];
    const teamTrendLabelMap = {
        day: "ngày",
        week: "tuần",
        month: "tháng",
    };
    
    // Filters riêng cho từng tab
    const [myFilters, setMyFilters] = useState({
        cycle: "",
        department: "",
        myOKROnly: false,
        showFilters: false
    });
    const [departmentFilters, setDepartmentFilters] = useState({
        cycle: "",
        department: "",
        myOKROnly: false,
        showFilters: false
    });
    const [companyFilters, setCompanyFilters] = useState({
        cycle: "",
        department: "",
        myOKROnly: false,
        showFilters: false
    });

    const calculateObjectiveProgress = (objective) => {
        const keyResults = objective?.key_results || [];
        if (!keyResults.length) return 0;
        const total = keyResults.reduce((sum, kr) => {
            let value = 0;
            if (kr.progress_percent !== null && kr.progress_percent !== undefined) {
                value = parseFloat(kr.progress_percent) || 0;
            } else if (kr.target_value) {
                const target = parseFloat(kr.target_value) || 0;
                const current = parseFloat(kr.current_value) || 0;
                value = target > 0 ? (current / target) * 100 : 0;
            }
            return sum + (isFinite(value) ? value : 0);
        }, 0);
        return total / keyResults.length;
    };

    const formatDate = (value) => {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "--";
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatDateRange = (start, end) => {
        if (!start && !end) return "--";
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    const buildSummary = (list) => {
        if (!Array.isArray(list) || list.length === 0) {
            return {
                total: 0,
                completed: 0,
                overdue: 0,
                upcoming: 0,
                progressAvg: 0,
                inProgress: 0,
                notStarted: 0,
            };
        }
        let completed = 0;
        let overdue = 0;
        let upcoming = 0;
        let inProgress = 0;
        let notStarted = 0;
        let progressSum = 0;

        list.forEach((objective) => {
            const progress = calculateObjectiveProgress(objective);
            progressSum += progress;
            const statusMeta = getObjectiveStatusMeta(objective);
            const statusLabel = statusMeta?.label || "";
            if (statusLabel === "Hoàn thành") {
                completed += 1;
            } else if (statusLabel === "Trễ hạn") {
                            overdue += 1;
            } else if (statusLabel === "Sắp đến hạn") {
                            upcoming += 1;
                inProgress += 1;
            } else if (statusLabel === "Đang tiến hành") {
                inProgress += 1;
            } else if (statusLabel === "Chưa bắt đầu") {
                notStarted += 1;
            }
        });

        return {
            total: list.length,
            completed,
            overdue,
            upcoming,
            progressAvg: list.length ? progressSum / list.length : 0,
            inProgress,
            notStarted,
        };
    };

    const getObjectiveStatusMeta = (objective) => {
        const now = new Date();
        const progress = calculateObjectiveProgress(objective);
        const endDate =
            objective?.cycle?.end_date || objective?.end_date || null;

        if (progress >= 99.99) {
            return { label: "Hoàn thành", tone: "emerald" };
        }

        if (endDate) {
            const end = new Date(endDate);
            if (!Number.isNaN(end.getTime())) {
                const diffMs = end.getTime() - now.getTime();
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                if (diffDays < 0) {
                    return { label: "Trễ hạn", tone: "rose" };
                }
                if (diffDays <= 7) {
                    return { label: "Sắp đến hạn", tone: "amber" };
                }
            }
        }

        if (progress > 0) {
            return { label: "Đang tiến hành", tone: "blue" };
        }

        return { label: "Chưa bắt đầu", tone: "slate" };
    };

    const renderStatusBadge = (meta) => {
        if (!meta) {
            return (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    --
                </span>
            );
        }
        const toneMap = {
            emerald: "bg-emerald-100 text-emerald-700",
            blue: "bg-blue-100 text-blue-700",
            amber: "bg-amber-100 text-amber-700",
            rose: "bg-rose-100 text-rose-700",
            slate: "bg-slate-100 text-slate-700",
        };
        return (
            <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${toneMap[meta.tone] || toneMap.slate
                    }`}
            >
                {meta.label}
            </span>
        );
    };

    const getOwnerName = (objective) =>
        objective?.owner?.full_name ||
        objective?.owner_name ||
        objective?.user?.full_name ||
        objective?.user_name ||
        objective?.assignee_name ||
        "Không xác định";

    const getStartDate = (objective) =>
        objective?.cycle?.start_date || objective?.start_date || null;
    const getEndDate = (objective) =>
        objective?.cycle?.end_date || objective?.end_date || null;

    // Helper để lấy filters hiện tại dựa trên tab
    const getCurrentFilters = () => {
        if (activeTab === 'my') return myFilters;
        if (activeTab === 'department') return departmentFilters;
        return companyFilters;
    };

    // Helper để set filters cho tab hiện tại
    const setCurrentFilters = (newFilters) => {
        if (activeTab === 'my') setMyFilters(newFilters);
        else if (activeTab === 'department') setDepartmentFilters(newFilters);
        else setCompanyFilters(newFilters);
    };

    const normalizeCheckIns = (checkIns) => {
        if (!Array.isArray(checkIns)) return [];
        return checkIns
            .map((checkIn) => {
                if (!checkIn) return null;
                const progressPercent =
                    checkIn.progress_percent !== undefined && checkIn.progress_percent !== null
                        ? parseFloat(checkIn.progress_percent)
                        : undefined;
                const progressValue =
                    checkIn.progress_value !== undefined && checkIn.progress_value !== null
                        ? parseFloat(checkIn.progress_value)
                        : undefined;
                return {
                    ...checkIn,
                    progress_percent: Number.isFinite(progressPercent) ? progressPercent : undefined,
                    progress_value: Number.isFinite(progressValue) ? progressValue : undefined,
                };
            })
            .filter(Boolean);
    };

    const fetchCheckInsForKeyResult = async (objectiveId, keyResultId, token) => {
        if (!objectiveId || !keyResultId) return [];
        try {
            const res = await fetch(
                `/api/check-in/${objectiveId}/${keyResultId}/history`,
                {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }
            );
            if (!res.ok) {
                console.warn(
                    "Failed to load check-ins for KR",
                    keyResultId,
                    res.status,
                    res.statusText
                );
                return [];
            }
            const data = await res.json().catch((err) => {
                console.error(
                    "Error parsing check-in history",
                    keyResultId,
                    err
                );
                return null;
            });
            if (!data) return [];
            const checkInsData =
                data.data?.check_ins || data.check_ins || data.data || [];
            return normalizeCheckIns(checkInsData);
        } catch (error) {
            console.error(
                "Unexpected error fetching check-ins for KR",
                keyResultId,
                error
            );
            return [];
        }
    };

    const attachCheckInsToObjectives = async (objectives, token) => {
        if (!Array.isArray(objectives) || objectives.length === 0) {
            return objectives;
        }
        const enrichedObjectives = [];
        for (const objective of objectives) {
            const objectiveId =
                objective.objective_id || objective.id || objective.obj_id;
            const keyResults = Array.isArray(objective.key_results)
                ? objective.key_results
                : [];
            const enrichedKeyResults = [];
            for (const kr of keyResults) {
                const keyResultId = kr.kr_id || kr.id;
                let history =
                    Array.isArray(kr.check_ins) && kr.check_ins.length > 0
                        ? normalizeCheckIns(kr.check_ins)
                        : await fetchCheckInsForKeyResult(
                              objectiveId,
                              keyResultId,
                              token
                          );
                enrichedKeyResults.push({
                    ...kr,
                    check_ins: history,
                });
            }
            enrichedObjectives.push({
                ...objective,
                key_results: enrichedKeyResults,
            });
        }
        return enrichedObjectives;
    };

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

    const load = async (filter = "", myOKR = false) => {
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

            // Tải TẤT CẢ dữ liệu một lần (per_page lớn để lấy tất cả)
            let url = `/my-objectives?page=1&dashboard=1&per_page=1000&_t=${Date.now()}`;
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
                return { success: false, data: { data: [] } };
            });
            // Normalize data: convert keyResults to key_results
            const list = Array.isArray(objData?.data?.data)
                ? objData.data.data
                : Array.isArray(objData?.data)
                ? objData.data
                : [];
            const normalizedItems = Array.isArray(list)
                ? list.map(obj => ({
                    ...obj,
                    key_results: obj.key_results || obj.keyResults || []
                }))
                : [];
            if (resObj.ok && Array.isArray(list)) {
                const enrichedItems = await attachCheckInsToObjectives(
                    normalizedItems,
                    token
                );
                setAllItems(enrichedItems); // Lưu tất cả items
                setItems(enrichedItems); // Set items ban đầu
                try {
                    localStorage.setItem(
                        "my_objectives",
                        JSON.stringify(enrichedItems)
                    );
                } catch {}
            } else {
                console.warn('Keeping previous objectives due to bad response');
            }

        } catch (err) {
            console.error("Load error:", err);
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
            setToast({
                type: "error",
                message: "Không thể tải dữ liệu. Vui lòng thử lại.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentFilters = getCurrentFilters();
        load(currentFilters.cycle, currentFilters.myOKROnly);
    }, []); // Chỉ load một lần khi mount

    useEffect(() => {
        // Reset page khi chuyển tab hoặc filter thay đổi
        setPage(1);
    }, [activeTab, myFilters, departmentFilters, companyFilters]);

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

    // Phân loại OKR theo level
    const { myOKRs, departmentOKRs, companyOKRs } = useMemo(() => {
        const allItems = Array.isArray(items) ? items : [];
        
        return {
            myOKRs: allItems.filter(item => item.level === 'person'),
            departmentOKRs: allItems.filter(item => item.level === 'unit'),
            companyOKRs: allItems.filter(item => item.level === 'company')
        };
    }, [items]);

    const personalSummary = useMemo(() => buildSummary(myOKRs), [myOKRs]);
    const teamSummary = useMemo(() => buildSummary(departmentOKRs), [departmentOKRs]);
    const companySummary = useMemo(() => buildSummary(companyOKRs), [companyOKRs]);

    const prioritizeObjectives = (list) => {
        if (!Array.isArray(list)) return [];
        return [...list]
            .map((objective) => {
                const progress = calculateObjectiveProgress(objective);
                const endDate =
                    objective?.cycle?.end_date || objective?.end_date || null;
                const end = endDate ? new Date(endDate) : null;
                const endTime = end && !Number.isNaN(end.getTime()) ? end.getTime() : Number.POSITIVE_INFINITY;
                const completed = progress >= 99.99;
                return {
                    objective,
                    progress,
                    endTime,
                    completed,
                };
            })
            .sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1; // Ưu tiên OKR chưa hoàn thành
                }
                return a.endTime - b.endTime;
            });
    };

    const prioritizedPersonal = useMemo(
        () => prioritizeObjectives(myOKRs),
        [myOKRs]
    );
    const prioritizedTeam = useMemo(
        () => prioritizeObjectives(departmentOKRs),
        [departmentOKRs]
    );
    const prioritizedCompany = useMemo(
        () => prioritizeObjectives(companyOKRs),
        [companyOKRs]
    );

    const primaryPersonalOKR = prioritizedPersonal[0]?.objective || null;
    const primaryTeamOKR = prioritizedTeam[0]?.objective || null;
    const primaryCompanyOKR = prioritizedCompany[0]?.objective || null;

    const personalBarData = useMemo(() => {
        if (!myOKRs || myOKRs.length === 0) return [];
        return myOKRs.map((objective) => ({
            label: objective.obj_title || "Không tên",
            value: calculateObjectiveProgress(objective),
        }));
    }, [myOKRs]);

    const getISOWeekNumber = (date) => {
        const target = new Date(date.valueOf());
        target.setHours(0, 0, 0, 0);
        target.setDate(target.getDate() + 4 - (target.getDay() || 7)); // Thursday
        const yearStart = new Date(target.getFullYear(), 0, 1);
        return Math.ceil(((target - yearStart) / (1000 * 60 * 60 * 24) + 1) / 7);
    };

    const getTrendBucket = (rawDate) => {
        if (!rawDate) return null;
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);

        if (teamTrendRange === "day") {
            const key = date.toISOString().slice(0, 10);
            const label = date.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
            });
            return { key, label, time: date.getTime() };
        }

        if (teamTrendRange === "week") {
            const weekStart = new Date(date);
            const diff = (weekStart.getDay() + 6) % 7; // Monday = 0
            weekStart.setDate(weekStart.getDate() - diff);
            weekStart.setHours(0, 0, 0, 0);
            const weekNumber = getISOWeekNumber(weekStart);
            const year = weekStart.getFullYear();
            const key = `${year}-W${weekNumber}`;
            const label = `Tuần ${weekNumber}/${year}`;
            return { key, label, time: weekStart.getTime() };
        }

        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const key = `${monthStart.getFullYear()}-${monthStart.getMonth()}`;
        const label = monthStart.toLocaleDateString("vi-VN", {
            month: "short",
            year: "numeric",
        });
        return { key, label, time: monthStart.getTime() };
    };

    const teamTrendData = useMemo(() => {
        if (!departmentOKRs || departmentOKRs.length === 0) return [];

        const clampProgress = (value) =>
            Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
        const buckets = new Map();

        const addSample = (rawDate, rawProgress) => {
            if (rawDate === null || rawDate === undefined) return;
            const bucketInfo = getTrendBucket(rawDate);
            if (!bucketInfo) return;
            const progressValue = clampProgress(Number(rawProgress));
            const bucket = buckets.get(bucketInfo.key) || {
                sum: 0,
                count: 0,
                label: bucketInfo.label,
                time: bucketInfo.time,
            };
            bucket.sum += progressValue;
            bucket.count += 1;
            bucket.label = bucketInfo.label;
            bucket.time = bucketInfo.time;
            buckets.set(bucketInfo.key, bucket);
        };

        departmentOKRs.forEach((objective) => {
            const objectiveProgress = calculateObjectiveProgress(objective);
            const baselineDate =
                objective.updated_at ||
                objective.completed_at ||
                objective.created_at ||
                objective?.cycle?.start_date ||
                objective?.cycle?.end_date ||
                null;
            if (baselineDate) {
                addSample(baselineDate, objectiveProgress);
            }

            (objective.key_results || []).forEach((kr) => {
                const krBaseProgress =
                    kr.progress_percent !== null && kr.progress_percent !== undefined
                        ? parseFloat(kr.progress_percent)
                        : (() => {
                              const target = parseFloat(kr.target_value) || 0;
                              const current = parseFloat(kr.current_value) || 0;
                              return target > 0 ? (current / target) * 100 : 0;
                          })();
                if (kr.updated_at || kr.created_at) {
                    addSample(kr.updated_at || kr.created_at, krBaseProgress);
                }

                if (Array.isArray(kr.check_ins)) {
                    kr.check_ins.forEach((checkIn) => {
                        const percent =
                            checkIn?.check_in_type === "percentage"
                                ? parseFloat(checkIn.progress_percent)
                                : (() => {
                                      const target =
                                          parseFloat(kr.target_value) || 0;
                                      const value =
                                          parseFloat(checkIn.progress_value) || 0;
                                      return target > 0 ? (value / target) * 100 : null;
                                  })();
                        if (!Number.isFinite(percent)) return;
                        const checkDate =
                            checkIn.checked_in_at ||
                            checkIn.created_at ||
                            checkIn.updated_at ||
                            null;
                        addSample(checkDate, percent);
                    });
                }
            });
        });

        return Array.from(buckets.values())
            .sort((a, b) => a.time - b.time)
            .map((bucket) => ({
                bucket: bucket.label,
                avgProgress: bucket.count ? bucket.sum / bucket.count : 0,
            }));
    }, [departmentOKRs, teamTrendRange]);

    const SummaryCard = ({
        title,
        subtitle,
        highlight,
        highlightLabel = "Tiến độ trung bình",
        metrics = [],
    }) => {
        const accentPalette = [
            {
                bg: "bg-sky-50",
                border: "border-sky-100",
                text: "text-sky-700",
            },
            {
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                text: "text-emerald-700",
            },
            {
                bg: "bg-violet-50",
                border: "border-violet-100",
                text: "text-violet-700",
            },
            {
                bg: "bg-amber-50",
                border: "border-amber-100",
                text: "text-amber-700",
            },
        ];

        const statusToneMap = {
            emerald: {
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                text: "text-emerald-700",
                badge: "bg-emerald-100 text-emerald-700",
                dot: "bg-emerald-500",
            },
            blue: {
                bg: "bg-blue-50",
                border: "border-blue-100",
                text: "text-blue-700",
                badge: "bg-blue-100 text-blue-700",
                dot: "bg-blue-500",
            },
            amber: {
                bg: "bg-amber-50",
                border: "border-amber-100",
                text: "text-amber-700",
                badge: "bg-amber-100 text-amber-700",
                dot: "bg-amber-500",
            },
            rose: {
                bg: "bg-rose-50",
                border: "border-rose-100",
                text: "text-rose-700",
                badge: "bg-rose-100 text-rose-700",
                dot: "bg-rose-500",
            },
            slate: {
                bg: "bg-slate-50",
                border: "border-slate-100",
                text: "text-slate-700",
                badge: "bg-slate-100 text-slate-700",
                dot: "bg-slate-500",
            },
        };

        return (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {subtitle}
                    </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">
                        {title}
                    </h3>
                </div>
                {highlight !== undefined && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 px-6 py-4 text-white shadow">
                            <span className="absolute inset-0 rounded-2xl border border-white/20" aria-hidden="true" />
                            <div className="relative">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                                    {highlightLabel}
                                </p>
                                <p className="mt-1 text-3xl font-bold">{highlight}</p>
                            </div>
                    </div>
                )}
            </div>

                {metrics.length > 0 && (
                    <div className="mt-6 space-y-4">
                        {(() => {
                            const statusMetric = metrics.find(
                                (metric) => metric.type === "status"
                            );
                            if (!statusMetric) return null;
                            const statusData = {
                                inProgress: statusMetric.value?.inProgress ?? 0,
                                upcoming: statusMetric.value?.upcoming ?? 0,
                                completed: statusMetric.value?.completed ?? 0,
                                overdue: statusMetric.value?.overdue ?? 0,
                            };
                            const statusDetails = [
                                {
                                    key: "inProgress",
                                    label: "Đang tiến hành",
                                    value: statusData.inProgress,
                                    tone: "blue",
                                },
                                {
                                    key: "upcoming",
                                    label: "Sắp đến hạn",
                                    value: statusData.upcoming,
                                    tone: "amber",
                                },
                                {
                                    key: "completed",
                                    label: "Hoàn thành",
                                    value: statusData.completed,
                                    tone: "emerald",
                                },
                                {
                                    key: "overdue",
                                    label: "Quá hạn",
                                    value: statusData.overdue,
                                    tone: "rose",
                                },
                            ];
                            return (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                                {statusMetric.label}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Phân bổ số lượng OKR theo trạng thái.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                            {statusDetails.map((detail) => {
                                                const tone =
                                                    statusToneMap[detail.tone] ||
                                                    statusToneMap.slate;
                                                return (
                                                    <div
                                                        key={detail.key}
                                                        className="rounded-2xl border border-white/60 bg-white px-4 py-3 text-center shadow-sm"
                                                    >
                                                        <span
                                                            className={`inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`}
                                                        />
                                                        <p className={`mt-2 text-xs font-semibold uppercase tracking-wide ${tone.text}`}>
                                                            {detail.label}
                                                        </p>
                                                        <p className="mt-1 text-2xl font-bold text-slate-900">
                                                            {detail.value}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {metrics
                                .filter((metric) => metric.type !== "status")
                                .map((metric, index) => {
                                    const accent =
                                        accentPalette[index % accentPalette.length];
                                    const valueIsPrimitive =
                                        typeof metric.value === "string" ||
                                        typeof metric.value === "number";

                                    return (
                    <div
                        key={metric.label}
                                            className={`rounded-2xl border ${accent.border} ${accent.bg} p-4`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <p
                                                    className={`text-xs font-semibold uppercase tracking-wide ${accent.text}`}
                                                >
                                                    {metric.label}
                                                </p>
                                            </div>
                                            <div className="mt-3 text-sm font-medium text-slate-700">
                                                {metric.type === "total" ? (
                                                    (() => {
                                                        const total =
                                                            metric.value?.total ?? 0;
                                                        const completed =
                                                            metric.value?.completed ?? 0;
                                                        return (
                                                            <div>
                                                                <p className="text-3xl font-bold text-slate-900">
                                                                    {total}
                                                                </p>
                                                                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                                                                    Hoàn thành {completed}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()
                                                ) : valueIsPrimitive ? (
                                                    <span className="text-base font-semibold text-slate-900">
                            {metric.value}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-start">
                                                        {metric.value}
                    </div>
                                                )}
                                            </div>
        </div>
    );
                                })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const filteredItems = useMemo(
        () => {
            let result = Array.isArray(items) ? items : [];

            // Filter by active tab
            if (activeTab === 'my') {
                result = result.filter(item => item.level === 'person');
            } else if (activeTab === 'department') {
                result = result.filter(item => item.level === 'unit');
            } else if (activeTab === 'company') {
                result = result.filter(item => item.level === 'company');
            }

            // Get filters cho tab hiện tại
            const currentFilters = activeTab === 'my' ? myFilters : 
                                 activeTab === 'department' ? departmentFilters : 
                                 companyFilters;

            // Apply filters riêng cho từng tab
            if (currentFilters.cycle) {
                result = result.filter(item => 
                    String(item.cycle_id) === String(currentFilters.cycle)
                );
            }

            if (currentFilters.department) {
                result = result.filter(item => 
                    String(item.department_id) === String(currentFilters.department)
                );
            }

            if (currentFilters.myOKROnly && currentUser) {
                result = result.filter(item => 
                    String(item.user_id) === String(currentUser.user_id || currentUser.id)
                );
            }

            // No sorting as requested; keep server order
            return result;
        },
        [items, activeTab, myFilters, departmentFilters, companyFilters, currentUser]
    );

    const sortedItems = useMemo(() => {
        const now = new Date();
        // Tính tổng tiến độ của tất cả OKR
        const totalProgress = filteredItems.reduce((sum, item) => {
            if (!item.key_results || item.key_results.length === 0) return sum;
            const itemProgress = item.key_results.reduce((krSum, kr) => {
                const percentage = kr.progress_percent !== null && kr.progress_percent !== undefined
                    ? parseFloat(kr.progress_percent)
                    : (kr.target_value > 0 ? (parseFloat(kr.current_value || 0) / parseFloat(kr.target_value)) * 100 : 0);
                return krSum + percentage;
            }, 0) / item.key_results.length;
            return sum + itemProgress;
        }, 0);
        const overallAvgProgress = filteredItems.length > 0 ? totalProgress / filteredItems.length : 0;

        // Sort by created_at descending (newest first) và thêm thông tin deadline
        const sorted = [...filteredItems].map(item => {
            // Tính overall progress cho item này (tỷ lệ % chung)
            let itemOverallProgress = 0;
            if (item.key_results && item.key_results.length > 0) {
                const itemProgress = item.key_results.reduce((krSum, kr) => {
                    const percentage = kr.progress_percent !== null && kr.progress_percent !== undefined
                        ? parseFloat(kr.progress_percent)
                        : (kr.target_value > 0 ? (parseFloat(kr.current_value || 0) / parseFloat(kr.target_value)) * 100 : 0);
                    return krSum + percentage;
                }, 0);
                itemOverallProgress = itemProgress / item.key_results.length;
            }

            // Kiểm tra quá hạn và tính deadline, priority dựa trên cycle end_date
            let isOverdue = false;
            let isUpcoming = false; // Sắp hết hạn (còn <= 7 ngày)
            let deadlineCharacter = '-';
            let priority = 'low'; // Mặc định là thấp
            let status = 'in_progress'; // Mặc định là đang thực hiện

            // Format ngày hết hạn nếu có
            if (item.cycle && item.cycle.end_date) {
                const endDate = new Date(item.cycle.end_date);
                deadlineCharacter = endDate.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }

            // Nếu tiến độ đạt 100% (hoặc >= 99.99 để tránh sai số làm tròn), trạng thái là hoàn thành (ưu tiên cao nhất)
            if (itemOverallProgress >= 99.99) {
                status = 'completed';
                priority = 'low'; // Hoàn thành = ưu tiên thấp
                // Không kiểm tra deadline nữa nếu đã hoàn thành
            } else if (item.cycle && item.cycle.end_date) {
                const endDate = new Date(item.cycle.end_date);
                isOverdue = endDate < now;

                // Tính mức độ ưu tiên và trạng thái dựa trên thời gian còn lại
                const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                
                if (isOverdue) {
                    priority = 'high'; // Quá hạn = ưu tiên cao
                    status = 'overdue';
                } else if (daysRemaining <= 7 && daysRemaining > 0) {
                    priority = 'high'; // Còn <= 7 ngày = ưu tiên cao
                    isUpcoming = true; // Sắp hết hạn
                    status = 'upcoming';
                } else if (daysRemaining <= 30) {
                    priority = 'medium'; // Còn <= 30 ngày = ưu tiên trung bình
                    status = 'in_progress';
                } else {
                    priority = 'low'; // Còn > 30 ngày = ưu tiên thấp
                    status = 'in_progress';
                }
            }

            return {
                ...item,
                deadlineCharacter,
                isOverdue,
                isUpcoming,
                priority,
                status,
                itemOverallProgress
            };
        }).sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Descending order
        });

        // Phân trang ở client-side: lấy 5 items cho trang hiện tại
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sorted.slice(startIndex, endIndex);
    }, [filteredItems, page, itemsPerPage]);

    // Tính tổng số trang dựa trên filteredItems
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
    }, [filteredItems.length, itemsPerPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const openCheckInHistory = (keyResult) => {
        console.log('Opening check-in history for:', keyResult);
        console.log('Objective ID:', keyResult?.objective_id);
        setCheckInHistory({ open: true, keyResult });
    };

    const roleName = currentUser?.role?.role_name
        ? currentUser.role.role_name.toLowerCase()
        : "";
    const isManager = roleName === "manager";
    const isAdmin = Boolean(currentUser?.is_admin || roleName === "admin");
    const canSeeTeamInsights =
        isManager || isAdmin || (departmentOKRs?.length || 0) > 0;

    const personalMetrics = [
        {
            label: "OKR nổi bật",
            value: primaryPersonalOKR?.obj_title || "Chưa có OKR nào",
        },
        {
            label: "Thời gian",
            value: primaryPersonalOKR
                ? formatDateRange(
                      getStartDate(primaryPersonalOKR),
                      getEndDate(primaryPersonalOKR)
                  )
                : "--",
        },
        {
            label: "Trạng thái",
            value: {
                inProgress: personalSummary.inProgress,
                upcoming: personalSummary.upcoming,
                completed: personalSummary.completed,
                overdue: personalSummary.overdue,
            },
            type: "status",
        },
        {
            label: "Tổng OKR",
            value: {
                total: personalSummary.total,
                completed: personalSummary.completed,
            },
            type: "total",
        },
        {
            label: "Sắp đến hạn",
            value: `${personalSummary.upcoming}`,
        },
        {
            label: "Quá hạn",
            value: `${personalSummary.overdue}`,
        },
    ];

    const teamMetrics = [
        {
            label: "Team nổi bật",
            value:
                primaryTeamOKR?.department?.d_name ||
                primaryTeamOKR?.department_name ||
                primaryTeamOKR?.obj_title ||
                "Chưa có OKR phòng ban",
        },
        {
            label: "Trách nhiệm",
            value: primaryTeamOKR ? getOwnerName(primaryTeamOKR) : "--",
        },
        {
            label: "Thời gian",
            value: primaryTeamOKR
                ? formatDateRange(
                      getStartDate(primaryTeamOKR),
                      getEndDate(primaryTeamOKR)
                  )
                : "--",
        },
        {
            label: "Trạng thái tổng quan",
            value: {
                inProgress: teamSummary.inProgress,
                upcoming: teamSummary.upcoming,
                completed: teamSummary.completed,
                overdue: teamSummary.overdue,
            },
            type: "status",
        },
        {
            label: "Tổng OKR",
            value: {
                total: teamSummary.total,
                completed: teamSummary.completed,
            },
            type: "total",
        },
        { label: "Sắp đến hạn", value: `${teamSummary.upcoming}` },
        { label: "Quá hạn", value: `${teamSummary.overdue}` },
    ];

    const companyMetrics = [
        {
            label: "Chiến lược nổi bật",
            value:
                primaryCompanyOKR?.obj_title ||
                "Chưa có OKR chiến lược nào được thiết lập",
        },
        {
            label: "Thời gian",
            value: primaryCompanyOKR
                ? formatDateRange(
                      getStartDate(primaryCompanyOKR),
                      getEndDate(primaryCompanyOKR)
                  )
                : "--",
        },
        {
            label: "Trạng thái tổng quan",
            value: {
                inProgress: companySummary.inProgress,
                upcoming: companySummary.upcoming,
                completed: companySummary.completed,
                overdue: companySummary.overdue,
            },
            type: "status",
        },
        {
            label: "Tổng OKR",
            value: {
                total: companySummary.total,
                completed: companySummary.completed,
            },
            type: "total",
        },
        { label: "Sắp đến hạn", value: `${companySummary.upcoming}` },
        { label: "Quá hạn", value: `${companySummary.overdue}` },
    ];

    const formatPercentValue = (value) =>
        `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

    const personalTableRows = (myOKRs || []).map((objective) => {
        const statusMeta = getObjectiveStatusMeta(objective);
        const progress = calculateObjectiveProgress(objective);
        return {
            id: objective.objective_id,
            title: objective.obj_title || "Không tên",
            description: objective.obj_description || "—",
                progress,
            updatedAt: formatDate(objective.updated_at || objective.created_at),
            status: statusMeta,
            };
        });

    const teamTableRows = (departmentOKRs || []).map((objective) => {
        const statusMeta = getObjectiveStatusMeta(objective);
        const progress = calculateObjectiveProgress(objective);
            return {
            id: objective.objective_id,
            title: objective.obj_title || "Không tên",
            owner: getOwnerName(objective),
                progress,
            timeframe: formatDateRange(
                getStartDate(objective),
                getEndDate(objective)
            ),
            status: statusMeta,
            };
        });

    const companyTableRows = (companyOKRs || []).map((objective) => {
        const statusMeta = getObjectiveStatusMeta(objective);
        const progress = calculateObjectiveProgress(objective);
            return {
            id: objective.objective_id,
            title: objective.obj_title || "Không tên",
            owner: getOwnerName(objective),
                progress,
            timeframe: formatDateRange(
                getStartDate(objective),
                getEndDate(objective)
            ),
            status: statusMeta,
            };
        });

    return (
        <div className="min-h-screen bg-white">
            <ToastComponent
                type={toast.type}
                message={toast.message}
                onClose={() => setToast((prev) => ({ ...prev, message: "" }))}
            />
            
            {/* Main Content */}
            <div className="p-6 max-w-7xl mx-auto">
                {/* Dashboard Title */}
                <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-900">Tổng quan OKR</h2>
                    <p className="text-sm text-gray-600 mt-1">Theo dõi nhanh tiến độ mục tiêu theo vai trò của bạn</p>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6 border-b border-gray-200">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'my'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            My OKR ({myOKRs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('department')}
                            className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'department'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            OKR Phòng ban ({departmentOKRs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('company')}
                            className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'company'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            OKR Công ty ({companyOKRs.length})
                        </button>
                        </div>
                </div>

                {/* Summary Cards - đặt dưới tab */}
                {activeTab === 'my' && (
                    <div className="mb-6">
                        <SummaryCard
                            title="OKR cá nhân"
                            subtitle="Ảnh hưởng trực tiếp của bạn"
                            highlight={formatPercentValue(personalSummary.progressAvg)}
                            metrics={personalMetrics}
                        />
                        </div>
                )}
                {activeTab === 'department' && (
                    <div className="mb-6">
                        <SummaryCard
                            title="Hiệu suất đội nhóm"
                            subtitle="Tiến độ OKR phòng ban"
                            highlight={formatPercentValue(teamSummary.progressAvg)}
                            metrics={teamMetrics}
                        />
                    </div>
                )}
                {activeTab === 'company' && (
                    <div className="mb-6">
                        <SummaryCard
                            title="OKR toàn công ty"
                            subtitle="Hướng đi chiến lược"
                            highlight={formatPercentValue(companySummary.progressAvg)}
                            metrics={companyMetrics}
                        />
                </div>
                )}

                {/* Filter Dropdown */}
                {getCurrentFilters().showFilters && (
                    <div className="relative mb-6">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Chu Kỳ</label>
                                    <select
                                        value={getCurrentFilters().cycle}
                                        onChange={(e) => setCurrentFilters({...getCurrentFilters(), cycle: e.target.value})}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">-- Tất Cả Chu Kỳ --</option>
                                        {cyclesList.map((cycle) => (
                                            <option key={cycle.cycle_id} value={cycle.cycle_id}>
                                                {cycle.cycle_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phòng Ban</label>
                                    <select
                                        value={getCurrentFilters().department}
                                        onChange={(e) => setCurrentFilters({...getCurrentFilters(), department: e.target.value})}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">-- Tất Cả Phòng Ban --</option>
                                        {departments.map((dept) => (
                                            <option key={dept.department_id} value={dept.department_id}>
                                                {dept.d_name || dept.department_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex flex-col justify-end">
                                    <button
                                        onClick={() => {
                                            setCurrentFilters({
                                                ...getCurrentFilters(),
                                                cycle: '',
                                                department: '',
                                                myOKROnly: false
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                                    >
                                        Đặt Lại
                                    </button>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex items-center">
                                <input
                                    type="checkbox"
                                    id="myOKR"
                                    checked={getCurrentFilters().myOKROnly}
                                    onChange={(e) => setCurrentFilters({...getCurrentFilters(), myOKROnly: e.target.checked})}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="myOKR" className="ml-2 text-sm text-gray-700">
                                    Chỉ Hiển Thị OKR Của Tôi
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-800">{error}</span>
                            <button 
                                onClick={() => {
                                    setError(null);
                                    const filters = getCurrentFilters();
                                    load(filters.cycle, filters.myOKROnly);
                                }}
                                className="ml-auto text-red-600 hover:text-red-800 underline"
                            >
                                Thử Lại
                            </button>
                        </div>
                    </div>
                )}

                {/* Chart Section - khác nhau theo tab */}
                {activeTab === 'my' && (
                    <div className="mb-8">
                        <BarChart
                            data={personalBarData}
                            title="Tiến độ OKR cá nhân"
                            xAxisLabel="OKR"
                            yAxisLabel="Phần trăm hoàn thành"
                        />
                    </div>
                )}
                {activeTab === 'department' && (
                    <section className="mb-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Xu hướng tiến độ OKR team
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Theo dõi tiến độ trung bình theo {teamTrendLabelMap[teamTrendRange]}.
                                </p>
                            </div>
                            <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
                                {teamTrendOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setTeamTrendRange(option.value)}
                                        className={`rounded-full px-3 py-1.5 transition ${
                                            teamTrendRange === option.value
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4">
                        <LineChart
                            data={teamTrendData}
                                label={`Xu hướng tiến độ (${teamTrendLabelMap[teamTrendRange]})`}
                            color="#3b82f6"
                                width={900}
                                height={300}
                                xAxisLabel={`Thời gian (${teamTrendLabelMap[teamTrendRange]})`}
                                yAxisLabel="Phần trăm hoàn thành"
                            />
                            {teamTrendData.length === 0 && (
                                <p className="mt-3 text-center text-sm text-slate-500">
                                    Chưa có dữ liệu check-in cho khoảng thời gian này.
                                </p>
                            )}
                    </div>
                    </section>
                )}
                {filteredItems.length === 0 && !error && (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
                        <div className="text-center text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium">Không Có Dữ Liệu Để Hiển Thị</p>
                            <p className="text-sm mt-1">
                                {activeTab === 'my' && 'Chưa Có OKR Cá Nhân Nào. Hãy Tạo OKR Đầu Tiên Của Bạn!'}
                                {activeTab === 'department' && 'Chưa Có OKR Phòng Ban Nào.'}
                                {activeTab === 'company' && 'Chưa Có OKR Công Ty Nào.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Bảng - Cá nhân đã được gỡ bỏ theo yêu cầu để tránh trùng lặp */}

                {/* Bảng - Phòng ban (đã gỡ bỏ theo yêu cầu) */}

                {/* Chi tiết nâng cao */}
                <section className="mb-10">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                Danh sách OKR theo bộ lọc
                            </h2>
                            <p className="text-sm text-slate-500">
                                Kiểm soát và thao tác trên các OKR hiện có: xem tiến độ, cập nhật và check-in.
                            </p>
                        </div>
                    </div>
                <OKRTable 
                    items={sortedItems}
                    departments={departments}
                    cyclesList={cyclesList}
                    loading={loading}
                    onViewOKR={(item) => {
                            console.log("View OKR:", item);
                    }}
                    onViewCheckInHistory={openCheckInHistory}
                    currentUser={currentUser}
                    viewMode={activeTab}
                />
                </section>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex justify-center gap-2">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300 hover:bg-blue-700 transition-colors"
                        >
                            Trước
                        </button>
                        <span className="text-sm text-slate-600 flex items-center px-4">
                            Trang {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300 hover:bg-blue-700 transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>
            {editingKR && (
                <KeyResultModal
                    editingKR={editingKR}
                    departments={departments}
                    cyclesList={cyclesList}
                    setEditingKR={setEditingKR}
                    setItems={setItems}
                    setToast={setToast}
                    reloadData={() => {
                        const filters = getCurrentFilters();
                        load(filters.cycle, filters.myOKROnly);
                    }}
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
                    reloadData={() => {
                        const filters = getCurrentFilters();
                        load(filters.cycle, filters.myOKROnly);
                    }}
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
                    reloadData={() => {
                        // Reset all filters when creating new objective to ensure it shows
                        setCurrentFilters({
                            cycle: "",
                            department: "",
                            myOKROnly: false,
                            showFilters: getCurrentFilters().showFilters
                        });
                        load("", false); // Reload with no filters
                    }}
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
                    reloadData={() => {
                        const filters = getCurrentFilters();
                        load(filters.cycle, filters.myOKROnly);
                    }}
                />
            )}

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
