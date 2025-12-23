import React from 'react';

export default function CheckInsTable({ checkIns, objectives }) {
    const totalCheckIns = checkIns.length;
    const avgCheckInsPerObjective = objectives.length > 0 
        ? (checkIns.length / objectives.length).toFixed(1)
        : 0;
    const latestCheckInDate = checkIns.length > 0 
        ? new Date(Math.max(...checkIns.map(ci => new Date(ci.created_at || ci.createdAt).getTime()))).toLocaleDateString('vi-VN')
        : 'Chưa có';

    return (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Lịch sử Check-in</div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Tổng số Check-in</div>
                        <div className="text-2xl font-bold text-slate-900">{totalCheckIns}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Check-in trung bình/Objective</div>
                        <div className="text-2xl font-bold text-slate-900">{avgCheckInsPerObjective}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Check-in gần nhất</div>
                        <div className="text-sm font-semibold text-slate-900">{latestCheckInDate}</div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Key Result</th>
                                <th className="px-6 py-3">Objective</th>
                                <th className="px-6 py-3">Người check-in</th>
                                <th className="px-6 py-3 text-center">Tiến độ</th>
                                <th className="px-6 py-3 text-center">Ngày check-in</th>
                                <th className="px-6 py-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checkIns.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        Chưa có check-in nào
                                    </td>
                                </tr>
                            ) : (
                                checkIns.slice(0, 20).map((checkIn, i) => (
                                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {checkIn.key_result?.kr_title || checkIn.kr_title || 'N/A'}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">
                                            {checkIn.objective?.obj_title || checkIn.objective_title || 'N/A'}
                                        </td>
                                        <td className="px-6 py-3">{checkIn.user?.full_name || checkIn.user_name || 'N/A'}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="font-semibold">{checkIn.progress_percent || 0}%</span>
                                        </td>
                                        <td className="px-6 py-3 text-center text-slate-600">
                                            {checkIn.created_at 
                                                ? new Date(checkIn.created_at).toLocaleDateString('vi-VN')
                                                : 'N/A'}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600 max-w-xs truncate">
                                            {checkIn.notes || checkIn.note || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

