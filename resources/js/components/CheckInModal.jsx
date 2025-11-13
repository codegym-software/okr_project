import React, { useState, useEffect } from 'react';
import { Modal } from './ui';

export default function CheckInModal({ 
    open, 
    onClose, 
    keyResult, 
    objectiveId, 
    onSuccess 
}) {
    console.log('🔧 CheckInModal: Props received:', { open, keyResult, objectiveId });
    console.log('🔧 CheckInModal: keyResult details:', {
        kr_id: keyResult?.kr_id,
        current_value: keyResult?.current_value,
        target_value: keyResult?.target_value,
        progress_percent: keyResult?.progress_percent,
        unit: keyResult?.unit,
        status: keyResult?.status
    });

    // Null check for keyResult
    if (!keyResult) {
        console.error('❌ CheckInModal: keyResult is null or undefined');
        return null;
    }

    const [formData, setFormData] = useState({
        progress_value: parseFloat(keyResult.current_value) || 0,
        progress_percent: parseFloat(keyResult.progress_percent) || 0,
        check_in_type: 'quantity',
        notes: ''
    });

    const [isInputFocused, setIsInputFocused] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Debug: Log formData changes
    useEffect(() => {
        console.log('🔧 CheckInModal: formData updated:', {
            progress_value: formData.progress_value,
            progress_percent: formData.progress_percent,
            check_in_type: formData.check_in_type,
            notes: formData.notes
        });
    }, [formData]);

    // Debug: Log keyResult changes
    useEffect(() => {
        console.log('🔧 CheckInModal: keyResult prop changed:', {
            kr_id: keyResult?.kr_id,
            current_value: keyResult?.current_value,
            target_value: keyResult?.target_value,
            progress_percent: keyResult?.progress_percent,
            unit: keyResult?.unit,
            status: keyResult?.status
        });
    }, [keyResult]);

    // Auto-calculate progress_percent when progress_value changes (giá trị hiện tại → thanh tiến độ)
    useEffect(() => {
        if (keyResult?.target_value) {
            const targetValue = parseFloat(keyResult.target_value);
            if (targetValue > 0) {
                const calculatedPercent = (formData.progress_value / targetValue) * 100;
                console.log('🔧 Auto-calculate progress_percent from value:', {
                    progress_value: formData.progress_value,
                    target_value: targetValue,
                    calculated_percent: calculatedPercent,
                    current_percent: formData.progress_percent
                });
                
                setFormData(prev => ({
                    ...prev,
                    progress_percent: calculatedPercent
                }));
            }
        }
    }, [formData.progress_value, keyResult?.target_value]);

    const handleInputChange = (field, value) => {
        console.log('🔧 handleInputChange called:', { field, value, type: typeof value });
        
        if (field === 'progress_value') {
            const numValue = parseFloat(value) || 0;
            console.log('🔧 Progress value change:', { 
                old_value: formData.progress_value, 
                new_value: numValue,
                target_value: keyResult?.target_value 
            });
            
            setFormData(prev => {
                const newData = {
                    ...prev,
                    progress_value: numValue
                };
                console.log('🔧 New formData after progress_value change:', newData);
                return newData;
            });
        } else if (field === 'progress_percent') {
            const numValue = parseFloat(value) || 0;
            console.log('🔧 Progress percent change:', { 
                old_percent: formData.progress_percent, 
                new_percent: numValue,
                target_value: keyResult?.target_value 
            });
            
            setFormData(prev => {
                const newData = {
                    ...prev,
                    progress_percent: numValue
                };
                console.log('🔧 New formData after progress_percent change:', newData);
                return newData;
            });
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
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

        // Debug: Log form data before submit
        console.log('🔧 Submitting form data:', {
            progress_value: formData.progress_value,
            progress_percent: formData.progress_percent,
            check_in_type: formData.check_in_type,
            notes: formData.notes
        });

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

    return (
        <Modal open={open} onClose={onClose} title="Cập nhật tiến độ Key Result">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Key Result
                        </label>
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-sm">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Giá trị hiện tại
                            <span className="text-xs text-blue-600 ml-1">(Auto-calculate %)</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={formData.progress_value === 0 && !isInputFocused ? '' : formData.progress_value}
                            onChange={(e) => {
                                const value = e.target.value;
                                console.log('🔧 Input change:', { value, type: typeof value });
                                
                                if (value === '') {
                                    handleInputChange('progress_value', 0);
                                } else {
                                    const numValue = parseFloat(value);
                                    console.log('🔧 Parsed value:', { numValue, isNaN: isNaN(numValue) });
                                    
                                    if (isNaN(numValue)) {
                                        handleInputChange('progress_value', 0);
                                    } else {
                                        handleInputChange('progress_value', numValue);
                                    }
                                }
                            }}
                            onFocus={(e) => {
                                setIsInputFocused(true);
                                if (formData.progress_value === 0) {
                                    // Select all text when focusing on 0 value
                                    setTimeout(() => {
                                        e.target.select();
                                    }, 0);
                                }
                            }}
                            onBlur={() => setIsInputFocused(false)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập giá trị..."
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
                        <span className="text-xs text-blue-600 ml-1">(Auto-calculate giá trị)</span>
                    </label>
                    <div className="space-y-2">
                        {/* Slider */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.progress_percent}
                                onChange={(e) => handleInputChange('progress_percent', parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${Math.min(100, Math.max(0, formData.progress_percent))}%, #e2e8f0 ${Math.min(100, Math.max(0, formData.progress_percent))}%, #e2e8f0 100%)`,
                                    WebkitAppearance: 'none',
                                    appearance: 'none'
                                }}
                            />
                            <span className="text-sm font-medium text-slate-600 w-32">
                                {Number(formData.progress_percent).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Ghi chú (tùy chọn)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mô tả ngắn về tiến độ công việc..."
                        rows={3}
                        maxLength={1000}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                        {formData.notes.length}/1000 ký tự
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
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