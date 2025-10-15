import { useMemo } from 'react';

/**
 * Custom hook để lấy thông tin authentication và permissions
 * @returns {Object} Object chứa thông tin user và permissions
 */
export function useAuth() {
    return useMemo(() => {
        const user = window.__USER__ || null;
        
        return {
            user,
            isAuthenticated: !!user,
            isAdmin: user?.is_admin === true,
            isManager: user?.role?.role_name?.toLowerCase() === 'manager',
            isMember: user?.role?.role_name?.toLowerCase() === 'member',
            // Helper methods
            canManageCycles: user?.is_admin === true,
            canManageUsers: user?.is_admin === true,
            canManageDepartments: user?.is_admin === true,
            canCreateCompanyOKR: user?.is_admin === true || user?.role?.role_name?.toLowerCase() === 'manager',
            canCreatePersonalOKR: true, // Mọi user đều có thể tạo OKR cá nhân
        };
    }, []);
}

export default useAuth;
