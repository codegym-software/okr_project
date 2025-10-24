import React, { useState, useEffect } from 'react';
import { Modal } from './ui';

export default function CheckInHistory({ 
    open, 
    onClose, 
    keyResult, 
    objectiveId 
}) {
    const [checkIns, setCheckIns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && keyResult) {
            loadCheckInHistory();
        }
    }, [open, keyResult]);

    const loadCheckInHistory = async () => {
        setLoading(true);
        setError('');

        if (!objectiveId) {
            setError('Không tìm thấy Objective ID');
            setLoading(false);
            return;
        }

        if (!keyResult?.kr_id) {
            setError('Không tìm thấy Key Result ID');
            setLoading(false);
            return;
        }

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(`/api/check-in/${objectiveId}/${keyResult.kr_id}/history`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            console.log('CheckInHistory API Response:', { response: response.status, data });

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Không thể tải lịch sử check-in');
            }

            const checkInsData = data.data?.check_ins || data.check_ins || [];
            console.log('CheckInHistory - Setting checkIns:', checkInsData);
            
            // Ensure all numeric values are properly parsed
            const parsedCheckIns = checkInsData.map(checkIn => ({
                ...checkIn,
                progress_percent: parseFloat(checkIn.progress_percent),
                progress_value: Math.round(parseFloat(checkIn.progress_value)),
                is_completed: Boolean(checkIn.is_completed)
            }));
            
            setCheckIns(parsedCheckIns);
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const deleteCheckIn = async (checkInId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa check-in này?')) {
            return;
        }

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(`/check-in/${objectiveId}/${keyResult.kr_id}/${checkInId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Xóa check-in thất bại');
            }

            // Reload history
            loadCheckInHistory();
        } catch (err) {
            alert(err.message || 'Có lỗi xảy ra khi xóa check-in');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatProgressValue = (checkIn) => {
        if (checkIn.check_in_type === 'percentage') {
            return `${parseFloat(checkIn.progress_percent).toFixed(2)}%`;
        }
        return `${Math.round(parseFloat(checkIn.progress_value))} ${keyResult?.unit || ''}`;
    };

    if (!keyResult) {
        console.error('CheckInHistory: keyResult is null or undefined');
        return null;
    }

    console.log('CheckInHistory rendering with:', { 
        keyResult, 
        objectiveId, 
        open, 
        loading, 
        error, 
        checkInsCount: checkIns.length,
        checkIns: checkIns
    });

    return (
        <Modal open={open} onClose={onClose} title="Lịch sử Check-in">
            <div className="space-y-4">
                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-slate-50 rounded-lg p-3">
                    <h3 className="font-medium text-slate-900 mb-1">{keyResult.kr_title}</h3>
                    <p className="text-sm text-slate-600">
                        Mục tiêu: {keyResult.target_value} {keyResult.unit || ''}
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-slate-600">Đang tải...</p>
                    </div>
                ) : checkIns.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <svg className="h-12 w-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>Chưa có check-in nào</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {checkIns.map((checkIn, index) => (
                            <div 
                                key={checkIn.check_in_id} 
                                className={`border rounded-lg p-4 ${
                                    checkIn.is_completed 
                                        ? 'border-green-200 bg-green-50' 
                                        : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                                                #{checkIns.length - index}
                                            </div>
                                            {checkIn.is_completed && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Hoàn thành
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-4">
                                                <div>
                                                    <span className="text-xs text-slate-500">Tiến độ</span>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {formatProgressValue(checkIn)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500">Phần trăm</span>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {parseFloat(checkIn.progress_percent).toFixed(2)}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {checkIn.notes && (
                                            <div className="mb-2">
                                                <span className="text-xs text-slate-500">Ghi chú</span>
                                                <p className="text-sm text-slate-700 mt-1">
                                                    {checkIn.notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                                            <div className="flex items-center space-x-2">
                                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>Bởi: {checkIn.user?.full_name || 'Người dùng'}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{formatDate(checkIn.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => deleteCheckIn(checkIn.check_in_id)}
                                        className="ml-3 p-1 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Xóa check-in"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </Modal>
    );
}