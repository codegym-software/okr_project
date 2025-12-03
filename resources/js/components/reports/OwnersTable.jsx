import React from 'react';
import ProgressBar from './ProgressBar';

export default function OwnersTable({ owners }) {
    if (owners.length === 0) {
        return (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Phân tích theo Người chịu trách nhiệm</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Người chịu trách nhiệm</th>
                                <th className="px-6 py-3 text-center">Số Key Results</th>
                                <th className="px-6 py-3 text-center">Tiến độ TB</th>
                                <th className="px-6 py-3 text-center">Đúng tiến độ</th>
                                <th className="px-6 py-3 text-center">Có nguy cơ</th>
                                <th className="px-6 py-3 text-center">Chậm tiến độ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
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
            <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 text-sm font-bold text-slate-800">Phân tích theo Người chịu trách nhiệm</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-700 font-semibold border-b-2 border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Người chịu trách nhiệm</th>
                            <th className="px-6 py-3 text-center">Số Key Results</th>
                            <th className="px-6 py-3 text-center">Tiến độ TB</th>
                            <th className="px-6 py-3 text-center">Đúng tiến độ</th>
                            <th className="px-6 py-3 text-center">Có nguy cơ</th>
                            <th className="px-6 py-3 text-center">Chậm tiến độ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {owners.map((owner, i) => (
                            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-3 font-semibold text-slate-900">{owner.owner_name || 'Chưa gán'}</td>
                                <td className="px-6 py-3 text-center font-semibold">{owner.keyResults.length}</td>
                                <td className="px-6 py-3 text-center">
                                    <ProgressBar progress={owner.averageProgress} />
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className="font-semibold text-emerald-700">{owner.onTrack}</span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className="font-semibold text-amber-700">{owner.atRisk}</span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className="font-semibold text-red-700">{owner.offTrack}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

