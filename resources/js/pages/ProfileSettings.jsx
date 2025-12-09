import React, { useEffect, useState } from 'react';
import { Toast } from '../components/ui';
import { UserAvatar } from '../components/UserAvatar';

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
            }, 800);
        } else {
            const err = await res.json().catch(()=>({ message: 'Cập nhật thất bại' }));
            showToast('error', err.message || 'Cập nhật thất bại');
        }
    };

    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    const submitPassword = async (e) => {
        e.preventDefault();
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const form = new FormData();
        form.append('_token', token);
        form.append('old_password', oldPwd);
        form.append('new_password', newPwd);
        form.append('new_password_confirmation', confirmPwd);
        
        try {
            const res = await fetch('/change-password', { 
                method: 'POST', 
                body: form, 
                headers: { 
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                } 
            });
            
            const data = await res.json().catch(()=>({}));
            
            if (res.ok && data.success) {
                showToast('success', data.message || 'Đổi mật khẩu thành công!');
                // Đảm bảo đăng xuất hoàn toàn trước khi redirect
                setTimeout(()=> { 
                    // Xóa tất cả session storage và local storage
                    sessionStorage.clear();
                    localStorage.clear();
                    // Redirect về trang login
                    window.location.href = data.redirect || '/login';
                }, 1500);
            } else {
                // Xử lý validation errors
                if (data.errors) {
                    // Thu thập tất cả error messages
                    let allErrors = [];
                    Object.keys(data.errors).forEach(field => {
                        if (Array.isArray(data.errors[field])) {
                            allErrors.push(...data.errors[field]);
                        } else {
                            allErrors.push(data.errors[field]);
                        }
                    });
                    
                    // Hiển thị từng lỗi riêng biệt với số thứ tự
                    if (allErrors.length === 1) {
                        showToast('error', allErrors[0]);
                    } else {
                        // Hiển thị nhiều lỗi dưới dạng danh sách
                        const errorList = allErrors.map((error, index) => `${index + 1}. ${error}`).join('\n');
                        showToast('error', `Có ${allErrors.length} lỗi cần sửa:\n${errorList}`);
                    }
                } else {
                    // Kiểm tra nếu là OAuth user
                    if (data.oauth_user) {
                        showToast('error', data.message || 'Bạn đang đăng nhập bằng Google. Để đổi mật khẩu, vui lòng truy cập tài khoản Google của bạn.');
                    } else {
                        showToast('error', data.message || 'Đổi mật khẩu thất bại');
                    }
                }
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showToast('error', 'Có lỗi xảy ra khi đổi mật khẩu');
        }
    };


    return (
        <div className="flex h-[calc(100vh-6rem)] items-center justify-center px-4 py-8">
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
                                    <UserAvatar user={user} size="md" showInfo={true} />
                                </div>
                            </div>
                            <div className="md:col-span-2 flex items-start">
                                <form onSubmit={submitProfile} className="space-y-5 w-full pt-6">
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
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                        <h2 className="text-xl font-extrabold">Đổi mật khẩu</h2>
                        <p className="text-white/80">Bảo vệ tài khoản của bạn với mật khẩu mạnh</p>
                    </div>
                    <div className="p-6">
                        {/* Thông báo cho OAuth users */}
                        {user?.google_id && (
                            <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
                                <div className="flex items-start">
                                    <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium mb-1">Thông tin quan trọng:</p>
                                        <p>Bạn đang đăng nhập bằng Google. Để đổi mật khẩu, vui lòng truy cập <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline font-medium">tài khoản Google</a> của bạn.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <form onSubmit={submitPassword} className="grid gap-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
                                <input 
                                    type={showPasswords ? "text" : "password"} 
                                    value={oldPwd} 
                                    onChange={(e)=>setOldPwd(e.target.value)} 
                                    className={`w-full rounded-3xl border border-slate-300 px-5 py-4 text-base outline-none ${user?.google_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    disabled={!!user?.google_id}
                                    required 
                                />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu mới</label>
                                    <input 
                                        type={showPasswords ? "text" : "password"} 
                                        value={newPwd} 
                                        onChange={(e)=>setNewPwd(e.target.value)} 
                                        className={`w-full rounded-3xl border border-slate-300 px-5 py-4 text-base outline-none ${user?.google_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        disabled={!!user?.google_id}
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                                    <input 
                                        type={showPasswords ? "text" : "password"} 
                                        value={confirmPwd} 
                                        onChange={(e)=>setConfirmPwd(e.target.value)} 
                                        className={`w-full rounded-3xl border border-slate-300 px-5 py-4 text-base outline-none ${user?.google_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        disabled={!!user?.google_id}
                                        required 
                                    />
                                </div>
                            </div>
                            
                            {/* Show password checkbox */}
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="showPasswords" 
                                    checked={showPasswords}
                                    onChange={(e) => setShowPasswords(e.target.checked)}
                                    className={`h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${user?.google_id ? 'cursor-not-allowed opacity-50' : ''}`}
                                    disabled={!!user?.google_id}
                                />
                                <label htmlFor="showPasswords" className={`text-sm font-medium text-slate-700 ${user?.google_id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                    Hiển thị mật khẩu
                                </label>
                            </div>
                            
                            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500 md:text-sm">
                                    <li>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</li>
                                    <li>Không nên dùng mật khẩu đã sử dụng trước đó.</li>
                                </ul>
                                <button 
                                    type="submit" 
                                    className={`rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow hover:opacity-95 ${user?.google_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!!user?.google_id}
                                >
                                    {user?.google_id ? 'Không khả dụng cho tài khoản Google' : 'Cập nhật'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}


