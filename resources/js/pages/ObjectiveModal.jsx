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
        }
    }, [editingObjective]);

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
            setItems((prev) => [
                ...prev,
                { ...created, key_results: created.key_results || [] },
            ]);
            setCreatingObjective(false);
            setToast({ type: "success", message: "Tạo Objective thành công" });
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
            {creatingObjective ? (
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
                                {allowedLevels.map((level) => (
                                    <option key={level} value={level}>
                                        {level.charAt(0).toUpperCase() +
                                            level.slice(1)}
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
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">
                                Key Results
                            </h3>
                            <button
                                type="button"
                                onClick={addNewKR}
                                className="text-xs text-blue-600"
                            >
                                + Thêm KR
                            </button>
                        </div>
                        {createForm.key_results.map((kr, index) => (
                            <div
                                key={index}
                                className="grid gap-3 md:grid-cols-4"
                            >
                                <div className="md:col-span-2">
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
                                        Mục tiêu
                                    </label>
                                    <input
                                        type="number"
                                        value={kr.target_value}
                                        onChange={(e) =>
                                            updateNewKR(
                                                index,
                                                "target_value",
                                                e.target.value
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
                                                e.target.value
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
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Status
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
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="completed">
                                            Completed
                                        </option>
                                    </select>
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
            ) : (
                <form onSubmit={handleUpdateObjective} className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
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
                                required
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                        </div>
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
                                {allowedLevels.map((level) => (
                                    <option key={level} value={level}>
                                        {level.charAt(0).toUpperCase() +
                                            level.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Mô tả
                            </label>
                            <textarea
                                value={createForm.description || ""}
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
                                value={createForm.status || "draft"}
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
                                value={createForm.cycle_id || ""}
                                onChange={(e) =>
                                    handleCreateFormChange(
                                        "cycle_id",
                                        e.target.value
                                    )
                                }
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
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleDeleteObjective}
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
            )}
        </Modal>
    );
}
