import React, { useState, useEffect } from "react";
import { Modal } from "../components/ui";

export default function KeyResultModal({
    editingKR,
    creatingFor,
    departments,
    cyclesList,
    setEditingKR,
    setCreatingFor,
    setItems,
    setToast,
    currentUser,
}) {
    const [form, setForm] = useState({
        kr_title: "",
        target_value: 0,
        current_value: 0,
        unit: "",
        status: "draft",
        cycle_id: "", // Sẽ được gán tự động
        department_id: "",
    });

    // Lấy cycle_id từ Objective (tạo mới hoặc sửa)
    useEffect(() => {
        const objectiveCycleId = editingKR?.cycle_id || creatingFor?.cycle_id;
        if (objectiveCycleId) {
            setForm((prev) => ({ ...prev, cycle_id: objectiveCycleId }));
        }
    }, [editingKR, creatingFor]);

    // Reset form khi mở tạo mới
    useEffect(() => {
        if (creatingFor) {
            setForm({
                kr_title: "",
                target_value: 0,
                current_value: 0,
                unit: "",
                status: "draft",
                cycle_id: creatingFor.cycle_id || "",
                department_id: creatingFor.department_id || "",
                assigned_to: currentUser?.user_id || null, // Mặc định là người tạo
            });
        }
    }, [creatingFor, currentUser]);

    // Cập nhật form khi editingKR thay đổi
    useEffect(() => {
        if (editingKR) {
            setForm({
                kr_title: editingKR.kr_title || "",
                target_value: Number(editingKR.target_value) || 0,
                current_value: Number(editingKR.current_value) || 0,
                unit: editingKR.unit || "",
                status: editingKR.status || "",
                cycle_id: editingKR.cycle_id || "",
                department_id: editingKR.department_id || "",
                assigned_to: editingKR.assigned_to || null,
            });
        }
    }, [editingKR]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...form,
            target_value: Number(form.target_value),
            current_value: Number(form.current_value),
            cycle_id: form.cycle_id, // Luôn lấy từ Objective
            department_id: form.department_id || null,
            assigned_to: form.assigned_to || null, // Thêm người được giao vào payload
        };

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");

            let url, method;
            if (editingKR) {
                url = `/my-key-results/update/${editingKR.objective_id}/${editingKR.kr_id}`;
                method = "PUT";
            } else {
                url = `/my-key-results/store`;
                method = "POST";
                payload.objective_id = creatingFor.objective_id;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Thao tác thất bại");
            }

            const savedKR = json.data;

            setItems((prev) => {
                const updated = prev.map((o) =>
                    o.objective_id ===
                    (editingKR?.objective_id || creatingFor.objective_id)
                        ? {
                              ...o,
                              key_results: editingKR
                                  ? (o.key_results || []).map((kr) =>
                                        kr.kr_id === editingKR.kr_id
                                            ? savedKR
                                            : kr
                                    )
                                  : [...(o.key_results || []), savedKR],
                          }
                        : o
                );
                try {
                    localStorage.setItem(
                        "my_objectives",
                        JSON.stringify(updated)
                    );
                } catch {}
                return updated;
            });

            setToast({
                type: "success",
                message: editingKR
                    ? "Cập nhật Key Result thành công"
                    : "Tạo Key Result thành công",
            });

            editingKR ? setEditingKR(null) : setCreatingFor(null);
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Thao tác thất bại",
            });
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa Key Result "${
                form.kr_title || "này"
            }"?\n\nHành động này không thể hoàn tác.`
        );
        if (!confirmed) return;

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");

            const res = await fetch(
                `/my-key-results/destroy/${editingKR.objective_id}/${editingKR.kr_id}`,
                {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                }
            );

            const json = await res.json().catch(() => ({ success: res.ok }));
            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Xóa thất bại");
            }

            setItems((prev) => {
                const updated = prev.map((o) =>
                    o.objective_id === editingKR.objective_id
                        ? {
                              ...o,
                              key_results: (o.key_results || []).filter(
                                  (kr) => kr.kr_id !== editingKR.kr_id
                              ),
                          }
                        : o
                );
                try {
                    localStorage.setItem(
                        "my_objectives",
                        JSON.stringify(updated)
                    );
                } catch {}
                return updated;
            });

            setToast({
                type: "success",
                message: "Đã xóa Key Result thành công",
            });
            setEditingKR(null);
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Xóa thất bại",
            });
        }
    };

    // Tìm tên chu kỳ để hiển thị (readonly)
    const currentCycle = cyclesList.find(
        (c) => String(c.cycle_id) === String(form.cycle_id)
    );

    return (
        <Modal
            open={!!editingKR || !!creatingFor}
            onClose={() =>
                editingKR ? setEditingKR(null) : setCreatingFor(null)
            }
            title={editingKR ? "Sửa Key Result" : "Thêm Key Result"}
        >
            <div className="max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Tiêu đề
                        </label>
                        <input
                            value={form.kr_title}
                            onChange={(e) =>
                                handleChange("kr_title", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            required
                        />
                    </div>

                    {/* Hiển thị Chu kỳ (chỉ đọc) */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Chu kỳ
                        </label>
                        <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {currentCycle?.cycle_name || "—"}
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Trạng thái
                            </label>
                            {creatingFor ? (
                                <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                    Bản nháp
                                </div>
                            ) : (
                                <select
                                    value={form.status}
                                    onChange={(e) =>
                                        handleChange("status", e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="">-- chọn trạng thái --</option>
                                    <option value="draft">Bản nháp</option>
                                    <option value="active">Đang thực hiện</option>
                                    <option value="completed">Hoàn thành</option>
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Đơn vị
                            </label>
                            <select
                                value={form.unit}
                                onChange={(e) =>
                                    handleChange("unit", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            >
                                <option value="">-- chọn đơn vị --</option>
                                <option value="number">Số lượng</option>
                                <option value="percent">Phần trăm</option>
                                <option value="completion">Hoàn thành</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Mục tiêu
                            </label>
                            <input
                                value={form.target_value}
                                onChange={(e) =>
                                    handleChange("target_value", e.target.value)
                                }
                                type="number"
                                step="0.01"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        {/* {editingKR && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                            >
                                Xóa
                            </button>
                        )} */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    editingKR
                                        ? setEditingKR(null)
                                        : setCreatingFor(null)
                                }
                                className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                            >
                                {editingKR ? "Lưu" : "Tạo"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
