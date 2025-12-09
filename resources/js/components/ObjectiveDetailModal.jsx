import React from "react";
import { Modal } from "./ui";

export default function ObjectiveDetailModal({ objective, onClose }) {
    if (!objective) return null;

    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(1)}%` : "0%";
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "Bản nháp";
            case "active":
                return "Đang thực hiện";
            case "completed":
                return "Hoàn thành";
            default:
                return status || "";
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "completed":
                return "bg-emerald-100 text-emerald-700";
            case "active":
                return "bg-blue-100 text-blue-700";
            case "draft":
                return "bg-slate-100 text-slate-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const getUnitText = (unit) => {
        switch (unit?.toLowerCase()) {
            case "number":
                return "Số lượng";
            case "percent":
                return "Phần trăm";
            case "completion":
                return "Hoàn thành";
            default:
                return unit || "";
        }
    };

    const getLevelText = (level) => {
        switch (level?.toLowerCase()) {
            case "company":
                return "Công ty";
            case "unit":
                return "Phòng ban";
            case "person":
                return "Cá nhân";
            case "team":
                return "Đội nhóm";
            default:
                return level || "";
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={`Chi tiết OKR: ${objective.obj_title || "Không có tiêu đề"}`}
        >
            <div className="space-y-6">
                {/* Thông tin cơ bản */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                        Thông tin cơ bản
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Cấp độ:</span>
                            <span className="text-sm font-medium text-slate-900">
                                {getLevelText(objective.level)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Trạng thái:</span>
                            <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${getStatusColor(
                                    objective.status
                                )}`}
                            >
                                {getStatusText(objective.status)}
                            </span>
                        </div>
                        {objective.description && (
                            <div>
                                <span className="text-sm text-slate-600 block mb-1">
                                    Mô tả:
                                </span>
                                <p className="text-sm text-slate-900 bg-white p-3 rounded border border-slate-200">
                                    {objective.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Key Results */}
                {objective.key_results && objective.key_results.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">
                            Key Results ({objective.key_results.length})
                        </h3>
                        <div className="space-y-3">
                            {objective.key_results.map((kr) => (
                                <div
                                    key={kr.kr_id}
                                    className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-slate-900 flex-1">
                                            {kr.kr_title}
                                        </h4>
                                        <span
                                            className={`ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${getStatusColor(
                                                kr.status
                                            )}`}
                                        >
                                            {getStatusText(kr.status)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                        <div>
                                            <span className="text-slate-600">Mục tiêu:</span>
                                            <span className="ml-2 font-medium text-slate-900">
                                                {kr.target_value} {getUnitText(kr.unit)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-600">Thực tế:</span>
                                            <span className="ml-2 font-medium text-slate-900">
                                                {kr.current_value} {getUnitText(kr.unit)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-600">Tiến độ:</span>
                                            <span className="ml-2 font-medium text-slate-900">
                                                {formatPercent(kr.progress_percent)}
                                            </span>
                                        </div>
                                        {kr.assigned_user && (
                                            <div>
                                                <span className="text-slate-600">Người thực hiện:</span>
                                                <span className="ml-2 font-medium text-slate-900">
                                                    {kr.assigned_user.full_name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="mt-3">
                                        <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden border border-slate-200">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-300 ${
                                                    kr.status === "completed"
                                                        ? "bg-emerald-600"
                                                        : kr.status === "active"
                                                        ? "bg-blue-600"
                                                        : "bg-slate-500"
                                                }`}
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        Math.max(0, kr.progress_percent || 0)
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(!objective.key_results || objective.key_results.length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                        Chưa có Key Results nào.
                    </div>
                )}
            </div>
        </Modal>
    );
}

