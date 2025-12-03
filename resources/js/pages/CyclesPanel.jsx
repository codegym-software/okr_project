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
    FiMoreVertical,
    FiLock,
    FiChevronDown,
    FiCheckCircle,
    FiActivity,
    FiPieChart,
    FiTarget
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

function CyclesTable({ cycles, onRowClick, onEdit, onDelete, onCloseCycle, isAdmin, emptyMessage }) {
    if (!cycles || cycles.length === 0) {
        return (
            <div className="mt-3 w-full rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <FiFileText size={24} />
                </div>
                <p className="text-slate-500 font-medium">{emptyMessage || "Không có dữ liệu"}</p>
            </div>
        );
    }

    return (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">Tên chu kỳ</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">Thời gian</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">Trạng thái</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
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
                                <td className="px-4 py-3 border-r border-slate-200">
                                    <div className="font-medium text-slate-900">{cycle.cycle_name}</div>
                                    {cycle.description && (
                                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                                            {cycle.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-600">
                                    {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                                </td>
                                <td className="px-4 py-3 text-center border-r border-slate-200">
                                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                                        {statusLabel}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {isAdmin && (
                                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            {/* Logic hiển thị nút hành động */}
                                            {/* Trường hợp 1: Tab Lịch sử (Inactive) -> Chỉ có nút Xóa -> Căn giữa */}
                                            {!isActive && !isDraft ? (
                                                <div className="flex justify-center w-full">
                                                    <button 
                                                        onClick={() => onDelete(cycle)}
                                                        className="p-1.5 rounded hover:bg-slate-100 hover:text-rose-600 transition-colors text-slate-400"
                                                        title="Xóa"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                /* Trường hợp 2: Tab Hiện tại (Active/Draft) -> Giữ layout 3 slots để thẳng hàng */
                                                <>
                                                    {/* Slot 1: Close/Lock Button */}
                                                    <div className="w-8 flex justify-center">
                                                        {isActive && isEnded ? (
                                                            <button 
                                                                onClick={() => onCloseCycle(cycle)} 
                                                                className="p-1.5 rounded text-amber-600 hover:bg-amber-50 transition-colors"
                                                                title="Đóng chu kỳ (Khóa để lưu trữ)"
                                                            >
                                                                <FiLock size={16} />
                                                            </button>
                                                        ) : null}
                                                    </div>

                                                    {/* Slot 2: Edit Button */}
                                                    <div className="w-8 flex justify-center">
                                                        <button 
                                                            onClick={() => onEdit(cycle)}
                                                            className="p-1.5 rounded hover:bg-slate-100 hover:text-blue-600 transition-colors text-slate-400"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Slot 3: Delete Button */}
                                                    <div className="w-8 flex justify-center">
                                                        <button 
                                                            onClick={() => onDelete(cycle)}
                                                            className="p-1.5 rounded hover:bg-slate-100 hover:text-rose-600 transition-colors text-slate-400"
                                                            title="Xóa"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
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
        <div className="">
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

            <div className="mx-auto max-w-6xl px-4 py-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-900">
                        {isDetail ? (detail ? detail.cycle?.cycle_name : "Đang tải...") : "Quản lý Chu kỳ"}
                    </h1>
                    
                    <div className="flex items-center gap-2">
                        {isDetail ? (
                            <button onClick={goBack} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                <FiArrowLeft /> Quay lại
                            </button>
                        ) : (
                            <AdminOnly permission="canManageCycles">
                                <button 
                                    onClick={() => setCreateModalOpen(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2"
                                >
                                    <FiPlus /> Tạo chu kỳ
                                </button>
                            </AdminOnly>
                        )}
                    </div>
                </div>

                {!isDetail && (
                    <div className="mb-6 w-full border-b border-slate-200">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setActiveTab('current')}
                                className={`relative pb-3 text-sm font-medium transition-all ${
                                    activeTab === 'current' 
                                    ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Hiện tại ({currentCycles.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`relative pb-3 text-sm font-medium transition-all ${
                                    activeTab === 'history' 
                                    ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Lịch sử ({historyCycles.length})
                            </button>
                        </div>
                    </div>
                )}

                {isDetail ? (
                    <div className="w-full">
                        {detail && detail.cycle ? (
                            <CycleDetailView 
                                key={detail.cycle.cycle_id || detail.cycle.id}
                                detail={detail} 
                                krs={krs} 
                                formatDate={formatDate}
                            />
                        ) : (
                            <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                <div className="text-center">
                                    <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600"></div>
                                    <div className="text-sm font-medium text-slate-500">Đang tải dữ liệu...</div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="min-h-[400px]">
                        {loading ? (
                            <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
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
                                        onCloseCycle={handleCloseCycle}
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
        </div>
    );
}

function CycleDetailView({ detail, krs, formatDate }) {
    const [openObj, setOpenObj] = useState({});
    const [activeObjTab, setActiveObjTab] = useState('company'); // 'company', 'department', 'personal'
    const toggleObj = (id) => setOpenObj(prev => ({ ...prev, [id]: !prev[id] }));

    // Safe check cho list objectives
    const objectives = detail?.objectives || [];
    
    // Tính toán thống kê đơn giản
    const totalObjectives = objectives.length;
    const totalKRs = objectives.reduce((acc, obj) => acc + (krs[obj.objective_id]?.length || 0), 0);

    // Phân loại Objectives
    const companyObjs = objectives.filter(o => !o.level || o.level === 'company');
    const deptObjs = objectives.filter(o => o.level === 'department' || (o.department_id && !o.user_id));
    const personalObjs = objectives.filter(o => o.level === 'personal' || o.user_id);

    const renderObjectivesList = (list, emptyMsg) => {
        if (list.length === 0) {
            return (
                <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-slate-50">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm text-slate-400">
                        <FiTarget size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">{emptyMsg}</p>
                </div>
            );
        }

        return list.map(obj => {
            const isOpen = openObj[obj.objective_id] !== false; // Default open
            
            return (
                <div key={obj.objective_id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-200 mb-4">
                    {/* Objective Header */}
                    <div 
                        onClick={() => toggleObj(obj.objective_id)}
                        className="flex cursor-pointer items-center justify-between px-6 py-5 bg-white select-none"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-lg transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                                {(obj.obj_title || "O")[0].toUpperCase()}
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{obj.obj_title}</h4>
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 border border-slate-200 uppercase tracking-wider text-[10px]">
                                        {obj.level || 'Company'}
                                    </span>
                                    
                                    {/* Hiển thị thông tin User/Department nếu có */}
                                    {obj.user && (
                                        <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-100">
                                            <span className="font-medium">{obj.user.full_name}</span>
                                        </span>
                                    )}
                                    
                                    {obj.department && (
                                        <span className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-purple-700 border border-purple-100">
                                            <span className="font-medium">{obj.department.d_name}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                            <FiChevronDown size={20} />
                        </div>
                    </div>
                    
                    {/* KRs Section (Expandable) */}
                    {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-3 pl-0 sm:pl-16">
                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                    <span>Key Results</span>
                                    <span>Trạng thái</span>
                                </div>
                                
                                {(krs[obj.objective_id] || []).map(kr => (
                                    <div key={kr.kr_id || kr.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300 hover:shadow-sm">
                                        <div className="mt-0.5 text-slate-400">
                                            <FiCheckCircle size={16} className={kr.status === 'completed' ? 'text-emerald-500' : ''} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800 leading-snug">{kr.kr_title}</p>
                                        </div>
                                        <Badge color={kr.status === 'completed' ? 'emerald' : 'slate'}>
                                            {kr.status || 'active'}
                                        </Badge>
                                    </div>
                                ))}
                                
                                {(krs[obj.objective_id] || []).length === 0 && (
                                    <div className="flex items-center gap-2 text-sm italic text-slate-400 px-2 py-2 border border-dashed border-slate-300 rounded-lg justify-center">
                                        <FiTarget size={14} />
                                        Chưa có Key Results nào được thiết lập.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Section: Stats & Description */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                {/* Stats Grid (Chiếm 3 phần) */}
                <div className="lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Thời gian */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <FiCalendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Thời gian</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {formatDate(detail.cycle?.start_date)} - {formatDate(detail.cycle?.end_date)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Trạng thái */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <FiActivity size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Trạng thái</p>
                                <div className="mt-0.5">
                                    <Badge color={detail.cycle?.status === 'active' ? 'emerald' : detail.cycle?.status === 'draft' ? 'slate' : 'red'}>
                                        {detail.cycle?.status === 'active' ? 'Đang hoạt động' : detail.cycle?.status === 'draft' ? 'Bản nháp' : 'Đã đóng'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tổng quan */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                                <FiPieChart size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tổng quan</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {totalObjectives} Mục tiêu • {totalKRs} Kết quả
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description (Chiếm 1 phần - Bên phải) */}
                <div className="lg:col-span-1 rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex flex-col justify-center">
                    <div className="flex items-start gap-3">
                        <FiFileText className="mt-0.5 text-blue-500 shrink-0" size={18} />
                        <div>
                            <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Mô tả</p>
                            <p className="text-sm text-slate-700 leading-snug line-clamp-3">
                                {detail.cycle?.description || "Không có mô tả thêm cho chu kỳ này."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Objectives & KRs Section with Tabs */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FiTarget className="text-blue-600" />
                        Objectives & Key Results
                    </h3>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveObjTab('company')}
                            className={`relative pb-3 text-sm font-medium transition-all ${
                                activeObjTab === 'company' 
                                ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Cấp Công Ty ({companyObjs.length})
                        </button>
                        <button
                            onClick={() => setActiveObjTab('department')}
                            className={`relative pb-3 text-sm font-medium transition-all ${
                                activeObjTab === 'department' 
                                ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Cấp Phòng Ban ({deptObjs.length})
                        </button>
                        <button
                            onClick={() => setActiveObjTab('personal')}
                            className={`relative pb-3 text-sm font-medium transition-all ${
                                activeObjTab === 'personal' 
                                ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Cấp Cá Nhân ({personalObjs.length})
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="pt-2">
                    {activeObjTab === 'company' && renderObjectivesList(companyObjs, "Chưa có mục tiêu cấp Công ty nào.")}
                    {activeObjTab === 'department' && renderObjectivesList(deptObjs, "Chưa có mục tiêu cấp Phòng ban nào.")}
                    {activeObjTab === 'personal' && renderObjectivesList(personalObjs, "Chưa có mục tiêu cấp Cá nhân nào.")}
                </div>
            </div>
        </div>
    );
}