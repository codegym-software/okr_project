import React from "react";

/**
 * Component hiển thị header của bảng quản lý người dùng
 */
export default function UserTableHeader() {
    return (
        <thead className="bg-slate-50 text-left font-semibold text-slate-700">
            <tr>
                <th className="px-3 py-2">Người dùng</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Cấp độ</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2">Phòng ban/Đội nhóm</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 w-20 text-center">Hành động</th>
            </tr>
        </thead>
    );
}
