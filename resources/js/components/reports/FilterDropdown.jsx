import React from 'react';
import Select from 'react-select';

// Note: This component is designed to be placed inside a <Dropdown> component.
export default function FilterDropdown({ filters, setFilters, allDepartments, onClose }) {

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            // Keep cycleId, clear the rest
            cycleId: filters.cycleId,
            departmentId: '',
            objectiveLevel: 'all',
            dateRange: { start: null, end: null },
        });
        if (onClose) onClose();
    };

    const departmentOptions = [
        { value: '', label: 'Tất cả Phòng ban' },
        ...(allDepartments || []).map(dept => ({
            value: dept.department_id,
            label: dept.d_name
        }))
    ];

    const levelOptions = [
        { value: 'all', label: 'Toàn bộ cấp độ' },
        { value: 'company', label: 'Công ty' },
        { value: 'department', label: 'Phòng ban' },
        { value: 'individual', label: 'Cá nhân' },
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
        <div className="p-4 space-y-4 w-80">
            <div>
                <label htmlFor="objective-level-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Cấp độ Mục tiêu
                </label>
                <Select
                    id="objective-level-filter"
                    options={levelOptions}
                    value={levelOptions.find(opt => opt.value === filters.objectiveLevel) || levelOptions[0]}
                    onChange={(selected) => handleFilterChange('objectiveLevel', selected.value)}
                    styles={customSelectStyles}
                />
            </div>

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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="pt-2 flex justify-between items-center">
                 <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={clearFilters}
                >
                    Xóa bộ lọc
                </button>
                <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
                    onClick={onClose}
                >
                    Xem
                </button>
            </div>
        </div>
    );
}
