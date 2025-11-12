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
    const [type, setType] = useState(
        mode === "edit" ? initialData?.type : "phòng ban"
    );
    const [parentDepartmentId, setParentDepartmentId] = useState(
        initialData?.parent_department_id || ""
    );
    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });

    const currentPermission = isAdmin;

    useEffect(() => {
        if (open && type === "đội nhóm") {
            (async () => {
                try {
                    const res = await fetch("/departments?type=phòng ban", {
                        headers: { Accept: "application/json" },
                    });
                    const data = await res.json();
                    if (data.success === false)
                        throw new Error(
                            data.message || "Tải danh sách phòng ban thất bại"
                        );
                    setDepartments(data.data || []);
                } catch (e) {
                    setToast({
                        type: "error",
                        message:
                            e.message || "Tải danh sách phòng ban thất bại",
                    });
                }
            })();
        }
        setName(initialData?.d_name || "");
        setDesc(initialData?.d_description || "");
        setType(mode === "edit" ? initialData?.type : "phòng ban");
        setParentDepartmentId(initialData?.parent_department_id || "");
    }, [initialData, open, type]);

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
                type,
                parent_department_id:
                    type === "đội nhóm" ? parentDepartmentId : null,
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
            title={
                mode === "edit"
                    ? "Sửa phòng ban/đội nhóm"
                    : "Tạo phòng ban/đội nhóm"
            }
        >
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Tên
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
                        Loại
                    </label>
                    <div className="w-full rounded-2xl border border-slate-300 px-4 py-2 bg-gray-100">
                        {type}
                    </div>
                </div>
                {type === "đội nhóm" && (
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Phòng ban cha
                        </label>
                        <select
                            value={parentDepartmentId}
                            onChange={(e) =>
                                setParentDepartmentId(e.target.value)
                            }
                            className={`w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${
                                !currentPermission
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : ""
                            }`}
                            disabled={!currentPermission}
                            required
                        >
                            <option value="">Chọn phòng ban cha</option>
                            {departments.map((dep) => (
                                <option
                                    key={dep.department_id}
                                    value={dep.department_id}
                                >
                                    {dep.d_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
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
                                {mode === "edit" ? "Lưu thay đổi" : "Lưu"}
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
                            .filter(
                                (user) =>
                                    user.department_id ===
                                    department?.department_id
                            )
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

    const userOptions = users.map((user) => ({
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
                            value={userOptions.filter((option) =>
                                selectedUsers.includes(option.value)
                            )}
                            onChange={(selected) =>
                                setSelectedUsers(
                                    selected.map((option) => option.value)
                                )
                            }
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Chọn người dùng..."
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Vai trò
                        </label>
                        <Select
                            options={roleOptions}
                            value={roleOptions.find(
                                (option) => option.value === selectedRole
                            )}
                            onChange={(selected) =>
                                setSelectedRole(selected ? selected.value : "")
                            }
                            className="basic-multi-select"
                            classNamePrefix="select"
                            placeholder="Chọn vai trò..."
                            isClearable
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
    const [teams, setTeams] = useState([]);
    const [expanded, setExpanded] = useState({});
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
            const departments = data.data.filter((d) => d.type === "phòng ban");
            const teams = data.data.filter((d) => d.type === "đội nhóm");
            setDepartments(departments);
            setTeams(teams);
        } catch (e) {
            showToast("error", e.message || "Tải danh sách thất bại");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const toggleExpand = (departmentId) => {
        setExpanded((prev) => ({
            ...prev,
            [departmentId]: !prev[departmentId],
        }));
    };

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
        if (!window.confirm("Bạn có chắc chắn muốn xóa?")) return;
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
            setTeams((prev) => prev.filter((t) => t.department_id !== id));
            setOpenEdit(false);
            setEditing(null);
            showToast("success", "Xóa thành công");
        } catch (e) {
            showToast("error", e.message || "Xóa thất bại");
        }
    };

    const handleSaved = (dep) => {
        if (dep.type === "phòng ban") {
            setDepartments((prev) =>
                editing
                    ? prev.map((x) =>
                          x.department_id === dep.department_id ? dep : x
                      )
                    : [...prev, dep]
            );
        } else {
            setTeams((prev) =>
                editing
                    ? prev.map((x) =>
                          x.department_id === dep.department_id ? dep : x
                      )
                    : [...prev, dep]
            );
        }
        showToast("success", `Tạo/cập nhật ${dep.type} thành công`);
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
                    Phòng ban & Đội nhóm
                </h2>
                {isAdmin && (
                    <button
                        onClick={() => setOpenCreate(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 flex items-center gap-2"
                    >
                        + Tạo mới
                    </button>
                )}
            </div>
            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 w-10"></th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">
                                Tên
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
                                    colSpan={4}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading && departments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Chưa có phòng ban
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            departments.map((d, index) => {
                                const childTeams = teams.filter(
                                    (t) =>
                                        t.parent_department_id ===
                                        d.department_id
                                );
                                const hasChildren = childTeams.length > 0;

                                return (
                                    <React.Fragment key={d.department_id}>
                                        <tr className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-3">
                                                {hasChildren && (
                                                    <button
                                                        onClick={() =>
                                                            toggleExpand(
                                                                d.department_id
                                                            )
                                                        }
                                                        className="p-1 rounded hover:bg-slate-200 transition"
                                                    >
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className={`text-slate-500 transition-transform ${
                                                                expanded[
                                                                    d
                                                                        .department_id
                                                                ]
                                                                    ? "rotate-90"
                                                                    : ""
                                                            }`}
                                                        >
                                                            <polyline points="9 18 15 12 9 6" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-200 font-medium text-slate-800">
                                                {d.d_name}
                                            </td>
                                            <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-600">
                                                {d.users?.length > 0
                                                    ? d.users
                                                          .map(
                                                              (u) => u.full_name
                                                          )
                                                          .join(", ")
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isAdmin ? (
                                                    <div className="flex items-center justify-center gap-3">
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
                                                                openAssignModal(
                                                                    d
                                                                )
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

                                        {expanded[d.department_id] &&
                                            childTeams.map((t) => (
                                                <tr
                                                    key={t.department_id}
                                                    className="bg-slate-50 hover:bg-slate-100 transition"
                                                >
                                                    <td className="px-4 py-2"></td>
                                                    <td className="px-4 py-2 pl-12 border-r border-slate-200 text-slate-700">
                                                        {t.d_name}
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-slate-600">
                                                        {t.users?.length > 0
                                                            ? t.users
                                                                  .map(
                                                                      (u) =>
                                                                          u.full_name
                                                                  )
                                                                  .join(", ")
                                                            : "—"}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        {isAdmin ? (
                                                            <div className="flex items-center justify-center gap-3">
                                                                <button
                                                                    onClick={() =>
                                                                        openEditModal(
                                                                            t.department_id
                                                                        )
                                                                    }
                                                                    className="p-1.5 rounded hover:bg-slate-200 transition"
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
                                                                        openAssignModal(
                                                                            t
                                                                        )
                                                                    }
                                                                    className="p-1.5 rounded hover:bg-slate-200 transition"
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

                                        {index < departments.length - 1 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="h-3"
                                                ></td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
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
