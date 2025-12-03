import React from "react";

const Tabs = ({ setCreatingObjective }) => {
  return (
    <div className="flex items-center">
      <button
        onClick={() => setCreatingObjective(true)}
        className="ml-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-all duration-200"
      >
        Thêm Objective
      </button>
    </div>
  );
};

export default Tabs;