import React, { useState } from 'react';
import PerformanceDataRow from './PerformanceDataRow';
import EmptyState from './EmptyState';
import { FiLayout } from 'react-icons/fi';

const PerformanceTable = ({ tableData }) => {
    const [expandedRows, setExpandedRows] = useState([]);

    const toggleRow = (objectiveId) => {
        setExpandedRows(prev => 
            prev.includes(objectiveId) 
                ? prev.filter(id => id !== objectiveId)
                : [...prev, objectiveId]
        );
    };

    if (!tableData || tableData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm mt-6">
                <EmptyState 
                    icon={FiLayout}
                    title="Không có dữ liệu chi tiết"
                    message="Chưa có mục tiêu nào trong chu kỳ này hoặc phù hợp với bộ lọc của bạn."
                />
            </div>
        );
    }

    const columns = [
        'Tên Mục tiêu (O/KR)',
        'Cấp độ',
        'Phòng ban/Đơn vị',
        'Tiến độ (%)',
        'Tình trạng (Health)',
        'Điểm Tự tin',
        'Liên kết với O Cấp trên',
    ];

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto mt-6">
            <h3 className="font-bold text-lg mb-2 p-4">Bảng Chi tiết Hiệu suất</h3>
            <table className="divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map(col => (
                            <th 
                                key={col}
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((objective, index) => (
                        <PerformanceDataRow 
                            key={objective.objective_id}
                            objective={objective}
                            level={0}
                            isZebra={index % 2 === 0}
                            expandedRows={expandedRows}
                            toggleRow={toggleRow}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PerformanceTable;
