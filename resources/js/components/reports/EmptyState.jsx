import React from 'react';
import { FiBarChart2 } from 'react-icons/fi'; // Example icon

const EmptyState = ({ icon, title, message }) => {
    const IconComponent = icon || FiBarChart2;

    return (
        <div className="flex flex-col items-center justify-center text-center h-full">
            <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconComponent className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">{title}</h3>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed mt-1">{message}</p>
        </div>
    );
};

export default EmptyState;
