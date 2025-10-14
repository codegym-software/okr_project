import React, { useEffect, useRef } from 'react';
import { Select, Badge } from './ui';

/**
 * Component hiển thị hàng người dùng trong bảng
 * @param {Object} props - Props của component
 * @param {Object} props.user - Thông tin người dùng
 * @param {Array} props.departments - Danh sách phòng ban
 * @param {Object} props.editingRole - Trạng thái chỉnh sửa vai trò
 * @param {Object} props.editingDept - Trạng thái chỉnh sửa phòng ban
 * @param {Function} props.setEditingRole - Hàm cập nhật trạng thái chỉnh sửa vai trò
 * @param {Function} props.setEditingDept - Hàm cập nhật trạng thái chỉnh sửa phòng ban
 * @param {Function} props.onChangeRole - Hàm xử lý thay đổi vai trò
 * @param {Object} props.editingLevel - Trạng thái chỉnh sửa cấp độ
 * @param {Function} props.setEditingLevel - Hàm cập nhật trạng thái chỉnh sửa cấp độ
 * @param {Object} props.rolesByLevel - Cache các roles theo level
 * @param {Function} props.loadRolesByLevel - Hàm load roles theo level
 */
export default function UserTableRow({
    user,
    departments,
    roles,
    editingRole,
    editingDept,
    editingLevel,
    setEditingRole,
    setEditingDept,
    setEditingLevel,
    onChangeRole,
    onChangeDept,
    onChangeLevel,
    loadRolesByLevel,
    toggleStatus,
    pendingChanges = {},
    setPendingChanges,
    setUsers
}) {
    const rname = (user.role?.role_name || '').toLowerCase();
    const isAdmin = rname === 'admin' || user.email === 'okr.admin@company.com';
    const hasPendingChanges = pendingChanges[user.user_id] && Object.keys(pendingChanges[user.user_id]).length > 0;

    // Refs cho các phần tử có thể chỉnh sửa
    const levelRef = useRef(null);
    const roleRef = useRef(null);
    const deptRef = useRef(null);

    // Logic click outside để thoát khỏi chế độ chỉnh sửa
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Thoát khỏi chế độ chỉnh sửa Level
            if (editingLevel[user.user_id] && levelRef.current && !levelRef.current.contains(event.target)) {
                setEditingLevel(prev => ({ ...prev, [user.user_id]: false }));
            }

            // Thoát khỏi chế độ chỉnh sửa Role
            if (editingRole[user.user_id] && roleRef.current && !roleRef.current.contains(event.target)) {
                setEditingRole(prev => ({ ...prev, [user.user_id]: false }));
            }

            // Thoát khỏi chế độ chỉnh sửa Department
            if (editingDept[user.user_id] && deptRef.current && !deptRef.current.contains(event.target)) {
                setEditingDept(prev => ({ ...prev, [user.user_id]: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingLevel, editingRole, editingDept, user.user_id, setEditingLevel, setEditingRole, setEditingDept]);

    // Refs cho các Select components (không cần thiết nữa vì Select component đã xử lý)
    // const levelSelectRef = useRef(null);
    // const roleSelectRef = useRef(null);
    // const deptSelectRef = useRef(null);

    // Logic xử lý click outside đã được tích hợp vào Select component
    // useEffect(() => { ... }, []);

    // Chuyển đổi role name sang tiếng Việt
    const getRoleDisplayName = (roleName) => {
        if (!roleName) return 'Chưa có';
        
        const roleLower = roleName.toLowerCase();
        
        switch (roleLower) {
            case 'admin':
                return 'Quản trị viên';
            case 'manager':
                return 'Quản lý';
            case 'member':
                return 'Thành viên';
            default:
                return roleName; // Hiển thị nguyên gốc nếu không nhận diện được
        }
    };

    // Chuyển đổi cấp độ sang tiếng Việt
    const getLevelDisplayName = (level) => {
        if (!level) return 'Chưa có';
        
        const levelLower = level.toLowerCase();
        
        switch (levelLower) {
            case 'company':
                return 'Công ty';
            case 'unit':
                return 'Đơn vị';
            case 'team':
                return 'Nhóm';
            default:
                return level; // Hiển thị nguyên gốc nếu không nhận diện được
        }
    };

    // Xác định màu sắc dựa trên cấp độ
    const getLevelColor = (level) => {
        if (!level) return 'slate';
        
        const levelLower = level.toLowerCase();
        
        // Cấp độ theo database: company, unit, team (loại bỏ person vì không cần thiết)
        if (levelLower === 'company') {
            return 'red'; // Cấp công ty - màu đỏ (cao nhất)
        } else if (levelLower === 'unit') {
            return 'amber'; // Cấp đơn vị - màu vàng cam
        } else if (levelLower === 'team') {
            return 'blue'; // Cấp nhóm - màu xanh dương
        }
        
        return 'indigo'; // Màu mặc định cho các cấp độ khác
    };

    return (
        <tr key={user.user_id} className="hover:bg-slate-50">
            <td className="px-3 py-2">
                <div className="flex items-center gap-3">
                    <img 
                        src={user.avatar_url || '/images/default.png'} 
                        className="h-8 w-8 rounded-full object-cover" 
                        alt={user.full_name}
                    />
                    <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {user.full_name || 'Chưa cập nhật'}
                            {hasPendingChanges && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Chưa lưu
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 text-slate-700">{user.email}</td>
            <td className="px-3 py-2 relative">
                {isAdmin ? (
                    <Badge color={getLevelColor(user.role?.level)}>
                        {getLevelDisplayName(user.role?.level)}
                    </Badge>
                ) : (
                    <div ref={levelRef}>
                        {editingLevel[user.user_id] ? (
                            <Select
                                value={user.role?.level || ''}
                                onChange={(val) => { 
                                    onChangeLevel(val); 
                                    setEditingLevel(prev => ({ ...prev, [user.user_id]: false })); 
                                }}
                                placeholder="Chọn cấp độ"
                                options={[
                                    { value: 'unit', label: 'Đơn vị' },
                                    { value: 'team', label: 'Nhóm' }
                                ]}
                            />
                        ) : (
                            <button 
                                onClick={() => setEditingLevel(prev => ({ ...prev, [user.user_id]: true }))} 
                                className="focus:outline-none"
                            >
                                <Badge color={getLevelColor(user.role?.level)}>
                                    {getLevelDisplayName(user.role?.level)}
                                </Badge>
                            </button>
                        )}
                    </div>
                )}
            </td>
            <td className="px-3 py-2 relative">
                {isAdmin ? (
                    <Badge color="indigo">ADMIN</Badge>
                ) : (
                    <div ref={roleRef}>
                        {editingRole[user.user_id] ? (
                        <Select 
                            value={String(user.role?.role_id || '')} 
                            onChange={(val) => { 
                                onChangeRole(val); 
                                setEditingRole(prev => ({ ...prev, [user.user_id]: false })); 
                            }} 
                            placeholder="Chọn vai trò" 
                            options={(() => {
                                const availableRoles = roles.filter(role => role.role_name !== 'admin');
                                console.log('Available roles:', availableRoles);
                                
                                const uniqueRoles = availableRoles.reduce((acc, role) => {
                                    const roleName = getRoleDisplayName(role.role_name);
                                    if (!acc.find(item => item.label === roleName)) {
                                        acc.push({
                                            value: String(role.role_id),
                                            label: roleName
                                        });
                                    }
                                    return acc;
                                }, []);
                                
                                console.log('Unique roles:', uniqueRoles);
                                return uniqueRoles;
                            })()} 
                        />
                    ) : (
                        <button 
                            onClick={() => setEditingRole(prev => ({ ...prev, [user.user_id]: true }))} 
                            className="focus:outline-none"
                        >
                            {(user.role?.role_name || '').toLowerCase() === 'member' ? 
                                <Badge color="amber">Thành viên</Badge> : 
                                <Badge color="blue">Quản lý</Badge>
                            }
                        </button>
                        )}
                    </div>
                )}
            </td>
            <td className="px-3 py-2 relative">
                {isAdmin ? (
                    <Badge color="indigo">ADMIN</Badge>
                ) : (
                    <div ref={deptRef}>
                        {editingDept[user.user_id] ? (
                        <Select
                            value={String(user.department_id || '')}
                            onChange={(val) => { 
                                onChangeDept(val); 
                                setEditingDept(prev => ({ ...prev, [user.user_id]: false })); 
                            }}
                            placeholder="Chọn phòng ban"
                            options={departments.map(d => ({ 
                                value: String(d.department_id), 
                                label: d.d_name 
                            }))}
                        />
                    ) : (
                        <button 
                            onClick={() => setEditingDept(prev => ({ ...prev, [user.user_id]: true }))} 
                            className="focus:outline-none"
                        >
                            {(user.department?.d_name || '').trim() ? 
                                <Badge color="blue">{user.department?.d_name}</Badge> : 
                                <Badge color="slate">Chưa gán</Badge>
                            }
                        </button>
                        )}
                    </div>
                )}
            </td>
            <td className="px-3 py-2">
                {isAdmin ? (
                    <Badge color="emerald">KÍCH HOẠT</Badge>
                ) : (
                    <button 
                        onClick={toggleStatus} 
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.status === 'active' ? 
                                'bg-emerald-100 text-emerald-700' : 
                                'bg-rose-100 text-rose-700'
                        }`}
                    >
                        {user.status === 'active' ? 'KÍCH HOẠT' : 'VÔ HIỆU'}
                    </button>
                )}
            </td>
        </tr>
    );
}
