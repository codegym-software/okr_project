import React, { useState, useEffect } from "react";
import { Modal } from "./ui";
import UserSearchInput from './UserSearchInput';
import { FaBullseye, FaKey } from "react-icons/fa";
import axios from 'axios';

export default function AssignKeyResultModal({
    show,
    kr,
    objective,
    loading,
    onConfirm,
    onClose,
    currentUserRole,
    currentUser,
    departments = [],
}) {
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [departmentUsers, setDepartmentUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // Xác định role của user
    const userRole = currentUser?.role?.role_name?.toLowerCase() || currentUserRole?.role_name?.toLowerCase() || '';
    const isAdminOrCeo = ['admin', 'ceo'].includes(userRole);
    const isManager = userRole === 'manager';
    
    // Manager chỉ thấy phòng ban của họ
    const managerDepartmentId = isManager ? currentUser?.department_id : null;
    const effectiveDepartmentId = isManager ? managerDepartmentId : selectedDepartmentId;
    
    // Load users trong phòng ban khi chọn phòng ban (Admin/CEO) hoặc khi là Manager
    useEffect(() => {
        if (effectiveDepartmentId) {
            setLoadingUsers(true);
            axios.get('/api/users/search', { 
                params: { 
                    q: '', // Query rỗng để lấy tất cả
                    department_id: effectiveDepartmentId 
                } 
            })
            .then(response => {
                // Đảm bảo role được load đầy đủ
                const users = (response.data.data || []).map(user => ({
                    ...user,
                    role: user.role || null
                }));
                console.log('Loaded department users:', {
                    departmentId: effectiveDepartmentId,
                    totalUsers: users.length,
                    usersWithRoles: users.filter(u => u.role).length,
                    users: users.map(u => ({
                        name: u.full_name,
                        role: u.role?.role_name || 'No role'
                    }))
                });
                setDepartmentUsers(users);
            })
            .catch(error => {
                console.error('Error loading department users:', error);
                setDepartmentUsers([]);
            })
            .finally(() => {
                setLoadingUsers(false);
            });
        } else {
            setDepartmentUsers([]);
        }
    }, [effectiveDepartmentId]);
    
    // Reset selectedAssignee khi đổi phòng ban
    useEffect(() => {
        setSelectedAssignee(null);
    }, [selectedDepartmentId]);

    // Sắp xếp users: Manager trước, sau đó Member, sau đó các role khác
    const sortedUsers = [...departmentUsers].sort((a, b) => {
        const aRole = a.role?.role_name?.toLowerCase() || '';
        const bRole = b.role?.role_name?.toLowerCase() || '';
        
        // Manager luôn lên trên
        if (aRole === 'manager' && bRole !== 'manager') return -1;
        if (aRole !== 'manager' && bRole === 'manager') return 1;
        
        // Nếu cùng role hoặc không có role, sắp xếp theo tên
        return (a.full_name || '').localeCompare(b.full_name || '');
    });

    // Format role name để hiển thị
    const formatRoleName = (roleName) => {
        if (!roleName) return '';
        const lowerRole = roleName.toLowerCase();
        const roleMap = {
            'admin': 'Admin',
            'ceo': 'CEO',
            'manager': 'Quản lý',
            'member': 'Thành viên'
        };
        return roleMap[lowerRole] || roleName;
    };

    // Dynamic title and button text based on context
    const isCurrentlyAssigned = kr && kr.assigned_user;
    const isAssigningNew = selectedAssignee && (!isCurrentlyAssigned || selectedAssignee.user_id !== kr.assigned_user?.user_id);
    const isUnassigning = !selectedAssignee && isCurrentlyAssigned;
    const isNoChange = selectedAssignee && isCurrentlyAssigned && selectedAssignee.user_id === kr.assigned_user?.user_id;

    const modalTitle = isCurrentlyAssigned ? "Giao lại Key Result" : "Giao Key Result";
    let confirmButtonText = "Giao việc";
    if (isUnassigning) {
        confirmButtonText = "Bỏ giao";
    } else if (isAssigningNew) {
        confirmButtonText = "Giao việc";
    } else if (isNoChange) {
        confirmButtonText = "Đã giao";
    }
    
    const isSubmitDisabled = loading || isNoChange;

    const handleSubmit = () => {
        onConfirm(selectedAssignee ? selectedAssignee.user_id : null);
    };

    if (!show || !kr || !objective) return null;

    return (
        <Modal open={show} onClose={onClose} title={modalTitle} maxHeight="max-h-[90vh]">
            <div className="space-y-4">
                <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600">
                            <FaBullseye className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-slate-800 font-semibold">
                            {objective.obj_title}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-amber-600">
                            <FaKey className="w-3 h-3" />
                        </div>
                        <p className="text-sm text-slate-700 font-medium">
                            {kr.kr_title}
                        </p>
                    </div>
                </div>

                {/* Display Current Assignee */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Người thực hiện hiện tại:
                    </label>
                    <div className="p-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600 text-sm">
                        {kr.assigned_user ? 
                            <div className="flex items-center gap-2">
                                {kr.assigned_user.avatar_url ? (
                                    <img src={kr.assigned_user.avatar_url} alt={kr.assigned_user.full_name} className="h-5 w-5 rounded-full object-cover" />
                                ) : (
                                    <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700">
                                        {kr.assigned_user.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {kr.assigned_user.full_name} ({kr.assigned_user.email})
                            </div>
                            : "Chưa giao"
                        }
                    </div>
                </div>

                {/* Dropdown phòng ban cho Admin/CEO */}
                {isAdminOrCeo && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Phòng ban:
                        </label>
                        <select
                            value={selectedDepartmentId || ''}
                            onChange={(e) => setSelectedDepartmentId(e.target.value || null)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Chọn phòng ban --</option>
                            {departments.map((dept) => (
                                <option key={dept.department_id} value={dept.department_id}>
                                    {dept.department_name || dept.d_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Dropdown thành viên */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Giao cho:
                    </label>
                    {isAdminOrCeo && !selectedDepartmentId ? (
                        <div className="p-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm">
                            Vui lòng chọn phòng ban trước
                        </div>
                    ) : effectiveDepartmentId ? (
                        <select
                            value={selectedAssignee?.user_id || ''}
                            onChange={(e) => {
                                const userId = e.target.value;
                                if (userId) {
                                    const user = departmentUsers.find(u => u.user_id == userId);
                                    setSelectedAssignee(user ? {
                                        user_id: user.user_id,
                                        full_name: user.full_name,
                                        email: user.email,
                                        avatar_url: user.avatar_url,
                                        role: user.role
                                    } : null);
                                } else {
                                    setSelectedAssignee(null);
                                }
                            }}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loadingUsers}
                        >
                            <option value="">-- Chọn thành viên --</option>
                            {loadingUsers ? (
                                <option disabled>Đang tải...</option>
                            ) : sortedUsers.length === 0 ? (
                                <option disabled>Không có thành viên</option>
                            ) : (
                                sortedUsers.map((user) => {
                                    const roleLabel = user.role ? formatRoleName(user.role.role_name) : '';
                                    const displayText = roleLabel 
                                        ? `[${roleLabel}] ${user.full_name}`
                                        : user.full_name;
                                    return (
                                        <option key={user.user_id} value={user.user_id}>
                                            {displayText}
                                        </option>
                                    );
                                })
                            )}
                        </select>
                    ) : (
                        <UserSearchInput
                            onUserSelect={setSelectedAssignee}
                            initialUser={null}
                            objectiveDepartmentId={objective.department_id}
                            currentUserRole={currentUserRole?.role_name}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="opacity-25"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8z"
                                        className="opacity-75"
                                    />
                                </svg>
                                Đang xử lý...
                            </>
                        ) : (
                            confirmButtonText
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
