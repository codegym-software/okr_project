import React, { useEffect, useState } from "react";
import { Badge, Modal, Toast } from "../components/ui";
import DateInputComponent from "../components/DateInput";
import { useAuth } from "../hooks/useAuth";
import { AdminOnly } from "../components/AdminOnly";
import { 
    FiPlus, 
    FiEdit2, 
    FiTrash2, 
    FiArchive,
    FiArrowLeft,
    FiMoreHorizontal,
    FiClock,
    FiFileText
} from "react-icons/fi";

// --- Helper Functions ---
const parseDateSafe = (v) => {
    if (!v) return null;
    const str = String(v);
    
    // Trường hợp 1: ISO String có Timezone (VD: 2025-11-11T17:00:00.000000Z)
    if (str.includes('T') || str.includes('Z')) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    
    // Trường hợp 2: Date String thuần (VD: 2025-11-12)
    // Regex bắt định dạng YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y, m, d] = str.slice(0, 10).split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    // Trường hợp 3: Thử parse bằng Date constructor cho các định dạng khác
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = parseDateSafe(dateStr);
    if (!date) {
        console.warn("formatDate: Invalid date", dateStr);
        return "—";
    }
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

const toInputDate = (v) => {
    if (!v) return "";
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
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Tên chu kỳ
                    </label>
                    <input
                        value={form.cycle_name}
                        onChange={(e) => setForm({...form, cycle_name: e.target.value})}
                        placeholder="Ví dụ: Quý 4 - 2025"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        required
                    />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Trạng thái
                        </label>
                        <div className="relative">
                            <select
                                value={form.status}
                                onChange={(e) => setForm({...form, status: e.target.value})}
                                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            >
                                <option value="draft">Bản nháp (Draft)</option>
                                <option value="active">Hoạt động (Active)</option>
                                <option value="inactive">Đóng (Inactive)</option>
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Mô tả (tuỳ chọn)
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({...form, description: e.target.value})}
                            className="h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            style={{ minHeight: '42px' }}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CyclesTable({ cycles, onRowClick, onEdit, onCloseCycle, onDelete, isAdmin, emptyMessage }) {
    if (!cycles || cycles.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <FiFileText size={24} />
                </div>
                <p className="text-slate-500">{emptyMessage || "Không có dữ liệu"}</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                        <th className="px-6 py-4 font-medium">Tên chu kỳ</th>
                        <th className="px-6 py-4 font-medium">Thời gian</th>
                        <th className="px-6 py-4 font-medium">Trạng thái</th>
                        <th className="px-6 py-4 font-medium text-right">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {cycles.map((cycle) => {
                        const isFuture = new Date(cycle.start_date) > new Date();
                        const isEnded = new Date(cycle.end_date) <= new Date();
                        const isDraft = cycle.status === 'draft';
                        const isActive = cycle.status === 'active';

                        let badgeColor = "slate";
                        let badgeText = cycle.status;

                        if (isDraft) {
                            badgeColor = "slate";
                            badgeText = "Bản nháp";
                        } else if (isActive) {
                            if (isFuture) {
                                badgeColor = "blue";
                                badgeText = "Sắp diễn ra";
                            } else if (isEnded) {
                                badgeColor = "amber";
                                badgeText = "Quá hạn";
                            } else {
                                badgeColor = "emerald";
                                badgeText = "Đang hoạt động";
                            }
                        } else {
                            badgeColor = "red";
                            badgeText = "Đã đóng";
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
                                        <div className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">
                                            {cycle.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <span>{formatDate(cycle.start_date)}</span>
                                        <span className="text-slate-300">→</span>
                                        <span>{formatDate(cycle.end_date)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge color={badgeColor}>{badgeText}</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        {isAdmin ? (
                                            <>
                                                {/* Close Button logic */}
                                                {isActive && isEnded && (
                                                    <button 
                                                        onClick={() => onCloseCycle(cycle)}
                                                        className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                                        title="Đóng chu kỳ"
                                                    >
                                                        Đóng
                                                    </button>
                                                )}
                                                
                                                {/* Actions */}
                                                <div className="flex items-center rounded-md border border-slate-200 bg-white shadow-sm">
                                                    {isActive && (
                                                        <button 
                                                            onClick={() => onEdit(cycle)}
                                                            className="p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-600"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <FiEdit2 size={14} />
                                                        </button>
                                                    )}
                                                    <div className="h-4 w-[1px] bg-slate-200"></div>
                                                    <button 
                                                        onClick={() => onDelete(cycle)}
                                                        className="p-2 text-slate-500 hover:bg-slate-50 hover:text-rose-600"
                                                        title="Xóa"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400">Chỉ xem</span>
                                        )}
                                    </div>
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
    
    // Tabs state: 'current' (Draft + Active) | 'history' (Inactive/Closed)
    const [activeTab, setActiveTab] = useState('current');

    // Modals state
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCycle, setEditingCycle] = useState(null);
    
    // Confirm Modal
    const [confirm, setConfirm] = useState({
        open: false,
        title: "",
        message: "",
        confirmText: "Xác nhận",
        onConfirm: null,
        type: "danger" 
    });

    const { isAdmin } = useAuth();

    // --- Fetch Data ---
    const fetchCycles = async () => {
        try {
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

    // --- Router/Detail Logic ---
    useEffect(() => {
        const handler = async () => {
            const m = window.location.pathname.match(/^\/cycles\/(\d+)\/detail$/);
            setIsDetail(Boolean(m));
                        if (!m) {
                            setDetail(null);
                            setKrs({});
                            return;
                        }
            
                        // Clear old detail immediately to avoid showing stale data
                        setDetail(null); 
                        
                        const id = m[1];
                        try {                const res = await fetch(`/cycles/${id}/detail`, { headers: { Accept: "application/json" } });
                const data = await res.json();
                if (res.ok && data.success) {
                    setDetail(data.data);
                    const map = {};
                    (data.data.objectives || []).forEach((o) => {
                        map[o.objective_id] = o.key_results || o.keyResults || [];
                    });
                    setKrs(map);
                }
            } catch (e) { /* ignore */ }
        };
        handler();
        window.addEventListener("popstate", handler);
        return () => window.removeEventListener("popstate", handler);
    }, []);

    const goDetail = (id) => {
        window.history.pushState({}, "", `/cycles/${id}/detail`);
        window.dispatchEvent(new Event("popstate"));
    };
    const goBack = () => {
        window.history.pushState({}, "", "/cycles");
        window.dispatchEvent(new Event("popstate"));
    };

    // --- Actions ---
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
            message: `Bạn có chắc muốn xóa chu kỳ "${cycle.cycle_name}"? Hành động này không thể hoàn tác.`,
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
            message: `Đóng chu kỳ "${cycle.cycle_name}" sẽ khóa tất cả OKR. Bạn chắc chắn chứ?`,
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

    // --- Filtering & Sorting Data ---
    
    // 1. Tách nhóm trước
    const rawCurrent = cycles.filter(c => c.status === 'active' || c.status === 'draft');
    const rawHistory = cycles.filter(c => c.status !== 'active' && c.status !== 'draft');

    // 2. Sắp xếp riêng biệt

    // Tab Hiện tại: Tăng dần (ASC) -> Đang diễn ra (cũ hơn) nằm trên, Tương lai (mới hơn) nằm dưới
    const currentCycles = [...rawCurrent].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    // Tab Lịch sử: Giảm dần (DESC) -> Vừa đóng (mới nhất) nằm trên, Lâu rồi (cũ nhất) nằm dưới
    const historyCycles = [...rawHistory].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 font-sans">
            <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: "success", message: "" })} />

            {/* Global Confirm Modal */}
            {confirm.open && (
                <Modal open={true} onClose={() => setConfirm({ ...confirm, open: false })} title={confirm.title}>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">{confirm.message}</p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setConfirm({ ...confirm, open: false })}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={async () => {
                                    await confirm.onConfirm();
                                    setConfirm({ ...confirm, open: false });
                                }}
                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${confirm.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {confirm.confirmText}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modals */}
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

            {/* Header Area */}
            <div className="mb-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isDetail ? detail?.cycle?.cycle_name : "Quản lý Chu kỳ"}
                        </h1>
                        {!isDetail && (
                            <div className="mt-4 flex items-center gap-6 border-b border-slate-200">
                                <button
                                    onClick={() => setActiveTab('current')}
                                    className={`relative pb-3 text-sm font-medium transition-colors ${
                                        activeTab === 'current' 
                                        ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Hiện tại
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                        {currentCycles.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`relative pb-3 text-sm font-medium transition-colors ${
                                        activeTab === 'history' 
                                        ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Lịch sử / Đã đóng
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                        {historyCycles.length}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isDetail ? (
                            <button onClick={goBack} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                <FiArrowLeft /> Quay lại
                            </button>
                        ) : (
                            <AdminOnly permission="canManageCycles">
                                <button 
                                    onClick={() => setCreateModalOpen(true)}
                                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all hover:shadow"
                                >
                                    <FiPlus /> Tạo chu kỳ
                                </button>
                            </AdminOnly>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isDetail && detail ? (
                <CycleDetailView 
                    detail={detail} 
                    krs={krs} 
                    formatDate={formatDate}
                />
            ) : (
                <div className="min-h-[400px]">
                    {activeTab === 'current' && (
                        <CyclesTable 
                            cycles={currentCycles}
                            onRowClick={(c) => goDetail(c.id || c.cycle_id)}
                            onEdit={(c) => { setEditingCycle(c); setEditModalOpen(true); }}
                            onCloseCycle={handleCloseCycle}
                            onDelete={handleDelete}
                            isAdmin={isAdmin}
                            emptyMessage="Không có chu kỳ nào đang hoạt động hoặc bản nháp."
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
                </div>
            )}
        </div>
    );
}

// --- Detail View ---
function CycleDetailView({ detail, krs, formatDate }) {
    console.log("CycleDetailView render with detail:", detail); // Debug log
    const [openObj, setOpenObj] = useState({});
    const toggleObj = (id) => setOpenObj(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-semibold text-slate-900">Thông tin chung</h3>
                </div>
                <div className="grid gap-6 px-6 py-6 md:grid-cols-3">
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Thời gian</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                            {formatDate(detail.cycle?.start_date)} — {formatDate(detail.cycle?.end_date)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trạng thái</div>
                        <div className="mt-1">
                             <Badge color={detail.cycle?.status === 'active' ? 'emerald' : detail.cycle?.status === 'draft' ? 'slate' : 'red'}>
                                {detail.cycle?.status}
                             </Badge>
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mô tả</div>
                        <div className="mt-1 text-sm text-slate-700">
                            {detail.cycle?.description || "Chưa có mô tả"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Objectives List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Objectives & Key Results</h3>
                {(detail.objectives || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                        Chưa có mục tiêu nào trong chu kỳ này.
                    </div>
                ) : (
                    (detail.objectives || []).map(obj => (
                        <div key={obj.objective_id} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
                            <div 
                                onClick={() => toggleObj(obj.objective_id)}
                                className="flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-slate-50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-sm">
                                        {(obj.obj_title || "O")[0]}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900">{obj.obj_title}</div>
                                        <div className="text-xs text-slate-500">{obj.level}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {openObj[obj.objective_id] !== false && (
                                <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4">
                                    <div className="space-y-3 pl-14">
                                        {(krs[obj.objective_id] || []).map(kr => (
                                            <div key={kr.kr_id || kr.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                                                <span className="text-sm font-medium text-slate-700">{kr.kr_title}</span>
                                                <Badge color={kr.status === 'completed' ? 'blue' : 'slate'}>{kr.status || 'draft'}</Badge>
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
