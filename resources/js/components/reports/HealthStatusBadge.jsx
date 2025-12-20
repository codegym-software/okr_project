import React from 'react';

const HealthStatusBadge = ({ status }) => {
    const statusStyles = {
        on_track: 'bg-green-100 text-green-800',
        at_risk: 'bg-yellow-100 text-yellow-800',
        off_track: 'bg-red-100 text-red-800',
        behind: 'bg-red-100 text-red-800', // Add alias for 'behind'
        completed: 'bg-blue-100 text-blue-800',
    };
    const statusText = {
        on_track: 'Đúng tiến độ',
        at_risk: 'Có rủi ro',
        off_track: 'Chậm tiến độ',
        behind: 'Chậm tiến độ',
        completed: 'Hoàn thành',
    }
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {statusText[status] || status || 'Không xác định'}
        </span>
    );
};

export default HealthStatusBadge;
