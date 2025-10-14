import React, { useState, useEffect } from "react";
import { Modal } from "../components/ui";

export default function ObjectiveModal({
    creatingObjective,
    setCreatingObjective,
    editingObjective,
    setEditingObjective,
    departments,
    cyclesList,
    assignableData,
    setItems,
    setToast,
}) {
    const [createForm, setCreateForm] = useState(
        creatingObjective
            ? {
                  obj_title: "",
                  description: "",
                  level: "company",
                  status: "draft",
                  cycle_id: "",
                  department_id: "",
                  key_results: [],
              }
            : editingObjective
            ? { ...editingObjective }
            : {}
    );
    const [allowedLevels, setAllowedLevels] = useState([]);
    const [availableTargets, setAvailableTargets] = useState([]);
    const [linkForm, setLinkForm] = useState({
        source_objective_id: editingObjective?.objective_id || "",
        target_kr_id: "",
        description: "",
    });
    const [assignments, setAssignments] = useState(
        editingObjective?.assignments?.map((a) => ({
            user_id: a.user_id,
            role_id: a.role_id,
            department_id: a.department_id || "",
        })) || []
    );

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
                setToast({
                    type: "error",
                    message: err.message || "Không thể lấy danh sách cấp độ",
                });
            }
        };
        fetchAllowedLevels();
    }, [setToast]);

    useEffect(() => {
        if (editingObjective) {
            setCreateForm({ ...editingObjective });
            setLinkForm((prev) => ({
                ...prev,
                source_objective_id: editingObjective.objective_id,
            }));
            setAssignments(
                editingObjective.assignments?.map((a) => ({
                    user_id: a.user_id,
                    role_id: a.role_id,
                    department_id: a.department_id || "",
                })) || []
            );
        }
    }, [editingObjective]);

    useEffect(() => {
        if (editingObjective) {
            const fetchAvailableTargets = async () => {
                try {
                    const token = document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content");
                    const res = await fetch(
                        `/my-links/available-targets?source_level=${editingObjective.level}`,
                        {
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    );
                    const json = await res.json();
                    if (res.ok && json.success) {
                        setAvailableTargets(json.data || []);
                    }
                } catch (err) {
                    setToast({
                        type: "error",
                        message: "Lỗi khi lấy Key Results đích",
                    });
                }
            };
            fetchAvailableTargets();
        }
    }, [editingObjective, setToast]);

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

    const addAssignment = () => {
        setAssignments((prev) => [
            ...prev,
            {
                user_id: "",
                role_id: "",
                department_id: createForm.department_id || "",
            },
        ]);
    };

    const updateAssignment = (index, field, value) => {
        setAssignments((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const removeAssignment = (index) => {
        setAssignments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCreateObjective = async () => {
        if (createForm.key_results.length < 1) {
            setToast({
                type: "error",
                message: "Phải có ít nhất một Key Result",
            });
            return;
        }
        if (createForm.level !== "company" && !createForm.department_id) {
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

            // Gán người dùng sau khi tạo Objective
            for (const assignment of assignments) {
                if (assignment.user_id && assignment.role_id) {
                    await fetch("/okr-assignments/store", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            user_id: assignment.user_id,
                            role_id: assignment.role_id,
                            objective_id: created.objective_id,
                            department_id: assignment.department_id || null,
                        }),
                    })
                        .then((res) => res.json())
                        .then((json) => {
                            if (!json.success)
                                throw new Error(json.message || "Gán thất bại");
                        });
                }
            }

            setItems((prev) => [
                ...prev,
                { ...created, key_results: created.key_results || [] },
            ]);
            setCreatingObjective(false);
            setToast({
                type: "success",
                message: "Tạo Objective và gán thành công",
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
                level: createForm.level,
                status: createForm.status,
                cycle_id: createForm.cycle_id,
                department_id: createForm.department_id || null,
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
            const json = await res.json();
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Cập nhật thất bại");

            // Cập nhật gán người dùng
            const existingAssignments = editingObjective.assignments || [];
            for (const assignment of assignments) {
                if (assignment.user_id && assignment.role_id) {
                    await fetch("/okr-assignments/store", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": token,
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            user_id: assignment.user_id,
                            role_id: assignment.role_id,
                            objective_id: editingObjective.objective_id,
                            department_id: assignment.department_id || null,
                        }),
                    })
                        .then((res) => res.json())
                        .then((json) => {
                            if (!json.success)
                                throw new Error(json.message || "Gán thất bại");
                        });
                }
            }
            // Xóa các gán không còn trong danh sách
            for (const existing of existingAssignments) {
                if (
                    !assignments.some(
                        (a) =>
                            a.user_id == existing.user_id &&
                            a.role_id == existing.role_id
                    )
                ) {
                    await fetch(
                        `/okr-assignments/destroy/${existing.assignment_id}`,
                        {
                            method: "DELETE",
                            headers: {
                                "X-CSRF-TOKEN": token,
                                Accept: "application/json",
                            },
                        }
                    )
                        .then((res) => res.json())
                        .then((json) => {
                            if (!json.success)
                                throw new Error(
                                    json.message || "Xóa gán thất bại"
                                );
                        });
                }
            }

            const updated = json.data;
            setItems((prev) =>
                prev.map((o) =>
                    o.objective_id === editingObjective.objective_id
                        ? { ...o, ...updated }
                        : o
                )
            );
            setEditingObjective(null);
            setToast({
                type: "success",
                message: "Cập nhật Objective và gán thành công",
            });
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Cập nhật thất bại",
            });
        }
    };

    const handleDeleteObjective = async () => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
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
            const json = await res.json().catch(() => ({ success: res.ok }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Xóa Objective thất bại");
            setItems((prev) =>
                prev.filter(
                    (o) => o.objective_id !== editingObjective.objective_id
                )
            );
            setEditingObjective(null);
            setToast({ type: "success", message: "Đã xóa Objective" });
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
            <form
                onSubmit={
                    creatingObjective
                        ? handleCreateObjective
                        : handleUpdateObjective
                }
                className="space-y-3"
            >
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
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            required
                        />
                    </div>
                    <div>
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
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Cấp độ
                        </label>
                        <select
                            value={createForm.level || "company"}
                            onChange={(e) =>
                                handleCreateFormChange("level", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                        >
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
                            value={createForm.status || "draft"}
                            onChange={(e) =>
                                handleCreateFormChange("status", e.target.value)
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
                    {createForm.level !== "company" && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Phòng ban
                            </label>
                            <select
                                value={createForm.department_id || ""}
                                onChange={(e) =>
                                    handleCreateFormChange(
                                        "department_id",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            >
                                <option value="">-- chọn phòng ban --</option>
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
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Tiêu đề
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
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Mục tiêu
                                        </label>
                                        <input
                                            value={kr.target_value}
                                            onChange={(e) =>
                                                updateNewKR(
                                                    index,
                                                    "target_value",
                                                    e.target.value
                                                )
                                            }
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
                                            value={kr.current_value}
                                            onChange={(e) =>
                                                updateNewKR(
                                                    index,
                                                    "current_value",
                                                    e.target.value
                                                )
                                            }
                                            type="number"
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Đơn vị
                                        </label>
                                        <select
                                            value={kr.unit}
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
                                                Number
                                            </option>
                                            <option value="percent">
                                                Percent
                                            </option>
                                            <option value="completion">
                                                Completion
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Trạng thái
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
                                            required
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="active">
                                                Active
                                            </option>
                                            <option value="completed">
                                                Completed
                                            </option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeNewKR(index)}
                                            className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                                        >
                                            Xóa
                                        </button>
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
                <div className="mt-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Gán người dùng
                    </h3>
                    {assignments.map((assignment, index) => (
                        <div
                            key={index}
                            className="mt-2 rounded-md border border-slate-200 p-3"
                        >
                            <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Người dùng
                                    </label>
                                    <select
                                        value={assignment.user_id}
                                        onChange={(e) =>
                                            updateAssignment(
                                                index,
                                                "user_id",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="">
                                            -- chọn người dùng --
                                        </option>
                                        {assignableData.users.map((u) => (
                                            <option
                                                key={u.user_id}
                                                value={String(u.user_id)}
                                            >
                                                {u.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Vai trò
                                    </label>
                                    <select
                                        value={assignment.role_id}
                                        onChange={(e) =>
                                            updateAssignment(
                                                index,
                                                "role_id",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="">
                                            -- chọn vai trò --
                                        </option>
                                        {assignableData.roles.map((r) => (
                                            <option
                                                key={r.role_id}
                                                value={String(r.role_id)}
                                            >
                                                {r.role_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Phòng ban
                                    </label>
                                    <select
                                        value={assignment.department_id}
                                        onChange={(e) =>
                                            updateAssignment(
                                                index,
                                                "department_id",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="">
                                            -- không chọn --
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
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => removeAssignment(index)}
                                        className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addAssignment}
                        className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                        Thêm gán người dùng
                    </button>
                </div>
                <div className="mt-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Liên kết với Key Result cấp cao hơn
                    </h3>
                    {availableTargets.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Không có Key Result nào từ cấp cao hơn để liên kết.
                        </p>
                    ) : (
                        <>
                            <select
                                value={linkForm.target_kr_id}
                                onChange={(e) =>
                                    setLinkForm({
                                        ...linkForm,
                                        target_kr_id: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            >
                                <option value="">Chọn Key Result đích</option>
                                {availableTargets.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.objective_title} - {t.title} (
                                        {t.level})
                                    </option>
                                ))}
                            </select>
                            <input
                                value={linkForm.description}
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
                                                    "X-CSRF-TOKEN": token,
                                                    Accept: "application/json",
                                                },
                                                body: JSON.stringify(linkForm),
                                            }
                                        );
                                        const json = await res.json();
                                        if (res.ok && json.success) {
                                            setToast({
                                                type: "success",
                                                message: "Liên kết thành công",
                                            });
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
                <div className="flex justify-end gap-2 pt-2">
                    {editingObjective && (
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
        </Modal>
    );
}
