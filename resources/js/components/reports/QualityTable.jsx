import React from 'react';
import EmptyState from './EmptyState';
import { FiAlertTriangle } from 'react-icons/fi';

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

const QualityTable = ({ tableData }) => {
    if (!tableData || tableData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm mt-6">
                <EmptyState 
                    icon={FiAlertTriangle}
                    title="Không có dữ liệu chi tiết"
                    message="Không có mục tiêu nào trong chu kỳ này để phân tích chất lượng và cấu trúc."
                />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto mt-6">
            <h3 className="font-bold text-lg mb-2 p-4">Các OKR có Dấu hiệu Cấu trúc kém</h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Mục tiêu (O/KR)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban/Đơn vị</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại KR</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tham vọng</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng KR</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thẻ Chiến lược</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiến độ (%)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tình trạng</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vấn đề Cấu trúc</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => (
                        <tr key={row.objective_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <span className="font-medium text-gray-900">{row.objective_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.kr_type_distribution?.outcome > 0 && `Kết quả (${row.kr_type_distribution.outcome})`}
                                {row.kr_type_distribution?.outcome > 0 && row.kr_type_distribution?.activity > 0 && ', '}
                                {row.kr_type_distribution?.activity > 0 && `Hoạt động (${row.kr_type_distribution.activity})`}
                                {(!row.kr_type_distribution || (row.kr_type_distribution.outcome === 0 && row.kr_type_distribution.activity === 0)) && 'Không xác định'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.is_aspirational ? 'Tham vọng' : 'Cam kết'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.kr_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.strategic_tags && row.strategic_tags.length > 0 ? row.strategic_tags.join(', ') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.progress}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <HealthStatusBadge status={row.health_status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                {row.structural_issues || 'Không'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default QualityTable;
