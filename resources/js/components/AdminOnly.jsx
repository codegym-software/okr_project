import React from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Component wrapper để chỉ hiển thị children khi user có quyền admin
 * @param {Object} props
 * @param {React.ReactNode} props.children - Nội dung cần hiển thị
 * @param {string} props.permission - Loại quyền cần kiểm tra (optional)
 * @param {React.ReactNode} props.fallback - Nội dung hiển thị khi không có quyền (optional)
 */
export function AdminOnly({ children, permission = 'canManageCycles', fallback = null }) {
    const auth = useAuth();
    const hasPermission = auth[permission];
    
    if (!hasPermission) {
        return fallback;
    }
    
    return <>{children}</>;
}

/**
 * Component wrapper để chỉ hiển thị children khi user có quyền tạo OKR
 * @param {Object} props
 * @param {React.ReactNode} props.children - Nội dung cần hiển thị
 * @param {string} props.level - Cấp độ OKR ('company', 'department', 'personal')
 * @param {React.ReactNode} props.fallback - Nội dung hiển thị khi không có quyền (optional)
 */
export function OKRCreationOnly({ children, level = 'personal', fallback = null }) {
    const auth = useAuth();
    
    let hasPermission = false;
    switch (level) {
        case 'company':
            hasPermission = auth.canCreateCompanyOKR;
            break;
        case 'department':
            hasPermission = auth.canCreateCompanyOKR;
            break;
        case 'personal':
            hasPermission = auth.canCreatePersonalOKR;
            break;
        default:
            hasPermission = false;
    }
    
    if (!hasPermission) {
        return fallback;
    }
    
    return <>{children}</>;
}

export default AdminOnly;
