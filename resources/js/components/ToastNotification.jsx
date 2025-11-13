import React from "react";

const ToastNotification = ({ toast }) => {
    return (
        toast && (
            <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 duration-300">
                <div
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm transition-all ${
                        toast.type === "success"
                            ? "bg-emerald-600"
                            : "bg-red-600"
                    }`}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {toast.type === "success" ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        )}
                    </svg>
                    <span>{toast.message}</span>
                </div>
            </div>
        )
    );
};

export default ToastNotification;
