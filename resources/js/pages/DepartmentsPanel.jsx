import React, { useEffect, useState } from "react";
import { Toast, Modal } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import Select from "react-select";

function DepartmentFormModal({
    open,
    onClose,
    mode = "create",
    initialData = null,
    onSaved,
    onDelete = null,
    onReload,
}) {
    const { isAdmin } = useAuth();
    const [name, setName] = useState(initialData?.d_name || "");
    const [desc, setDesc] = useState(initialData?.d_description || "");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });

    const currentPermission = isAdmin;

    useEffect(() => {
        if (open) {
            setName(initialData?.d_name || "");
            setDesc(initialData?.d_description || "");
        }
    }, [initialData, open]);

    const submit = async (e) => {
        e.preventDefault();
        if (saving || !currentPermission) return;
        setSaving(true);
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const isEdit = mode === "edit" && initialData?.department_id;
            const url = isEdit
                ? `/departments/${initialData.department_id}`
                : "/departments";
            const method = isEdit ? "PUT" : "POST";
            const body = {
                d_name: name,
                d_description: desc,
            };

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || data.success === false)
                throw new Error(
                    data.message ||
                        (isEdit ? "Cập nhật thất bại" : "Tạo thất bại")
                );

            setToast({
                type: "success",
                message:
                    data.message ||
                    (isEdit ? "Cập nhật thành công!" : "Tạo thành công!"),
            });
            onSaved && onSaved(data.data);
            if (!isEdit) onReload && onReload();
            onClose();
        } catch (e) {
            setToast({
                type: "error",
                message: e.message || "Thao tác thất bại",
            });
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={mode === "edit" ? "Sửa đơn vị" : "Tạo đơn vị mới"}
        >
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Tên đơn vị
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${
                            !currentPermission
                                ? "bg-gray-100 cursor-not-allowed"
                                : ""
                        }`}
                        disabled={!currentPermission}
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Mô tả
                    </label>
                    <textarea
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className={`h-24 w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${
                            !currentPermission
                                ? "bg-gray-100 cursor-not-allowed"
                                : ""
                        }`}
                        disabled={!currentPermission}
                    />
                </div>

                <div className="flex justify-between gap-3 pt-2">
                    <div className="flex gap-3">
                        {mode === "edit" && onDelete && currentPermission && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="rounded-2xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Xóa
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-300 px-5 py-2 text-sm"
                        >
                            Hủy
                        </button>
                        {currentPermission && (
                            <button
                                disabled={saving}
                                type="submit"
                                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                            >
                                {mode === "edit" ? "Lưu thay đổi" : "Tạo mới"}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}

function AssignUsersModal({ open, onClose, department, onReload }) {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });

    const roleOptions = [
        { value: "member", label: "Member" },
        { value: "manager", label: "Manager" },
    ];

    useEffect(() => {
        if (open && isAdmin) {
            (async () => {
                setLoading(true);
                try {
                    const res = await fetch("/users", {
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    const data = await res.json();
                    if (res.status === 403)
                        throw new Error(
                            "Bạn không có quyền truy cập danh sách người dùng"
                        );
                    if (data.success === false)
                        throw new Error(
                            data.message || "Tải danh sách người dùng thất bại"
                        );

                    setUsers(data.data || []);
                    setSelectedUsers(
                        data.data
                            .filter((user) => {
                                const isAdminUser =
                                    (
                                        user.role?.role_name || ""
                                    ).toLowerCase() === "admin" ||
                                    user.email === "okr.admin@company.com";
                                return (
                                    !isAdminUser &&
                                    user.department_id ===
                                        department?.department_id
                                );
                            })
                            .map((user) => user.user_id)
                    );
                } catch (e) {
                    setToast({
                        type: "error",
                        message:
                            e.message || "Tải danh sách người dùng thất bại",
                    });
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [open, department, isAdmin]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving || !isAdmin) return;
        setSaving(true);
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const payload = { user_ids: selectedUsers };
            if (selectedRole) payload.role = selectedRole;

            const res = await fetch(
                `/departments/${department.department_id}/assign-users`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );
            const data = await res.json();
            if (!res.ok || data.success === false)
                throw new Error(data.message || "Gán người dùng thất bại");

            setToast({
                type: "success",
                message: "Gán người dùng thành công!",
            });
            onReload && onReload();
            onClose();
        } catch (e) {
            setToast({
                type: "error",
                message: e.message || "Gán người dùng thất bại",
            });
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const isAdminUser =
            (user.role?.role_name || "").toLowerCase() === "admin" ||
            user.email === "okr.admin@company.com";
        return !isAdminUser;
    });

    const userOptions = filteredUsers.map((user) => ({
        value: user.user_id,
        label: `${user.full_name} (${user.email})`,
    }));

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Gán người dùng cho ${department?.d_name}`}
        >
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            {!isAdmin ? (
                <div className="text-center text-red-500">
                    Bạn không có quyền gán người dùng.
                </div>
            ) : loading ? (
                <div className="text-center text-slate-500">Đang tải...</div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Chọn người dùng
                        </label>
                        <Select
                            isMulti
                            options={userOptions}
                            value={userOptions.filter((opt) =>
                                selectedUsers.includes(opt.value)
                            )}
                            onChange={(selected) =>
                                setSelectedUsers(
                                    selected ? selected.map((s) => s.value) : []
                                )
                            }
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Chọn người dùng..."
                            menuPortalTarget={document.body}
                            styles={{
                                menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                }),
                            }}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Vai trò
                        </label>
                        <Select
                            options={roleOptions}
                            value={roleOptions.find(
                                (opt) => opt.value === selectedRole
                            )}
                            onChange={(selected) =>
                                setSelectedRole(selected ? selected.value : "")
                            }
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Chọn vai trò..."
                            isClearable
                            menuPortalTarget={document.body}
                            styles={{
                                menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                }),
                            }}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-300 px-5 py-2 text-sm"
                        >
                            Hủy
                        </button>
                        <button
                            disabled={saving}
                            type="submit"
                            className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                        >
                            Lưu
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default function DepartmentsPanel() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [assigningDepartment, setAssigningDepartment] = useState(null);
    const [editing, setEditing] = useState(null);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const showToast = (type, message) => setToast({ type, message });

    const { isAdmin } = useAuth();

    const fetchDepartments = async () => {
        try {
            const res = await fetch("/departments", {
                headers: { Accept: "application/json" },
            });
            const data = await res.json();
            if (data.success === false)
                throw new Error(data.message || "Tải danh sách thất bại");
            setDepartments(data.data || []);
        } catch (e) {
            showToast("error", e.message || "Tải danh sách thất bại");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const openEditModal = async (id) => {
        try {
            const res = await fetch(`/departments/${id}`, {
                headers: { Accept: "application/json" },
            });
            const data = await res.json();
            if (!res.ok || data.success === false)
                throw new Error(data.message || "Tải dữ liệu thất bại");
            setEditing(data.data);
            setOpenEdit(true);
        } catch (e) {
            showToast("error", e.message || "Không tải được dữ liệu");
        }
    };

    const openAssignModal = (department) => {
        setAssigningDepartment(department);
        setOpenAssign(true);
    };

    const remove = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa đơn vị này?")) return;
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const res = await fetch(`/departments/${id}`, {
                method: "DELETE",
                headers: { "X-CSRF-TOKEN": token, Accept: "application/json" },
            });
            const data = await res.json().catch(() => ({ success: res.ok }));
            if (!res.ok || data.success === false)
                throw new Error(data.message || "Xóa thất bại");

            setDepartments((prev) =>
                prev.filter((d) => d.department_id !== id)
            );
            setOpenEdit(false);
            setEditing(null);
            showToast("success", "Xóa đơn vị thành công");
        } catch (e) {
            showToast("error", e.message || "Xóa thất bại");
        }
    };

    const handleSaved = (dep) => {
        setDepartments((prev) =>
            editing
                ? prev.map((x) =>
                      x.department_id === dep.department_id ? dep : x
                  )
                : [...prev, dep]
        );
        showToast("success", "Thao tác thành công");
    };

    return (
        <div className="px-4 py-6">
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />

            <div className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                    Quản lý đơn vị
                </h2>
                {isAdmin && (
                    <button
                        onClick={() => setOpenCreate(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 flex items-center gap-2"
                    >
                        + Tạo đơn vị mới
                    </button>
                )}
            </div>

            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">
                                Tên đơn vị
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">
                                Thành viên
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading && departments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Chưa có đơn vị nào
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            departments.map((d) => (
                                <tr
                                    key={d.department_id}
                                    className="hover:bg-slate-50 transition"
                                >
                                    <td className="px-4 py-3 border-r border-slate-200 font-medium text-slate-800">
                                        {d.d_name}
                                    </td>
                                    <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-600">
                                        {d.users?.length > 0
                                            ? d.users
                                                  .map((u) => u.full_name)
                                                  .join(", ")
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isAdmin ? (
                                            <div className="flex items-center justify-center gap-4">
                                                <button
                                                    onClick={() =>
                                                        openEditModal(
                                                            d.department_id
                                                        )
                                                    }
                                                    className="p-1.5 rounded hover:bg-slate-100 transition"
                                                    title="Sửa"
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        openAssignModal(d)
                                                    }
                                                    className="p-1.5 rounded hover:bg-slate-100 transition"
                                                    title="Gán người dùng"
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                        <circle
                                                            cx="8.5"
                                                            cy="7"
                                                            r="4"
                                                        />
                                                        <path d="M20 8v5" />
                                                        <path d="M23 11h-6" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">
                                                —
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            <DepartmentFormModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                mode="create"
                onSaved={handleSaved}
                onReload={fetchDepartments}
            />
            <DepartmentFormModal
                open={openEdit}
                onClose={() => {
                    setOpenEdit(false);
                    setEditing(null);
                }}
                mode="edit"
                initialData={editing}
                onSaved={handleSaved}
                onDelete={editing ? () => remove(editing.department_id) : null}
            />
            <AssignUsersModal
                open={openAssign}
                onClose={() => {
                    setOpenAssign(false);
                    setAssigningDepartment(null);
                }}
                department={assigningDepartment}
                onReload={fetchDepartments}
            />
        </div>
    );
}
