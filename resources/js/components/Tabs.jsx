import React from "react";

const Tabs = ({ showArchived, setShowArchived, setCreatingObjective }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Tab Hoạt động */}
      <button
        onClick={() => setShowArchived(false)}
        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
          !showArchived
            ? "bg-blue-600 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        Hoạt động
      </button>

      {/* Tab Lưu trữ */}
      <button
        onClick={() => setShowArchived(true)}
        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
          showArchived
            ? "bg-blue-600 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        Lưu trữ
      </button>

      {/* Nút Thêm Objective */}
      <button
        onClick={() => setCreatingObjective(true)}
        className="ml-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-all duration-200 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Thêm Objective
      </button>
    </div>
  );
};

export default Tabs;