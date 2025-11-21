import { useMemo } from "react";

/**
 * Custom hook để lấy thông tin authentication và permissions
 * @returns {Object} Object chứa thông tin user và permissions
 */
export function useAuth() {
    return useMemo(() => {
        const user = window.__USER__ || null;
        console.log("User data:", window.__USER__);

        return {
            user,
            isAuthenticated: !!user,
            isAdmin: user?.is_admin === true,
            isManager:
                user?.role?.role_name?.toLowerCase() === "manager" &&
                user?.role?.level?.toLowerCase() === "unit",
            isMember: user?.role?.role_name?.toLowerCase() === "member",
            // Helper methods
            canManageCycles: user?.is_admin === true,
            canManageUsers:
                user?.is_admin === true ||
                (user?.role?.role_name?.toLowerCase() === "manager" &&
                    user?.role?.level?.toLowerCase() === "unit"),
            canManageRooms: user?.is_admin === true, // Chỉ admin quản lý phòng ban
            canManageTeams:
                user?.role?.role_name?.toLowerCase() === "manager" &&
                user?.role?.level?.toLowerCase() === "unit", // Chỉ unit manager quản lý đội nhóm
            canCreateCompanyOKR: user?.is_admin === true,
            canCreatePersonalOKR: true, // Mọi user đều có thể tạo OKR cá nhân
        };
    }, []);
}

export default useAuth;
