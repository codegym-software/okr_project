import React from 'react';
import ProgressBar from './ProgressBar';
import { getStatusFromProgress, getStatusBadgeProps } from '../../utils/reports/statusHelpers';

function getAssigneeName(kr) {
    const assigneeName = kr.assignedUser?.full_name;
    if (assigneeName) return assigneeName;
    const ownerName = kr.objective_owner?.full_name || kr.objective_owner?.name;
    return ownerName || 'Chưa gán';
}

export default function KeyResultsTable({ keyResults }) {
    if (keyResults.length === 0) {
        return (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Chi tiết Key Results</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Tên Key Result</th>
                                <th className="px-6 py-3">Objective</th>
                                <th className="px-6 py-3">Người được giao</th>
                                <th className="px-6 py-3 text-center">Tiến độ</th>
                                <th className="px-6 py-3 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                    Chưa có dữ liệu
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Chi tiết Key Results</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Tên Key Result</th>
                            <th className="px-6 py-3">Objective</th>
                            <th className="px-6 py-3">Người được giao</th>
                            <th className="px-6 py-3 text-center">Tiến độ</th>
                            <th className="px-6 py-3 text-center">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {keyResults.map((kr, i) => {
                            const progress = kr.progress_percent || 0;
                            const status = getStatusFromProgress(progress);
                            const statusBadge = getStatusBadgeProps(status);
                            
                            return (
                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-900">{kr.kr_title || 'N/A'}</td>
                                    <td className="px-6 py-3 text-slate-600">{kr.objective_title || 'N/A'}</td>
                                    <td className="px-6 py-3">{getAssigneeName(kr)}</td>
                                    <td className="px-6 py-3 text-center">
                                        <ProgressBar progress={progress} />
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={statusBadge.className}>
                                            {statusBadge.text}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

