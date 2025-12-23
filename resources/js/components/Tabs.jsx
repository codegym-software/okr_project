import React from "react";

const Tabs = ({ setCreatingObjective, isCycleClosed = false }) => {
  return (
    <div className="flex items-center">
      <button
        onClick={() => {
          if (!isCycleClosed) {
            setCreatingObjective(true);
          }
        }}
        disabled={isCycleClosed}
        className={`ml-4 px-5 py-2.5 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-200 ${
          isCycleClosed
            ? 'bg-gray-400 cursor-not-allowed opacity-60'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
        title={isCycleClosed ? 'Chu kỳ đã đóng, không thể thêm Objective' : 'Thêm Objective'}
      >
        Thêm Objective
      </button>
    </div>
  );
};

export default Tabs;