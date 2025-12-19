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
    reloadData,
}) {
    const [createForm, setCreateForm] = useState(
        creatingObjective
            ? {
                  obj_title: "",
                  description: "",
                  level: "",
                  status: null, // Sẽ được tính tự động từ progress
                  cycle_id: "",
                  department_id: "",
                  key_results: [],
                  is_aspirational: false,
                  tags: "",
              }
            : editingObjective
            ? { ...editingObjective, level: editingObjective.level || "team" } // Default level
            : {}
    );
    const [allowedLevels, setAllowedLevels] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Update createForm and linkForm when editingObjective changes
    useEffect(() => {
        if (editingObjective?.objective_id) {
            setCreateForm({
                ...editingObjective,
                level: editingObjective.level || "team",
            });
        }
    }, [editingObjective]);

    // Reset create form each time the "creatingObjective" modal is opened
    useEffect(() => {
        if (creatingObjective) {
            setCreateForm({
                obj_title: "",
                description: "",
                level: "",
                status: null, // Sẽ được tính tự động từ progress
                cycle_id: "",
                department_id: "",
                key_results: [],
            });
        }
    }, [creatingObjective]);

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

    // Thêm useEffect để tự động điền department_id khi level là unit/team và có currentUser
    useEffect(() => {
        if (
            currentUser?.department_id &&
            ["unit", "team"].includes(createForm.level)
        ) {
            setCreateForm((prev) => ({
                ...prev,
                department_id: String(currentUser.department_id),
            }));
        }
    }, [currentUser, createForm.level]);

    const handleCreateFormChange = (field, value) => {
        setCreateForm((prev) => {
            let newForm = { ...prev, [field]: value };

            // TỰ ĐỘNG gán department_id khi chọn level là unit hoặc team
            if (field === "level" && ["unit", "team"].includes(value)) {
                if (currentUser?.department_id) {
                    newForm.department_id = String(currentUser.department_id);
                } else {
                    newForm.department_id = "";
                    // Có thể thông báo ngay ở đây nếu muốn
                }
            }

            // Khi chuyển sang company hoặc person → xóa department_id
            if (field === "level" && (value === "company" || value === "person")) {
                newForm.department_id = null;
            }

            return newForm;
        });
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
                    status: "not_start", // Bản nháp
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

    const handleCreateObjective = async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        // CHỈ validate department_id cho level unit hoặc team
        if (
            ["unit", "team"].includes(createForm.level) &&
            !createForm.department_id
        ) {
            setToast({
                type: "error",
                message: "Phải chọn phòng ban cho level unit hoặc team",
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
                    createForm.level === "company" || createForm.level === "person"
                        ? null
                        : createForm.department_id,
                key_results: createForm.key_results.map((kr) => ({
                    ...kr,
                    target_value: Number(kr.target_value),
                    current_value: Number(kr.current_value),
                })),
                is_aspirational: createForm.is_aspirational,
                tags: createForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
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

            // Đảm bảo có user data nếu backend không trả về
            const createdWithUser = {
                ...created,
                key_results: created.key_results || [],
                user: created.user || (currentUser ? {
                    user_id: currentUser.user_id,
                    full_name: currentUser.full_name,
                    email: currentUser.email,
                    avatar_url: currentUser.avatar_url,
                } : null),
            };

            setItems((prev) => [
                ...prev,
                createdWithUser,
            ]);

            setCreatingObjective(false);
            // Reload data from server to ensure consistency
            if (reloadData) {
                reloadData();
            }
            setToast({
                type: "success",
                message: "Tạo Objective thành công",
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
                is_aspirational: createForm.is_aspirational,
                tags: typeof createForm.tags === 'string' ? createForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : createForm.tags,
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
            setItems((prev) =>
                prev.filter(
                    (o) => o.objective_id !== editingObjective.objective_id
                )
            );
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
            className="max-w-3xl"
        >
            <div className="max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 px-1 md:px-2">
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
                    <div className="grid gap-3 md:grid-cols-2 items-start">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Thẻ (cách nhau bởi dấu phẩy)
                            </label>
                            <input
                                value={createForm.tags || ""}
                                onChange={(e) =>
                                    handleCreateFormChange("tags", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                        <div className="flex items-center h-full mt-4">
                            <input
                                type="checkbox"
                                id="is_aspirational"
                                checked={createForm.is_aspirational || false}
                                onChange={(e) =>
                                    handleCreateFormChange(
                                        "is_aspirational",
                                        e.target.checked
                                    )
                                }
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="is_aspirational" className="ml-2 block text-sm text-gray-900">
                                Mục tiêu tham vọng
                            </label>
                        </div>
                    </div>
                <div className="grid gap-3 md:grid-cols-2 items-start">
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
                                    {level === "company"
                                        ? "Công ty"
                                        : level === "unit"
                                        ? "Phòng ban"
                                        : level === "team"
                                        ? "Nhóm"
                                        : level === "person"
                                        ? "Cá nhân"
                                        : level}
                                </option>
                            ))}
                            </select>
                        </div>
                        {/* Thay thế toàn bộ phần hiển thị Phòng ban hiện tại bằng đoạn code mới này */}

                        {["unit", "team"].includes(createForm.level) && (
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Phòng ban
                                </label>
                                {
                                    currentUser?.department_id ? (
                                        <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                            <span className="font-medium">
                                                {departments.find(
                                                    (d) =>
                                                        String(
                                                            d.department_id
                                                        ) ===
                                                        String(
                                                            currentUser.department_id
                                                        )
                                                )?.d_name ||
                                                    "Phòng ban của bạn"}
                                            </span>
                                        </div>
                                    ) : null
                                    // (
                                    //     <div className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    //         Bạn chưa thuộc phòng ban nào. Không thể
                                    //         tạo Objective cấp Unit/Team.
                                    //     </div>
                                    // )
                                }
                                {/* Ẩn input để vẫn gửi dữ liệu khi submit */}
                                <input
                                    type="hidden"
                                    name="department_id"
                                    value={currentUser?.department_id || ""}
                                />
                            </div>
                        )}
                    </div>
                    {creatingObjective && (
                        <div className="mt-4">
                            {/* <h3 className="text-sm font-semibold text-slate-700">
                                Key Results
                            </h3> */}
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
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                                readOnly={creatingObjective}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
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
