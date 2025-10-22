import React, { useEffect, useState } from "react";
import { Toast, Modal } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { AdminOnly } from "../components/AdminOnly";
import Select from "react-select"; // Nếu dùng React-Select

function DepartmentFormModal({
    open,
    onClose,
    mode = "create",
    initialData = null,
    onSaved,
    onDelete = null,
    onReload,
}) {
    const { canManageRooms, canManageTeams } = useAuth();
    const [name, setName] = useState(initialData?.d_name || "");
    const [desc, setDesc] = useState(initialData?.d_description || "");
    const [type, setType] = useState(
        mode === "edit"
            ? initialData?.type
            : canManageRooms
            ? "phòng ban"
            : "đội nhóm"
    );
    const [parentDepartmentId, setParentDepartmentId] = useState(
        initialData?.parent_department_id || ""
    );
    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });

    const hasPermissionForType = (selectedType) => {
        if (selectedType === "phòng ban") return canManageRooms;
        if (selectedType === "đội nhóm") return canManageTeams;
        return false;
    };

    const currentPermission = hasPermissionForType(type);

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
        setType(
            mode === "edit"
                ? initialData?.type
                : canManageRooms
                ? "phòng ban"
                : "đội nhóm"
        );
        setParentDepartmentId(initialData?.parent_department_id || "");
    }, [initialData, open, canManageRooms, type]);

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
            if (!isEdit) {
                onReload && onReload();
            }
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
    const { canManageUsers } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });

    useEffect(() => {
        if (open && canManageUsers) {
            (async () => {
                setLoading(true);
                try {
                    const res = await fetch("/users", {
                        headers: { Accept: "application/json" },
                        credentials: "include", // Gửi cookie xác thực nếu dùng Sanctum
                    });
                    const data = await res.json();
                    if (res.status === 403) {
                        throw new Error(
                            "Bạn không có quyền truy cập danh sách người dùng"
                        );
                    }
                    if (data.success === false) {
                        throw new Error(
                            data.message || "Tải danh sách người dùng thất bại"
                        );
                    }
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
    }, [open, department, canManageUsers]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving || !canManageUsers) return;
        setSaving(true);
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const res = await fetch(
                `/departments/${department.department_id}/assign-users`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ user_ids: selectedUsers }),
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
            {!canManageUsers ? (
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

    const { canManageRooms, canManageTeams, canManageUsers } = useAuth();
    const canCreateNew = canManageRooms || canManageTeams;

    const fetchDepartments = async () => {
        try {
            const res = await fetch("/departments", {
                headers: { Accept: "application/json" },
            });
            const data = await res.json();
            if (data.success === false)
                throw new Error(
                    data.message || "Tải danh sách phòng ban/đội nhóm thất bại"
                );
            const departments = data.data.filter((d) => d.type === "phòng ban");
            const teams = data.data.filter((d) => d.type === "đội nhóm");
            setDepartments(departments);
            setTeams(teams);
        } catch (e) {
            showToast(
                "error",
                e.message || "Tải danh sách phòng ban/đội nhóm thất bại"
            );
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
            showToast(
                "error",
                e.message || "Không tải được dữ liệu phòng ban/đội nhóm"
            );
        }
    };

    const openAssignModal = async (department) => {
        setAssigningDepartment(department);
        setOpenAssign(true);
    };

    const remove = async (id) => {
        const ok = window.confirm(
            "Bạn có chắc chắn muốn xóa phòng ban/đội nhóm này?"
        );
        if (!ok) return;
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
            showToast("success", "Xóa phòng ban/đội nhóm thành công");
        } catch (e) {
            showToast("error", e.message || "Xóa phòng ban/đội nhóm thất bại");
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
                {canCreateNew && (
                    <button
                        onClick={() => setOpenCreate(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                    >
                        Tạo mới
                    </button>
                )}
            </div>
            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 w-12"></th>
                            <th className="px-3 py-2 w-[30%] border-r border-slate-200">
                                Tên
                            </th>
                            <th className="px-3 py-2 w-[20%] border-r border-slate-200 text-center">
                                Loại
                            </th>
                            <th className="px-3 py-2 w-[50%] text-center">
                                Mô tả
                            </th>
                            <th className="px-3 py-2 w-[20%] text-center">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading && departments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Chưa có phòng ban
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            departments.map((d, index) => (
                                <React.Fragment key={d.department_id}>
                                    <tr
                                        className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td className="px-3 py-3">
                                            {teams.some(
                                                (t) =>
                                                    t.parent_department_id ===
                                                    d.department_id
                                            ) && (
                                                <button
                                                    onClick={() =>
                                                        toggleExpand(
                                                            d.department_id
                                                        )
                                                    }
                                                    className="rounded-md border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 shadow-sm"
                                                >
                                                    <svg
                                                        width="12"
                                                        height="12"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <polyline
                                                            points={
                                                                expanded[
                                                                    d
                                                                        .department_id
                                                                ]
                                                                    ? "18 15 12 9 6 15"
                                                                    : "6 9 12 15 18 9"
                                                            }
                                                        ></polyline>
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 border-r border-slate-200">
                                            <AdminOnly
                                                permission="canManageRooms"
                                                fallback={
                                                    <span className="font-semibold text-green-700">
                                                        {d.d_name}
                                                    </span>
                                                }
                                            >
                                                <button
                                                    onClick={() =>
                                                        openEditModal(
                                                            d.department_id
                                                        )
                                                    }
                                                    className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                                                >
                                                    {d.d_name}
                                                </button>
                                            </AdminOnly>
                                        </td>
                                        <td className="px-3 py-3 border-r border-slate-200 text-center">
                                            {d.type}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {d.d_description || "-"}
                                            {d.users && d.users.length > 0 && (
                                                <div className="text-xs text-slate-500">
                                                    Người dùng:{" "}
                                                    {d.users
                                                        .map((u) => u.full_name)
                                                        .join(", ")}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <AdminOnly permission="canManageUsers">
                                                <button
                                                    onClick={() =>
                                                        openAssignModal(d)
                                                    }
                                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                                >
                                                    Gán người dùng
                                                </button>
                                            </AdminOnly>
                                        </td>
                                    </tr>
                                    {expanded[d.department_id] &&
                                        teams
                                            .filter(
                                                (t) =>
                                                    t.parent_department_id ===
                                                    d.department_id
                                            )
                                            .map((t) => (
                                                <tr
                                                    key={t.department_id}
                                                    className="hover:bg-slate-100"
                                                >
                                                    <td className="px-8 py-3"></td>
                                                    <td className="px-3 py-3 border-r border-slate-200">
                                                        <AdminOnly
                                                            permission="canManageTeams"
                                                            fallback={
                                                                <span className="text-indigo-600">
                                                                    {t.d_name}
                                                                </span>
                                                            }
                                                        >
                                                            <button
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        t.department_id
                                                                    )
                                                                }
                                                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                            >
                                                                {t.d_name}
                                                            </button>
                                                        </AdminOnly>
                                                    </td>
                                                    <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                        {t.type}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {t.d_description || "-"}
                                                        {t.users &&
                                                            t.users.length >
                                                                0 && (
                                                                <div className="text-xs text-slate-500">
                                                                    Người dùng:{" "}
                                                                    {t.users
                                                                        .map(
                                                                            (
                                                                                u
                                                                            ) =>
                                                                                u.full_name
                                                                        )
                                                                        .join(
                                                                            ", "
                                                                        )}
                                                                </div>
                                                            )}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <AdminOnly permission="canManageUsers">
                                                            <button
                                                                onClick={() =>
                                                                    openAssignModal(
                                                                        t
                                                                    )
                                                                }
                                                                className="text-blue-600 hover:text-blue-900 font-medium"
                                                            >
                                                                Gán người dùng
                                                            </button>
                                                        </AdminOnly>
                                                    </td>
                                                </tr>
                                            ))}
                                </React.Fragment>
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
