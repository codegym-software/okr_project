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
            isDeptManager:
                user?.role?.role_name?.toLowerCase() === "manager" &&
                user?.role?.level?.toLowerCase() === "unit",
            isTeamManager:
                user?.role?.role_name?.toLowerCase() === "manager" &&
                user?.role?.level?.toLowerCase() === "team",
            isMember: user?.role?.role_name?.toLowerCase() === "member",
            // Helper methods
            canManageCycles: user?.is_admin === true,
            canManageUsers: user?.is_admin === true,
            canManageDepartments:
                user?.is_admin === true ||
                (user?.role?.role_name?.toLowerCase() === "manager" &&
                    (!user?.role?.level ||
                        user?.role?.level?.toLowerCase() === "unit")),
            canCreateCompanyOKR: user?.is_admin === true,
            canCreatePersonalOKR: true, // Mọi user đều có thể tạo OKR cá nhân
        };
    }, []);
}

export default useAuth;
