import React from "react";
import { Badge } from "./ui";

/**
 * Component hiển thị hàng người dùng trong bảng
 * @param {Object} props - Props của component
 * @param {Object} props.user - Thông tin người dùng
 * @param {Array} props.departments - Danh sách phòng ban và đội nhóm (không còn sử dụng, giữ lại để tương thích)
 * @param {Array} props.roles - Danh sách vai trò (chỉ để hiển thị)
 * @param {Object} props.editingDept - Trạng thái chỉnh sửa phòng ban/đội nhóm (không còn sử dụng, giữ lại để tương thích)
 * @param {Function} props.setEditingDept - Hàm cập nhật trạng thái chỉnh sửa phòng ban/đội nhóm (không còn sử dụng, giữ lại để tương thích)
 * @param {Function} props.onChangeDept - Hàm xử lý thay đổi phòng ban/đội nhóm (không còn sử dụng, giữ lại để tương thích)
 * @param {Function} props.toggleStatus - Hàm xử lý thay đổi trạng thái
 * @param {Object} props.pendingChanges - Thay đổi đang chờ xử lý
 * @param {Function} props.setPendingChanges - Hàm cập nhật thay đổi đang chờ
 * @param {Function} props.setUsers - Hàm cập nhật danh sách người dùng
 * @param {Function} props.onDelete - Hàm xử lý xóa người dùng
 * 
 * Lưu ý: Cấp độ, vai trò và phòng ban/đội nhóm chỉ hiển thị, không cho phép chỉnh sửa
 */
export default function UserTableRow({
    user,
    departments,
    roles,
    editingDept,
    setEditingDept,
    onChangeDept,
    toggleStatus,
    pendingChanges = {},
    setPendingChanges,
    setUsers,
    onDelete,
}) {
    const rname = (user.role?.role_name || "").toLowerCase();
    const isAdmin = rname === "admin" || user.email === "okr.admin@company.com";
    const hasPendingChanges =
        pendingChanges[user.user_id] &&
        Object.keys(pendingChanges[user.user_id]).length > 0;

    const renderRoleBadge = () => {
        if (isAdmin) {
            return <Badge color="indigo">ADMIN</Badge>;
        }

        switch (rname) {
            case "ceo":
                return <Badge color="red">CEO</Badge>;
            case "manager":
                return <Badge color="blue">Quản lý</Badge>;
            case "member":
                return <Badge color="amber">Thành viên</Badge>;
            default:
                return (
                    <Badge color="slate">
                        {user.role?.role_name || "Chưa có"}
                    </Badge>
                );
        }
    };

    // Chuyển đổi cấp độ sang tiếng Việt
    const getLevelDisplayName = (level) => {
        if (!level) return "Chưa có";

        const levelLower = level.toLowerCase();

        switch (levelLower) {
            case "company":
                return "Công ty";
            case "unit":
                return "Phòng ban";
            case "team":
                return "Nhóm";
            default:
                return level; // Hiển thị nguyên gốc nếu không nhận diện được
        }
    };

    // Xác định màu sắc dựa trên cấp độ
    const getLevelColor = (level) => {
        if (!level) return "slate";

        const levelLower = level.toLowerCase();

        if (levelLower === "company") {
            return "red"; // Cấp công ty - màu đỏ (cao nhất)
        } else if (levelLower === "unit") {
            return "amber"; // Cấp Phòng ban - màu vàng cam
        } else if (levelLower === "team") {
            return "blue"; // Cấp nhóm - màu xanh dương
        }

        return "indigo"; // Màu mặc định cho các cấp độ khác
    };


    return (
        <tr key={user.user_id} className="hover:bg-slate-50">
            <td className="px-3 py-2">
                <div className="flex items-center gap-3">
                    <img
                        src={user.avatar_url || "/images/default.png"}
                        className="h-8 w-8 rounded-full object-cover"
                        alt={user.full_name}
                    />
                    <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {user.full_name || "Chưa cập nhật"}
                            {hasPendingChanges && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Chưa lưu
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 text-slate-700">{user.email}</td>
            <td className="px-3 py-2">
                <Badge color={getLevelColor(user.role?.level)}>
                    {getLevelDisplayName(user.role?.level)}
                </Badge>
            </td>
            <td className="px-3 py-2">{renderRoleBadge()}</td>
            <td className="px-3 py-2">
                {(user.department?.d_name || "").trim() ? (
                    <Badge color="blue">
                        {user.department?.d_name}
                    </Badge>
                ) : (
                    <Badge color="slate">Chưa gán</Badge>
                )}
            </td>
            <td className="px-3 py-2">
                <button
                    onClick={() => {
                        if (isAdmin) {
                            // Admin không thể thay đổi trạng thái của mình
                            return;
                        }
                        toggleStatus();
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                    } ${isAdmin ? 'cursor-not-allowed opacity-75' : ''}`}
                >
                    {user.status === "active" ? "KÍCH HOẠT" : "VÔ HIỆU"}
                </button>
            </td>
            <td className="px-3 py-2 w-20 text-center">
                {!isAdmin && onDelete && (
                    <button
                        onClick={() => onDelete(user)}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa người dùng"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                )}
            </td>
        </tr>
    );
}
