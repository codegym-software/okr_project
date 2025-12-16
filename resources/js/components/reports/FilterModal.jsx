import React from 'react';
import Modal from '../Modal'; // Assuming a generic Modal component exists
import Select from 'react-select';

export default function FilterModal({ isOpen, onClose, filters, setFilters, allDepartments }) {
    if (!isOpen) return null;

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const departmentOptions = [
        { value: '', label: 'Tất cả Phòng ban' },
        ...(allDepartments || []).map(dept => ({
            value: dept.department_id,
            label: dept.d_name
        }))
    ];

    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            minHeight: '38px',
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#2563eb' : (state.isFocused ? '#eff6ff' : 'white'),
            color: state.isSelected ? 'white' : 'black',
        }),
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bộ lọc báo cáo">
            <div className="p-6 space-y-4">
                {/* Objective Level Filter */}
                <div>
                    <label htmlFor="objective-level-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Cấp độ Mục tiêu
                    </label>
                    <select
                        id="objective-level-filter"
                        value={filters.objectiveLevel}
                        onChange={(e) => handleFilterChange('objectiveLevel', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Toàn Công ty</option>
                        <option value="department">Phòng ban</option>
                        <option value="individual">Cá nhân</option>
                    </select>
                </div>

                {/* Department Filter */}
                <div>
                    <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Phòng ban
                    </label>
                    <Select
                        id="department-filter"
                        options={departmentOptions}
                        value={departmentOptions.find(opt => opt.value === filters.departmentId) || departmentOptions[0]}
                        onChange={(selected) => handleFilterChange('departmentId', selected.value)}
                        styles={customSelectStyles}
                        placeholder="Tìm kiếm phòng ban..."
                    />
                </div>

                {/* Date Range Filter */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Từ ngày
                        </label>
                        <input
                            type="date"
                            id="start-date-filter"
                            value={filters.dateRange.start || ''}
                            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Đến ngày
                        </label>
                        <input
                            type="date"
                            id="end-date-filter"
                            value={filters.dateRange.end || ''}
                            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={onClose}
                >
                    Đóng
                </button>
            </div>
        </Modal>
    );
}
