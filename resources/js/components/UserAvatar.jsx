import React from 'react';

/**
 * UserInfoBadge Component - Hiển thị thông tin user dưới dạng badge
 * @param {Object} props
 * @param {Object} props.user - Thông tin user
 * @param {string} props.className - CSS classes bổ sung
 */
export function UserInfoBadge({ user, className = '' }) {
    if (!user) return null;

    return (
        <div className={`space-y-1 ${className}`}>
            {/* Phòng ban */}
            {user?.department && user.department.type === 'đội nhóm' && user.department.parentDepartment && (
                <div className="text-sm text-slate-500">
                    <span className="font-medium">Phòng ban:</span> {user.department.parentDepartment.d_name}
                </div>
            )}
            
            {/* Đội nhóm/Phòng ban */}
            {user?.department && (
                <div className="text-sm text-slate-500">
                    <span className="font-medium">
                        {user.department.type === 'đội nhóm' ? 'Đội nhóm:' : 'Phòng ban:'}
                    </span> {user.department.d_name}
                </div>
            )}
            
            {/* Vai trò */}
            {user?.role?.role_name && (
                <div className="text-sm text-slate-500">
                    <span className="font-medium">Vai trò:</span> {user.role.role_name}
                </div>
            )}
        </div>
    );
}

/**
 * UserAvatar Component - Hiển thị avatar và thông tin cơ bản của user
 * @param {Object} props
 * @param {Object} props.user - Thông tin user
 * @param {string} props.size - Kích thước avatar: 'sm', 'md', 'lg'
 * @param {boolean} props.showInfo - Hiển thị thông tin chi tiết
 * @param {string} props.className - CSS classes bổ sung
 */
export function UserAvatar({ user, size = 'md', showInfo = true, className = '' }) {
    if (!user) return null;

    const sizeClasses = {
        sm: 'h-12 w-12',
        md: 'h-24 w-24',
        lg: 'h-32 w-32'
    };

    const avatar = user?.avatar || '/images/default.png';
    const name = user?.name || 'Chưa cập nhật';
    const email = user?.email || '';

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <img 
                src={avatar} 
                className={`${sizeClasses[size]} rounded-full object-cover ring-4 ring-blue-100`} 
                alt="avatar" 
            />
            <div className="mt-3">
                <div className="text-base font-semibold text-slate-900 text-center">{name}</div>
                <div className="text-sm text-slate-500 text-center">{email}</div>
                
                {showInfo && (
                    <UserInfoBadge user={user} className="mt-3" />
                )}
            </div>
        </div>
    );
}

export default UserAvatar;
