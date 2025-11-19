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
}) {
    const rname = (user.role?.role_name || "").toLowerCase();
    const isAdmin = rname === "admin" || user.email === "okr.admin@company.com";
    const hasPendingChanges =
        pendingChanges[user.user_id] &&
        Object.keys(pendingChanges[user.user_id]).length > 0;

    // Chuyển đổi role name sang tiếng Việt
    const getRoleDisplayName = (roleName) => {
        if (!roleName) return "Chưa có";

        const roleLower = roleName.toLowerCase();

        switch (roleLower) {
            case "admin":
                return "Quản trị viên";
            case "manager":
                return "Quản lý";
            case "member":
                return "Thành viên";
            default:
                return roleName; // Hiển thị nguyên gốc nếu không nhận diện được
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
            <td className="px-3 py-2">
                {isAdmin ? (
                    <Badge color="indigo">ADMIN</Badge>
                ) : (user.role?.role_name || "").toLowerCase() ===
                "member" ? (
                    <Badge color="amber">Thành viên</Badge>
                ) : (
                    <Badge color="blue">Quản lý</Badge>
                )}
            </td>
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
        </tr>
    );
}
