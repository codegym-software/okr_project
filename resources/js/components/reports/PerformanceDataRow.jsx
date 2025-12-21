import React from 'react';
import { FiChevronRight, FiChevronDown } from 'react-icons/fi';

const HealthStatusBadge = ({ status }) => {
    const statusStyles = {
        on_track: 'bg-green-100 text-green-800',
        at_risk: 'bg-yellow-100 text-yellow-800',
        off_track: 'bg-red-100 text-red-800',
    };
    const statusText = {
        on_track: 'Đang theo dõi',
        at_risk: 'Rủi ro',
        off_track: 'Trễ',
    }
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {statusText[status] || 'Không xác định'}
        </span>
    );
};

const PerformanceDataRow = ({ objective, level, isZebra, expandedRows, toggleRow }) => {
    const isExpanded = expandedRows.includes(objective.objective_id);
    const hasChildren = objective.children && objective.children.length > 0;

    const indentStyle = { paddingLeft: `${level * 24 + 16}px` };

    const rowClass = level > 0 
        ? 'bg-gray-50' 
        : (isZebra ? 'bg-white' : 'bg-gray-50');

    return (
        <>
            <tr className={rowClass}>
                {/* Tên Mục tiêu */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center" style={indentStyle}>
                        {hasChildren && (
                            <button onClick={() => toggleRow(objective.objective_id)} className="mr-2 p-1 rounded-full hover:bg-gray-200">
                                {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                            </button>
                        )}
                        <span className="font-medium text-gray-900">
                            {objective.objective_name}
                        </span>
                    </div>
                </td>
                {/* Cấp độ */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{objective.level}</td>
                {/* Phòng ban/Đơn vị */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{objective.department_name}</td>
                {/* Tiến độ */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${objective.progress}%` }}></div>
                        </div>
                        <span className="ml-2 font-medium">{objective.progress}%</span>
                    </div>
                </td>
                {/* Tình trạng (Health) */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <HealthStatusBadge status={objective.health_status} />
                </td>
                {/* Điểm Tự tin */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 text-center">{objective.confidence_score || '-'}</td>
                {/* Liên kết với O Cấp trên */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{objective.parent_objective_name || 'N/A'}</td>
            </tr>

            {isExpanded && hasChildren && objective.children.map(child => (
                <PerformanceDataRow
                    key={child.objective_id}
                    objective={child}
                    level={level + 1}
                    isZebra={false} // Child rows won't alternate, they'll have a consistent bg
                    expandedRows={expandedRows}
                    toggleRow={toggleRow}
                />
            ))}
        </>
    );
};

export default PerformanceDataRow;
