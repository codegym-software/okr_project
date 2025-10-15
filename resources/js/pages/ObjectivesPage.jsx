import React, { useEffect, useMemo, useState } from "react";
import { Modal, Toast } from "../components/ui";
import CheckInModal from "../components/CheckInModal";
import CheckInHistory from "../components/CheckInHistory";
import ErrorBoundary from "../components/ErrorBoundary";

export default function ObjectivesPage() {
    const [items, setItems] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [cyclesList, setCyclesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const [editingKR, setEditingKR] = useState(null);
    const [creatingFor, setCreatingFor] = useState(null);
    const [creatingObjective, setCreatingObjective] = useState(false);
    const [editingObjective, setEditingObjective] = useState(null);
    const [openObj, setOpenObj] = useState({}); // { [objective_id]: boolean }
    const [checkInModal, setCheckInModal] = useState({ open: false, keyResult: null });
    const [checkInHistory, setCheckInHistory] = useState({ open: false, keyResult: null });
    const [krPermissions, setKrPermissions] = useState({}); // { [objective_id]: boolean }
    const [userLevels, setUserLevels] = useState([]); // Các level được phép cho user hiện tại
    const [createForm, setCreateForm] = useState({
        obj_title: "",
        description: "",
        level: "",
        status: "draft",
        cycle_id: "",
        department_id: "",
        key_results: [],
    });

    // Load user levels
    const loadUserLevels = async () => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            
            const res = await fetch('/my-objectives/user-levels', {
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": token,
                },
            });
            
            const data = await res.json();
            if (data.success) {
                setUserLevels(data.allowed_levels);
                // Set default level to first available level
                if (data.allowed_levels.length > 0) {
                    setCreateForm(prev => ({
                        ...prev,
                        level: data.allowed_levels[0]
                    }));
                }
            }
        } catch (err) {
            console.error("Error loading user levels:", err);
            // Fallback to default levels
            setUserLevels(['Nhóm', 'Cá nhân']);
            setCreateForm(prev => ({
                ...prev,
                level: 'Nhóm'
            }));
        }
    };

    const load = async () => {
        try {
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

            const [resObj, resDept, resCycles] = await Promise.all([
                fetch("/my-objectives", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                }),
                fetch("/departments", {
                    headers: { Accept: "application/json" },
                }),
                fetch("/cycles", { headers: { Accept: "application/json" } }),
            ]);

            // Check /my-objectives
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
            console.log("Objectives data:", objData);
            setItems(Array.isArray(objData.data) ? objData.data : []);

            // Check /departments
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
            console.log("Departments data:", deptData);
            setDepartments(deptData.data || []);

            // Check /cycles
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
            console.log("Cycles data:", cyclesData);
            setCyclesList(cyclesData.data || []);

            // Notify if data is empty
            if (
                !Array.isArray(objData.data) ||
                objData.data.length === 0
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
                setToast({
                    type: "warning",
                    message: "Không có chu kỳ nào",
                });
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

    // Kiểm tra quyền hạn thêm KR cho tất cả objectives
    const checkKRPermissions = async () => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            
            console.log('Starting KR permissions check for', items.length, 'objectives');
            const permissions = {};
            
            for (const obj of items) {
                try {
                    console.log(`Checking permission for objective ${obj.objective_id}: ${obj.obj_title}`);
                    const res = await fetch(`/my-key-results/can-add/${obj.objective_id}`, {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    });
                    const data = await res.json();
                    console.log(`Permission result for ${obj.objective_id}:`, data);
                    permissions[obj.objective_id] = data.can_add_kr || false;
                } catch (err) {
                    console.error(`Error checking permission for objective ${obj.objective_id}:`, err);
                    permissions[obj.objective_id] = false;
                }
            }
            console.log('Final permissions:', permissions);
            setKrPermissions(permissions);
        } catch (err) {
            console.error("Error checking KR permissions:", err);
        }
    };

    useEffect(() => {
        load();
        loadUserLevels();
    }, []);

    // Kiểm tra quyền hạn khi items thay đổi
    useEffect(() => {
        if (items.length > 0) {
            console.log('Items loaded, checking KR permissions for', items.length, 'objectives');
            checkKRPermissions();
        }
    }, [items]);

    const sortedItems = useMemo(() => {
        return Array.isArray(items) ? items : [];
    }, [items]);

    const saveKr = async (kr) => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const computed =
                Number(kr.target_value) > 0
                    ? (Number(kr.current_value) / Number(kr.target_value)) * 100
                    : 0;
            const parent = items.find(
                (o) => String(o.objective_id) === String(kr.objective_id)
            );
            const payload = {
                ...kr,
                department_id: kr.department_id,
                cycle_id: parent?.cycle_id || kr.cycle_id,
                progress_percent: Number.isFinite(computed)
                    ? Number(computed.toFixed(2))
                    : 0,
            };
            const res = await fetch(
                `/my-key-results/update/${kr.objective_id}/${kr.kr_id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );
            const json = await res.json().catch(() => ({
                success: false,
                message: "Cập nhật thất bại",
            }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Cập nhật thất bại");
            const serverKR = json.data || {};
            const enriched = { ...kr, ...serverKR };
            const dep = departments.find(
                (d) =>
                    String(d.department_id) === String(enriched.department_id)
            );
            if (dep) enriched.department = dep;
            setItems((prev) =>
                prev.map((o) =>
                    o.objective_id === kr.objective_id
                        ? {
                              ...o,
                              key_results: (o.key_results || []).map((x) =>
                                  x.kr_id === kr.kr_id ? enriched : x
                              ),
                          }
                        : o
                )
            );
            setEditingKR(null);
            setToast({
                type: "success",
                message: "Cập nhật Key Result thành công",
            });
        } catch (e) {
            setToast({
                type: "error",
                message: e.message || "Cập nhật thất bại",
            });
        }
    };

    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(1)}%` : "0%";
    };

    const getProgressColor = (percent) => {
        if (percent >= 100) return 'text-green-600';
        if (percent >= 75) return 'text-blue-600';
        if (percent >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getProgressBgColor = (percent) => {
        if (percent >= 100) return 'bg-green-500';
        if (percent >= 75) return 'bg-blue-500';
        if (percent >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const handleCreateFormChange = (field, value) => {
        setCreateForm((prev) => ({ ...prev, [field]: value }));
    };

    const addNewKR = () => {
        setCreateForm((prev) => ({
            ...prev,
            key_results: [
                ...prev.key_results,
                {
                    kr_title: "",
                    target_value: 0,
                    current_value: 0,
                    unit: "",
                    status: "draft",
                },
            ],
        }));
    };

    const updateNewKR = (index, field, value) => {
        setCreateForm((prev) => {
            const updatedKRs = [...prev.key_results];
            updatedKRs[index] = { ...updatedKRs[index], [field]: value };
            return { ...prev, key_results: updatedKRs };
        });
    };

    const removeNewKR = (index) => {
        setCreateForm((prev) => ({
            ...prev,
            key_results: prev.key_results.filter((_, i) => i !== index),
        }));
    };

    const handleCreateObjective = async () => {
        if (createForm.key_results.length < 1) {
            setToast({
                type: "error",
                message: "Phải có ít nhất một Key Result",
            });
            return;
        }
        if (createForm.level !== "Công ty" && !createForm.department_id) {
            setToast({
                type: "error",
                message: "Phải chọn phòng ban cho level không phải công ty",
            });
            return;
        }
        
        // Kiểm tra quyền hạn tạo objective với level này
        if (!userLevels.includes(createForm.level)) {
            setToast({
                type: "error",
                message: `Bạn không có quyền tạo objective với level "${createForm.level}"`,
            });
            return;
        }
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const body = {
                ...createForm,
                department_id:
                    createForm.level === "Công ty"
                        ? null
                        : createForm.department_id,
                key_results: createForm.key_results.map((kr) => ({
                    ...kr,
                    target_value: Number(kr.target_value),
                    current_value: Number(kr.current_value),
                })),
            };
            const res = await fetch("/my-objectives/store", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Tạo thất bại");
            const created = json.data;
            setItems((prev) => [
                ...prev,
                { ...created, key_results: created.key_results || [] },
            ]);
            
            // Cập nhật quyền hạn cho objective mới
            setTimeout(async () => {
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute("content");
                    
                    const res = await fetch(`/my-key-results/can-add/${created.objective_id}`, {
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-TOKEN": token,
                        },
                    });
                    const data = await res.json();
                    setKrPermissions(prev => ({
                        ...prev,
                        [created.objective_id]: data.can_add_kr || false
                    }));
                } catch (err) {
                    console.error(`Error checking permission for new objective ${created.objective_id}:`, err);
                }
            }, 100);
            
            setCreatingObjective(false);
            setCreateForm({
                obj_title: "",
                description: "",
                level: "Công ty",
                status: "draft",
                cycle_id: "",
                department_id: "",
                key_results: [],
            });
            setToast({ type: "success", message: "Tạo Objective thành công" });
        } catch (err) {
            setToast({ type: "error", message: err.message || "Tạo thất bại" });
        }
    };

    // Tính toán tất cả Key Results từ Objectives
    const allKeyResults = useMemo(() => {
        return items.reduce((acc, obj) => {
            return [...acc, ...(obj.key_results || [])];
        }, []);
    }, [items]);

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

    return (
        <div className="px-4 py-6">
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast((prev) => ({ ...prev, message: "" }))}
            />
            <div className="mx-auto mb-3 flex w-full max-w-6xl items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                    Danh sách mục tiêu
                </h2>
                <button
                    onClick={() => setCreatingObjective(true)}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                    Thêm Objective
                </button>
            </div>
            <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 border-r border-slate-200 w-[30%] text-left">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[14%] text-center">
                                Phòng ban
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Chu kỳ
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Trạng thái
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[8%] text-center">
                                Đơn vị
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[8%] text-center">
                                Thực tế
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[8%] text-center">
                                Mục tiêu
                            </th>
                            <th className="px-3 py-2 w-[8%] text-center">
                                Tiến độ (%)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            sortedItems.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    <tr
                                        className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td colSpan={8} className="px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="inline-flex items-center gap-3">
                                                    <button
                                                        onClick={() =>
                                                            setOpenObj(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [obj.objective_id]:
                                                                        prev[
                                                                            obj
                                                                                .objective_id
                                                                        ] ===
                                                                        false,
                                                                })
                                                            )
                                                        }
                                                        className="rounded-md border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 shadow-sm"
                                                        title="Đóng/mở Key Results"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                            className={`h-4 w-4 transition-transform ${
                                                                openObj[
                                                                    obj
                                                                        .objective_id
                                                                ] === false
                                                                    ? ""
                                                                    : "rotate-180"
                                                            }`}
                                                        >
                                                            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setEditingObjective(
                                                                obj
                                                            )
                                                        }
                                                        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                                                        title="Sửa Objective"
                                                    >
                                                        {obj.obj_title}
                                                    </button>
                                                </div>
                                                {krPermissions[obj.objective_id] && (
                                                    <button
                                                        onClick={() =>
                                                            setCreatingFor(obj)
                                                        }
                                                        title="Thêm Key Result"
                                                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                                                    >
                                                        Thêm KR
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {openObj[obj.objective_id] !== false
                                        ? (obj.key_results || []).map((kr) => (
                                              <tr
                                                  key={kr.kr_id}
                                                  className="hover:bg-slate-50 bg-white border-l-4 border-l-blue-200"
                                              >
                                                  <td className="px-6 py-3 border-r border-slate-200">
                                                      <button
                                                          onClick={() =>
                                                              setEditingKR({
                                                                  ...kr,
                                                                  objective_id:
                                                                      obj.objective_id,
                                                              })
                                                          }
                                                          className="inline-flex items-center gap-2 text-left text-slate-900"
                                                      >
                                                          <span className="underline-offset-2 hover:underline font-medium">
                                                              {kr.kr_title ||
                                                                  ""}
                                                          </span>
                                                      </button>
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.department?.d_name ||
                                                          departments.find(
                                                              (d) =>
                                                                  String(
                                                                      d.department_id
                                                                  ) ===
                                                                  String(
                                                                      kr.department_id
                                                                  )
                                                          )?.d_name ||
                                                          ""}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {(() => {
                                                          const cy =
                                                              cyclesList.find(
                                                                  (c) =>
                                                                      String(
                                                                          c.cycle_id
                                                                      ) ===
                                                                      String(
                                                                          kr.cycle_id
                                                                      )
                                                              );
                                                          return (
                                                              cy?.cycle_name ||
                                                              ""
                                                          );
                                                      })()}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      <span
                                                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                              (
                                                                  kr.status ||
                                                                  ""
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
                                                          {kr.status || ""}
                                                      </span>
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.unit || ""}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.current_value ?? ""}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.target_value ?? ""}
                                                  </td>
                                                  <td className="px-3 py-3 text-center">
                                                      <div className="space-y-2">
                                                          <div className="flex items-center justify-center space-x-2">
                                                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                                                  <div 
                                                                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBgColor(kr.progress_percent)}`}
                                                                      style={{ width: `${Math.min(100, Math.max(0, kr.progress_percent))}%` }}
                                                                  ></div>
                                                              </div>
                                                              <span className={`text-sm font-medium ${getProgressColor(kr.progress_percent)}`}>
                                                                  {formatPercent(kr.progress_percent)}
                                                              </span>
                                                          </div>
                                                          <div className="flex space-x-1 justify-center">
                                                              <button
                                                                  onClick={() => openCheckInModal(kr)}
                                                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                                  title="Check-in tiến độ"
                                                              >
                                                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                  </svg>
                                                              </button>
                                                              <button
                                                                  onClick={() => openCheckInHistory(kr)}
                                                                  className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                                                                  title="Xem lịch sử check-in"
                                                              >
                                                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                  </svg>
                                                              </button>
                                                          </div>
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))
                                        : null}
                                </React.Fragment>
                            ))}
                    </tbody>
                </table>
            </div>

            {editingKR && (
                <Modal
                    open={true}
                    onClose={() => setEditingKR(null)}
                    title="Sửa Key Result"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveKr(editingKR);
                        }}
                        className="space-y-3"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Tiêu đề
                            </label>
                            <input
                                value={editingKR.kr_title || ""}
                                onChange={(e) =>
                                    setEditingKR({
                                        ...editingKR,
                                        kr_title: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Mục tiêu
                                </label>
                                <input
                                    type="number"
                                    value={editingKR.target_value || 0}
                                    onChange={(e) =>
                                        setEditingKR({
                                            ...editingKR,
                                            target_value: Number(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Thực tế
                                </label>
                                <input
                                    type="number"
                                    value={editingKR.current_value || 0}
                                    onChange={(e) =>
                                        setEditingKR({
                                            ...editingKR,
                                            current_value: Number(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Đơn vị
                                </label>
                                <input
                                    value={editingKR.unit || ""}
                                    onChange={(e) =>
                                        setEditingKR({
                                            ...editingKR,
                                            unit: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Trạng thái
                                </label>
                                <select
                                    value={editingKR.status || "draft"}
                                    onChange={(e) =>
                                        setEditingKR({
                                            ...editingKR,
                                            status: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Phòng ban
                                </label>
                                <select
                                    value={String(
                                        editingKR.department_id || ""
                                    )}
                                    onChange={(e) =>
                                        setEditingKR({
                                            ...editingKR,
                                            department_id: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="">Chọn phòng ban</option>
                                    {departments.map((d) => (
                                        <option
                                            key={d.department_id}
                                            value={String(d.department_id)}
                                        >
                                            {d.d_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Chu kỳ
                                </label>
                                <input
                                    value={(() => {
                                        const parent = items.find(
                                            (o) =>
                                                String(o.objective_id) ===
                                                String(editingKR.objective_id)
                                        );
                                        const cy = cyclesList.find(
                                            (c) =>
                                                String(c.cycle_id) ===
                                                String(parent?.cycle_id)
                                        );
                                        return cy?.cycle_name || "";
                                    })()}
                                    disabled
                                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    const ok = window.confirm(
                                        "Xóa Key Result này? Hành động không thể hoàn tác."
                                    );
                                    if (!ok) return;
                                    try {
                                        const token = document
                                            .querySelector(
                                                'meta[name="csrf-token"]'
                                            )
                                            .getAttribute("content");
                                        const url = `/my-key-results/destroy/${editingKR.objective_id}/${editingKR.kr_id}`;
                                        const res = await fetch(url, {
                                            method: "DELETE",
                                            headers: {
                                                "X-CSRF-TOKEN": token,
                                                Accept: "application/json",
                                            },
                                        });
                                        const json = await res
                                            .json()
                                            .catch(() => ({ success: res.ok }));
                                        if (!res.ok || json.success === false)
                                            throw new Error(
                                                json.message || "Xóa thất bại"
                                            );
                                        setItems((prev) =>
                                            prev.map((o) =>
                                                o.objective_id ===
                                                editingKR.objective_id
                                                    ? {
                                                          ...o,
                                                          key_results: (
                                                              o.key_results ||
                                                              []
                                                          ).filter(
                                                              (x) =>
                                                                  x.kr_id !==
                                                                  editingKR.kr_id
                                                          ),
                                                      }
                                                    : o
                                            )
                                        );
                                        setEditingKR(null);
                                        setToast({
                                            type: "success",
                                            message: "Đã xóa Key Result",
                                        });
                                    } catch (err) {
                                        setToast({
                                            type: "error",
                                            message:
                                                err.message || "Xóa thất bại",
                                        });
                                    }
                                }}
                                className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                            >
                                Xóa
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingKR(null)}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {editingObjective && (
                <Modal
                    open={true}
                    onClose={() => setEditingObjective(null)}
                    title="Sửa Objective"
                >
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const token = document
                                    .querySelector('meta[name="csrf-token"]')
                                    .getAttribute("content");
                                const body = {
                                    obj_title: e.target.obj_title.value,
                                    description:
                                        e.target.description.value || "",
                                    level: e.target.level.value || "company",
                                    status: e.target.status.value || "draft",
                                    cycle_id: e.target.cycle_id.value || null,
                                    department_id:
                                        e.target.level.value === "company"
                                            ? null
                                            : e.target.department_id.value ||
                                              null,
                                };
                                const res = await fetch(
                                    `/my-objectives/update/${editingObjective.objective_id}`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "X-CSRF-TOKEN": token,
                                            Accept: "application/json",
                                        },
                                        body: JSON.stringify(body),
                                    }
                                );
                                const json = await res
                                    .json()
                                    .catch(() => ({ success: false }));
                                if (!res.ok || json.success === false)
                                    throw new Error(
                                        json.message ||
                                            "Cập nhật Objective thất bại"
                                    );
                                const updated = json.data || {
                                    ...editingObjective,
                                    ...body,
                                };
                                const newCycleId =
                                    updated.cycle_id ??
                                    editingObjective.cycle_id;
                                setItems((prev) =>
                                    prev.map((o) => {
                                        if (
                                            o.objective_id !==
                                            editingObjective.objective_id
                                        )
                                            return o;
                                        const updatedKrs = (
                                            o.key_results || []
                                        ).map((kr) => ({
                                            ...kr,
                                            cycle_id: newCycleId,
                                        }));
                                        return {
                                            ...o,
                                            ...updated,
                                            cycle_id: newCycleId,
                                            key_results: updatedKrs,
                                        };
                                    })
                                );
                                setEditingObjective(null);
                                setToast({
                                    type: "success",
                                    message: "Cập nhật Objective thành công",
                                });
                            } catch (err) {
                                setToast({
                                    type: "error",
                                    message:
                                        err.message ||
                                        "Cập nhật Objective thất bại",
                                });
                            }
                        }}
                        className="space-y-3"
                    >
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Tiêu đề
                                </label>
                                <input
                                    name="obj_title"
                                    defaultValue={
                                        editingObjective.obj_title || ""
                                    }
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Cấp độ
                                </label>
                                <select
                                    name="level"
                                    defaultValue={
                                        editingObjective.level || "Công ty"
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="Công ty">Công ty</option>
                                    <option value="Phòng ban">Phòng ban</option>
                                    <option value="Nhóm">Nhóm</option>
                                    <option value="Cá nhân">Cá nhân</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Mô tả
                                </label>
                                <textarea
                                    name="description"
                                    defaultValue={
                                        editingObjective.description || ""
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Trạng thái
                                </label>
                                <select
                                    name="status"
                                    defaultValue={
                                        editingObjective.status || "draft"
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Chu kỳ
                                </label>
                                <select
                                    name="cycle_id"
                                    defaultValue={String(
                                        editingObjective.cycle_id || ""
                                    )}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="">-- chọn chu kỳ --</option>
                                    {cyclesList.map((c) => (
                                        <option
                                            key={c.cycle_id}
                                            value={String(c.cycle_id)}
                                        >
                                            {c.cycle_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Phòng ban
                                </label>
                                <select
                                    name="department_id"
                                    defaultValue={String(
                                        editingObjective.department_id || ""
                                    )}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="">
                                        -- chọn phòng ban --
                                    </option>
                                    {departments.map((d) => (
                                        <option
                                            key={d.department_id}
                                            value={String(d.department_id)}
                                        >
                                            {d.d_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    const ok = window.confirm(
                                        "Xóa Objective này? Hành động không thể hoàn tác."
                                    );
                                    if (!ok) return;
                                    try {
                                        const token = document
                                            .querySelector(
                                                'meta[name="csrf-token"]'
                                            )
                                            .getAttribute("content");
                                        const res = await fetch(
                                            `/my-objectives/destroy/${editingObjective.objective_id}`,
                                            {
                                                method: "DELETE",
                                                headers: {
                                                    "X-CSRF-TOKEN": token,
                                                    Accept: "application/json",
                                                },
                                            }
                                        );
                                        const json = await res
                                            .json()
                                            .catch(() => ({ success: res.ok }));
                                        if (!res.ok || json.success === false)
                                            throw new Error(
                                                json.message ||
                                                    "Xóa Objective thất bại"
                                            );
                                        setItems((prev) =>
                                            prev.filter(
                                                (o) =>
                                                    o.objective_id !==
                                                    editingObjective.objective_id
                                            )
                                        );
                                        setEditingObjective(null);
                                        setToast({
                                            type: "success",
                                            message: "Đã xóa Objective",
                                        });
                                    } catch (err) {
                                        setToast({
                                            type: "error",
                                            message:
                                                err.message ||
                                                "Xóa Objective thất bại",
                                        });
                                    }
                                }}
                                className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                            >
                                Xóa
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingObjective(null)}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {creatingObjective && (
                <Modal
                    open={true}
                    onClose={() => setCreatingObjective(false)}
                    title="Thêm Objective"
                >
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Tiêu đề
                                </label>
                                <input
                                    value={createForm.obj_title}
                                    onChange={(e) =>
                                        handleCreateFormChange(
                                            "obj_title",
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Cấp độ
                                </label>
                                <select
                                    value={createForm.level}
                                    onChange={(e) =>
                                        handleCreateFormChange(
                                            "level",
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    {userLevels.map((level) => (
                                        <option key={level} value={level}>
                                            {level}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Mô tả
                                </label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) =>
                                        handleCreateFormChange(
                                            "description",
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Trạng thái
                                </label>
                                <select
                                    value={createForm.status}
                                    onChange={(e) =>
                                        handleCreateFormChange(
                                            "status",
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Chu kỳ
                                </label>
                                <select
                                    value={createForm.cycle_id}
                                    onChange={(e) =>
                                        handleCreateFormChange(
                                            "cycle_id",
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="">-- chọn chu kỳ --</option>
                                    {cyclesList.length === 0 ? (
                                        <option value="" disabled>
                                            Không có chu kỳ nào
                                        </option>
                                    ) : (
                                        cyclesList.map((c) => (
                                            <option
                                                key={c.cycle_id}
                                                value={String(c.cycle_id)}
                                            >
                                                {c.cycle_name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            {createForm.level !== "company" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Phòng ban
                                    </label>
                                    <select
                                        value={createForm.department_id}
                                        onChange={(e) =>
                                            handleCreateFormChange(
                                                "department_id",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="">
                                            -- chọn phòng ban --
                                        </option>
                                        {departments.map((d) => (
                                            <option
                                                key={d.department_id}
                                                value={String(d.department_id)}
                                            >
                                                {d.d_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="pt-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-600">
                                    Key Results
                                </label>
                                <button
                                    type="button"
                                    onClick={addNewKR}
                                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                                >
                                    Thêm KR
                                </button>
                            </div>
                            {createForm.key_results.map((kr, index) => (
                                <div
                                    key={index}
                                    className="mt-3 border border-slate-200 rounded-lg p-3 space-y-2"
                                >
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Tiêu đề KR
                                            </label>
                                            <input
                                                value={kr.kr_title}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "kr_title",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Trạng thái KR
                                            </label>
                                            <select
                                                value={kr.status}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "status",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            >
                                                <option value="draft">
                                                    Draft
                                                </option>
                                                <option value="active">
                                                    Active
                                                </option>
                                                <option value="completed">
                                                    Completed
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Mục tiêu
                                            </label>
                                            <input
                                                type="number"
                                                value={kr.target_value}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "target_value",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                required
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Thực tế
                                            </label>
                                            <input
                                                type="number"
                                                value={kr.current_value}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "current_value",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                required
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Đơn vị
                                            </label>
                                            <input
                                                value={kr.unit}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "unit",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeNewKR(index)}
                                        className="text-xs text-rose-600"
                                    >
                                        Xóa KR này
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setCreatingObjective(false)}
                                className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateObjective}
                                className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                            >
                                Tạo
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {creatingFor && (
                <Modal
                    open={true}
                    onClose={() => setCreatingFor(null)}
                    title="Thêm Key Result"
                >
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const token = document
                                    .querySelector('meta[name="csrf-token"]')
                                    .getAttribute("content");
                                const body = {
                                    kr_title: e.target.kr_title.value,
                                    target_value: Number(
                                        e.target.target_value.value || 0
                                    ),
                                    current_value: Number(
                                        e.target.current_value.value || 0
                                    ),
                                    unit: e.target.unit.value || "",
                                    status: e.target.status.value || "draft",
                                    cycle_id: creatingFor.cycle_id,
                                    department_id:
                                        e.target.department_id.value || null,
                                };
                                const res = await fetch(
                                    `/my-key-results/store`,
                                    {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "X-CSRF-TOKEN": token,
                                            Accept: "application/json",
                                        },
                                        body: JSON.stringify({
                                            ...body,
                                            objective_id:
                                                creatingFor.objective_id,
                                        }),
                                    }
                                );
                                const json = await res.json();
                                if (!res.ok || json.success === false)
                                    throw new Error(
                                        json.message || "Tạo thất bại"
                                    );
                                const newKR = json.data;
                                setItems((prev) =>
                                    prev.map((o) =>
                                        o.objective_id ===
                                        creatingFor.objective_id
                                            ? {
                                                  ...o,
                                                  key_results: [
                                                      ...(o.key_results || []),
                                                      newKR,
                                                  ],
                                              }
                                            : o
                                    )
                                );
                                setCreatingFor(null);
                                setToast({
                                    type: "success",
                                    message: "Tạo Key Result thành công",
                                });
                            } catch (err) {
                                setToast({
                                    type: "error",
                                    message: err.message || "Tạo thất bại",
                                });
                            }
                        }}
                        className="space-y-3"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Tiêu đề
                            </label>
                            <input
                                name="kr_title"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            />
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Mục tiêu
                                </label>
                                <input
                                    name="target_value"
                                    type="number"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Thực tế
                                </label>
                                <input
                                    name="current_value"
                                    type="number"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Đơn vị
                                </label>
                                <input
                                    name="unit"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Phòng ban
                                </label>
                                <select
                                    name="department_id"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="">Chọn phòng ban</option>
                                    {departments.map((d) => (
                                        <option
                                            key={d.department_id}
                                            value={String(d.department_id)}
                                        >
                                            {d.d_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Chu kỳ
                                </label>
                                <input
                                    value={(() => {
                                        const cy = cyclesList.find(
                                            (c) =>
                                                String(c.cycle_id) ===
                                                String(creatingFor?.cycle_id)
                                        );
                                        return cy?.cycle_name || "";
                                    })()}
                                    disabled
                                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setCreatingFor(null)}
                                className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                            >
                                Tạo
                            </button>
                        </div>
                    </form>
                </Modal>
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
