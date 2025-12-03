import React from 'react';
import ProgressBar from './ProgressBar';
import { calculateObjectiveProgress, getStatusFromProgress, getStatusBadgeProps, getLevelText } from '../../utils/reports/statusHelpers';

export default function ObjectivesTable({ objectives, level }) {
    if (objectives.length === 0) {
        return (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Chi tiết Objectives</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Tên Objective</th>
                                <th className="px-6 py-3">Cấp độ</th>
                                {level !== 'company' && <th className="px-6 py-3">Phòng ban</th>}
                                <th className="px-6 py-3 text-center">Số KR</th>
                                <th className="px-6 py-3 text-center">Tiến độ</th>
                                <th className="px-6 py-3 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={level === 'company' ? 5 : 6} className="px-6 py-8 text-center text-slate-500">
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
            <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Chi tiết Objectives</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Tên Objective</th>
                            <th className="px-6 py-3">Cấp độ</th>
                            {level !== 'company' && <th className="px-6 py-3">Phòng ban</th>}
                            <th className="px-6 py-3 text-center">Số KR</th>
                            <th className="px-6 py-3 text-center">Tiến độ</th>
                            <th className="px-6 py-3 text-center">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {objectives.map((obj, i) => {
                            const progress = calculateObjectiveProgress(obj);
                            const status = getStatusFromProgress(progress);
                            const statusBadge = getStatusBadgeProps(status);
                            const levelText = getLevelText(obj.level);
                            
                            return (
                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-6 py-3 font-semibold text-slate-900">{obj.obj_title || 'N/A'}</td>
                                    <td className="px-6 py-3">
                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                            {levelText}
                                        </span>
                                    </td>
                                    {level !== 'company' && (
                                        <td className="px-6 py-3">{obj.department?.d_name || obj.department?.departmentName || '—'}</td>
                                    )}
                                    <td className="px-6 py-3 text-center font-semibold">{obj.key_results?.length || 0}</td>
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

