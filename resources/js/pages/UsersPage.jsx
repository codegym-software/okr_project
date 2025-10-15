import React, { useEffect, useState } from 'react';
import { Toast, Select, Badge, Modal } from '../components/ui';
import UserTableRow from '../components/UserTableRow';
import UserTableHeader from '../components/UserTableHeader';
import InviteUserModal from '../components/InviteUserModal';

export default function UsersPage(){
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [rolesByLevel, setRolesByLevel] = useState({});
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [level, setLevel] = useState('');
    const [toast, setToast] = useState({ type: 'success', message: '' });
    const showToast = (type, message) => setToast({ type, message });
    const [editingRole, setEditingRole] = useState({});
    const [editingDept, setEditingDept] = useState({});
    const [editingLevel, setEditingLevel] = useState({});
    const [pendingChanges, setPendingChanges] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Function để load roles theo level
    const loadRolesByLevel = async (level) => {
        if (rolesByLevel[level]) return rolesByLevel[level]; // Đã cache
        
        try {
            const res = await fetch(`/roles-by-level?level=${level}`, { 
                headers: { 'Accept': 'application/json' } 
            });
            const data = await res.json();
            if (data.success) {
                setRolesByLevel(prev => ({ ...prev, [level]: data.data }));
                return data.data;
            }
        } catch (e) {
            console.error('Error loading roles by level:', e);
        }
        return [];
    };

    // Function để lưu tất cả thay đổi
    const saveAllChanges = async () => {
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const promises = Object.entries(pendingChanges).map(async ([userId, changes]) => {
            try {
                const requests = [];
                
                // Gửi thay đổi thông tin user (role, department, level)
                const userChanges = { ...changes };
                delete userChanges.status; // Tách status ra riêng
                
                if (Object.keys(userChanges).length > 0) {
                    requests.push(
                        fetch(`/users/${userId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': token,
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(userChanges)
                        })
                    );
                }
                
                // Gửi thay đổi status riêng
                if (changes.status) {
                    requests.push(
                        fetch(`/users/${userId}/status`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': token,
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ status: changes.status })
                        })
                    );
                }
                
                const responses = await Promise.all(requests);
                const allOk = responses.every(res => res.ok);
                
                if (!allOk) throw new Error();
                return { userId, success: true };
            } catch (e) {
                return { userId, success: false, error: e.message };
            }
        });

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.success);
        
        if (failed.length === 0) {
            showToast('success', `Đã lưu thành công ${results.length} thay đổi`);
            setPendingChanges({});
            setShowConfirmModal(false);
        } else {
            showToast('error', `Lưu thất bại ${failed.length}/${results.length} thay đổi`);
        }
    };

    // Function để load users
    const loadUsers = async () => {
        try {
            const resUsers = await fetch('/users', { headers: { 'Accept': 'application/json' } });
            const usersData = await resUsers.json();
            setUsers(usersData.data || []);
        } catch (e) {
            console.error('Error loading users:', e);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [resUsers, resDeps, resRoles] = await Promise.all([
                    fetch('/users', { headers: { 'Accept': 'application/json' } }),
                    fetch('/departments', { headers: { 'Accept': 'application/json' } }),
                    fetch('/roles', { headers: { 'Accept': 'application/json' } })
                ]);
                const usersData = await resUsers.json();
                const depsData = await resDeps.json();
                const rolesData = await resRoles.json();
                setUsers(usersData.data || []);
                setDepartments(depsData.data || []);
                setRoles(rolesData.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Function để reset tất cả filter về trạng thái ban đầu
    const resetAllFilters = () => {
        setQ('');
        setLevel('');
        setRole('');
        setDepartmentId('');
        setStatus('');
    };

    // Kiểm tra có filter nào đang active không
    const hasActiveFilters = (q && q.trim()) || level || role || departmentId || status;

    // Logic filter users
    const filtered = users.filter(u => {
        const needle = q.toLowerCase();
        const matchesQ = !needle || (u.full_name?.toLowerCase().includes(needle) || u.email?.toLowerCase().includes(needle));
        const matchesRole = !role || (u.role?.role_name?.toLowerCase() === role);
        const matchesStatus = !status || (u.status?.toLowerCase() === status);
        const matchesLevel = !level || (u.role?.level === level);
        const isAdmin = (u.role?.role_name || '').toLowerCase() === 'admin' || u.email === 'okr.admin@company.com';
        const matchesDept = !departmentId || String(u.department_id) === String(departmentId);
        return !isAdmin && matchesQ && matchesRole && matchesStatus && matchesDept && matchesLevel;
    });

    return (
        <div className="">
            <Toast type={toast.type} message={toast.message} onClose={()=>setToast({ type:'success', message:'' })} />
            <div className="mx-auto max-w-6xl px-4 py-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-900">Quản lý người dùng</h1>
                    <button 
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Mời người dùng
                    </button>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                    {/* Thanh tìm kiếm - 1 dòng riêng */}
                    <input 
                        value={q} 
                        onChange={e=>setQ(e.target.value)} 
                        placeholder="Tìm kiếm theo tên hoặc email..." 
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    
                    {/* Filter và nút lưu - cùng hàng */}
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            <Select value={level} onChange={setLevel} placeholder="Cấp độ" options={[{value:'',label:'Cấp độ'},{value:'unit',label:'Đơn vị'},{value:'team',label:'Nhóm'}]} />
                            <Select value={role} onChange={setRole} placeholder="Vai trò" options={[{value:'',label:'Vai trò'},{value:'manager',label:'Quản lý'},{value:'member',label:'Thành viên'}]} />
                            <Select value={departmentId} onChange={setDepartmentId} placeholder="Phòng ban" options={[{value:'',label:'Phòng ban'}, ...departments.map(d=>({ value: String(d.department_id), label: d.d_name }))]} />
                            <Select value={status} onChange={setStatus} placeholder="Trạng thái" options={[{value:'',label:'Trạng thái'},{value:'active',label:'Kích hoạt'},{value:'inactive',label:'Vô hiệu'}]} />
                            {hasActiveFilters && (
                                <button 
                                    onClick={resetAllFilters}
                                    className="px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200"
                                    title="Xóa tất cả bộ lọc"
                                >
                                    <svg className="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => setShowConfirmModal(true)}
                            disabled={Object.keys(pendingChanges).length === 0}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                                Object.keys(pendingChanges).length === 0 
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            Lưu thay đổi ({Object.keys(pendingChanges).length})
                        </button>
                    </div>
                </div>

                <div className="mt-3 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm relative z-10">
                    <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                        <UserTableHeader />
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr><td colSpan={6} className="px-3 py-5 text-center text-slate-500">Đang tải...</td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={6} className="px-3 py-5 text-center text-slate-500">Không có người dùng</td></tr>
                            )}
                            {!loading && filtered.map(u => {
                                const rname = (u.role?.role_name || '').toLowerCase();
                                const isAdmin = rname === 'admin' || u.email === 'okr.admin@company.com';
                                const onChangeRole = (val) => {
                                    // Chỉ cập nhật giao diện, không gọi API
                                    const selectedRole = roles.find(r => r.role_id == val);
                                    setPendingChanges(prev => ({
                                        ...prev,
                                        [u.user_id]: {
                                            ...prev[u.user_id],
                                            role_id: val,
                                            role_name: selectedRole?.role_name,
                                            level: selectedRole?.level // Cập nhật level theo role được chọn
                                        }
                                    }));
                                    setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{
                                        ...x, 
                                        role:{
                                            ...(x.role||{}), 
                                            role_id: val,
                                            role_name: selectedRole?.role_name,
                                            level: selectedRole?.level // Cập nhật level theo role được chọn
                                        }
                                    }:x));
                                };
                                const onChangeDept = (val) => {
                                    // Chỉ cập nhật giao diện, không gọi API
                                    const depObj = departments.find(d=> String(d.department_id) === String(val));
                                    setPendingChanges(prev => ({
                                        ...prev,
                                        [u.user_id]: {
                                            ...prev[u.user_id],
                                            department_id: val,
                                            department: depObj
                                        }
                                    }));
                                    setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{...x, department_id: val, department: depObj || x.department}:x));
                                };
                                const onChangeLevel = (val) => {
                                    // Chỉ cập nhật giao diện, không gọi API
                                    // Tìm role phù hợp với level mới và role_name hiện tại
                                    const currentRoleName = u.role?.role_name;
                                    const matchingRole = roles.find(r => 
                                        r.level === val && r.role_name === currentRoleName
                                    );
                                    
                                    if (matchingRole) {
                                        setPendingChanges(prev => ({
                                            ...prev,
                                            [u.user_id]: {
                                                ...prev[u.user_id],
                                                level: val,
                                                role_id: matchingRole.role_id,
                                                role_name: matchingRole.role_name
                                            }
                                        }));
                                        
                                        setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{
                                            ...x, 
                                            role:{
                                                ...(x.role||{}), 
                                                level: val,
                                                role_id: matchingRole.role_id,
                                                role_name: matchingRole.role_name
                                            }
                                        }:x));
                                    } else {
                                        // Nếu không tìm thấy role phù hợp, chỉ cập nhật level
                                        setPendingChanges(prev => ({
                                            ...prev,
                                            [u.user_id]: {
                                                ...prev[u.user_id],
                                                level: val
                                            }
                                        }));
                                        
                                        setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{
                                            ...x, 
                                            role:{
                                                ...(x.role||{}), 
                                                level: val
                                            }
                                        }:x));
                                    }
                                };
                                const toggleStatus = () => {
                                    // Chỉ cập nhật giao diện, không gọi API
                                    const newStatus = u.status === 'active' ? 'inactive' : 'active';
                                    setPendingChanges(prev => ({
                                        ...prev,
                                        [u.user_id]: {
                                            ...prev[u.user_id],
                                            status: newStatus
                                        }
                                    }));
                                    setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{...x,status:newStatus}:x));
                                };
                                return (
                                    <UserTableRow
                                        key={u.user_id}
                                        user={u}
                                        departments={departments}
                                        roles={roles}
                                        editingRole={editingRole}
                                        editingDept={editingDept}
                                        editingLevel={editingLevel}
                                        setEditingRole={setEditingRole}
                                        setEditingDept={setEditingDept}
                                        setEditingLevel={setEditingLevel}
                                        onChangeRole={onChangeRole}
                                        onChangeDept={onChangeDept}
                                        onChangeLevel={onChangeLevel}
                                        loadRolesByLevel={loadRolesByLevel}
                                        toggleStatus={toggleStatus}
                                        pendingChanges={pendingChanges}
                                        setPendingChanges={setPendingChanges}
                                        setUsers={setUsers}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Confirmation Modal */}
            <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Xác nhận thay đổi">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Bạn có chắc chắn muốn lưu <strong>{Object.keys(pendingChanges).length}</strong> thay đổi về phân quyền người dùng?
                    </p>
                    
                    {/* Chi tiết thay đổi */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Chi tiết thay đổi:</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {Object.entries(pendingChanges).map(([userId, changes]) => {
                                const user = users.find(u => u.user_id == userId);
                                return (
                                    <div key={userId} className="text-sm">
                                        <div className="font-medium text-gray-800">{user?.full_name || user?.email}</div>
                                        <div className="ml-4 space-y-1">
                                            {changes.role_id && (
                                                <div className="text-gray-600">
                                                    • Vai trò: {(() => {
                                                        const role = roles.find(r => r.role_id == changes.role_id);
                                                        return role ? (role.role_name === 'manager' ? 'Quản lý' : role.role_name === 'member' ? 'Thành viên' : role.role_name) : changes.role_id;
                                                    })()}
                                                </div>
                                            )}
                                            {changes.department_id && (
                                                <div className="text-gray-600">
                                                    • Phòng ban: {departments.find(d => d.department_id == changes.department_id)?.d_name || changes.department_id}
                                                </div>
                                            )}
                                            {changes.level && (
                                                <div className="text-gray-600">
                                                    • Cấp độ: {changes.level === 'unit' ? 'Đơn vị' : changes.level === 'team' ? 'Nhóm' : changes.level}
                                                </div>
                                            )}
                                            {changes.status && (
                                                <div className="text-gray-600">
                                                    • Trạng thái: {changes.status === 'active' ? 'Kích hoạt' : 'Vô hiệu'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <p className="text-sm text-red-600">
                        ⚠️ Thao tác này sẽ ảnh hưởng đến quyền hạn của người dùng trong hệ thống.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setShowConfirmModal(false)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={saveAllChanges}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Xác nhận lưu
                        </button>
                    </div>
                </div>
            </Modal>
            
            {/* Invite User Modal */}
            <InviteUserModal 
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    setShowInviteModal(false);
                    loadUsers(); // Reload danh sách users
                    showToast('success', 'Email mời đã được gửi thành công');
                }}
                departments={departments}
                roles={roles}
            />
        </div>
    );
}


