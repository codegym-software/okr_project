import React, { useState, useEffect } from "react";
import { Modal } from "../components/ui";

export default function ObjectiveModal({
    creatingObjective,
    setCreatingObjective,
    editingObjective,
    setEditingObjective,
    departments,
    cyclesList,
    setItems,
    setToast,
}) {
    console.log("🚨 FULL editingObjective:", editingObjective); // DEBUG
    const [createForm, setCreateForm] = useState(
        creatingObjective
            ? {
                  obj_title: "",
                  description: "",
                  level: "",
                  status: "",
                  cycle_id: "",
                  department_id: "",
                  key_results: [],
              }
            : editingObjective
            ? { ...editingObjective, level: editingObjective.level || "team" } // Default level
            : {}
    );
    const [allowedLevels, setAllowedLevels] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [availableTargets, setAvailableTargets] = useState([]);
    const [linkForm, setLinkForm] = useState({
        source_objective_id: editingObjective?.objective_id || "",
        target_kr_id: "",
        description: "",
    });

    // Log final state
    useEffect(() => {
        console.log(
            "🎯 FINAL STATE:",
            availableTargets.length,
            availableTargets
        );
    }, [availableTargets]);

    // Update createForm and linkForm when editingObjective changes
    useEffect(() => {
        if (editingObjective?.objective_id) {
            setCreateForm({
                ...editingObjective,
                level: editingObjective.level || "team",
            });
            setLinkForm((prev) => ({
                ...prev,
                source_objective_id: editingObjective.objective_id,
            }));
        }
    }, [editingObjective]);

    // Fetch available targets
    const fetchAvailableTargets = async () => {
        // TODO: Implement linking feature
        // Tạm thời disable để tránh lỗi route not found
        setAvailableTargets([]);
        return;
        
        /* DISABLED - Route not implemented yet
        if (!editingObjective?.objective_id) {
            setAvailableTargets([]);
            return;
        }
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const sourceLevel = editingObjective.level || "team";
            const url = `/my-links/available-targets?source_level=${sourceLevel}`;
            console.log("📡 FETCHING:", url);
            const res = await fetch(url, {
                headers: {
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
            });
            const json = await res.json();
            console.log("📦 DATA RECEIVED:", json);
            if (res.ok && json.success) {
                setAvailableTargets(json.data || []);
            } else {
                throw new Error(json.message || "Lỗi khi lấy Key Results đích");
            }
        } catch (err) {
            console.error("❌ FETCH ERROR:", err);
            setToast({
                type: "error",
                message: err.message || "Lỗi khi lấy Key Results đích",
            });
            setAvailableTargets([]);
        }
        */
    };

    useEffect(() => {
        fetchAvailableTargets();
    }, [editingObjective?.objective_id, setToast]);

    // Fetch allowed levels
    useEffect(() => {
        const fetchAllowedLevels = async () => {
            try {
                const token = document
                    .querySelector('meta[name="csrf-token"]')
                    .getAttribute("content");
                const res = await fetch("/my-objectives/getAllowedLevelsApi", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    setAllowedLevels(json.data || []);
                } else {
                    throw new Error(
                        json.message || "Không thể lấy danh sách cấp độ"
                    );
                }
            } catch (err) {
                console.error("Error fetching allowed levels:", err);
                // Fallback to default levels for member
                setAllowedLevels(['person']);
                setToast({
                    type: "error",
                    message: err.message || "Không thể lấy danh sách cấp độ",
                });
            }
        };
        fetchAllowedLevels();
    }, [setToast]);

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = document
                    .querySelector('meta[name="csrf-token"]')
                    .getAttribute("content");
                const res = await fetch("/api/profile", {
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": token,
                    },
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    setCurrentUser(json.user);
                } else {
                    throw new Error(
                        json.message || "Không thể lấy thông tin người dùng"
                    );
                }
            } catch (err) {
                setToast({
                    type: "error",
                    message:
                        err.message || "Không thể lấy thông tin người dùng",
                });
            }
        };
        fetchCurrentUser();
    }, [setToast, creatingObjective]);

    // Update department_id for key results
    useEffect(() => {
        if (createForm.department_id && createForm.key_results.length > 0) {
            const needsUpdate = createForm.key_results.some(
                (kr) => kr.department_id !== createForm.department_id
            );
            if (needsUpdate) {
                setCreateForm((prev) => ({
                    ...prev,
                    key_results: prev.key_results.map((kr) => ({
                        ...kr,
                        department_id: prev.department_id,
                    })),
                }));
            }
        }
    }, [createForm.department_id]);

    // Update cycle_id for key results
    useEffect(() => {
        if (createForm.cycle_id && createForm.key_results.length > 0) {
            const needsUpdate = createForm.key_results.some(
                (kr) => kr.cycle_id !== createForm.cycle_id
            );
            if (needsUpdate) {
                setCreateForm((prev) => ({
                    ...prev,
                    key_results: prev.key_results.map((kr) => ({
                        ...kr,
                        cycle_id: prev.cycle_id,
                    })),
                }));
            }
        }
    }, [createForm.cycle_id]);

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
                    status: "",
                    department_id: prev.department_id,
                    cycle_id: prev.cycle_id,
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
        const kr = createForm.key_results[index];
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa Key Result "${
                kr.kr_title || `KR #${index + 1}`
            }"?\n\nHành động này không thể hoàn tác.`
        );
        if (!confirmed) return;
        setCreateForm((prev) => ({
            ...prev,
            key_results: prev.key_results.filter((_, i) => i !== index),
        }));
    };

    const handleCreateObjective = async () => {
        // Filter out empty key results
        const validKeyResults = createForm.key_results.filter(kr => 
            kr.kr_title && kr.kr_title.trim() !== '' && kr.unit && kr.status
        );
        
        if (validKeyResults.length < 1) {
            setToast({
                type: "error",
                message: "Phải có ít nhất một Key Result",
            });
            return;
        }
        if (
            createForm.level !== "company" &&
            createForm.level !== "" &&
            !createForm.department_id
        ) {
            setToast({
                type: "error",
                message: "Phải chọn phòng ban cho level không phải company",
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
                    createForm.level === "company"
                        ? null
                        : createForm.department_id,
                key_results: validKeyResults.map((kr) => ({
                    ...kr,
                    target_value: Number(kr.target_value) || 0,
                    current_value: Number(kr.current_value) || 0,
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
            const next = [
                ...(
                    (Array.isArray(await (async () => null)()) && []) || []
                ),
            ];
            const updatedList = (prev => {
                const merged = [
                    ...prev,
                    { 
                        ...created, 
                        key_results: created.key_results || created.keyResults || [] 
                    },
                ];
                try { localStorage.setItem('my_objectives', JSON.stringify(merged)); } catch {}
                return merged;
            });
            setItems(updatedList);
            setCreatingObjective(false);
            setToast({
                type: "success",
                message: "Tạo Objective và Key Results thành công",
            });
        } catch (err) {
            setToast({ type: "error", message: err.message || "Tạo thất bại" });
        }
    };

    const handleUpdateObjective = async (e) => {
        e.preventDefault();
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const body = {
                obj_title: createForm.obj_title,
                description: createForm.description,
                level: createForm.level || "team",
                status: createForm.status,
                cycle_id: createForm.cycle_id,
                department_id: createForm.department_id || null,
            };
            const res = await fetch(
                `/my-objectives/update/${editingObjective?.objective_id}`,
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
            const json = await res.json();
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Cập nhật thất bại");
            const updated = json.data;
            setItems((prev) =>
                prev.map((o) =>
                    o.objective_id === editingObjective.objective_id
                        ? {
                              ...o,
                              ...updated,
                              key_results:
                                  o.key_results?.map((kr) => ({
                                      ...kr,
                                      cycle_id: updated.cycle_id,
                                  })) || [],
                          }
                        : o
                )
            );
            setEditingObjective(null);
            setToast({
                type: "success",
                message: "Cập nhật Objective thành công",
            });
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Cập nhật thất bại",
            });
        }
    };

    const handleDeleteObjective = async () => {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa Objective "${
                editingObjective?.obj_title || "này"
            }"?\n\nHành động này sẽ xóa tất cả Key Results liên quan và không thể hoàn tác.`
        );
        if (!confirmed) return;
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const res = await fetch(
                `/my-objectives/destroy/${editingObjective?.objective_id}`,
                {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                }
            );
            const json = await res.json().catch(() => ({ success: res.ok }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Xóa Objective thất bại");
            setItems((prev) => {
                const merged = prev.filter((o) => o.objective_id !== editingObjective.objective_id);
                try { localStorage.setItem('my_objectives', JSON.stringify(merged)); } catch {}
                return merged;
            });
            setEditingObjective(null);
            setToast({
                type: "success",
                message: "Đã xóa Objective thành công",
            });
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Xóa Objective thất bại",
            });
        }
    };

    return (
        <Modal
            open={creatingObjective || editingObjective}
            onClose={() =>
                creatingObjective
                    ? setCreatingObjective(false)
                    : setEditingObjective(null)
            }
            title={creatingObjective ? "Thêm Objective" : "Sửa Objective"}
        >
            <div className="max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
                <form
                    onSubmit={
                        creatingObjective
                            ? handleCreateObjective
                            : handleUpdateObjective
                    }
                    className="space-y-3"
                >
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Tiêu đề
                        </label>
                        <input
                            value={createForm.obj_title || ""}
                            onChange={(e) =>
                                handleCreateFormChange(
                                    "obj_title",
                                    e.target.value
                                )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Mô tả
                        </label>
                        <input
                            value={createForm.description || ""}
                            onChange={(e) =>
                                handleCreateFormChange(
                                    "description",
                                    e.target.value
                                )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                        />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Cấp độ
                            </label>
                            <select
                                value={createForm.level || ""}
                                onChange={(e) =>
                                    handleCreateFormChange(
                                        "level",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            >
                                <option value="">-- chọn cấp độ --</option>
                                {allowedLevels.map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Trạng thái
                            </label>
                            <select
                                value={createForm.status || ""}
                                onChange={(e) =>
                                    handleCreateFormChange(
                                        "status",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            >
                                <option value="">-- chọn trạng thái --</option>
                                <option value="draft">Bản nháp</option>
                                <option value="active">Đang thực hiện</option>
                                <option value="completed">Hoàn thành</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Chu kỳ
                            </label>
                            <select
                                value={createForm.cycle_id || ""}
                                onChange={(e) =>
                                    handleCreateFormChange(
                                        "cycle_id",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
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
                        {createForm.level !== "company" &&
                            createForm.level !== "" && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Phòng ban
                                    </label>
                                    <select
                                        value={createForm.department_id || ""}
                                        onChange={(e) => {
                                            const selectedDeptId =
                                                e.target.value;
                                            // Admin có quyền chọn bất kỳ phòng ban nào
                                            const isAdmin = 
                                                currentUser?.is_admin === true || 
                                                currentUser?.role?.role_name?.toLowerCase() === 'admin';
                                            
                                            // Nếu không phải Admin và chọn phòng ban khác phòng ban của mình
                                            if (
                                                !isAdmin &&
                                                selectedDeptId &&
                                                selectedDeptId !== "" &&
                                                selectedDeptId !== String(currentUser?.department_id)
                                            ) {
                                                setToast({
                                                    type: "error",
                                                    message:
                                                        "Bạn không thuộc phòng ban này. Vui lòng chọn phòng ban của bạn.",
                                                });
                                                return;
                                            }
                                            handleCreateFormChange(
                                                "department_id",
                                                selectedDeptId
                                            );
                                        }}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="">
                                            -- chọn phòng ban --
                                        </option>
                                        {departments.map((dept) => {
                                            const isUserDept = String(dept.department_id) === String(currentUser?.department_id);
                                            const isAdmin = 
                                                currentUser?.is_admin === true || 
                                                currentUser?.role?.role_name?.toLowerCase() === 'admin';
                                            
                                            return (
                                                <option
                                                    key={dept.department_id}
                                                    value={String(dept.department_id)}
                                                    className={isUserDept ? "font-semibold text-blue-600" : ""}
                                                >
                                                    {dept.d_name}
                                                    {isUserDept ? " (Phòng ban của bạn)" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                    </div>
                    {creatingObjective && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-slate-700">
                                Key Results
                            </h3>
                            {createForm.key_results.map((kr, index) => (
                                <div
                                    key={index}
                                    className="mt-2 rounded-md border border-slate-200 p-3"
                                >
                                    <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                                        <h4 className="text-sm font-semibold text-slate-700">
                                            KR #{index + 1}
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => removeNewKR(index)}
                                            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                    <div className="mb-3">
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Tiêu đề
                                        </label>
                                        <input
                                            value={kr.kr_title || ""}
                                            onChange={(e) =>
                                                updateNewKR(
                                                    index,
                                                    "kr_title",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 mb-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Trạng thái
                                            </label>
                                            <select
                                                value={kr.status || ""}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "status",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                                required
                                            >
                                                <option value="">
                                                    -- chọn trạng thái --
                                                </option>
                                                <option value="draft">
                                                    Bản nháp
                                                </option>
                                                <option value="active">
                                                    Đang thực hiện
                                                </option>
                                                <option value="completed">
                                                    Hoàn thành
                                                </option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Đơn vị
                                            </label>
                                            <select
                                                value={kr.unit || ""}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "unit",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                                required
                                            >
                                                <option value="">
                                                    -- chọn đơn vị --
                                                </option>
                                                <option value="number">
                                                    Số lượng
                                                </option>
                                                <option value="percent">
                                                    Phần trăm
                                                </option>
                                                <option value="completion">
                                                    Hoàn thành
                                                </option>
                                                <option value="bai">
                                                    Bài
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Mục tiêu
                                            </label>
                                            <input
                                                value={kr.target_value || 0}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "target_value",
                                                        e.target.value
                                                    )
                                                }
                                                type="number"
                                                step="0.01"
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Thực tế
                                            </label>
                                            <input
                                                value={kr.current_value || 0}
                                                onChange={(e) =>
                                                    updateNewKR(
                                                        index,
                                                        "current_value",
                                                        e.target.value
                                                    )
                                                }
                                                type="number"
                                                step="0.01"
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addNewKR}
                                className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                                Thêm Key Result
                            </button>
                        </div>
                    )}
                    {editingObjective && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-slate-700">
                                Liên kết với Key Result cấp cao hơn
                            </h3>
                            {availableTargets.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Không có Key Result nào từ cấp cao hơn để
                                    liên kết.
                                </p>
                            ) : (
                                <>
                                    <select
                                        value={linkForm.target_kr_id || ""}
                                        onChange={(e) =>
                                            setLinkForm({
                                                ...linkForm,
                                                target_kr_id: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="">
                                            Chọn Key Result đích
                                        </option>
                                        {availableTargets.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.objective_title} - {t.title}{" "}
                                                ({t.level})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        value={linkForm.description || ""}
                                        onChange={(e) =>
                                            setLinkForm({
                                                ...linkForm,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Mô tả liên kết"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none mt-2"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const token = document
                                                    .querySelector(
                                                        'meta[name="csrf-token"]'
                                                    )
                                                    .getAttribute("content");
                                                const res = await fetch(
                                                    "/my-links/store",
                                                    {
                                                        method: "POST",
                                                        headers: {
                                                            "Content-Type":
                                                                "application/json",
                                                            "X-CSRF-TOKEN":
                                                                token,
                                                            Accept: "application/json",
                                                        },
                                                        body: JSON.stringify(
                                                            linkForm
                                                        ),
                                                    }
                                                );
                                                const json = await res.json();
                                                if (res.ok && json.success) {
                                                    setToast({
                                                        type: "success",
                                                        message:
                                                            "Liên kết thành công",
                                                    });
                                                    // Reset linkForm
                                                    setLinkForm({
                                                        source_objective_id:
                                                            editingObjective.objective_id,
                                                        target_kr_id: "",
                                                        description: "",
                                                    });
                                                    // Refresh available targets
                                                    await fetchAvailableTargets();
                                                } else {
                                                    throw new Error(
                                                        json.message ||
                                                            "Liên kết thất bại"
                                                    );
                                                }
                                            } catch (err) {
                                                setToast({
                                                    type: "error",
                                                    message:
                                                        err.message ||
                                                        "Lỗi khi lưu liên kết",
                                                });
                                            }
                                        }}
                                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 mt-2"
                                        disabled={!linkForm.target_kr_id}
                                    >
                                        Lưu liên kết
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        {editingObjective && currentUser && currentUser.role?.role_name?.toLowerCase() !== 'member' && (
                            <button
                                type="button"
                                onClick={handleDeleteObjective}
                                className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                            >
                                Xóa
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    creatingObjective
                                        ? setCreatingObjective(false)
                                        : setEditingObjective(null)
                                }
                                className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                            >
                                {creatingObjective ? "Tạo" : "Lưu"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
