import React, { useEffect, useState } from 'react';
import { Toast, Modal } from '../components/ui';

function DepartmentFormModal({ open, onClose, mode='create', initialData=null, onSaved }){
    const [name, setName] = useState(initialData?.d_name || '');
    const [desc, setDesc] = useState(initialData?.d_description || '');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: 'success', message: '' });

    useEffect(() => {
        setName(initialData?.d_name || '');
        setDesc(initialData?.d_description || '');
    }, [initialData, open]);

    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            const isEdit = mode === 'edit' && initialData?.department_id;
            const url = isEdit ? `/departments/${initialData.department_id}` : '/departments';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers:{ 'Content-Type':'application/json','X-CSRF-TOKEN':token,'Accept':'application/json' }, body: JSON.stringify({ d_name: name, d_description: desc }) });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.message || (isEdit ? 'Cập nhật phòng ban thất bại' : 'Tạo phòng ban thất bại'));
            setToast({ type:'success', message: data.message || (isEdit ? 'Cập nhật phòng ban thành công!' : 'Tạo phòng ban thành công!') });
            onSaved && onSaved(data.data);
            onClose();
        } catch (e) {
            setToast({ type:'error', message: e.message || 'Thao tác thất bại' });
        } finally {
            setSaving(false);
        }
    };
    if (!open) return null;
    return (
        <Modal open={open} onClose={onClose} title={mode==='edit' ? 'Sửa phòng ban' : 'Tạo phòng ban'}>
            <Toast type={toast.type} message={toast.message} onClose={()=>setToast({type:'success',message:''})} />
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Tên phòng ban</label>
                    <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</label>
                    <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="h-24 w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 px-5 py-2 text-sm">Hủy</button>
                    <button disabled={saving} type="submit" className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow disabled:opacity-60">{mode==='edit' ? 'Lưu thay đổi' : 'Lưu'}</button>
                </div>
            </form>
        </Modal>
    );
}

export default function DepartmentsPanel(){
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editing, setEditing] = useState(null);
    const [toast, setToast] = useState({ type:'success', message:'' });
    const showToast = (type, message) => setToast({ type, message });

    useEffect(()=>{ (async() => {
        try {
            const res = await fetch('/departments', { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            setDepartments(data.data || []);
        } finally { setLoading(false); }
    })(); }, []);

    const openEditModal = async (id) => {
        try {
            const res = await fetch(`/departments/${id}`, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.message || 'Tải dữ liệu thất bại');
            setEditing(data.data);
            setOpenEdit(true);
        } catch (e) {
            showToast('error', e.message || 'Không tải được dữ liệu phòng ban');
        }
    };

    return (
        <div className="px-4 py-6">
            <Toast type={toast.type} message={toast.message} onClose={()=>setToast({ type:'success', message:'' })} />
            <div className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">Phòng ban</h2>
                <button onClick={()=>setOpenCreate(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Tạo mới</button>
            </div>
            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2">Tên phòng ban</th>
                            <th className="px-3 py-2">Mô tả</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (<tr><td colSpan={2} className="px-3 py-5 text-center text-slate-500">Đang tải...</td></tr>)}
                        {!loading && departments.length === 0 && (<tr><td colSpan={2} className="px-3 py-5 text-center text-slate-500">Chưa có phòng ban</td></tr>)}
                        {!loading && departments.map(d => (
                            <tr key={d.department_id} className="hover:bg-slate-50">
                                <td className="px-3 py-2">
                                    <button 
                                        onClick={()=>openEditModal(d.department_id)} 
                                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                    >
                                        {d.d_name}
                                    </button>
                                </td>
                                <td className="px-3 py-2 text-slate-600">{d.d_description || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <DepartmentFormModal open={openCreate} onClose={()=>setOpenCreate(false)} mode="create" onSaved={(dep)=>{ setDepartments([...departments, dep]); showToast('success','Tạo phòng ban thành công'); }} />
            <DepartmentFormModal open={openEdit} onClose={()=>{ setOpenEdit(false); setEditing(null); }} mode="edit" initialData={editing} onSaved={(dep)=>{ setDepartments(prev=>prev.map(x=>x.department_id===dep.department_id?dep:x)); showToast('success','Cập nhật phòng ban thành công'); }} />
        </div>
    );
}


