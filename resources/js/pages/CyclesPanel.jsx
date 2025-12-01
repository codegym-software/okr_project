import React, { useEffect, useState } from "react";
import { Badge, Modal, Toast } from "../components/ui";
import DateInputComponent from "../components/DateInput";
import { useAuth } from "../hooks/useAuth";
import { AdminOnly } from "../components/AdminOnly";
import { 
    FiPlus, 
    FiEdit2, 
    FiTrash2, 
    FiArrowLeft,
    FiFileText,
    FiCalendar,
    FiMoreVertical
} from "react-icons/fi";

// --- Helper Functions ---
const parseDateSafe = (v) => {
    if (!v) return null;
    const str = String(v);
    
    if (str.includes('T') || str.includes('Z')) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y, m, d] = str.slice(0, 10).split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    
    return null;
};

const formatDate = (dateStr) => {
    const date = parseDateSafe(dateStr);
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

const toInputDate = (v) => {
    const date = parseDateSafe(v);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// --- Components ---

function CycleFormModal({ open, onClose, onSubmit, initialData, title }) {
    const [form, setForm] = useState({
        cycle_name: "",
        start_date: "",
        end_date: "",
        status: "active",
        description: ""
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                setForm({
                    cycle_name: initialData.cycle_name || "",
                    start_date: toInputDate(initialData.start_date),
                    end_date: toInputDate(initialData.end_date),
                    // Nếu dữ liệu cũ là draft, vẫn giữ nguyên để hiển thị, nhưng select bên dưới sẽ không có option draft
                    // Người dùng buộc phải đổi sang active hoặc inactive nếu muốn lưu lại (tuỳ logic, ở đây ta cứ set theo data cũ)
                    status: initialData.status || "active",
                    description: initialData.description || ""
                });
            } else {
                setForm({
                    cycle_name: "",
                    start_date: "",
                    end_date: "",
                    status: "active",
                    description: ""
                });
            }
        }
    }, [open, initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Tên chu kỳ
                    </label>
                    <input
                        value={form.cycle_name}
                        onChange={(e) => setForm({...form, cycle_name: e.target.value})}
                        placeholder="Ví dụ: Quý 4 - 2025"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
                        required
                    />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Ngày bắt đầu
                        </label>
                        <DateInputComponent
                            name="start_date"
                            value={form.start_date}
                            onChange={(val) => setForm({...form, start_date: val})}
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Ngày kết thúc
                        </label>
                        <DateInputComponent
                            name="end_date"
                            value={form.end_date}
                            onChange={(val) => setForm({...form, end_date: val})}
                            required
                        />
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Trạng thái
                        </label>
                        <div className="relative">
                            <select
                                value={form.status}
                                onChange={(e) => setForm({...form, status: e.target.value})}
                                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
                            >
                                {/* CHỈ CÒN ACTIVE VÀ INACTIVE */}
                                <option value="active">Hoạt động (Active)</option>
                                <option value="inactive">Đóng (Inactive)</option>
                            </select>
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Mô tả (tuỳ chọn)
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({...form, description: e.target.value})}
                            className="h-[46px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all resize-none"
                            style={{ minHeight: '46px' }}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors shadow-none"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CyclesTable({ cycles, onRowClick, onEdit, onDelete, isAdmin, emptyMessage }) {
    if (!cycles || cycles.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <FiFileText size={24} />
                </div>
                <p className="text-slate-500 font-medium">{emptyMessage || "Không có dữ liệu"}</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                        <th className="px-6 py-4 font-medium">Tên chu kỳ</th>
                        <th className="px-6 py-4 font-medium">Thời gian</th>
                        <th className="px-6 py-4 font-medium">Trạng thái</th>
                        <th className="px-6 py-4 font-medium text-right">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {cycles.map((cycle) => {
                        const isActive = cycle.status === 'active';
                        const isDraft = cycle.status === 'draft';
                        const now = new Date();
                        const isEnded = new Date(cycle.end_date) <= now;
                        const isUpcoming = new Date(cycle.start_date) > now;
                        
                        let statusLabel = cycle.status;
                        let statusClass = "bg-slate-100 text-slate-600";
                        
                        // Logic hiển thị status
                        if (isActive) {
                            if (isUpcoming) {
                                statusLabel = "Sắp diễn ra";
                                statusClass = "bg-blue-50 text-blue-700 border border-blue-100";
                            } else if (isEnded) {
                                statusLabel = "Quá hạn";
                                statusClass = "bg-amber-50 text-amber-700 border border-amber-100";
                            } else {
                                statusLabel = "Đang diễn ra";
                                statusClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                            }
                        } else if (isDraft) {
                            statusLabel = "Bản nháp";
                            statusClass = "bg-slate-100 text-slate-600 border border-slate-200";
                        } else {
                            statusLabel = "Đã đóng";
                            statusClass = "bg-red-50 text-red-600 border border-red-100"; 
                        }

                        return (
                            <tr 
                                key={cycle.cycle_id || cycle.id} 
                                onClick={() => onRowClick(cycle)}
                                className="cursor-pointer transition-colors hover:bg-slate-50"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{cycle.cycle_name}</div>
                                    {cycle.description && (
                                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                                            {cycle.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                                        {statusLabel}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isAdmin && (
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            {/* Nút đóng chu kỳ: Chỉ hiện khi Active + Quá hạn */}
                                            {isActive && isEnded && (
                                                <button 
                                                    onClick={() => handleCloseCycle(cycle)} // Sử dụng prop function passed down or context logic
                                                    // Lưu ý: Ở đây cần gọi onCloseCycle được truyền từ props vào component CyclesTable
                                                    // Nhưng component CyclesTable đang nhận prop tên là onCloseCycle
                                                    // Sửa lại logic gọi hàm bên dưới
                                                />
                                            )}
                                            {/* Nút đóng chu kỳ thực tế */}
                                            {isActive && isEnded && (
                                                <button 
                                                    onClick={() => onCloseCycle(cycle)}
                                                    className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                                                    title="Đóng chu kỳ này lại để lưu trữ"
                                                >
                                                    Đóng
                                                </button>
                                            )}

                                            {/* Cho phép sửa Active và Draft */}
                                            {(isActive || isDraft) && (
                                                <button 
                                                    onClick={() => onEdit(cycle)}
                                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onDelete(cycle)}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                title="Xóa"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function CyclesPanel() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [krs, setKrs] = useState({});
    const [isDetail, setIsDetail] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const [activeTab, setActiveTab] = useState('current');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCycle, setEditingCycle] = useState(null);
    
    const [confirm, setConfirm] = useState({
        open: false,
        title: "",
        message: "",
        confirmText: "Xác nhận",
        onConfirm: null,
        type: "danger" 
    });

    const { isAdmin } = useAuth();

    const fetchCycles = async () => {
        try {
            setLoading(true);
            const r = await fetch("/cycles", { headers: { Accept: "application/json" } });
            const d = await r.json();
            setCycles(d.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCycles();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const handler = async () => {
            const m = window.location.pathname.match(/^\/cycles\/(\d+)\/detail$/);
            const newIsDetail = Boolean(m);
            setIsDetail(newIsDetail);
            
            if (!m) {
                setDetail(null);
                setKrs({});
                return;
            }

            setDetail(null); 
            
            const id = m[1];
            try {
                const res = await fetch(`/cycles/${id}/detail`, { 
                    headers: { Accept: "application/json" },
                    signal: controller.signal
                });
                
                const data = await res.json();
                if (res.ok && data.success) {
                    setDetail(data.data);
                    const map = {};
                    (data.data.objectives || []).forEach((o) => {
                        map[o.objective_id] = o.key_results || o.keyResults || [];
                    });
                    setKrs(map);
                }
            } catch (e) { 
                if (e.name !== 'AbortError') {
                    console.error("Fetch error:", e);
                }
            }
        };

        handler();
        window.addEventListener("popstate", handler);
        
        return () => {
            window.removeEventListener("popstate", handler);
            controller.abort();
        };
    }, []);

    const goDetail = (id) => {
        window.history.pushState({}, "", `/cycles/${id}/detail`);
        window.dispatchEvent(new Event("popstate"));
    };
    const goBack = () => {
        window.history.pushState({}, "", "/cycles");
        window.dispatchEvent(new Event("popstate"));
    };

    const handleCreate = async (data) => {
        try {
            const token = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
            const res = await fetch("/cycles", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": token, Accept: "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Tạo thất bại");
            
            setToast({ type: "success", message: "Tạo chu kỳ mới thành công" });
            setCreateModalOpen(false);
            fetchCycles();
        } catch (e) {
            setToast({ type: "error", message: e.message });
        }
    };

    const handleUpdate = async (data) => {
        if (!editingCycle) return;
        const id = editingCycle.cycle_id || editingCycle.id;
        try {
            const token = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
            const res = await fetch(`/cycles/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": token, Accept: "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Cập nhật thất bại");

            setToast({ type: "success", message: "Cập nhật chu kỳ thành công" });
            setEditModalOpen(false);
            setEditingCycle(null);
            fetchCycles();
            
            if (detail && (detail.cycle.cycle_id === id || detail.cycle.id === id)) {
                setDetail(prev => ({ ...prev, cycle: { ...prev.cycle, ...data } }));
            }
        } catch (e) {
            setToast({ type: "error", message: e.message });
        }
    };

    const handleDelete = async (cycle) => {
        const id = cycle.cycle_id || cycle.id;
        setConfirm({
            open: true,
            title: "Xóa chu kỳ",
            message: `Bạn có chắc muốn xóa chu kỳ "${cycle.cycle_name}"?`,
            confirmText: "Xóa ngay",
            type: "danger",
            onConfirm: async () => {
                try {
                    const token = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
                    const res = await fetch(`/cycles/${id}`, {
                        method: 'DELETE',
                        headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                    });
                    const json = await res.json();
                    if (!res.ok || json.success === false) throw new Error(json.message);
                    
                    setToast({ type: 'success', message: 'Đã xóa chu kỳ' });
                    if (isDetail) goBack();
                    fetchCycles();
                } catch (e) {
                    setToast({ type: 'error', message: e.message });
                }
            }
        });
    };

    const handleCloseCycle = async (cycle) => {
        const id = cycle.cycle_id || cycle.id;
        setConfirm({
            open: true,
            title: "Đóng chu kỳ",
            message: `Đóng chu kỳ "${cycle.cycle_name}" sẽ khóa tất cả OKR.`,
            confirmText: "Đóng chu kỳ",
            type: "warning",
            onConfirm: async () => {
                try {
                    const token = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
                    const res = await fetch(`/cycles/${id}/close`, {
                        method: 'POST',
                        headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                    });
                    const json = await res.json();
                    if (!res.ok || json.success === false) throw new Error(json.message);

                    setToast({ type: 'success', message: 'Đã đóng chu kỳ thành công' });
                    fetchCycles();
                } catch (e) {
                    setToast({ type: 'error', message: e.message });
                }
            }
        });
    };

    // Sort & Filter Logic
    // Tab "Hiện tại" bao gồm Active + Draft (để không bị mất data cũ)
    const rawCurrent = cycles.filter(c => c.status === 'active' || c.status === 'draft');
    // Tab "Lịch sử" bao gồm các trạng thái còn lại (Inactive)
    const rawHistory = cycles.filter(c => c.status !== 'active' && c.status !== 'draft');
    
    const currentCycles = [...rawCurrent].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)); // ASC
    const historyCycles = [...rawHistory].sort((a, b) => new Date(b.start_date) - new Date(a.start_date)); // DESC

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 font-sans">
            <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: "success", message: "" })} />

            {confirm.open && (
                <Modal open={true} onClose={() => setConfirm({ ...confirm, open: false })} title={confirm.title}>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">{confirm.message}</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={() => setConfirm({ ...confirm, open: false })}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={async () => {
                                    await confirm.onConfirm();
                                    setConfirm({ ...confirm, open: false });
                                }}
                                className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${confirm.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {confirm.confirmText}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <CycleFormModal 
                open={createModalOpen} 
                onClose={() => setCreateModalOpen(false)} 
                onSubmit={handleCreate} 
                title="Tạo chu kỳ mới"
            />
            <CycleFormModal 
                open={editModalOpen} 
                onClose={() => { setEditModalOpen(false); setEditingCycle(null); }} 
                onSubmit={handleUpdate} 
                initialData={editingCycle}
                title="Chỉnh sửa chu kỳ"
            />

            {/* Main Header */}
            <div className="mb-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {isDetail ? (detail ? detail.cycle?.cycle_name : "Đang tải...") : "Quản lý Chu kỳ"}
                        </h1>
                        {!isDetail && (
                            <div className="mt-6 flex items-center gap-6 border-b border-slate-200">
                                <button
                                    onClick={() => setActiveTab('current')}
                                    className={`relative pb-3 text-sm font-medium transition-all ${
                                        activeTab === 'current' 
                                        ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-slate-900' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Hiện tại ({currentCycles.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`relative pb-3 text-sm font-medium transition-all ${
                                        activeTab === 'history' 
                                        ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-slate-900' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Lịch sử ({historyCycles.length})
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                        {isDetail ? (
                            <button onClick={goBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                <FiArrowLeft /> Quay lại
                            </button>
                        ) : (
                            <AdminOnly permission="canManageCycles">
                                <button 
                                    onClick={() => setCreateModalOpen(true)}
                                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors shadow-sm"
                                >
                                    <FiPlus /> Tạo chu kỳ
                                </button>
                            </AdminOnly>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            {isDetail ? (
                detail && detail.cycle ? (
                    <CycleDetailView 
                        key={detail.cycle.cycle_id || detail.cycle.id}
                        detail={detail} 
                        krs={krs} 
                        formatDate={formatDate}
                    />
                ) : (
                    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <div className="text-center">
                            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600"></div>
                            <div className="text-sm font-medium text-slate-500">Đang tải dữ liệu...</div>
                        </div>
                    </div>
                )
            ) : (
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                            <div className="text-center">
                                <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600"></div>
                                <div className="text-sm font-medium text-slate-500">Đang tải danh sách...</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'current' && (
                                <CyclesTable 
                                    cycles={currentCycles}
                                    onRowClick={(c) => goDetail(c.id || c.cycle_id)}
                                    onEdit={(c) => { setEditingCycle(c); setEditModalOpen(true); }}
                                    onDelete={handleDelete}
                                    isAdmin={isAdmin}
                                    emptyMessage="Không có chu kỳ nào đang hoạt động."
                                />
                            )}
                            {activeTab === 'history' && (
                                <CyclesTable 
                                    cycles={historyCycles}
                                    onRowClick={(c) => goDetail(c.id || c.cycle_id)}
                                    onEdit={(c) => { setEditingCycle(c); setEditModalOpen(true); }}
                                    onDelete={handleDelete}
                                    isAdmin={isAdmin}
                                    emptyMessage="Chưa có chu kỳ nào đã đóng."
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function CycleDetailView({ detail, krs, formatDate }) {
    const [openObj, setOpenObj] = useState({});
    const toggleObj = (id) => setOpenObj(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="space-y-8">
            {/* Info Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Thông tin chung</h3>
                    <Badge color="slate">{detail.cycle?.status}</Badge>
                </div>
                <div className="grid gap-8 px-6 py-6 md:grid-cols-3">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian</div>
                        <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            <FiCalendar className="text-slate-400" />
                            {formatDate(detail.cycle?.start_date)} — {formatDate(detail.cycle?.end_date)}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mô tả</div>
                        <div className="text-sm text-slate-700 leading-relaxed">
                            {detail.cycle?.description || "Chưa có mô tả cho chu kỳ này."}
                        </div>
                    </div>
                </div>
            </div>

            {/* Objectives List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Objectives & Key Results</h3>
                </div>
                
                {(detail.objectives || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                        Chưa có mục tiêu nào được thiết lập trong chu kỳ này.
                    </div>
                ) : (
                    (detail.objectives || []).map(obj => (
                        <div key={obj.objective_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300">
                            <div 
                                onClick={() => toggleObj(obj.objective_id)}
                                className="flex cursor-pointer items-center justify-between px-6 py-5 hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">
                                        {(obj.obj_title || "O")[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-base">{obj.obj_title}</div>
                                        <div className="text-xs font-medium text-slate-500 mt-0.5">{obj.level}</div>
                                    </div>
                                </div>
                                <FiMoreVertical className="text-slate-400" />
                            </div>
                            
                            {openObj[obj.objective_id] !== false && (
                                <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-5">
                                    <div className="space-y-3 pl-14">
                                        {(krs[obj.objective_id] || []).map(kr => (
                                            <div key={kr.kr_id || kr.id} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
                                                <span className="text-sm font-medium text-slate-700">{kr.kr_title}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                                        kr.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                                        kr.status === 'active' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                                        'bg-slate-50 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {kr.status || 'active'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {(krs[obj.objective_id] || []).length === 0 && (
                                            <div className="text-sm italic text-slate-400">Chưa có Key Results</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}