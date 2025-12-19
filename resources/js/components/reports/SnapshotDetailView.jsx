import React, { useState, useMemo } from 'react';
import PerformanceTab from './PerformanceTab';
import ProcessTab from './ProcessTab';
import QualityTab from './QualityTab';
import { FiTrendingUp, FiCheckCircle, FiShield } from "react-icons/fi";

/**
 * Hiển thị chi tiết một snapshot (báo cáo đã lưu) với giao diện tab
 * giống như báo cáo gốc.
 */
export default function SnapshotDetailView({
    snapshot,
    onBack,
    onExport,
}) {
    const [currentTab, setCurrentTab] = useState('performance');

    if (!snapshot) return null;

    // Dữ liệu báo cáo được lồng trong đối tượng snapshot
    const reportData = snapshot.snapshot_data?.data;
    const metaData = snapshot.snapshot_data?.meta;

    // Cấu hình các tab
    const tabConfig = useMemo(() => [
        { id: 'performance', label: 'Hiệu suất', icon: FiTrendingUp, component: PerformanceTab },
        { id: 'process', label: 'Quy trình', icon: FiCheckCircle, component: ProcessTab },
        { id: 'quality', label: 'Chất lượng & Cấu trúc', icon: FiShield, component: QualityTab },
    ], []);
    
    const CurrentTabComponent = useMemo(() => {
        return tabConfig.find(t => t.id === currentTab)?.component;
    }, [currentTab, tabConfig]);

    return (
        <div>
            {/* Header với nút Quay lại và Xuất file */}
            <div className="flex items-center justify-between mb-4 gap-3">
                <button 
                    onClick={onBack} 
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Quay lại danh sách
                </button>

                <button
                    onClick={() => onExport?.(snapshot)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-colors"
                    title="Xuất báo cáo"
                >
                    <svg 
                        className="h-4 w-4 text-slate-600" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Xuất file
                </button>
            </div>

            {/* Thông tin chung của Snapshot */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{snapshot.report_name}</h3>
                <div className="text-sm flex flex-wrap items-center gap-x-6 gap-y-1 text-slate-600">
                    <span>
                        <span className="font-semibold">Chu kỳ:</span>
                        <span className="ml-1.5">{snapshot.cycle?.cycle_name || metaData?.cycleName || 'N/A'}</span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                        <span className="font-semibold">Ngày chốt:</span>
                        <span className="ml-1.5">{new Date(snapshot.created_at).toLocaleDateString('vi-VN')}</span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                        <span className="font-semibold">Người tạo:</span>
                        <span className="ml-1.5">{snapshot.creator?.full_name || 'N/A'}</span>
                    </span>
                </div>
            </div>

            {/* Thanh điều hướng Tab */}
            <div className="mb-6 border-b border-gray-200">
                <div className="flex items-center gap-4 -mb-px">
                    {tabConfig.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setCurrentTab(tab.id)} 
                            className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-colors duration-200 ${
                                currentTab === tab.id 
                                ? 'text-blue-600 border-b-2 border-blue-600' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Nội dung Tab */}
            <div className="report-content">
                {!reportData ? (
                    <div className="text-center py-16 bg-slate-50 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-700">Không có dữ liệu chi tiết</h4>
                        <p className="text-slate-500 mt-2">Snapshot này không chứa dữ liệu chi tiết để hiển thị.</p>
                    </div>
                ) : (
                    CurrentTabComponent && <CurrentTabComponent data={reportData} isSnapshot={true} />
                )}
            </div>
        </div>
    );
}

