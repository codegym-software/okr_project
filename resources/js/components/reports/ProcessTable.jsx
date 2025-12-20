import React from 'react';
import EmptyState from './EmptyState';
import { FiCheckSquare } from 'react-icons/fi';

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

const ProcessTable = ({ tableData }) => {
     if (!tableData || tableData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm mt-6">
                <EmptyState 
                    icon={FiCheckSquare}
                    title="Không có dữ liệu tuân thủ"
                    message="Chưa có mục tiêu nào trong chu kỳ này để phân tích quy trình check-in."
                />
            </div>
        );
    }

    const columns = [
        'Tên Mục tiêu (O/KR)',
        'Phòng ban/Đơn vị',
        'Người Sở hữu Chính',
        'Tình trạng (Health)',
        'Check-in Gần nhất',
        'Quá hạn Check-in (Ngày)',
        'Tỷ lệ Check-in Định kỳ (%)',
    ];
    
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto mt-6">
            <h3 className="font-bold text-lg mb-2 p-4">Chi tiết Tuân thủ Quy trình (Sắp xếp theo mức độ bị lãng quên)</h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map(col => (
                            <th key={col} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => (
                        <tr key={row.objective_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <a href={`/objectives/${row.objective_id}`} className="hover:underline" target="_blank" rel="noopener noreferrer">{row.objective_name}</a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.owner_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><HealthStatusBadge status={row.health_status} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.last_checkin_date || 'Chưa có'}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${row.days_overdue > 14 ? 'text-red-600' : (row.days_overdue > 7 ? 'text-yellow-600' : 'text-gray-600')}`}>
                                {row.days_overdue !== null ? `${row.days_overdue} ngày` : '-'}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.periodic_checkin_rate}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProcessTable;
