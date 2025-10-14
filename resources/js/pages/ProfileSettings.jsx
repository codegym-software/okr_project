import React, { useEffect, useState } from 'react';
import { Toast } from '../components/ui';

export default function ProfileSettings({ user, activeTab }){
    const [toast, setToast] = useState({ type: 'success', message: '' });
    const showToast = (type, message) => setToast({ type, message });

    const [name, setName] = useState(user?.name || '');
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');

    useEffect(()=>{ setName(user?.name || ''); }, [user]);

    const submitProfile = async (e) => {
        e.preventDefault();
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const form = new FormData();
        form.append('_token', token);
        form.append('full_name', name);
        if (file) form.append('avatar', file);
        const res = await fetch('/api/profile', { method: 'POST', body: form, headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const data = await res.json().catch(()=>({}));
            showToast('success', (data && data.message) || 'Cập nhật hồ sơ thành công!');
            // Redirect về dashboard sau khi cập nhật thành công
            setTimeout(()=> {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = '/dashboard';
                }
            }, 1500);
        } else {
            const err = await res.json().catch(()=>({ message: 'Cập nhật thất bại' }));
            showToast('error', err.message || 'Cập nhật thất bại');
        }
    };

    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');

    const submitPassword = async (e) => {
        e.preventDefault();
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const form = new FormData();
        form.append('_token', token);
        form.append('old_password', oldPwd);
        form.append('new_password', newPwd);
        form.append('new_password_confirmation', confirmPwd);
        const res = await fetch('/change-password', { method: 'POST', body: form, headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const data = await res.json().catch(()=>({}));
            showToast('success', (data && data.message) || 'Đổi mật khẩu thành công!');
            // Đảm bảo đăng xuất hoàn toàn trước khi redirect
            setTimeout(()=> { 
                // Xóa tất cả session storage và local storage
                sessionStorage.clear();
                localStorage.clear();
                // Redirect về landing page
                window.location.href = '/landingpage';
            }, 1500);
        } else {
            const err = await res.json().catch(()=>({ message: 'Đổi mật khẩu thất bại' }));
            showToast('error', err.message || 'Đổi mật khẩu thất bại');
        }
    };

    const avatar = user?.avatar || '/images/default.png';
    const email = user?.email || '';

    return (
        <div className="mx-auto w-full max-w-4xl">
            <Toast type={toast.type} message={toast.message} onClose={()=>setToast({ type:'success', message:'' })} />
            {activeTab==='profile' && (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                        <h2 className="text-xl font-extrabold">Hồ sơ cá nhân</h2>
                        <p className="text-white/80">Cập nhật tên hiển thị và ảnh đại diện của bạn</p>
                    </div>
                    <div className="p-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="md:col-span-1">
                                <div className="flex flex-col items-center rounded-2xl border border-slate-200 p-6">
                                    <img src={avatar} className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-100" alt="avatar" />
                                    <div className="mt-3 text-center">
                                        <div className="text-base font-semibold text-slate-900">{user?.name || 'Chưa cập nhật'}</div>
                                        <div className="text-sm text-slate-500">{email}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <form onSubmit={submitProfile} className="space-y-5">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Họ và tên</label>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 1114 0H5z"/></svg>
                                            </span>
                                            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Ảnh đại diện</label>
                                        <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 p-4 hover:border-blue-400">
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l-7 7-5-5 1.41-1.41L12 13.17l5.59-5.59L19 9z"/></svg>
                                                <span>{fileName || 'Chọn ảnh (JPG, PNG, GIF ≤ 2MB)'}</span>
                                            </div>
                                            <input type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]||null; setFile(f); setFileName(f ? f.name : ''); }} className="hidden" />
                                            <span className="rounded-xl bg-slate-100 px-3 py-1 text-sm">{fileName ? 'Đã chọn' : 'Tải lên'}</span>
                                        </label>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-95">Cập nhật</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab==='password' && (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-4 text-white">
                        <h2 className="text-xl font-extrabold">Đổi mật khẩu</h2>
                        <p className="text-white/80">Bảo vệ tài khoản của bạn với mật khẩu mạnh</p>
                    </div>
                    <div className="p-6">
                        <form onSubmit={submitPassword} className="grid gap-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
                                <input type="password" value={oldPwd} onChange={(e)=>setOldPwd(e.target.value)} className="w-full rounded-3xl border border-slate-300 px-5 py-4 text-base outline-none" required />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu mới</label>
                                    <input type="password" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} className="w-full rounded-3xl border border-slate-300 px-5 py-4 text-base outline-none" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                                    <input type="password" value={confirmPwd} onChange={(e)=>setConfirmPwd(e.target.value)} className="w-full rounded-3xl border border-slate-300 px-5 py-4 text-base outline-none" required />
                                </div>
                            </div>
                            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500 md:text-sm">
                                    <li>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</li>
                                    <li>Không nên dùng mật khẩu đã sử dụng trước đó.</li>
                                </ul>
                                <button type="submit" className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-7 py-3 text-sm font-semibold text-white shadow hover:opacity-95">Cập nhật</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


