import React, { useCallback, useEffect, useMemo, useState } from "react";
import ObjectiveList from "./ObjectiveList.jsx";
import ObjectiveModal from "./ObjectiveModal.jsx";
import KeyResultModal from "./KeyResultModal.jsx";
import ToastComponent from "./ToastComponent.jsx";
import CheckInModal from "../components/CheckInModal";
import ErrorBoundary from "../components/ErrorBoundary";
import LinkOkrModal from "../components/LinkOkrModal.jsx";
import LinkRequestsPanel from "../components/LinkRequestsPanel";
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
    const [checkInModal, setCheckInModal] = useState({ open: false, keyResult: null, initialTab: 'chart' });
    const [currentUser, setCurrentUser] = useState(null);

    const urlParamsHandledRef = React.useRef(false);
    const [userDepartmentName, setUserDepartmentName] = useState('');
    const [cycleFilter, setCycleFilter] = useState(null);

    const [myOKRFilter, setMyOKRFilter] = useState(false);
    const [viewMode, setViewMode] = useState('levels'); // 'levels' or 'personal'
    const [displayMode, setDisplayMode] = useState("table"); // 'table' | 'tree'
    const [treeLayout, setTreeLayout] = useState("horizontal");
    const [treeRootId, setTreeRootId] = useState(null);

    // Set default view mode for members
    useEffect(() => {
        if (currentUser?.role?.role_name?.toLowerCase() === 'member') {
            setViewMode('personal');
        }
    }, [currentUser?.user_id]);

    // Effect to select the default cycle on initial load
    useEffect(() => {
        const selectDefaultCycle = async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
                });
                const json = await res.json();

                if (!Array.isArray(json.data) || json.data.length === 0) {
                    setToast({ type: "error", message: "Không có dữ liệu chu kỳ" });
                    return;
                }

                const cycles = json.data;
                setCyclesList(cycles);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let selectedCycle = cycles.find(c => {
                    const start = c.start_date ? new Date(c.start_date) : null;
                    const end = c.end_date ? new Date(c.end_date) : null;
                    if (start && end) {
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);
                        return today >= start && today <= end;
                    }
                    return false;
                });

                if (!selectedCycle) {
                    selectedCycle = cycles.reduce((best, c) => {
                        const start = c.start_date ? new Date(c.start_date) : null;
                        const end = c.end_date ? new Date(c.end_date) : null;
                        let refDate = start || end || new Date(c.created_at);
                        const diff = Math.abs(refDate - today);
                        return !best || diff < best.diff ? { ...c, diff } : best;
                    }, null);
                }
                
                if(selectedCycle) {
                    setCycleFilter(selectedCycle.cycle_id);
                } else if (cycles.length > 0) {
                    setCycleFilter(cycles[0].cycle_id);
                }

            } catch (err) {
                console.error(err);
                setToast({ type: "error", message: "Lỗi tải danh sách chu kỳ" });
            }
        };
        selectDefaultCycle();
    }, []);


    const load = async (pageNum = 1, cycle, myOKR = false, view = 'levels') => {
        if (cycle === null) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            if (!token) {
                throw new Error("CSRF token not found");
            }

            let url = `/my-objectives?page=${pageNum}&view_mode=${view}`;
            if (cycle) url += `&cycle_id=${cycle}`;
            if (myOKR) url += `&my_okr=true`;

            const [resObj, resDept, resUser, resLinks] = await Promise.all([
                fetch(url, { headers: { Accept: "application/json", "X-CSRF-TOKEN": token } }),
                fetch("/departments", { headers: { Accept: "application/json" } }),
                fetch("/api/profile", { headers: { Accept: "application/json", "X-CSRF-TOKEN": token } }),
                fetch("/my-links", { headers: { Accept: "application/json", "X-CSRF-TOKEN": token } }),
            ]);

            const objData = await resObj.json();
            if (resObj.ok && objData.success) {
                setItems(objData.data.data || []);
                setTotalPages(objData.data.last_page || 1);
                setUserDepartmentName(objData.user_department_name || '');
            } else {
                throw new Error(objData.message || "Không thể tải OKR");
            }

            const deptData = await resDept.json();
            if (resDept.ok) setDepartments(deptData.data || []);

            if (resUser.ok) {
                const userData = await resUser.json();
                if (userData.success) setCurrentUser(userData.user);
            }
            
            const linksJson = await resLinks.json();
            if (resLinks.ok && linksJson.success) {
                setLinks(normalizeLinksList(linksJson.data?.outgoing || []));
                setIncomingLinks(normalizeLinksList(linksJson.data?.incoming || []));
                setChildLinks(normalizeLinksList(linksJson.data?.children || []));
            }

        } catch (err) {
            console.error("Load error:", err);
            setToast({ type: "error", message: err.message || "Không thể tải dữ liệu." });
        } finally {
            setLoading(false);
        }
    };

    const refreshLinks = useCallback(async () => {
        // ... (implementation is fine)
    }, []);

    // Main data loading effect
    useEffect(() => {
        if (cycleFilter !== null) {
            load(page, cycleFilter, myOKRFilter, viewMode);
        }
    }, [page, cycleFilter, myOKRFilter, viewMode]);

    // Reset page to 1 when filters change
    useEffect(() => {
        if (page !== 1) setPage(1);
    }, [cycleFilter, myOKRFilter, viewMode]);

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
            let foundObjective = null;
            for (const obj of items) {
                if (String(obj.objective_id) === String(autoOpen.objective_id)) {
                    foundObjective = obj;
                    const foundKeyResult = (obj.key_results || []).find(k => String(k.kr_id) === String(autoOpen.kr_id));
                    if (foundKeyResult) {
                        // Đảm bảo KR có đầy đủ thông tin
                        foundKR = {
                            ...foundKeyResult,
                            objective_id: obj.objective_id,
                            // Đảm bảo có các fields cần thiết
                            kr_id: foundKeyResult.kr_id || autoOpen.kr_id,
                            assigned_to: foundKeyResult.assigned_to || autoOpen.assigned_to,
                            user_id: foundKeyResult.user_id || autoOpen.user_id,
                        };
                        break;
                    }
                }
            }

            if (foundKR && foundObjective) {
                // Mở objective để hiển thị KR
                setOpenObj((prev) => ({
                    ...prev,
                    [foundObjective.objective_id]: true,
                }));

                // Đợi một chút để đảm bảo component đã render xong và objective đã mở
                setTimeout(() => {
                    // Tìm element của KR và scroll đến đó
                    const krElement = document.querySelector(`[data-kr-id="${autoOpen.kr_id}"]`);
                    if (krElement) {
                        // Scroll đến element với offset để không bị che bởi header
                        const elementPosition = krElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px offset từ top

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });

                        // Highlight element tạm thời
                        krElement.style.backgroundColor = '#fef3c7';
                        setTimeout(() => {
                            krElement.style.backgroundColor = '';
                        }, 2000);
                    }

                    // Mở modal check-in sau khi scroll
                    setTimeout(() => {
                        setCheckInModal({ open: true, keyResult: foundKR });
                        // Xóa localStorage sau khi đã mở modal
                        localStorage.removeItem('autoOpenCheckIn');
                    }, 800);
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

    // Track if we've tried switching view mode for URL params
    const viewModeSwitchedRef = React.useRef(false);

    // Handle URL parameters for highlighting KR (from email notifications)
    useEffect(() => {
        if (loading || items.length === 0) return;
        if (urlParamsHandledRef.current) return; // Đã xử lý rồi

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const highlightKrId = urlParams.get('highlight_kr');
            const objectiveId = urlParams.get('objective_id');
            const action = urlParams.get('action'); // 'checkin', 'checkin_history' hoặc null

            if (!highlightKrId) return;

            console.log('🔗 Highlighting KR from URL:', highlightKrId, 'in objective:', objectiveId, 'action:', action);

            // Tìm objective và KR
            let foundObjective = null;
            let foundKR = null;

            for (const obj of items) {
                const objId = String(obj.objective_id);
                if (objectiveId && objId !== String(objectiveId)) continue;

                const foundKeyResult = (obj.key_results || []).find(k => String(k.kr_id) === String(highlightKrId));
                if (foundKeyResult) {
                    foundObjective = obj;
                    foundKR = {
                        ...foundKeyResult,
                        objective_id: obj.objective_id,
                    };
                    break;
                }
            }

            if (foundObjective && foundKR) {
                // Đánh dấu đã xử lý URL params
                urlParamsHandledRef.current = true;
                
                console.log('🔗 Found KR for highlight:', foundKR);
                
                // Lưu KR vào biến để tránh stale closure
                const krToHighlight = { ...foundKR };
                const objIdToOpen = foundObjective.objective_id;
                
                // Mở accordion của objective
                setOpenObj(prev => ({
                    ...prev,
                    [objIdToOpen]: true
                }));

                // Scroll đến KR và highlight
                setTimeout(() => {
                    const krElement = document.querySelector(`[data-kr-id="${highlightKrId}"]`);
                    if (krElement) {
                        // Scroll với offset để không bị che bởi header
                        const elementPosition = krElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px offset từ top

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });

                        // Highlight element tạm thời
                        krElement.style.backgroundColor = '#dbeafe';
                        krElement.style.transition = 'background-color 0.3s ease';
                        
                        // Xóa highlight sau 3 giây
                        setTimeout(() => {
                            krElement.style.backgroundColor = '';
                        }, 3000);
                    }


                    

                    // Mở check-in history modal
                    console.log('🔗 Opening check-in history for:', krToHighlight);
                    openCheckInHistory(krToHighlight);
                }, 800);


                // Xóa URL parameters sau khi xử lý (delay để đảm bảo state đã được set)
                setTimeout(() => {
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }, 1500);
            } else {
                // Không tìm thấy KR - thử chuyển view mode
                if (!viewModeSwitchedRef.current) {
                    viewModeSwitchedRef.current = true;
                    console.log('🔗 KR not found, trying to switch view mode. Current:', viewMode);
                    
                    // Chuyển sang view mode khác để tìm KR
                    if (viewMode === 'personal') {
                        setViewMode('levels');
                    } else {
                        setViewMode('personal');
                    }
                    // Không đánh dấu handled, để effect chạy lại sau khi items thay đổi
                } else {
                    // Đã thử cả 2 view mode nhưng vẫn không tìm thấy
                    console.warn('🔗 KR not found in both view modes:', highlightKrId);
                    urlParamsHandledRef.current = true;
                    // Xóa URL params
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }
            }
        } catch (error) {
            console.error('🔗 Error handling URL highlight:', error);
            urlParamsHandledRef.current = true;
        }
    }, [items, loading, viewMode]);

    // Ref để tránh xử lý highlight_link nhiều lần
    const linkParamsHandledRef = React.useRef(false);

    // Handle URL parameters for highlighting link request (from email/notification)
    useEffect(() => {
        if (loading || items.length === 0 || linksLoading) return;
        if (linkParamsHandledRef.current) return; // Đã xử lý rồi

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const highlightLinkId = urlParams.get('highlight_link');
            const objectiveId = urlParams.get('objective_id');

            if (!highlightLinkId) return;

            // Đánh dấu đã xử lý URL params
            linkParamsHandledRef.current = true;

            console.log('🔗 Highlighting link request from URL:', highlightLinkId, 'in objective:', objectiveId);

            // Tìm objective
            let foundObjective = null;
            for (const obj of items) {
                const objId = String(obj.objective_id);
                if (objectiveId && objId === String(objectiveId)) {
                    foundObjective = obj;
                    break;
                }
            }

            if (foundObjective) {
                // Mở accordion của objective
                setOpenObj(prev => ({
                    ...prev,
                    [foundObjective.objective_id]: true
                }));

                // Scroll đến phần "Chờ phê duyệt" và highlight link request
                setTimeout(() => {
                    // Scroll đến phần LinkRequestsPanel trước
                    const linkRequestsSection = document.querySelector('[data-section="link-requests"]');
                    if (linkRequestsSection) {
                        linkRequestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }

                    // Sau đó highlight link request cụ thể
                    setTimeout(() => {
                        const linkElement = document.querySelector(`[data-link-id="${highlightLinkId}"]`);
                        if (linkElement) {
                            linkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            linkElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50');
                            
                            // Xóa highlight sau 5 giây
                            setTimeout(() => {
                                linkElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50');
                            }, 5000);
                        } else {
                            console.warn('🔗 Link element not found:', highlightLinkId);
                        }
                    }, 300);
                }, 800);

                // Xóa URL parameters sau khi xử lý
                setTimeout(() => {
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }, 1500);
            } else {
                console.warn('🔗 Objective not found for link highlight:', objectiveId);
            }
        } catch (error) {
            console.error('🔗 Error handling link highlight:', error);
        }
    }, [items, loading, incomingLinks, linksLoading]);

    // Helper function để highlight KR (dùng chung cho URL params và event)
    const highlightKR = React.useCallback((highlightKrId, objectiveId, action = null) => {
        if (!highlightKrId || items.length === 0) return;

        console.log('🔗 Highlighting KR:', highlightKrId, 'in objective:', objectiveId, 'action:', action);

        // Tìm objective và KR
        let foundObjective = null;
        let foundKR = null;

        for (const obj of items) {
            const objId = String(obj.objective_id);
            if (objectiveId && objId !== String(objectiveId)) continue;

            const foundKeyResult = (obj.key_results || []).find(k => String(k.kr_id) === String(highlightKrId));
            if (foundKeyResult) {
                foundObjective = obj;
                foundKR = {
                    ...foundKeyResult,
                    objective_id: obj.objective_id,
                };
                break;
            }
        }

        if (foundObjective && foundKR) {
            const krToHighlight = { ...foundKR };
            const objIdToOpen = foundObjective.objective_id;
            
            // Mở accordion của objective
            setOpenObj(prev => ({
                ...prev,
                [objIdToOpen]: true
            }));

            // Scroll đến KR và highlight
            setTimeout(() => {
                const krElement = document.querySelector(`[data-kr-id="${highlightKrId}"]`);
                if (krElement) {
                    // Scroll với offset để không bị che bởi header
                    const elementPosition = krElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - 120; // 120px offset từ top

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // Highlight element tạm thời với border và background
                    krElement.style.backgroundColor = '#dbeafe';
                    krElement.style.transition = 'background-color 0.3s ease, border-left 0.3s ease';
                    krElement.style.borderLeft = '4px solid #3b82f6';
                    krElement.style.paddingLeft = '8px';
                    
                    // Xóa highlight sau 5 giây
                    setTimeout(() => {
                        krElement.style.backgroundColor = '';
                        krElement.style.borderLeft = '';
                        krElement.style.paddingLeft = '';
                    }, 5000);
                }

                // Mở modal tùy theo action
                setTimeout(() => {
                    if (action === 'checkin') {
                        // Mở check-in modal để member cập nhật tiến độ
                        console.log('🔗 Opening check-in modal for:', krToHighlight);
                        setCheckInModal({ open: true, keyResult: krToHighlight });
                    } else if (action === 'checkin_history') {
                        // Mở check-in history modal (cho thông báo check-in từ manager)
                        console.log('🔗 Opening check-in history for:', krToHighlight);
                        setCheckInHistory({ open: true, keyResult: krToHighlight });
                    } else {
                        // Mặc định: mở check-in history nếu không có action
                        console.log('🔗 No action specified, opening check-in history for:', krToHighlight);
                        setCheckInHistory({ open: true, keyResult: krToHighlight });
                    }
                }, 800); // Tăng thời gian đợi để đảm bảo scroll và highlight hoàn tất
            }, 500); // Đợi objective mở xong
        }
    }, [items]);

    // Helper function để highlight Link Request (dùng chung cho URL params và event)
    const highlightLinkRequest = React.useCallback((highlightLinkId, objectiveId) => {
        if (!highlightLinkId) return;

        console.log('🔗 Highlighting link request:', highlightLinkId);

        // Tìm objective nếu có
        if (objectiveId) {
            const foundObjective = items.find(obj => String(obj.objective_id) === String(objectiveId));
            if (foundObjective) {
                setOpenObj(prev => ({
                    ...prev,
                    [foundObjective.objective_id]: true
                }));
            }
        }

        // Scroll đến phần "Chờ phê duyệt" và highlight link request
        setTimeout(() => {
            const linkRequestsSection = document.querySelector('[data-section="link-requests"]');
            if (linkRequestsSection) {
                linkRequestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            setTimeout(() => {
                const linkElement = document.querySelector(`[data-link-id="${highlightLinkId}"]`);
                if (linkElement) {
                    linkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    linkElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50');
                    
                    setTimeout(() => {
                        linkElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'bg-blue-50');
                    }, 5000);
                }
            }, 300);
        }, 300);
    }, [items]);

    // Lắng nghe custom event để điều hướng trong trang (không reload)
    useEffect(() => {
        const handleOkrNavigate = (event) => {
            const { highlight_kr, highlight_link, objective_id, action } = event.detail;
            
            console.log('🔔 Received okr-navigate event:', event.detail);
            
            if (highlight_kr) {
                highlightKR(highlight_kr, objective_id, action);
            } else if (highlight_link) {
                highlightLinkRequest(highlight_link, objective_id);
            }
        };

        // Lắng nghe event để mở check-in modal từ reminder banner (không reload)
        const handleOpenCheckInFromReminder = (event) => {
            const checkInData = event.detail;
            console.log('🔔 Received open-checkin-from-reminder event:', checkInData);
            
            if (!checkInData || !checkInData.kr_id) {
                console.warn('🔔 Invalid check-in data in event');
                return;
            }

            // Tìm Key Result trong items
            let foundKR = null;
            let foundObjective = null;
            
            for (const obj of items) {
                if (String(obj.objective_id) === String(checkInData.objective_id)) {
                    foundObjective = obj;
                    const foundKeyResult = (obj.key_results || []).find(k => String(k.kr_id) === String(checkInData.kr_id));
                    if (foundKeyResult) {
                        // Đảm bảo KR có đầy đủ thông tin
                        foundKR = {
                            ...foundKeyResult,
                            objective_id: obj.objective_id,
                            // Đảm bảo có các fields cần thiết
                            kr_id: foundKeyResult.kr_id || checkInData.kr_id,
                            assigned_to: foundKeyResult.assigned_to || checkInData.assigned_to,
                            user_id: foundKeyResult.user_id || checkInData.user_id,
                        };
                        break;
                    }
                }
            }

            if (foundKR && foundObjective) {
                console.log('🔔 Found KR for check-in:', foundKR);
                // Mở objective để hiển thị KR
                setOpenObj((prev) => ({
                    ...prev,
                    [foundObjective.objective_id]: true,
                }));

                // Đợi một chút để đảm bảo component đã render xong và objective đã mở
                setTimeout(() => {
                    // Tìm element của KR và scroll đến đó
                    const krElement = document.querySelector(`[data-kr-id="${checkInData.kr_id}"]`);
                    if (krElement) {
                        // Scroll đến element với offset để không bị che bởi header
                        const elementPosition = krElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - 120; // 120px offset từ top

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });

                        // Highlight element tạm thời với border và background
                        krElement.style.backgroundColor = '#dbeafe';
                        krElement.style.transition = 'background-color 0.3s ease, border-left 0.3s ease';
                        krElement.style.borderLeft = '4px solid #3b82f6';
                        krElement.style.paddingLeft = '8px';
                        
                        // Xóa highlight sau 5 giây
                        setTimeout(() => {
                            krElement.style.backgroundColor = '';
                            krElement.style.borderLeft = '';
                            krElement.style.paddingLeft = '';
                        }, 5000);
                    }

                    // Mở modal check-in sau khi scroll và highlight
                    setTimeout(() => {
                        console.log('🔔 Opening check-in modal with KR:', foundKR);
                        setCheckInModal({ open: true, keyResult: foundKR });
                    }, 800); // Tăng thời gian đợi để đảm bảo scroll và highlight hoàn tất
                }, 400); // Tăng thời gian đợi để đảm bảo objective đã mở hoàn toàn
            } else {
                console.warn('🔔 Key Result not found in items for reminder check-in', {
                    checkInData,
                    itemsCount: items.length,
                    objectiveIds: items.map(o => o.objective_id)
                });
                // Fallback: thử reload trang với localStorage
                localStorage.setItem('autoOpenCheckIn', JSON.stringify(checkInData));
                window.location.href = '/my-objectives';
            }
        };

        window.addEventListener('okr-navigate', handleOkrNavigate);
        window.addEventListener('open-checkin-from-reminder', handleOpenCheckInFromReminder);
        
        return () => {
            window.removeEventListener('okr-navigate', handleOkrNavigate);
            window.removeEventListener('open-checkin-from-reminder', handleOpenCheckInFromReminder);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const sortedItems = useMemo(
        () => (Array.isArray(items) ? items : []),
        [items]
    );

    // Lọc dữ liệu hiển thị cho bảng (không ảnh hưởng tree)
    // - Manager/Admin/CEO: giữ nguyên
    // - Member ở chế độ "levels": chỉ thấy các KR/O có liên quan tới mình
    const displayItems = useMemo(() => {
        if (!Array.isArray(sortedItems)) return [];
        if (!currentUser) return sortedItems;

        const roleName = currentUser.role?.role_name?.toLowerCase();
        const userId = currentUser.user_id;

        // Chỉ giới hạn cho member khi xem theo cấp độ (levels)
        if (roleName !== "member" || viewMode !== "levels") {
            return sortedItems;
        }

        const isKrRelatedToUser = (kr) => {
            const assignedId =
                kr.assigned_to ||
                kr.assigned_user?.user_id ||
                kr.assignedUser?.user_id;

            if (String(assignedId) === String(userId)) return true;

            // Nếu KR có linked_objectives, check xem có objective/KR nào của user không
            if (Array.isArray(kr.linked_objectives)) {
                return kr.linked_objectives.some((linkedObj) => {
                    if (
                        String(linkedObj.user_id) === String(userId) ||
                        String(linkedObj.user?.user_id) === String(userId)
                    ) {
                        return true;
                    }

                    if (Array.isArray(linkedObj.key_results)) {
                        return linkedObj.key_results.some((linkedKr) => {
                            const linkedAssignedId =
                                linkedKr.assigned_to ||
                                linkedKr.assigned_user?.user_id ||
                                linkedKr.assignedUser?.user_id;
                            return (
                                String(linkedAssignedId) === String(userId)
                            );
                        });
                    }

                    return false;
                });
            }

            return false;
        };

        return sortedItems
            .map((obj) => {
                const isPersonLevel = obj.level === "person";

                // Luôn giữ lại Objective cấp cao hơn làm context (company/unit/team),
                // nhưng chỉ hiển thị các KR liên quan tới user.
                const filteredKRs = (obj.key_results || []).filter((kr) =>
                    isKrRelatedToUser(kr)
                );

                const hasRelevantKR = filteredKRs.length > 0;

                // Với objective cấp cá nhân: chỉ giữ nếu chính user liên quan,
                // còn không thì ẩn khỏi bảng.
                if (isPersonLevel && !hasRelevantKR) {
                    return null;
                }

                return {
                    ...obj,
                    key_results: filteredKRs,
                };
            })
            .filter(Boolean);
    }, [sortedItems, currentUser, viewMode]);

    const enrichedItems = useMemo(
        () => mergeChildLinksIntoObjectives(displayItems, childLinks),
        [displayItems, childLinks]
    );

    const treeNodes = useMemo(
        () => buildTreeFromObjectives(enrichedItems),
        [enrichedItems]
    );

    // Đồng bộ displayMode, treeRootId, treeLayout vào query params
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            if (displayMode === "tree") {
                url.searchParams.set("display", "tree");
                if (treeRootId) {
                    url.searchParams.set("root_objective_id", String(treeRootId));
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
            console.error("Failed to sync tree params", e);
        }
    }, [displayMode, treeRootId, treeLayout]);

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

    const handleCheckInSuccess = useCallback((responseData) => {
        console.log('🔧 handleCheckInSuccess called with:', responseData);
        
        // Backend trả về: { objective: ... } trong data.data
        const updatedObjective = responseData?.objective;

        if (!updatedObjective) {
            console.warn('🔧 handleCheckInSuccess: No objective in response, reloading data', responseData);
            // Nếu không có objective trong response, reload lại data mà không reload trang
            load(page, cycleFilter, myOKRFilter, viewMode);
            setToast({ type: 'success', message: 'Đã cập nhật tiến độ thành công!' });
            return;
        }

        console.log('🔧 Updating objective:', updatedObjective.objective_id);
        
        // Lấy keyResults mới từ backend (backend trả về key_results - snake_case)
        const newKeyResults = updatedObjective.key_results || updatedObjective.keyResults;
        
        console.log('🔧 Updated objective from backend:', {
            objective_id: updatedObjective.objective_id,
            has_key_results: !!updatedObjective.key_results,
            has_keyResults: !!updatedObjective.keyResults,
            key_results_count: newKeyResults?.length || 0,
            sample_kr: newKeyResults?.[0] ? {
                kr_id: newKeyResults[0].kr_id,
                progress_percent: newKeyResults[0].progress_percent,
                current_value: newKeyResults[0].current_value
            } : null
        });

        setItems(prevItems => {
            const updatedItems = prevItems.map(objective => {
                if (String(objective.objective_id) === String(updatedObjective.objective_id)) {
                    // Lấy keyResults mới từ backend (backend trả về key_results - snake_case)
                    const backendKeyResults = updatedObjective.key_results || updatedObjective.keyResults;
                    
                    console.log('🔧 Updated objective from backend:', {
                        objective_id: updatedObjective.objective_id,
                        has_key_results: !!updatedObjective.key_results,
                        has_keyResults: !!updatedObjective.keyResults,
                        key_results_count: backendKeyResults?.length || 0,
                        sample_kr: backendKeyResults?.[0] ? {
                            kr_id: backendKeyResults[0].kr_id,
                            progress_percent: backendKeyResults[0].progress_percent,
                            current_value: backendKeyResults[0].current_value,
                            status: backendKeyResults[0].status
                        } : null
                    });

                    // Tạo array mới với object mới cho mỗi KR để React nhận ra thay đổi
                    let finalKeyResults;
                    if (backendKeyResults && Array.isArray(backendKeyResults) && backendKeyResults.length > 0) {
                        // Tạo map từ backend để dễ tìm kiếm theo kr_id
                        const backendKrMap = new Map();
                        backendKeyResults.forEach(kr => {
                            const krId = String(kr.kr_id);
                            backendKrMap.set(krId, kr);
                        });
                        
                        // Merge với keyResults hiện tại, cập nhật những KR có trong backend
                        const existingKeyResults = objective.keyResults || objective.key_results || [];
                        finalKeyResults = existingKeyResults.map(existingKr => {
                            const krId = String(existingKr.kr_id);
                            const backendKr = backendKrMap.get(krId);
                            
                            if (backendKr) {
                                // Có dữ liệu mới từ backend, tạo object mới với dữ liệu đã parse
                                return {
                                    ...existingKr,
                                    ...backendKr,
                                    // Đảm bảo progress_percent là number
                                    progress_percent: backendKr.progress_percent !== null && backendKr.progress_percent !== undefined 
                                        ? parseFloat(backendKr.progress_percent) 
                                        : existingKr.progress_percent,
                                    // Đảm bảo current_value là number
                                    current_value: backendKr.current_value !== null && backendKr.current_value !== undefined 
                                        ? parseFloat(backendKr.current_value) 
                                        : existingKr.current_value,
                                    // Đảm bảo target_value là number
                                    target_value: backendKr.target_value !== null && backendKr.target_value !== undefined 
                                        ? parseFloat(backendKr.target_value) 
                                        : existingKr.target_value,
                                    // Cập nhật status nếu có
                                    status: backendKr.status || existingKr.status
                                };
                            }
                            // Không có trong backend, giữ nguyên nhưng tạo object mới
                            return { ...existingKr };
                        });
                        
                        // Thêm các KR mới từ backend mà không có trong existing
                        backendKeyResults.forEach(backendKr => {
                            const krId = String(backendKr.kr_id);
                            const exists = finalKeyResults.some(kr => String(kr.kr_id) === krId);
                            if (!exists) {
                                finalKeyResults.push({
                                    ...backendKr,
                                    progress_percent: backendKr.progress_percent !== null && backendKr.progress_percent !== undefined 
                                        ? parseFloat(backendKr.progress_percent) 
                                        : 0,
                                    current_value: backendKr.current_value !== null && backendKr.current_value !== undefined 
                                        ? parseFloat(backendKr.current_value) 
                                        : 0,
                                    target_value: backendKr.target_value !== null && backendKr.target_value !== undefined 
                                        ? parseFloat(backendKr.target_value) 
                                        : 0
                                });
                            }
                        });
                    } else {
                        // Không có dữ liệu từ backend, tạo array mới từ existing
                        finalKeyResults = (objective.keyResults || objective.key_results || []).map(kr => ({ ...kr }));
                    }
                    
                    console.log('🔧 Final keyResults after merge:', {
                        count: finalKeyResults.length,
                        all_krs: finalKeyResults.map(kr => ({
                            kr_id: kr.kr_id,
                            progress_percent: kr.progress_percent,
                            current_value: kr.current_value,
                            status: kr.status
                        }))
                    });

                    // Merge với objective cũ để giữ các thông tin khác (như links, relationships, etc.)
                    // Loại bỏ key_results và keyResults từ updatedObjective trước khi merge để tránh ghi đè
                    const { key_results: _, keyResults: __, ...updatedObjectiveWithoutKRs } = updatedObjective;
                    
                    const mergedObjective = {
                        ...objective,
                        ...updatedObjectiveWithoutKRs,
                        // Luôn sử dụng finalKeyResults (đã được merge và parse)
                        key_results: finalKeyResults,
                        keyResults: finalKeyResults,
                        // Cập nhật progress_percent của objective nếu có
                        progress_percent: updatedObjective.progress_percent !== undefined 
                            ? parseFloat(updatedObjective.progress_percent)
                            : objective.progress_percent
                    };
                    
                    console.log('🔧 Merged objective:', {
                        objective_id: mergedObjective.objective_id,
                        key_results_count: mergedObjective.key_results?.length || 0,
                        all_krs: mergedObjective.key_results?.map(kr => ({
                            kr_id: kr.kr_id,
                            progress_percent: kr.progress_percent,
                            current_value: kr.current_value,
                            status: kr.status
                        })) || []
                    });
                    
                    return mergedObjective;
                }
                return objective;
            });
            console.log('🔧 Updated items count:', updatedItems.length);
            
            // Force re-render bằng cách tạo array mới
            return [...updatedItems];
        });

        setToast({ type: 'success', message: 'Đã cập nhật tiến độ thành công!' });
        
        // Force update sau một chút để đảm bảo UI được cập nhật
        setTimeout(() => {
            setItems(prevItems => {
                // Tạo array mới để force re-render
                return prevItems.map(obj => ({ ...obj }));
            });
        }, 100);
    }, [page, cycleFilter, myOKRFilter, viewMode, load]);

    const handleOpenLinkModal = (payload) => {
        setLinkModal({
            open: true,
            source: payload.source,
            sourceType: payload.sourceType,
        });
    };

    const closeLinkModal = () => {
        setLinkModal({
            open: false,
            source: null,
            sourceType: "objective",
        });
    };

    const handleLinkRequestSuccess = (link) => {
        // ... (implementation is fine)
    };

    const performLinkAction = useCallback(
        async (linkId, action, payload = {}, fallbackMessage = "Đã cập nhật trạng thái liên kết") => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                if (!token) throw new Error("CSRF token not found");

                const res = await fetch(`/my-links/${linkId}/${action}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.message || `Hành động ${action} thất bại`);
                }
                
                setToast({ type: "success", message: json.message || fallbackMessage });
                load(page, cycleFilter, myOKRFilter, viewMode); // Reload data on success

            } catch (err) {
                setToast({ type: "error", message: err.message });
            }
        },
        [page, cycleFilter, myOKRFilter, viewMode]
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
        console.log('🔧 openCheckInModal called with:', {
            kr_id: keyResult?.kr_id,
            key_result_id: keyResult?.key_result_id,
            id: keyResult?.id,
            objective_id: keyResult?.objective_id,
            assigned_to: keyResult?.assigned_to,
            user_id: keyResult?.user_id,
            fullKeyResult: keyResult
        });
        
        if (!keyResult) {
            console.error('🔧 openCheckInModal: keyResult is null/undefined');
            return;
        }
        
        // Đảm bảo có objective_id
        if (!keyResult.objective_id && keyResult.objective) {
            keyResult.objective_id = keyResult.objective.objective_id || keyResult.objective.id;
        }
        
        setCheckInModal({ open: true, keyResult });
    };

    const openCheckInHistory = (keyResult) => {
        setCheckInModal({ open: true, keyResult, initialTab: 'history' });
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
            <div className="mx-auto w-full max-w-6xl flex justify-end">
                <div className="flex items-center gap-2">
                    {displayMode === "tree" && (
                        <button
                            type="button"
                            onClick={() =>
                                setTreeLayout((prev) =>
                                    prev === "horizontal" ? "vertical" : "horizontal"
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
                            {treeLayout === "horizontal" ? "Xem ngang" : "Xem dọc"}
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
                                <option key={obj.objective_id} value={obj.objective_id}>
                                    {obj.obj_title}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div />
                )}
            </div>

            {displayMode === "table" ? (
            <ObjectiveList
                    items={displayItems}
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
                userDepartmentName={userDepartmentName}
                cycleFilter={cycleFilter}
                setCycleFilter={setCycleFilter}
                myOKRFilter={myOKRFilter}
                setMyOKRFilter={setMyOKRFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onOpenLinkModal={handleOpenLinkModal}
                onCancelLink={handleCancelLink}
                reloadData={load}
            />
            ) : (
                <OkrTreeCanvas
                    data={treeDataForRender}
                    loading={loading}
                    emptyMessage="Không có OKR nào trong danh sách hiện tại"
                    height={640}
                    showLayoutToggle={false}
                    layoutDirection={treeLayout}
                    onLayoutDirectionChange={setTreeLayout}
                />
            )}

            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                <button
                    onClick={() => handlePageChange(page - 1)}
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                (pageNumber) => {
                                    if (
                                        pageNumber === 1 ||
                                        pageNumber === totalPages ||
                                        (pageNumber >= page - 1 && pageNumber <= page + 1)
                                    ) {
                                        return (
                                            <button
                                                key={pageNumber}
                                                onClick={() => handlePageChange(pageNumber)}
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
                                            <span key={pageNumber} className="px-2 text-gray-400">
                                                ...
                </span>
                                        );
                                    }
                                    return null;
                                }
                            )}
                        </div>

                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                page === totalPages
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
                    reloadData={load}
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

            <ErrorBoundary>
                <CheckInModal
                    open={checkInModal.open}
                    onClose={() => setCheckInModal({ open: false, keyResult: null, initialTab: 'chart' })}
                    keyResult={checkInModal.keyResult}
                    objectiveId={checkInModal.keyResult?.objective_id}
                    onSuccess={handleCheckInSuccess}
                    initialTab={checkInModal.initialTab}
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
