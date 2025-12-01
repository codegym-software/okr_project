import React, { useEffect, useState } from "react";
import { Toast, Select, Badge, Modal } from "../components/ui";
import UserTableRow from "../components/UserTableRow";
import UserTableHeader from "../components/UserTableHeader";
import InviteUserModal from "../components/InviteUserModal";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [level, setLevel] = useState("");
    const [toast, setToast] = useState({ type: "success", message: "" });
    const showToast = (type, message) => setToast({ type, message });
    const [editingDept, setEditingDept] = useState({});
    const [pendingChanges, setPendingChanges] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [teamId, setTeamId] = useState("");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Function để lưu tất cả thay đổi
    const saveAllChanges = async () => {
        const token = document
            .querySelector('meta[name="csrf-token"]')
            .getAttribute("content");
        const promises = Object.entries(pendingChanges).map(
            async ([userId, changes]) => {
                try {
                    const requests = [];

                    // Gửi thay đổi thông tin user (chỉ department, không bao gồm role và level)
                    const userChanges = { ...changes };
                    delete userChanges.status; // Tách status ra riêng
                    delete userChanges.role_id; // Không cho phép thay đổi role
                    delete userChanges.role_name; // Không cho phép thay đổi role
                    delete userChanges.level; // Không cho phép thay đổi level

                    if (Object.keys(userChanges).length > 0) {
                        requests.push(
                            fetch(`/users/${userId}`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-CSRF-TOKEN": token,
                                    Accept: "application/json",
                                },
                                body: JSON.stringify(userChanges),
                            })
                        );
                    }

                    // Gửi thay đổi status riêng
                    if (changes.status) {
                        requests.push(
                            fetch(`/users/${userId}/status`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-CSRF-TOKEN": token,
                                    Accept: "application/json",
                                },
                                body: JSON.stringify({
                                    status: changes.status,
                                }),
                            })
                        );
                    }

                    const responses = await Promise.all(requests);
                    const allOk = responses.every((res) => res.ok);

                    if (!allOk) throw new Error();
                    return { userId, success: true };
                } catch (e) {
                    return { userId, success: false, error: e.message };
                }
            }
        );

        const results = await Promise.all(promises);
        const failed = results.filter((r) => !r.success);

        if (failed.length === 0) {
            showToast(
                "success",
                `Đã lưu thành công ${results.length} thay đổi`
            );
            setPendingChanges({});
            setShowConfirmModal(false);
        } else {
            showToast(
                "error",
                `Lưu thất bại ${failed.length}/${results.length} thay đổi`
            );
        }
    };

    // Function để load users
    const loadUsers = async () => {
        try {
            const resUsers = await fetch("/users", {
                headers: { Accept: "application/json" },
            });
            const usersData = await resUsers.json();
            setUsers(usersData.data || []);
        } catch (e) {
            console.error("Error loading users:", e);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [resUsers, resDeps, resRoles] = await Promise.all([
                    fetch("/users", {
                        headers: { Accept: "application/json" },
                    }),
                    fetch("/departments", {
                        headers: { Accept: "application/json" },
                    }),
                    fetch("/roles", {
                        headers: { Accept: "application/json" },
                    }),
                ]);
                const usersData = await resUsers.json();
                const depsData = await resDeps.json();
                const rolesData = await resRoles.json();
                setUsers(usersData.data || []);
                setDepartments(depsData.data || []);
                setRoles(rolesData.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Function để reset tất cả filter về trạng thái ban đầu
    const resetAllFilters = () => {
        setQ("");
        setLevel("");
        setRole("");
        setDepartmentId("");
        setStatus("");
        setTeamId("");
    };

    // Handler khi thay đổi cấp độ - reset các bộ lọc liên quan
    const handleLevelChange = (newLevel) => {
        setLevel(newLevel);
        // Reset departmentId và teamId khi thay đổi cấp độ
        setDepartmentId("");
        setTeamId("");
    };

    // Kiểm tra có filter nào đang active không
    const hasActiveFilters =
        (q && q.trim()) || level || role || departmentId || status || teamId;

    // Logic filter users
    const filtered = users.filter((u) => {
        const needle = q.toLowerCase();
        const matchesQ =
            !needle ||
            u.full_name?.toLowerCase().includes(needle) ||
            u.email?.toLowerCase().includes(needle);
        const matchesRole = !role || u.role?.role_name?.toLowerCase() === role;
        const matchesStatus = !status || u.status?.toLowerCase() === status;
        const matchesLevel = !level || u.role?.level === level;
        const isAdmin =
            (u.role?.role_name || "").toLowerCase() === "admin" ||
            u.email === "okr.admin@company.com";
        const matchesDept =
            !departmentId || String(u.department_id) === String(departmentId);
        const matchesTeam =
            !teamId || String(u.department_id) === String(teamId);
        return (
            !isAdmin &&
            matchesQ &&
            matchesRole &&
            matchesStatus &&
            matchesDept &&
            matchesLevel &&
            matchesTeam
        );
    });

    return (
        <div className="">
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            <div className="mx-auto max-w-6xl px-4 py-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-900">
                        Quản lý người dùng
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm flex items-center gap-2"
                        >
                            Mời người dùng
                        </button>
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={Object.keys(pendingChanges).length === 0}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm shrink-0 ${
                                Object.keys(pendingChanges).length === 0
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                        >
                            Lưu thay đổi ({Object.keys(pendingChanges).length})
                        </button>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                    {/* Thanh tìm kiếm và Bộ lọc */}
                    <div className="flex items-center gap-3">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Tìm kiếm theo tên hoặc email..."
                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        {/* Filter Button với Dropdown */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFilterDropdown(!showFilterDropdown);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                    hasActiveFilters
                                        ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>Bộ lọc</span>
                                {hasActiveFilters && (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-blue-600 rounded-full">
                                        {[
                                            level,
                                            role,
                                            departmentId,
                                            teamId,
                                            status,
                                        ].filter(Boolean).length}
                                    </span>
                                )}
                                <svg
                                    className={`h-4 w-4 transition-transform ${
                                        showFilterDropdown ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showFilterDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowFilterDropdown(false)}
                                    />
                                    <div 
                                        className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-20"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Bộ lọc
                                                </h3>
                                                {hasActiveFilters && (
                                                    <button
                                                        onClick={() => {
                                                            resetAllFilters();
                                                            setShowFilterDropdown(false);
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Xóa tất cả
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {/* Cấp độ */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                                        Cấp độ
                                                    </label>
                                                    <Select
                                                        value={level}
                                                        onChange={handleLevelChange}
                                                        placeholder="Chọn cấp độ"
                                                        options={[
                                                            { value: "", label: "Tất cả" },
                                                            { value: "unit", label: "Phòng ban" },
                                                            { value: "team", label: "Nhóm" },
                                                        ]}
                                                    />
                                                </div>

                                                {/* Phòng ban - chỉ hiển thị khi level = "unit" */}
                                                {level === "unit" && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                                            Phòng ban
                                                        </label>
                                                        <Select
                                                            value={departmentId}
                                                            onChange={setDepartmentId}
                                                            placeholder="Chọn phòng ban"
                                                            options={[
                                                                { value: "", label: "Tất cả" },
                                                                ...departments
                                                                    .filter(
                                                                        (d) =>
                                                                            d.parent_department_id === null &&
                                                                            d.type === "phòng ban"
                                                                    )
                                                                    .map((d) => ({
                                                                        value: String(d.department_id),
                                                                        label: d.d_name,
                                                                    })),
                                                            ]}
                                                        />
                                                    </div>
                                                )}

                                                {/* Đội nhóm - chỉ hiển thị khi level = "team" */}
                                                {level === "team" && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                                            Đội nhóm
                                                        </label>
                                                        <Select
                                                            value={teamId}
                                                            onChange={setTeamId}
                                                            placeholder="Chọn đội nhóm"
                                                            options={[
                                                                { value: "", label: "Tất cả" },
                                                                ...departments
                                                                    .filter(
                                                                        (d) =>
                                                                            d.type === "đội nhóm" &&
                                                                            (!departmentId ||
                                                                                d.parent_department_id ===
                                                                                    (departmentId
                                                                                        ? parseInt(departmentId)
                                                                                        : null))
                                                                    )
                                                                    .map((d) => ({
                                                                        value: String(d.department_id),
                                                                        label: d.d_name,
                                                                    })),
                                                            ]}
                                                        />
                                                    </div>
                                                )}

                                                {/* Vai trò */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                                        Vai trò
                                                    </label>
                                                    <Select
                                                        value={role}
                                                        onChange={setRole}
                                                        placeholder="Chọn vai trò"
                                                        options={[
                                                            { value: "", label: "Tất cả" },
                                                            { value: "ceo", label: "CEO" },
                                                            { value: "manager", label: "Quản lý" },
                                                            { value: "member", label: "Thành viên" },
                                                        ]}
                                                    />
                                                </div>

                                                {/* Trạng thái */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                                        Trạng thái
                                                    </label>
                                                    <Select
                                                        value={status}
                                                        onChange={setStatus}
                                                        placeholder="Chọn trạng thái"
                                                        options={[
                                                            { value: "", label: "Tất cả" },
                                                            { value: "active", label: "Kích hoạt" },
                                                            { value: "inactive", label: "Vô hiệu" },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-3 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm relative z-10">
                    <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                        <UserTableHeader />
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-5 text-center text-slate-500"
                                    >
                                        Đang tải...
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-5 text-center text-slate-500"
                                    >
                                        Không có người dùng
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                filtered.map((u) => {
                                    const rname = (
                                        u.role?.role_name || ""
                                    ).toLowerCase();
                                    const isAdmin =
                                        rname === "admin" ||
                                        u.email === "okr.admin@company.com";
                                    const onChangeDept = (val) => {
                                        // Chỉ cập nhật giao diện, không gọi API
                                        const depObj = departments.find(
                                            (d) =>
                                                String(d.department_id) ===
                                                String(val)
                                        );
                                        setPendingChanges((prev) => ({
                                            ...prev,
                                            [u.user_id]: {
                                                ...prev[u.user_id],
                                                department_id: val,
                                                department: depObj,
                                            },
                                        }));
                                        setUsers((prev) =>
                                            prev.map((x) =>
                                                x.user_id === u.user_id
                                                    ? {
                                                          ...x,
                                                          department_id: val,
                                                          department:
                                                              depObj ||
                                                              x.department,
                                                      }
                                                    : x
                                            )
                                        );
                                    };
                                    const toggleStatus = () => {
                                        // Chỉ cập nhật giao diện, không gọi API
                                        const newStatus =
                                            u.status === "active"
                                                ? "inactive"
                                                : "active";
                                        setPendingChanges((prev) => ({
                                            ...prev,
                                            [u.user_id]: {
                                                ...prev[u.user_id],
                                                status: newStatus,
                                            },
                                        }));
                                        setUsers((prev) =>
                                            prev.map((x) =>
                                                x.user_id === u.user_id
                                                    ? {
                                                          ...x,
                                                          status: newStatus,
                                                      }
                                                    : x
                                            )
                                        );
                                    };
                                    return (
                                        <UserTableRow
                                            key={u.user_id}
                                            user={u}
                                            departments={departments}
                                            roles={roles}
                                            editingDept={editingDept}
                                            setEditingDept={setEditingDept}
                                            onChangeDept={onChangeDept}
                                            toggleStatus={toggleStatus}
                                            pendingChanges={pendingChanges}
                                            setPendingChanges={
                                                setPendingChanges
                                            }
                                            setUsers={setUsers}
                                        />
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                open={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Xác nhận thay đổi"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Bạn có chắc chắn muốn lưu{" "}
                        <strong>{Object.keys(pendingChanges).length}</strong>{" "}
                        thay đổi về phân quyền người dùng?
                    </p>

                    {/* Chi tiết thay đổi */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Chi tiết thay đổi:
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {Object.entries(pendingChanges).map(
                                ([userId, changes]) => {
                                    const user = users.find(
                                        (u) => u.user_id == userId
                                    );
                                    return (
                                        <div key={userId} className="text-sm">
                                            <div className="font-medium text-gray-800">
                                                {user?.full_name || user?.email}
                                            </div>
                                            <div className="ml-4 space-y-1">
                                                {changes.department_id && (
                                                    <div className="text-gray-600">
                                                        • Phòng ban:{" "}
                                                        {departments.find(
                                                            (d) =>
                                                                d.department_id ==
                                                                changes.department_id
                                                        )?.d_name ||
                                                            changes.department_id}
                                                    </div>
                                                )}
                                                {changes.status && (
                                                    <div className="text-gray-600">
                                                        • Trạng thái:{" "}
                                                        {changes.status ===
                                                        "active"
                                                            ? "Kích hoạt"
                                                            : "Vô hiệu"}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-red-600">
                        ⚠️ Thao tác này sẽ ảnh hưởng đến quyền hạn của người
                        dùng trong hệ thống.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={saveAllChanges}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Xác nhận lưu
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Invite User Modal */}
            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    setShowInviteModal(false);
                    loadUsers(); // Reload danh sách users
                    showToast("success", "Email mời đã được gửi thành công");
                }}
                departments={departments}
                roles={roles}
            />
        </div>
    );
}
