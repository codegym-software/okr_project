import React from "react";
import { Modal } from "../components/ui";

export default function KeyResultModal({
    editingKR,
    creatingFor,
    departments,
    cyclesList,
    setEditingKR,
    setCreatingFor,
    setItems,
    setToast,
}) {
    const saveKr = async (kr) => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const computed =
                Number(kr.target_value) > 0
                    ? (Number(kr.current_value) / Number(kr.target_value)) * 100
                    : 0;
            const payload = {
                ...kr,
                cycle_id: kr.cycle_id,
                progress_percent: Number.isFinite(computed)
                    ? Number(computed.toFixed(2))
                    : 0,
            };
            const res = await fetch(
                `/my-key-results/update/${kr.objective_id}/${kr.kr_id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );
            const json = await res.json().catch(() => ({
                success: false,
                message: "Cập nhật thất bại",
            }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Cập nhật thất bại");
            const serverKR = json.data || {};
            const enriched = { ...kr, ...serverKR };
            setItems((prev) => {
                const merged = prev.map((o) =>
                    o.objective_id === kr.objective_id
                        ? {
                              ...o,
                              key_results: (o.key_results || []).map((x) =>
                                  x.kr_id === kr.kr_id ? enriched : x
                              ),
                          }
                        : o
                );
                try { localStorage.setItem('my_objectives', JSON.stringify(merged)); } catch {}
                return merged;
            });
            setEditingKR(null);
            setToast({
                type: "success",
                message: "Cập nhật Key Result thành công",
            });
        } catch (e) {
            setToast({
                type: "error",
                message: e.message || "Cập nhật thất bại",
            });
        }
    };

    const handleDeleteKR = async (kr) => {
        // Xác nhận trước khi xóa
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa Key Result "${kr.kr_title}"?\n\nHành động này không thể hoàn tác.`
        );
        
        if (!confirmed) {
            return;
        }

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            const res = await fetch(
                `/my-key-results/destroy/${kr.objective_id}/${kr.kr_id}`,
                {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-TOKEN": token,
                        Accept: "application/json",
                    },
                }
            );
            const json = await res.json().catch(() => ({ success: res.ok }));
            if (!res.ok || json.success === false)
                throw new Error(json.message || "Xóa Key Result thất bại");
            setItems((prev) => {
                const merged = prev.map((o) =>
                    o.objective_id === kr.objective_id
                        ? {
                              ...o,
                              key_results: (o.key_results || []).filter(
                                  (x) => x.kr_id !== kr.kr_id
                              ),
                          }
                        : o
                );
                try { localStorage.setItem('my_objectives', JSON.stringify(merged)); } catch {}
                return merged;
            });
            setEditingKR(null);
            setToast({ type: "success", message: "Đã xóa Key Result thành công" });
        } catch (err) {
            setToast({
                type: "error",
                message: err.message || "Xóa Key Result thất bại",
            });
        }
    };

    return (
        <Modal
            open={editingKR || creatingFor}
            onClose={() =>
                editingKR ? setEditingKR(null) : setCreatingFor(null)
            }
            title={editingKR ? "Sửa Key Result" : "Thêm Key Result"}
        >
            {editingKR ? (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.target;
                        const updated = {
                            ...editingKR,
                            kr_title: form.kr_title.value,
                            target_value: Number(form.target_value.value),
                            current_value: Number(form.current_value.value),
                            unit: form.unit.value,
                            status: form.status.value,
                            cycle_id: editingKR.cycle_id, // Giữ nguyên cycle_id từ KR hiện tại
                        };
                        await saveKr(updated);
                    }}
                    className="space-y-3"
                >
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Tiêu đề
                        </label>
                        <input
                            defaultValue={editingKR.kr_title}
                            name="kr_title"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            required
                        />
                    </div>
                    {/* Trạng thái và đơn vị - 1 hàng */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Trạng thái
                            </label>
                            <select
                                defaultValue={editingKR.status || ""}
                                name="status"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            >
                                <option value="">-- chọn trạng thái --</option>
                                <option value="draft">Bản nháp</option>
                                <option value="active">Đang thực hiện</option>
                                <option value="completed">Hoàn thành</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Đơn vị
                            </label>
                            <select
                                defaultValue={editingKR.unit}
                                name="unit"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            >
                                <option value="">-- chọn đơn vị --</option>
                                <option value="number">Số lượng</option>
                                <option value="percent">Phần trăm</option>
                                <option value="completion">Hoàn thành</option>
                                <option value="bai">Bài</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Mục tiêu và Thực tế - 1 hàng */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Mục tiêu
                            </label>
                            <input
                                defaultValue={editingKR.target_value}
                                name="target_value"
                                type="number"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Thực tế
                            </label>
                            <input
                                defaultValue={editingKR.current_value}
                                name="current_value"
                                type="number"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => handleDeleteKR(editingKR)}
                            className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                        >
                            Xóa
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingKR(null)}
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
                    </div>
                </form>
            ) : (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                            const token = document
                                .querySelector('meta[name="csrf-token"]')
                                .getAttribute("content");
                            const body = {
                                kr_title: e.target.kr_title.value,
                                target_value: Number(
                                    e.target.target_value.value || 0
                                ),
                                current_value: Number(
                                    e.target.current_value.value || 0
                                ),
                                unit: e.target.unit.value || "",
                                status: e.target.status.value || "",
                                cycle_id: e.target.cycle_id.value || creatingFor.cycle_id,
                            };
                            const res = await fetch(`/my-key-results/store`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-CSRF-TOKEN": token,
                                    Accept: "application/json",
                                },
                                body: JSON.stringify({
                                    ...body,
                                    objective_id: creatingFor.objective_id,
                                }),
                            });
                            const json = await res.json();
                            if (!res.ok || json.success === false)
                                throw new Error(json.message || "Tạo thất bại");
                            const newKR = json.data;
                            setItems((prev) => {
                                const merged = prev.map((o) =>
                                    o.objective_id === creatingFor.objective_id
                                        ? {
                                              ...o,
                                              key_results: [
                                                  ...(o.key_results || []),
                                                  newKR,
                                              ],
                                          }
                                        : o
                                );
                                try { localStorage.setItem('my_objectives', JSON.stringify(merged)); } catch {}
                                return merged;
                            });
                            setCreatingFor(null);
                            setToast({
                                type: "success",
                                message: "Tạo Key Result thành công",
                            });
                        } catch (err) {
                            setToast({
                                type: "error",
                                message: err.message || "Tạo thất bại",
                            });
                        }
                    }}
                    className="space-y-3"
                >
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Tiêu đề
                        </label>
                        <input
                            name="kr_title"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            required
                        />
                    </div>
                    
                    {/* Chu kỳ và Trạng thái - 1 hàng */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Chu kỳ
                            </label>
                            <select
                                name="cycle_id"
                                defaultValue={creatingFor?.cycle_id || ""}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            >
                                <option value="">-- chọn chu kỳ --</option>
                                {cyclesList.map((cycle) => (
                                    <option key={cycle.cycle_id} value={cycle.cycle_id}>
                                        {cycle.cycle_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Trạng thái
                            </label>
                            <select
                                name="status"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            >
                                <option value="">-- chọn trạng thái --</option>
                                <option value="draft">Bản nháp</option>
                                <option value="active">Đang thực hiện</option>
                                <option value="completed">Hoàn thành</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Đơn vị */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Đơn vị
                        </label>
                        <select
                            name="unit"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            required
                        >
                            <option value="">-- chọn đơn vị --</option>
                            <option value="number">Số lượng</option>
                            <option value="percent">Phần trăm</option>
                            <option value="completion">Hoàn thành</option>
                            <option value="bai">Bài</option>
                        </select>
                    </div>
                    
                    {/* Mục tiêu và Thực tế - 1 hàng */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Mục tiêu
                            </label>
                            <input
                                name="target_value"
                                type="number"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Thực tế
                            </label>
                            <input
                                name="current_value"
                                type="number"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setCreatingFor(null)}
                            className="rounded-md border border-slate-300 px-4 py-2 text-xs"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                        >
                            Tạo
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
