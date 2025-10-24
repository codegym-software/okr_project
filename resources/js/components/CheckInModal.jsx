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
            // Tính phần trăm chính xác từ current_value / target_value
            const currentValue = parseFloat(keyResult.current_value) || 0;
            const targetValue = parseFloat(keyResult.target_value) || 0;
            const calculatedPercent = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
            
            console.log('🔍 Tính toán tiến độ:', {
                keyResultRaw: keyResult,
                currentValue,
                targetValue,
                calculatedPercent,
                calculatedPercentFixed: calculatedPercent.toFixed(2),
                isFinite: Number.isFinite(calculatedPercent)
            });
            
            setFormData({
                check_in_type: keyResult.unit === '%' ? 'percentage' : 'quantity',
                progress_value: currentValue,
                progress_percent: calculatedPercent, // Không làm tròn
                notes: '',
                is_completed: keyResult.status === 'completed'
            });
            setError('');
        }
    }, [keyResult, open]);

    const handleInputChange = (field, value) => {
        console.log('🔧 handleInputChange called:', { field, value, keyResult });
        
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            
            // Auto-calculate: Tự động tính toán progress_percent khi nhập giá trị hiện tại
            if (field === 'progress_value' && keyResult?.target_value > 0) {
                const currentValue = parseFloat(value) || 0;
                const targetValue = parseFloat(keyResult.target_value);
                const percent = Math.min(100, Math.max(0, (currentValue / targetValue) * 100));
                
                console.log('🔄 Auto-calculate từ giá trị:', {
                    field,
                    value,
                    currentValue,
                    targetValue,
                    keyResultTargetValue: keyResult.target_value,
                    calculatedPercent: percent,
                    displayedPercent: percent,
                    isFinite: Number.isFinite(percent)
                });
                
                newData.progress_percent = percent;
                newData.is_completed = percent >= 100;
            }
            
            // Auto-calculate: Tự động tính toán progress_value khi nhập phần trăm
            if (field === 'progress_percent' && keyResult?.target_value > 0) {
                const percent = parseFloat(value) || 0;
                const targetValue = parseFloat(keyResult.target_value);
                const progressValue = (percent / 100) * targetValue;
                
                console.log('🔄 Auto-calculate từ phần trăm:', {
                    field,
                    value,
                    percent,
                    targetValue,
                    keyResultTargetValue: keyResult.target_value,
                    calculatedValue: progressValue,
                    displayedValue: progressValue
                });
                
                newData.progress_value = progressValue;
                newData.is_completed = percent >= 100;
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
                            <span className="text-xs text-blue-600 ml-1">(Auto-calculate %)</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.000001"
                            value={formData.progress_value}
                            onChange={(e) => {
                                console.log('🔧 Input onChange triggered:', e.target.value);
                                handleInputChange('progress_value', parseFloat(e.target.value) || 0);
                            }}
                            onInput={(e) => {
                                console.log('🔧 Input onInput triggered:', e.target.value);
                            }}
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
                                onChange={(e) => {
                                    console.log('🔧 Slider onChange triggered:', e.target.value);
                                    handleInputChange('progress_percent', parseFloat(e.target.value));
                                }}
                                onInput={(e) => {
                                    console.log('🔧 Slider onInput triggered:', e.target.value);
                                }}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formData.progress_percent}%, #e2e8f0 ${formData.progress_percent}%, #e2e8f0 100%)`
                                }}
                            />
                            <span className="text-sm font-medium text-slate-600 w-32">
                                {formData.progress_percent}%
                            </span>
                        </div>
                        
                        {/* Input field để nhập chính xác */}
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500 w-16">Nhập %:</span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.progress_percent}
                                onChange={(e) => handleInputChange('progress_percent', parseFloat(e.target.value) || 0)}
                                className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                            <span className="text-xs text-slate-500">%</span>
                        </div>
                    </div>
                    {/* Hiển thị công thức tính toán chi tiết */}
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <div className="font-medium mb-1">🔄 Auto-calculate hoạt động:</div>
                        <div className="mb-1">
                            • Nhập <strong>giá trị hiện tại</strong> → Tự động tính <strong>phần trăm</strong>
                        </div>
                        <div className="mb-1">
                            • Nhập <strong>phần trăm</strong> → Tự động tính <strong>giá trị hiện tại</strong>
                        </div>
                        <div className="font-medium mt-2">Công thức:</div>
                        <div>
                            ({formData.progress_value} ÷ {keyResult.target_value}) × 100 = {formData.progress_percent}%
                        </div>
                        <div className="mt-1 text-blue-600">
                            Giá trị hiện tại: {formData.progress_value} | Phần trăm: {formData.progress_percent}%
                        </div>
                        <div className="mt-1 text-red-600 text-xs">
                            DEBUG: Raw={formData.progress_percent} | Type: {typeof formData.progress_percent}
                        </div>
                        <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-xs">
                            ⚠️ Nếu vẫn thấy số nguyên (10%), hãy refresh browser (Ctrl+F5) để clear cache
                        </div>
                        <div className="mt-2 p-2 bg-green-100 rounded text-green-800 text-xs">
                            ✅ Database đã lưu: 60.16% | Hiển thị: {formData.progress_percent}% | Slider step: 0.01%
                        </div>
                        <div className="mt-2 p-2 bg-purple-100 rounded text-purple-800 text-xs">
                            🔄 KeyResult Data: current_value={keyResult?.current_value}, target_value={keyResult?.target_value}
                        </div>
                        <div className="mt-2 p-2 bg-orange-100 rounded text-orange-800 text-xs">
                            🧮 Auto-calc Test: Nhập {formData.progress_value} → Tính {(formData.progress_value / keyResult?.target_value * 100)}% | Target: {keyResult?.target_value}
                        </div>
                        <div className="mt-2 p-2 bg-cyan-100 rounded text-cyan-800 text-xs">
                            📊 Công thức: (Giá trị hiện tại ÷ Mục tiêu) × 100 = ({formData.progress_value} ÷ {keyResult?.target_value}) × 100 = {(formData.progress_value / keyResult?.target_value * 100)}%
                        </div>
                        <div className="mt-2 p-2 bg-pink-100 rounded text-pink-800 text-xs">
                            🎚️ Slider Debug: min=0, max=100, step=0.01, value={formData.progress_percent} | Range: 0% - 100%
                        </div>
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                            >
                                🔄 Refresh Page
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const currentValue = parseFloat(keyResult?.current_value) || 0;
                                    const targetValue = parseFloat(keyResult?.target_value) || 0;
                                    const calculatedPercent = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
                                    setFormData(prev => ({
                                        ...prev,
                                        progress_value: currentValue,
                                        progress_percent: calculatedPercent
                                    }));
                                }}
                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                                🔄 Recalculate
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Test với giá trị 30
                                    const testValue = 30;
                                    const targetValue = parseFloat(keyResult?.target_value) || 123;
                                    const calculatedPercent = (testValue / targetValue) * 100;
                                    setFormData(prev => ({
                                        ...prev,
                                        progress_value: testValue,
                                        progress_percent: calculatedPercent
                                    }));
                                    console.log('🧪 Test với giá trị 30:', { testValue, targetValue, calculatedPercent });
                                }}
                                className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                            >
                                🧪 Test 30
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Test với giá trị 50
                                    const testValue = 50;
                                    const targetValue = parseFloat(keyResult?.target_value) || 123;
                                    const calculatedPercent = (testValue / targetValue) * 100;
                                    setFormData(prev => ({
                                        ...prev,
                                        progress_value: testValue,
                                        progress_percent: calculatedPercent
                                    }));
                                    console.log('🧪 Test với giá trị 50:', { testValue, targetValue, calculatedPercent });
                                }}
                                className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                            >
                                🧪 Test 50
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Test với giá trị 75
                                    const testValue = 75;
                                    const targetValue = parseFloat(keyResult?.target_value) || 123;
                                    const calculatedPercent = (testValue / targetValue) * 100;
                                    setFormData(prev => ({
                                        ...prev,
                                        progress_value: testValue,
                                        progress_percent: calculatedPercent
                                    }));
                                    console.log('🧪 Test với giá trị 75:', { testValue, targetValue, calculatedPercent });
                                }}
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            >
                                🧪 Test 75
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Test với giá trị 0
                                    const testValue = 0;
                                    const targetValue = parseFloat(keyResult?.target_value) || 123;
                                    const calculatedPercent = (testValue / targetValue) * 100;
                                    setFormData(prev => ({
                                        ...prev,
                                        progress_value: testValue,
                                        progress_percent: calculatedPercent
                                    }));
                                    console.log('🧪 Test với giá trị 0:', { testValue, targetValue, calculatedPercent });
                                }}
                                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                                🧪 Test 0
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Test với giá trị 100
                                    const testValue = 100;
                                    const targetValue = parseFloat(keyResult?.target_value) || 123;
                                    const calculatedPercent = (testValue / targetValue) * 100;
                                    setFormData(prev => ({
                                        ...prev,
                                        progress_value: testValue,
                                        progress_percent: calculatedPercent
                                    }));
                                    console.log('🧪 Test với giá trị 100:', { testValue, targetValue, calculatedPercent });
                                }}
                                className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                            >
                                🧪 Test 100
                            </button>
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