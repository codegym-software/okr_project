import React, { useEffect, useState, useCallback } from "react";
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
            title={mode === "edit" ? "Sửa phòng ban" : "Tạo phòng ban mới"}
        >
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Tên phòng ban
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
                    setSelectedUsers([]);
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
        const roleName = (user.role?.role_name || "").toLowerCase();
        const isAdminUser =
            roleName === "admin" ||
            user.email === "okr.admin@company.com";
        const isCeoUser = roleName === "ceo";
        // Chỉ hiển thị người dùng chưa thuộc phòng ban nào
        const isAssignedToAnyDepartment = !!user.department_id;
        return !isAdminUser && !isCeoUser && !isAssignedToAnyDepartment;
    });

    const userOptions = filteredUsers.map((user) => ({
        value: user.user_id,
        label: user.full_name,
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

// Component Modal hiển thị danh sách thành viên
function MembersModal({
    open,
    onClose,
    users,
    departmentName,
    canRemove = false,
    onRequestRemoveUser,
    removingUserId = null,
}) {
    if (!users || users.length === 0) {
        return (
            <Modal open={open} onClose={onClose} title={departmentName}>
                <div className="text-center text-slate-500 py-8">
                    Chưa có thành viên nào
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={departmentName}
        >
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user) => {
                    const roleName = (user.role?.role_name || "").toLowerCase();
                    const isManager = roleName === "manager";
                    const isMember = roleName === "member";
                    
                    return (
                        <div
                            key={user.user_id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                        >
                            <img
                                src={user.avatar_url || "/images/default.png"}
                                alt={user.full_name}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                            <div className="flex-1 flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-medium text-slate-900">
                                        {user.full_name}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {user.email}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isManager && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                            Quản lý
                                        </span>
                                    )}
                                    {isMember && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                            Thành viên
                                        </span>
                                    )}
                                    {canRemove && (
                                        <button
                                            onClick={() => onRequestRemoveUser && onRequestRemoveUser(user)}
                                            disabled={removingUserId === user.user_id}
                                            className={`p-1.5 rounded-lg border transition-colors ${
                                                removingUserId === user.user_id
                                                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                                    : "border-rose-200 text-rose-600 hover:bg-rose-50"
                                            }`}
                                            title="Xoá khỏi phòng ban"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}

// Component hiển thị danh sách thành viên với avatar
function MembersDisplay({ users, departmentName, onShowAll }) {
    const maxVisible = 3; // Số avatar hiển thị tối đa
    const visibleUsers = users?.slice(0, maxVisible) || [];
    const remainingCount = users?.length > maxVisible ? users.length - maxVisible : 0;

    if (!users || users.length === 0) {
        return (
            <div className="flex items-center justify-center">
                <span className="text-slate-400">—</span>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2 flex-wrap">
            {visibleUsers.map((user) => (
                <div
                    key={user.user_id}
                    className="flex items-center"
                    title={user.full_name}
                >
                    <img
                        src={user.avatar_url || "/images/default.png"}
                        alt={user.full_name}
                        className="h-8 w-8 rounded-full object-cover shadow-sm"
                    />
                </div>
            ))}
            {remainingCount > 0 && (
                <button
                    onClick={onShowAll}
                    className="h-8 px-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors flex items-center justify-center shadow-sm"
                    title={`Xem thêm ${remainingCount} thành viên`}
                >
                    +{remainingCount}
                </button>
            )}
        </div>
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
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [removingUserId, setRemovingUserId] = useState(null);
    const [userPendingRemoval, setUserPendingRemoval] = useState(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [pendingDepartmentId, setPendingDepartmentId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("department") || null;
    });

    const updateDepartmentQueryParam = useCallback((deptId, replace = false) => {
        const params = new URLSearchParams(window.location.search);
        if (deptId) {
            params.set("department", deptId);
        } else {
            params.delete("department");
        }
        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        window.history[replace ? "replaceState" : "pushState"]({}, "", newUrl);
    }, []);

    const openMembersModal = useCallback(
        (department, options = {}) => {
            if (!department) return;
            setSelectedDepartment(department);
            setShowMembersModal(true);
            if (!options.skipUrlUpdate) {
                updateDepartmentQueryParam(department.department_id);
            }
        },
        [updateDepartmentQueryParam]
    );

    const closeMembersModal = useCallback(() => {
        setShowMembersModal(false);
        setSelectedDepartment(null);
        setShowRemoveConfirm(false);
        setUserPendingRemoval(null);
        updateDepartmentQueryParam(null);
    }, [updateDepartmentQueryParam]);
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
        if (!window.confirm("Bạn có chắc chắn muốn xóa phòng ban này?")) return;
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
            showToast("success", "Xóa phòng ban thành công");
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

    const requestRemoveUserFromDepartment = (user) => {
        if (!isAdmin || !selectedDepartment) return;
        setUserPendingRemoval(user);
        setShowRemoveConfirm(true);
    };

    const confirmRemoveUserFromDepartment = async () => {
        if (!isAdmin || !selectedDepartment || !userPendingRemoval) return;
        try {
            setRemovingUserId(userPendingRemoval.user_id);
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
            const res = await fetch(
                `/departments/${selectedDepartment.department_id}/users/${userPendingRemoval.user_id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                }
            );
            const data = await res.json();
            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Không thể xoá người dùng");
            }

            showToast("success", data.message || "Đã xoá người dùng khỏi phòng ban");
            setDepartments((prev) =>
                prev.map((dep) =>
                    dep.department_id === selectedDepartment.department_id
                        ? {
                              ...dep,
                              users: (dep.users || []).filter((u) => u.user_id !== userPendingRemoval.user_id),
                          }
                        : dep
                )
            );
            setSelectedDepartment((prev) =>
                prev
                    ? {
                          ...prev,
                          users: (prev.users || []).filter((u) => u.user_id !== userPendingRemoval.user_id),
                      }
                    : prev
            );
        } catch (e) {
            showToast("error", e.message || "Không thể xoá người dùng");
        } finally {
            setRemovingUserId(null);
            setShowRemoveConfirm(false);
            setUserPendingRemoval(null);
        }
    };

    useEffect(() => {
        if (!pendingDepartmentId || departments.length === 0) return;
        const dept = departments.find(
            (d) => String(d.department_id) === String(pendingDepartmentId)
        );
        if (dept) {
            openMembersModal(dept, { skipUrlUpdate: true });
            setPendingDepartmentId(null);
        }
    }, [pendingDepartmentId, departments, openMembersModal]);

    return (
        <div className="">
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />

            <div className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                    Danh sách phòng ban
                </h2>
                {isAdmin && (
                    <button
                        onClick={() => setOpenCreate(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 flex items-center gap-2"
                    >
                        Tạo mới
                    </button>
                )}
            </div>

            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">
                                Tên phòng ban
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
                                    Chưa có phòng ban nào
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
                                        <button
                                            onClick={() => openMembersModal(d)}
                                            className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                                        >
                                            {d.d_name}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 border-r border-slate-200">
                                        <MembersDisplay
                                            users={d.users}
                                            departmentName={d.d_name}
                                            onShowAll={() => openMembersModal(d)}
                                        />
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
            <MembersModal
                open={showMembersModal}
                onClose={closeMembersModal}
                users={selectedDepartment?.users}
                departmentName={selectedDepartment?.d_name}
                canRemove={isAdmin}
                onRequestRemoveUser={requestRemoveUserFromDepartment}
                removingUserId={removingUserId}
            />
            <Modal
                open={showRemoveConfirm}
                onClose={() => {
                    if (removingUserId) return;
                    setShowRemoveConfirm(false);
                    setUserPendingRemoval(null);
                }}
                title="Xác nhận xoá"
                maxWidth="max-w-lg"
            >
                <div className="space-y-4">
                    <p className="text-slate-700">
                        Bạn có chắc chắn muốn xoá{" "}
                        <strong>{userPendingRemoval?.full_name}</strong> khỏi{" "}
                        <strong>{selectedDepartment?.d_name}</strong>?
                    </p>
                    <p className="text-sm text-rose-500">
                        Hành động này sẽ xoá người dùng khỏi phòng ban!
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                if (removingUserId) return;
                                setShowRemoveConfirm(false);
                                setUserPendingRemoval(null);
                            }}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            disabled={!!removingUserId}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={confirmRemoveUserFromDepartment}
                            className={`px-4 py-2 rounded-lg text-white bg-rose-600 hover:bg-rose-700 transition ${
                                removingUserId ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                            disabled={!!removingUserId}
                        >
                            {removingUserId ? "Đang xoá..." : "Xoá khỏi phòng ban"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
