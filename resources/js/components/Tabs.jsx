import React from "react";

const Tabs = ({ showArchived, setShowArchived, setCreatingObjective }) => {
    return (
        <div className="flex items-center gap-3">
            <div className="flex rounded-md border border-slate-300 overflow-hidden">
                <button
                    onClick={() => setShowArchived(false)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                        !showArchived
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                    Hoạt động
                </button>
                <button
                    onClick={() => setShowArchived(true)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                        showArchived
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                    Lưu trữ
                </button>
            </div>

            <button
                onClick={() => setCreatingObjective(true)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
                + Thêm Objective
            </button>
        </div>
    );
};

export default Tabs;
