import React, { useState, useEffect } from 'react';
import { Modal } from './ui';

export default function CheckInModal({ 
    open, 
    onClose, 
    keyResult, 
    objectiveId, 
    onSuccess 
}) {
    const [formData, setFormData] = useState({
        check_in_type: 'quantity',
        progress_value: 0,
        progress_percent: 0,
        notes: '',
        is_completed: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (keyResult && open) {
            setFormData({
                check_in_type: keyResult.unit === '%' ? 'percentage' : 'quantity',
                progress_value: Math.round(parseFloat(keyResult.current_value)) || 0,
                progress_percent: Math.round(parseFloat(keyResult.progress_percent) / 10) * 10 || 0,
                notes: '',
                is_completed: keyResult.status === 'completed'
            });
            setError('');
        }
    }, [keyResult, open]);

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            
            // Tự động tính toán progress_percent nếu thay đổi progress_value
            if (field === 'progress_value' && keyResult?.target_value > 0) {
                const percent = Math.min(100, Math.max(0, 
                    Math.round((parseFloat(value) / parseFloat(keyResult.target_value)) * 100 / 10) * 10
                ));
                newData.progress_percent = percent;
                newData.is_completed = percent >= 100;
            }
            
            // Tự động tính toán progress_value nếu thay đổi progress_percent
            if (field === 'progress_percent' && keyResult?.target_value > 0) {
                const progressValue = Math.round((parseFloat(value) / 100) * parseFloat(keyResult.target_value));
                newData.progress_value = progressValue;
                newData.is_completed = parseFloat(value) >= 100;
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
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

        if (formData.check_in_type === 'quantity' && formData.progress_value < 0) {
            setError('Giá trị tiến độ không thể âm');
            setLoading(false);
            return;
        }

        if (formData.check_in_type === 'percentage' && (formData.progress_percent < 0 || formData.progress_percent > 100)) {
            setError('Phần trăm tiến độ phải từ 0% đến 100%');
            setLoading(false);
            return;
        }

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(`/check-in/${objectiveId}/${keyResult.kr_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Cập nhật tiến độ thất bại');
            }

            // Gọi callback để cập nhật UI
            if (onSuccess) {
                onSuccess(data.data?.key_result || data.key_result || data.data);
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi cập nhật tiến độ');
        } finally {
            setLoading(false);
        }
    };

    if (!keyResult) {
        console.error('CheckInModal: keyResult is null or undefined');
        return null;
    }

    console.log('CheckInModal rendering with:', { keyResult, objectiveId, open });

    return (
        <Modal open={open} onClose={onClose} title="Cập nhật tiến độ Key Result">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Key Result
                    </label>
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                        {keyResult.kr_title}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Loại cập nhật
                    </label>
                    <select
                        value={formData.check_in_type}
                        onChange={(e) => handleInputChange('check_in_type', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="quantity">Giá trị định lượng</option>
                        <option value="percentage">Phần trăm</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Giá trị hiện tại
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={formData.progress_value}
                            onChange={(e) => handleInputChange('progress_value', parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Mục tiêu
                        </label>
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-sm">
                            {keyResult.target_value} {keyResult.unit || ''}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tiến độ (%)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={Math.round(formData.progress_percent / 10)}
                            onChange={(e) => handleInputChange('progress_percent', parseInt(e.target.value) * 10)}
                            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formData.progress_percent}%, #e2e8f0 ${formData.progress_percent}%, #e2e8f0 100%)`
                            }}
                        />
                        <span className="text-sm font-medium text-slate-600 w-16">
                            {Math.round(formData.progress_percent / 10) * 10}%
                        </span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Ghi chú (tùy chọn)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Mô tả ngắn về tiến độ công việc..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-slate-500 mt-1">
                        {formData.notes.length}/1000 ký tự
                    </div>
                </div>

                {formData.progress_percent >= 100 && (
                    <div className="rounded-md bg-green-50 p-3">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-green-700 text-sm font-medium">
                                Chúc mừng! Key Result này đã hoàn thành 100%.
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? 'Đang lưu...' : 'Cập nhật tiến độ'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}