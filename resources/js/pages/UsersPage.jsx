import React, { useEffect, useState } from 'react';
import { Toast, Select, Badge } from '../components/ui';

export default function UsersPage(){
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [toast, setToast] = useState({ type: 'success', message: '' });
    const showToast = (type, message) => setToast({ type, message });
    const [editingRole, setEditingRole] = useState({});
    const [editingDept, setEditingDept] = useState({});

    useEffect(() => {
        const load = async () => {
            try {
                const [resUsers, resDeps] = await Promise.all([
                    fetch('/users', { headers: { 'Accept': 'application/json' } }),
                    fetch('/departments', { headers: { 'Accept': 'application/json' } })
                ]);
                const usersData = await resUsers.json();
                const depsData = await resDeps.json();
                setUsers(usersData.data || []);
                setDepartments(depsData.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = users.filter(u => {
        const needle = q.toLowerCase();
        const matchesQ = !needle || (u.full_name?.toLowerCase().includes(needle) || u.email?.toLowerCase().includes(needle));
        const matchesRole = !role || (u.role?.role_name?.toLowerCase() === role);
        const matchesStatus = !status || (u.status?.toLowerCase() === status);
        const isAdmin = (u.role?.role_name || '').toLowerCase() === 'admin' || u.email === 'okr.admin@company.com';
        const matchesDept = !departmentId || String(u.department_id) === String(departmentId);
        return !isAdmin && matchesQ && matchesRole && matchesStatus && matchesDept;
    });

    return (
        <div className="">
            <Toast type={toast.type} message={toast.message} onClose={()=>setToast({ type:'success', message:'' })} />
            <div className="mx-auto max-w-6xl px-4 py-6">
                <h1 className="text-2xl font-extrabold text-slate-900">Quản lý người dùng</h1>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm kiếm theo tên hoặc email..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 md:w-1/2" />
                    <div className="flex flex-wrap gap-2">
                        <Select value={departmentId} onChange={setDepartmentId} placeholder="Tất cả phòng ban" options={[{value:'',label:'Tất cả'}, ...departments.map(d=>({ value: String(d.department_id), label: d.d_name }))]} />
                        <Select value={role} onChange={setRole} placeholder="Tất cả vai trò" options={[{value:'manager',label:'Manager'},{value:'member',label:'Member'}]} />
                        <Select value={status} onChange={setStatus} placeholder="Tất cả trạng thái" options={[{value:'active',label:'Kích hoạt'},{value:'inactive',label:'Vô hiệu'}]} />
                    </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                        <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                            <tr>
                                <th className="px-3 py-2">Người dùng</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Phòng ban</th>
                                <th className="px-3 py-2">Vai trò</th>
                                <th className="px-3 py-2">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr><td colSpan={4} className="px-3 py-5 text-center text-slate-500">Đang tải...</td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={4} className="px-3 py-5 text-center text-slate-500">Không có người dùng</td></tr>
                            )}
                            {!loading && filtered.map(u => {
                                const rname = (u.role?.role_name || '').toLowerCase();
                                const isAdmin = rname === 'admin' || u.email === 'okr.admin@company.com';
                                const onChangeRole = async (val) => {
                                    try {
                                        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                                        const body = { role: val };
                                        const res = await fetch(`/users/${u.user_id}`, { method:'PUT', headers:{ 'Content-Type':'application/json','X-CSRF-TOKEN':token,'Accept':'application/json' }, body: JSON.stringify(body) });
                                        if (!res.ok) throw new Error();
                                        setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{...x, role:{...(x.role||{}), role_name: val}}:x));
                                        showToast('success','Cập nhật vai trò thành công');
                                    } catch(e){ showToast('error','Cập nhật vai trò thất bại'); }
                                };
                                const onChangeDept = async (val) => {
                                    try {
                                        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                                        const body = { department_id: val };
                                        const res = await fetch(`/users/${u.user_id}`, { method:'PUT', headers:{ 'Content-Type':'application/json','X-CSRF-TOKEN':token,'Accept':'application/json' }, body: JSON.stringify(body) });
                                        if (!res.ok) throw new Error();
                                        const depObj = departments.find(d=> String(d.department_id) === String(val));
                                        setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{...x, department_id: val, department: depObj || x.department}:x));
                                        showToast('success','Cập nhật phòng ban thành công');
                                    } catch(e){ showToast('error','Cập nhật phòng ban thất bại'); }
                                };
                                const toggleStatus = async () => {
                                    try {
                                        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                                        const ns = u.status === 'active' ? 'inactive' : 'active';
                                        const res = await fetch(`/users/${u.user_id}/status`, { method:'PUT', headers:{ 'Content-Type':'application/json','X-CSRF-TOKEN':token,'Accept':'application/json' }, body: JSON.stringify({ status: ns }) });
                                        if (!res.ok) throw new Error();
                                        setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{...x,status:ns}:x));
                                        showToast('success','Cập nhật trạng thái thành công');
                                    } catch(e){ showToast('error','Cập nhật trạng thái thất bại'); }
                                };
                                return (
                                    <tr key={u.user_id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar_url || '/images/default.png'} className="h-8 w-8 rounded-full object-cover" />
                                                <div>
                                                    <div className="font-semibold text-slate-900">{u.full_name || 'Chưa cập nhật'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">{u.email}</td>
                                        <td className="px-3 py-2">
                                            {isAdmin ? (
                                                <Badge color="indigo">ADMIN</Badge>
                                            ) : (
                                                editingDept[u.user_id] ? (
                                                    <Select
                                                        value={String(u.department_id || '')}
                                                        onChange={async (val)=>{ await onChangeDept(val); setEditingDept(prev=>({ ...prev, [u.user_id]: false })); }}
                                                        placeholder="Chọn phòng ban"
                                                        options={departments.map(d=>({ value: String(d.department_id), label: d.d_name }))}
                                                    />
                                                ) : (
                                                    <button onClick={()=>setEditingDept(prev=>({ ...prev, [u.user_id]: true }))} className="focus:outline-none">
                                                        {(u.department?.d_name || '').trim() ? <Badge color="blue">{u.department?.d_name}</Badge> : <Badge color="slate">Chưa gán</Badge>}
                                                    </button>
                                                )
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {isAdmin ? (
                                                <Badge color="indigo">ADMIN</Badge>
                                            ) : (
                                                editingRole[u.user_id] ? (
                                                    <Select value={(u.role?.role_name || '').toLowerCase()} onChange={async (val)=>{ await onChangeRole(val); setEditingRole(prev=>({ ...prev, [u.user_id]: false })); }} placeholder="Chọn vai trò" options={[{value:'manager',label:'Manager'},{value:'member',label:'Member'}]} />
                                                ) : (
                                                    <button onClick={()=>setEditingRole(prev=>({ ...prev, [u.user_id]: true }))} className="focus:outline-none">
                                                        {(u.role?.role_name || '').toLowerCase() === 'member' ? <Badge color="amber">MEMBER</Badge> : <Badge color="blue">MANAGER</Badge>}
                                                    </button>
                                                )
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {isAdmin ? (
                                                <Badge color="emerald">KÍCH HOẠT</Badge>
                                            ) : (
                                                <button onClick={toggleStatus} className={`rounded-full px-3 py-1 text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {u.status === 'active' ? 'KÍCH HOẠT' : 'VÔ HIỆU'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


