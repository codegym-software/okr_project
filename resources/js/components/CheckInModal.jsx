import React, { useState, useEffect } from 'react';
import { Modal } from './ui';
import CheckInProgressChart from './CheckInProgressChart';

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

    const [formData, setFormData] = useState({
        progress_value: 0,
        progress_percent: 0,
        check_in_type: 'quantity',
        notes: ''
    });

    const [isInputFocused, setIsInputFocused] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkIns, setCheckIns] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Load checkin history function
    // Chỉ phụ thuộc vào kr_id thay vì toàn bộ keyResult object để tránh re-render không cần thiết
    const krId = keyResult?.kr_id;
    const loadCheckInHistory = React.useCallback(async () => {
        if (!objectiveId || !krId) {
            return;
        }

        setLoadingHistory(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(`/api/check-in/${objectiveId}/${krId}/history`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const checkInsData = data.data?.check_ins || data.check_ins || [];
                const parsedCheckIns = checkInsData.map(checkIn => ({
                    ...checkIn,
                    progress_percent: parseFloat(checkIn.progress_percent),
                    progress_value: Math.round(parseFloat(checkIn.progress_value)),
                    is_completed: Boolean(checkIn.is_completed)
                }));
                setCheckIns(parsedCheckIns);
            }
        } catch (err) {
            console.error('Error loading checkin history:', err);
            // Không hiển thị error vì đây là tính năng phụ
        } finally {
            setLoadingHistory(false);
        }
    }, [objectiveId, krId]);

    // Cập nhật formData khi keyResult thay đổi
    useEffect(() => {
        if (keyResult) {
            setFormData({
                progress_value: parseFloat(keyResult.current_value) || 0,
                progress_percent: parseFloat(keyResult.progress_percent) || 0,
                check_in_type: 'quantity',
                notes: ''
            });
            setError(''); // Reset error khi keyResult thay đổi
        }
    }, [keyResult]);

    // Load checkin history khi modal mở
    useEffect(() => {
        if (open && keyResult && objectiveId) {
            loadCheckInHistory();
        }
    }, [open, keyResult, objectiveId, loadCheckInHistory]);

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

    // Null check for keyResult - hiển thị message thay vì return null
    // Phải đặt sau tất cả hooks để tuân thủ Rules of Hooks
    if (!keyResult) {
        return (
            <Modal open={open} onClose={onClose} title="Cập nhật tiến độ Key Result">
                <div className="text-center py-8">
                    <p className="text-red-600">Không tìm thấy thông tin Key Result. Vui lòng thử lại.</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Đóng
                    </button>
                </div>
            </Modal>
        );
    }

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

        if (formData.progress_value < 0) {
            setError('Giá trị tiến độ không thể âm');
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
            
            if (!token) {
                throw new Error('Không tìm thấy CSRF token. Vui lòng tải lại trang.');
            }
            
            const response = await fetch(`/check-in/${objectiveId}/${keyResult.kr_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            }).catch((fetchError) => {
                // Bắt lỗi network
                console.error('Fetch error:', fetchError);
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.');
            });

            // Kiểm tra response có ok không trước khi parse JSON
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error(`Lỗi phản hồi từ server: ${response.status} ${response.statusText}`);
            }

            if (!response.ok || !data.success) {
                throw new Error(data.message || `Cập nhật tiến độ thất bại (${response.status})`);
            }

            // Reload checkin history để cập nhật chart
            await loadCheckInHistory();

            // Gọi callback để cập nhật UI
            if (onSuccess) {
                onSuccess(data.data?.key_result || data.key_result || data.data);
            }

            onClose();
        } catch (err) {
            console.error('Check-in error:', err);
            const errorMessage = err.message || 'Có lỗi xảy ra khi cập nhật tiến độ';
            setError(errorMessage);
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

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Key Result
                    </label>
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-sm">
                        {keyResult.kr_title}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Giá trị hiện tại
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

                {/* Biểu đồ tiến độ Check-in */}
                {!loadingHistory && checkIns && checkIns.length > 0 && keyResult && (
                    <div className="w-full overflow-x-auto">
                        <CheckInProgressChart
                            checkIns={checkIns}
                            width={700}
                            height={280}
                            keyResult={keyResult}
                        />
                    </div>
                )}

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