// src/components/DepartmentDropdown.jsx
import React from "react";

export function DepartmentDropdown({
    departments,
    departmentFilter,
    handleDepartmentChange,
    dropdownOpen,
    setDropdownOpen,
    selectedLabel,
}) {
    return (
        <div className="relative">
            <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <span>{selectedLabel || "Tất cả phòng ban"}</span>
                <svg
                    className={`w-5 h-5 ml-2 -mr-1 transition-transform duration-200 ${
                        dropdownOpen ? "transform rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
            {dropdownOpen && (
                <div className="absolute right-0 w-56 mt-2 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        <button
                            onClick={() => {
                                handleDepartmentChange(null);
                                setDropdownOpen(false);
                            }}
                            className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        >
                            Tất cả phòng ban
                        </button>
                        {departments.map((dept) => (
                            <button
                                key={dept.department_id}
                                onClick={() => {
                                    handleDepartmentChange(dept.department_id);
                                    setDropdownOpen(false);
                                }}
                                className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                            >
                                {dept.department_name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
