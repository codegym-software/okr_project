import React, { useEffect, useRef, useState } from "react";
import { Badge, Modal, Toast } from "../components/ui";
import DateInputComponent from "../components/DateInput";
import { useAuth } from "../hooks/useAuth";
import { AdminOnly } from "../components/AdminOnly";

function NewCycleModal({ open, onClose, onCreated }) {
    const [name, setName] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [status, setStatus] = useState("active");
    const [desc, setDesc] = useState("");
    const [toast, setToast] = useState({ type: "success", message: "" });
    const resetForm = () => {
        setName("");
        setStart("");
        setEnd("");
        setStatus("active");
        setDesc("");
        setToast({ type: "success", message: "" });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Reset form khi modal mở
    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const res = await fetch("/cycles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    cycle_name: name,
                    start_date: start,
                    end_date: end,
                    status,
                    description: desc,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
                throw new Error(data.message || "Tạo chu kỳ thất bại");
            setToast({
                type: "success",
                message: data.message || "Tạo chu kỳ thành công!",
            });
            onCreated && onCreated(data.data);
            resetForm();
            onClose();
        } catch (e) {
            setToast({
                type: "error",
                message: e.message || "Tạo chu kỳ thất bại",
            });
        }
    };
    if (!open) return null;
    return (
        <Modal open={open} onClose={onClose} title="Tạo chu kỳ mới">
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Tên chu kỳ
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Q4 - 2025"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Ngày bắt đầu
                        </label>
                        <DateInputComponent
                            name="start_date"
                            value={start}
                            onChange={setStart}
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Ngày kết thúc
                        </label>
                        <DateInputComponent
                            name="end_date"
                            value={end}
                            onChange={setEnd}
                            required
                        />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Trạng thái
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Mô tả
                        </label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="h-20 w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-2xl border border-slate-300 px-5 py-2 text-sm"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow"
                    >
                        Lưu
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default function CyclesPanel() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [krs, setKrs] = useState({});
    const [isDetail, setIsDetail] = useState(false);
    const [openObj, setOpenObj] = useState({});
    const [editOpen, setEditOpen] = useState(false);
    const [toast, setToast] = useState({ type: "success", message: "" });
    const [openCreateObjective, setOpenCreateObjective] = useState(false);
    const [openCreateKRForObjId, setOpenCreateKRForObjId] = useState(null);
    
    // Sử dụng custom hook để lấy thông tin authentication
    const { isAdmin } = useAuth();

    const toInputDate = (v) => {
        if (!v) return "";
        const str = String(v);
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
        const d = new Date(str);
        if (isNaN(d.getTime())) return "";
        const iso = new Date(
            d.getTime() - d.getTimezoneOffset() * 60000
        ).toISOString();
        return iso.slice(0, 10);
    };

    const formatDMY = (v) => {
        if (!v) return "";
        const d = new Date(v);
        if (isNaN(d.getTime())) return "";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const sortByStartDesc = (arr = []) =>
        [...arr].sort(
            (a, b) =>
                new Date(b.start_date || b.startDate) -
                new Date(a.start_date || a.startDate)
        );

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/cycles", {
                    headers: { Accept: "application/json" },
                });
                const d = await r.json();
                setCycles(sortByStartDesc(d.data || []));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const handler = async () => {
            const m = window.location.pathname.match(
                /^\/cycles\/(\d+)\/detail$/
            );
            setIsDetail(Boolean(m));
            if (!m) {
                setDetail(null);
                setKrs({});
                return;
            }
            const id = m[1];
            try {
                const res = await fetch(`/cycles/${id}/detail`, {
                    headers: { Accept: "application/json" },
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setDetail(data.data);
                    // Server đã trả kèm keyResults cho mỗi objective
                    const map = {};
                    (data.data.objectives || []).forEach((o) => {
                        map[o.objective_id] =
                            o.key_results || o.keyResults || [];
                    });
                    setKrs(map);
                }
            } catch (e) {
                /* ignore */
            }
        };
        handler();
        window.addEventListener("popstate", handler);
        return () => window.removeEventListener("popstate", handler);
    }, []);

    function goDetail(id) {
        window.history.pushState({}, "", `/cycles/${id}/detail`);
        window.dispatchEvent(new Event("popstate"));
    }
    function goBack() {
        window.history.pushState({}, "", "/cycles");
        window.dispatchEvent(new Event("popstate"));
    }

    return (
        <div className="px-4 py-6">
            <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ type: "success", message: "" })}
            />
            <div className="mx-auto mb-3 flex w-full max-w-4xl items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                    {isDetail ? "Chi tiết chu kỳ" : "Danh sách chu kỳ"}
                </h2>
                {isDetail ? (
                    <div className="flex items-center gap-2">
                        <AdminOnly permission="canManageCycles">
                            <>
                                <button
                                    onClick={() => setEditOpen(true)}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    Sửa
                                </button>
                                <button
                                    onClick={async () => {
                                        const ok = window.confirm(
                                            "Xóa chu kỳ này? Hành động không thể hoàn tác."
                                        );
                                        if (!ok) return;
                                        try {
                                            const token = document
                                                .querySelector(
                                                    'meta[name="csrf-token"]'
                                                )
                                                .getAttribute("content");
                                            const id =
                                                detail?.cycle?.cycle_id ||
                                                detail?.cycle_id;
                                            const res = await fetch(`/cycles/${id}`, {
                                                method: "DELETE",
                                                headers: {
                                                    "X-CSRF-TOKEN": token,
                                                    Accept: "application/json",
                                                },
                                            });
                                            const json = await res
                                                .json()
                                                .catch(() => ({ success: res.ok }));
                                            if (!res.ok || json.success === false)
                                                throw new Error(
                                                    json.message ||
                                                        "Xóa chu kỳ thất bại"
                                                );
                                            setCycles((prev) =>
                                                prev.filter(
                                                    (c) =>
                                                        String(c.cycle_id || c.id) !==
                                                        String(id)
                                                )
                                            );
                                            setToast({
                                                type: "success",
                                                message: "Đã xóa chu kỳ",
                                            });
                                            goBack();
                                        } catch (e) {
                                            setToast({
                                                type: "error",
                                                message:
                                                    e.message || "Xóa chu kỳ thất bại",
                                            });
                                        }
                                    }}
                                    className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                    Xóa
                                </button>
                            </>
                        </AdminOnly>
                        <button
                            onClick={goBack}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Quay lại
                        </button>
                    </div>
                ) : (
                    <AdminOnly permission="canManageCycles">
                        <button
                            onClick={() => setOpen(true)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                        >
                            Tạo mới
                        </button>
                    </AdminOnly>
                )}
            </div>
            {editOpen && (
                <Modal
                    open={true}
                    onClose={() => setEditOpen(false)}
                    title="Sửa chu kỳ"
                >
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const token = document
                                    .querySelector('meta[name="csrf-token"]')
                                    .getAttribute("content");
                                const id =
                                    detail?.cycle?.cycle_id || detail?.cycle_id;
                                const currentCycle = detail?.cycle || detail;

                                // Chỉ gửi các field thay đổi
                                const body = {};
                                const newValues = {
                                    cycle_name:
                                        e.target.cycle_name.value.trim(),
                                    start_date:
                                        e.target.start_date.value.trim(),
                                    end_date: e.target.end_date.value.trim(),
                                    status: e.target.status.value,
                                    description:
                                        e.target.description.value.trim(),
                                };

                                // Chuẩn hóa định dạng ngày để so sánh
                                const normalizeDate = (dateStr) => {
                                    if (!dateStr) return "";
                                    // Nếu đã là định dạng ISO (yyyy-MM-dd), giữ nguyên
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
                                        return dateStr;
                                    // Nếu là định dạng dd/MM/yyyy, convert sang ISO
                                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                                        const [day, month, year] =
                                            dateStr.split("/");
                                        return `${year}-${month}-${day}`;
                                    }
                                    // Thử parse bằng Date constructor
                                    const date = new Date(dateStr);
                                    if (!isNaN(date.getTime())) {
                                        const year = date.getFullYear();
                                        const month = String(
                                            date.getMonth() + 1
                                        ).padStart(2, "0");
                                        const day = String(
                                            date.getDate()
                                        ).padStart(2, "0");
                                        return `${year}-${month}-${day}`;
                                    }
                                    return dateStr;
                                };

                                // Validate ngày chỉ khi có giá trị và khác với giá trị hiện tại
                                const normalizedStartDate = normalizeDate(
                                    newValues.start_date
                                );
                                const normalizedCurrentStartDate =
                                    normalizeDate(currentCycle.start_date);

                                const normalizedEndDate = normalizeDate(
                                    newValues.end_date
                                );
                                const normalizedCurrentEndDate = normalizeDate(
                                    currentCycle.end_date
                                );

                                if (
                                    normalizedStartDate &&
                                    normalizedStartDate !==
                                        normalizedCurrentStartDate
                                ) {
                                    const startDate = new Date(
                                        normalizedStartDate
                                    );
                                    if (isNaN(startDate.getTime())) {
                                        throw new Error(
                                            "Ngày bắt đầu không hợp lệ"
                                        );
                                    }
                                }

                                if (
                                    normalizedEndDate &&
                                    normalizedEndDate !==
                                        normalizedCurrentEndDate
                                ) {
                                    const endDate = new Date(normalizedEndDate);
                                    if (isNaN(endDate.getTime())) {
                                        throw new Error(
                                            "Ngày kết thúc không hợp lệ"
                                        );
                                    }
                                }

                                // So sánh với giá trị hiện tại và chỉ thêm vào body nếu khác
                                Object.keys(newValues).forEach((key) => {
                                    let currentValue = currentCycle[key];
                                    let newValue = newValues[key];

                                    // Đối với các trường ngày, sử dụng giá trị đã chuẩn hóa
                                    if (key === "start_date") {
                                        currentValue =
                                            normalizedCurrentStartDate;
                                        newValue = normalizedStartDate;
                                    } else if (key === "end_date") {
                                        currentValue = normalizedCurrentEndDate;
                                        newValue = normalizedEndDate;
                                    }

                                    // Đối với status luôn gửi nếu khác, đối với các trường khác chỉ gửi nếu có giá trị
                                    if (key === "status") {
                                        if (newValue !== currentValue) {
                                            body[key] = newValue;
                                        }
                                    } else {
                                        // Chỉ thêm vào body nếu có giá trị mới và khác với giá trị hiện tại
                                        if (
                                            newValue &&
                                            newValue !== currentValue
                                        ) {
                                            body[key] = newValue;
                                        }
                                    }
                                });

                                // Nếu không có field nào thay đổi, không gửi request
                                if (Object.keys(body).length === 0) {
                                    setToast({
                                        type: "info",
                                        message: "Không có thay đổi nào để lưu",
                                    });
                                    setEditOpen(false);
                                    return;
                                }

                                const res = await fetch(`/cycles/${id}`, {
                                    method: "PUT",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "X-CSRF-TOKEN": token,
                                        Accept: "application/json",
                                    },
                                    body: JSON.stringify(body),
                                });
                                const json = await res
                                    .json()
                                    .catch(() => ({ success: false }));
                                if (!res.ok || json.success === false)
                                    throw new Error(
                                        json.message ||
                                            "Cập nhật chu kỳ thất bại"
                                    );
                                const updated = json.data || {
                                    ...currentCycle,
                                    ...body,
                                };
                                setDetail((prev) => ({
                                    ...(prev || {}),
                                    cycle: updated.cycle
                                        ? updated.cycle
                                        : updated,
                                }));
                                setCycles((prev) =>
                                    prev.map((c) =>
                                        String(c.cycle_id || c.id) ===
                                        String(updated.cycle_id || updated.id)
                                            ? { ...c, ...updated }
                                            : c
                                    )
                                );
                                setEditOpen(false);
                                setToast({
                                    type: "success",
                                    message: "Cập nhật chu kỳ thành công",
                                });
                            } catch (err) {
                                setToast({
                                    type: "error",
                                    message:
                                        err.message ||
                                        "Cập nhật chu kỳ thất bại",
                                });
                            }
                        }}
                        className="space-y-3"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Tên chu kỳ
                            </label>
                            <input
                                name="cycle_name"
                                defaultValue={detail.cycle?.cycle_name}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Ngày bắt đầu
                                </label>
                                <DateInputComponent
                                    name="start_date"
                                    defaultValue={toInputDate(
                                        detail.cycle?.start_date ||
                                            detail?.start_date
                                    )}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Ngày kết thúc
                                </label>
                                <DateInputComponent
                                    name="end_date"
                                    defaultValue={toInputDate(
                                        detail.cycle?.end_date ||
                                            detail?.end_date
                                    )}
                                />
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Trạng thái
                                </label>
                                <select
                                    name="status"
                                    defaultValue={
                                        detail.cycle?.status || "active"
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Mô tả
                                </label>
                                <textarea
                                    name="description"
                                    defaultValue={
                                        detail.cycle?.description || ""
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditOpen(false)}
                                className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                            >
                                Lưu
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
            {isDetail && detail && (
                <div className="mx-auto mb-6 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                        <h2 className="text-xl font-extrabold text-slate-900">
                            {detail.cycle?.cycle_name}
                        </h2>
                    </div>
                    <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                        <div>
                            <div className="text-xs font-semibold text-slate-500">
                                Ngày bắt đầu:
                            </div>
                            <div className="text-sm text-slate-800">
                                {formatDMY(detail.cycle?.start_date)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500">
                                Ngày kết thúc:
                            </div>
                            <div className="text-sm text-slate-800">
                                {formatDMY(detail.cycle?.end_date)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500">
                                Mô tả:
                            </div>
                            <div className="text-sm text-slate-800">
                                {detail.cycle?.description || "—"}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500">
                                Trạng thái:
                            </div>
                            <div className="text-sm text-slate-800">
                                {detail.cycle?.status === "active"
                                    ? "Active"
                                    : "Inactive"}
                            </div>
                        </div>
                    </div>
                    <AdminOnly permission="canManageCycles">
                        <div className="px-6 pb-4">
                            <button
                                onClick={() => setOpenCreateObjective(true)}
                                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                Thêm Objective
                            </button>
                        </div>
                    </AdminOnly>
                    {(detail.objectives || []).map((obj) => (
                        <div
                            key={obj.objective_id}
                            className="border-t border-slate-200 px-6 py-4"
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() =>
                                        setOpenObj((prev) => ({
                                            ...prev,
                                            [obj.objective_id]:
                                                !prev[obj.objective_id],
                                        }))
                                    }
                                    className="flex items-center gap-3 text-left"
                                >
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">
                                        {(obj.obj_title || "T")[0]}
                                    </span>
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {obj.obj_title ||
                                                obj.objective_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {obj.level || ""}
                                        </div>
                                    </div>
                                </button>
                                <AdminOnly permission="canManageCycles">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                setOpenCreateKRForObjId(
                                                    obj.objective_id
                                                )
                                            }
                                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                                        >
                                            Thêm KR
                                        </button>
                                    </div>
                                </AdminOnly>
                            </div>
                            {openObj[obj.objective_id] !== false && (
                                <div className="mt-3 space-y-3">
                                    {(krs[obj.objective_id] || []).map((kr) => (
                                        <div
                                            key={kr.kr_id || kr.id}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                                        >
                                            <div className="text-sm font-semibold text-slate-900">
                                                {kr.kr_title}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {kr.status || "in progress"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {!isDetail && (
                <>
                    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {loading && (
                            <div className="px-4 py-6 text-center text-slate-500">
                                Đang tải...
                            </div>
                        )}
                        {!loading && (
                            <div className="divide-y divide-slate-100">
                                {cycles.map((c) => {
                                    const id = c.cycle_id || c.id;
                                    const active = c.status === "active";
                                    return (
                                        <div key={id} className="px-4 py-3">
                                            <button
                                                onClick={() => goDetail(id)}
                                                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                                            >
                                                <div className="font-semibold text-slate-900">
                                                    {c.cycle_name}
                                                </div>
                                                {active ? (
                                                    <Badge color="emerald">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge color="red">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <NewCycleModal
                        open={open}
                        onClose={() => setOpen(false)}
                        onCreated={(cy) => {
                            setCycles((prev) => sortByStartDesc([cy, ...prev]));
                            setToast({
                                type: "success",
                                message: "Tạo chu kỳ thành công",
                            });
                        }}
                    />
                </>
            )}

            {/* Modal tạo Objective mới trong chu kỳ hiện tại */}
            {isDetail && openCreateObjective && (
                <Modal
                    open={true}
                    onClose={() => setOpenCreateObjective(false)}
                    title="Tạo Objective mới"
                >
                    <div className="max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 rounded-lg">
                        <ObjectiveCreateForm
                            cycleId={
                                detail?.cycle?.cycle_id || detail?.cycle_id
                            }
                            onCreated={(objective) => {
                                setToast({
                                    type: "success",
                                    message: "Tạo Objective thành công",
                                });
                                const objId =
                                    objective?.objective_id || objective?.id;
                                const krList =
                                    objective?.keyResults ||
                                    objective?.key_results ||
                                    [];
                                // Cập nhật danh sách KR map để hiển thị ngay
                                if (objId) {
                                    setKrs((prev) => ({
                                        ...prev,
                                        [objId]: krList,
                                    }));
                                }
                                // Thêm objective vào danh sách hiện tại, giữ nguyên KR trong card
                                setDetail((prev) => ({
                                    ...prev,
                                    objectives: [
                                        ...(prev?.objectives || []),
                                        { ...objective },
                                    ],
                                }));
                                setOpenCreateObjective(false);
                            }}
                            onError={(msg) =>
                                setToast({
                                    type: "error",
                                    message: msg || "Tạo Objective thất bại",
                                })
                            }
                        />
                    </div>
                </Modal>
            )}

            {/* Modal tạo KR cho một Objective */}
            {isDetail && openCreateKRForObjId && (
                <Modal
                    open={true}
                    onClose={() => setOpenCreateKRForObjId(null)}
                    title="Tạo Key Result"
                >
                    <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 rounded-lg">
                        <KeyResultCreateForm
                            objectiveId={openCreateKRForObjId}
                            onCreated={(kr) => {
                                setToast({
                                    type: "success",
                                    message: "Tạo Key Result thành công",
                                });
                                setKrs((prev) => ({
                                    ...prev,
                                    [openCreateKRForObjId]: [
                                        kr,
                                        ...(prev[openCreateKRForObjId] || []),
                                    ],
                                }));
                                setOpenCreateKRForObjId(null);
                            }}
                            onError={(msg) =>
                                setToast({
                                    type: "error",
                                    message: msg || "Tạo Key Result thất bại",
                                })
                            }
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}

function ObjectiveCreateForm({ cycleId, onCreated, onError }) {
    const [objTitle, setObjTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("draft");
    const [level, setLevel] = useState("company");
    const [departmentId, setDepartmentId] = useState("");
    const [departments, setDepartments] = useState([]);
    const [keyResults, setKeyResults] = useState([
        {
            kr_title: "",
            target_value: "",
            current_value: "",
            unit: "number",
            status: "draft",
        },
    ]);
    const [submitting, setSubmitting] = useState(false);

    // Try to load departments for dropdown; gracefully degrade to text input
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/departments", {
                    headers: { Accept: "application/json" },
                });
                const data = await res.json();
                const list = Array.isArray(data?.data)
                    ? data.data
                    : Array.isArray(data)
                    ? data
                    : [];
                if (Array.isArray(list) && list.length) setDepartments(list);
            } catch (e) {
                /* fallback to manual input */
            }
        })();
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const payload = {
                obj_title: objTitle.trim(),
                description: description.trim() || null,
                status,
                progress_percent: 0,
                level,
                cycle_id: cycleId,
                parent_key_result_id: null,
                ...(level !== "company"
                    ? { department_id: departmentId || undefined }
                    : {}),
                key_results: keyResults.map((kr) => ({
                    kr_title: kr.kr_title.trim(),
                    target_value: Number(kr.target_value || 0),
                    current_value: Number(kr.current_value || 0),
                    unit: String(kr.unit || "number"),
                    status: kr.status || "draft",
                })),
            };
            const res = await fetch("/my-objectives/store", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({ success: false }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Tạo Objective thất bại");
            onCreated && onCreated(json.data || {});
        } catch (err) {
            onError && onError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const updateKR = (i, patch) => {
        setKeyResults((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item))
        );
    };
    const addKR = () =>
        setKeyResults((prev) => [
            ...prev,
            {
                kr_title: "",
                target_value: "",
                current_value: "",
                unit: "number",
                status: "draft",
            },
        ]);
    const removeKR = (i) =>
        setKeyResults((prev) => prev.filter((_, idx) => idx !== i));

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Tiêu đề Objective
                </label>
                <input
                    value={objTitle}
                    onChange={(e) => setObjTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>
            {/* Cấp mặc định: Công ty (không cho chọn). Hiển thị input giống chiều rộng tiêu đề */}
            <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Cấp
                </label>
                <input
                    value="Công ty"
                    disabled
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-slate-600"
                />
                <input type="hidden" name="level" value={level} />
            </div>
            <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Mô tả
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-20 w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Key Results
                </label>
                <div className="space-y-3">
                    {keyResults.map((kr, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border border-slate-200 p-3"
                        >
                            {/* Row 1: Title full width */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Tiêu đề KR
                                </label>
                                <input
                                    value={kr.kr_title}
                                    onChange={(e) =>
                                        updateKR(idx, {
                                            kr_title: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    required
                                />
                            </div>
                            {/* Rows 2-3: 2x2 layout for Unit/Target and Current/Status */}
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Đơn vị
                                    </label>
                                    <input
                                        value={kr.unit}
                                        onChange={(e) =>
                                            updateKR(idx, {
                                                unit: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Mục tiêu
                                    </label>
                                    <input
                                        type="number"
                                        value={kr.target_value}
                                        onChange={(e) =>
                                            updateKR(idx, {
                                                target_value: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Hiện tại
                                    </label>
                                    <input
                                        type="number"
                                        value={kr.current_value}
                                        onChange={(e) =>
                                            updateKR(idx, {
                                                current_value: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={kr.status}
                                        onChange={(e) =>
                                            updateKR(idx, {
                                                status: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                    >
                                        <option value="draft">Bản nháp</option>
                                        <option value="active">
                                            Đang thực hiện
                                        </option>
                                        <option value="completed">
                                            Hoàn thành
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => removeKR(idx)}
                                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={addKR}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                        Thêm KR
                    </button>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={() => {
                        /* parent modal closes outside */
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                >
                    Đóng
                </button>
                <button
                    disabled={submitting}
                    type="submit"
                    className="rounded-md bg-emerald-600 px-5 py-2 text-xs font-semibold text-white"
                >
                    {submitting ? "Đang lưu..." : "Lưu Objective"}
                </button>
            </div>
        </form>
    );
}

function KeyResultCreateForm({ objectiveId, onCreated, onError }) {
    const [form, setForm] = useState({
        kr_title: "",
        target_value: "",
        current_value: "",
        unit: "number",
        status: "draft",
        department_id: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [departments, setDepartments] = useState([]);
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/departments", {
                    headers: { Accept: "application/json" },
                });
                const j = await r.json();
                const list = Array.isArray(j?.data)
                    ? j.data
                    : Array.isArray(j)
                    ? j
                    : [];
                if (Array.isArray(list)) setDepartments(list);
            } catch (e) {}
        })();
    }, []);
    const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const submit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const payload = {
                ...form,
                objective_id: objectiveId,
                department_id: form.department_id || undefined,
            };
            const res = await fetch("/my-key-results/store", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({ success: false }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Tạo Key Result thất bại");
            onCreated && onCreated(json.data || {});
        } catch (err) {
            onError && onError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Tiêu đề
                </label>
                <input
                    value={form.kr_title}
                    onChange={(e) => set({ kr_title: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Đơn vị
                    </label>
                    <input
                        value={form.unit}
                        onChange={(e) => set({ unit: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Trạng thái
                    </label>
                    <select
                        value={form.status}
                        onChange={(e) => set({ status: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-3 py-2 outline-none"
                    >
                        <option value="draft">Bản nháp</option>
                        <option value="active">Đang thực hiện</option>
                        <option value="completed">Hoàn thành</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Phòng ban
                    </label>
                    {departments.length > 0 ? (
                        <select
                            value={form.department_id}
                            onChange={(e) =>
                                set({ department_id: e.target.value })
                            }
                            className="w-full rounded-2xl border border-slate-300 px-3 py-2 outline-none"
                        >
                            <option value="">Chọn phòng ban</option>
                            {departments.map((d) => (
                                <option
                                    key={d.department_id || d.id}
                                    value={d.department_id || d.id}
                                >
                                    {d.d_name ||
                                        d.name ||
                                        `#${d.department_id || d.id}`}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            value={form.department_id}
                            onChange={(e) =>
                                set({ department_id: e.target.value })
                            }
                            placeholder="ID phòng ban (tuỳ chọn)"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none"
                        />
                    )}
                </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Mục tiêu
                    </label>
                    <input
                        type="number"
                        value={form.target_value}
                        onChange={(e) => set({ target_value: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Hiện tại
                    </label>
                    <input
                        type="number"
                        value={form.current_value}
                        onChange={(e) => set({ current_value: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-2 outline-none"
                        required
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={() => {
                        /* parent modal closes outside */
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                >
                    Đóng
                </button>
                <button
                    disabled={submitting}
                    type="submit"
                    className="rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white"
                >
                    {submitting ? "Đang lưu..." : "Lưu Key Result"}
                </button>
            </div>
        </form>
    );
}
