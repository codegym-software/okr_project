import React from "react";
import { Modal } from "./ui"; // Giả sử bạn có component Modal chung từ './ui' giống như CheckInModal

export default function AssignKeyResultModal({
    show,
    kr,
    objective,
    email,
    setEmail,
    loading,
    onConfirm,
    onClose,
}) {
    if (!show) return null;

    return (
        <Modal open={show} onClose={onClose} title="Giao Key Result">
            <div className="space-y-4">
                <div className="mb-4">
                    <p className="text-sm text-slate-700 font-medium">
                        {kr.kr_title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Objective: {objective.obj_title}
                    </p>
                </div>

                <input
                    type="email"
                    placeholder="Nhập email người nhận"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                />

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading || !email.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="opacity-25"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8z"
                                        className="opacity-75"
                                    />
                                </svg>
                                Đang giao...
                            </>
                        ) : (
                            "Giao việc"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
