import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './ui';
import CheckInProgressChart from './CheckInProgressChart';
import { canCheckInKeyResult } from '../utils/checkinPermissions';

export default function CheckInModal({
    open,
    onClose,
    keyResult,
    objectiveId,
    onSuccess,
    initialTab = 'chart', // Add new prop with default value
    objective = null, // Thêm prop objective để kiểm tra quyền
    currentUser = null // Thêm prop currentUser để kiểm tra quyền
}) {
    // ... (rest of the component)

    const [error, setError] = useState('');
    const [checkIns, setCheckIns] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        progress_value: 0,
        progress_percent: 0,
        check_in_type: 'quantity',
        status: '',
        notes: ''
    });
    const [showStatusList, setShowStatusList] = useState(false);
    const statusDropdownRef = useRef(null);

    const statusOptions = [
        { value: 'not_start', label: 'Bản nháp', color: '#4b5563' },
        { value: 'on_track', label: 'Đang thực hiện', color: '#16a34a' },
        { value: 'at_risk', label: 'Nguy cơ bị trễ', color: '#f59e0b' },
        { value: 'in_trouble', label: 'Gặp vấn đề', color: '#e11d48' },
        { value: 'completed', label: 'Hoàn thành', color: '#15803d' },
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setShowStatusList(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
        }
        if (!open) {
            setShowStatusList(false);
        }
    }, [open, initialTab]);


    // ... (rest of the component)

    // Load checkin history function
    const loadCheckInHistory = React.useCallback(async () => {
        const currentKeyResult = keyResult;
        const currentObjectiveId = objectiveId || currentKeyResult?.objective_id;
        
        if (!currentObjectiveId || !currentKeyResult) {
            return;
        }

        const currentKrId = currentKeyResult?.kr_id || currentKeyResult?.key_result_id || currentKeyResult?.id;
        if (!currentKrId) {
            return;
        }

        setLoadingHistory(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(`/api/check-in/${currentObjectiveId}/${currentKrId}/history`, {
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
    }, [objectiveId, keyResult]);

    // Cập nhật formData khi keyResult thay đổi
    useEffect(() => {
        const currentKeyResult = keyResult;
        if (currentKeyResult) {
            console.log('🔧 CheckInModal: keyResult updated:', {
                kr_id: currentKeyResult.kr_id,
                key_result_id: currentKeyResult.key_result_id,
                id: currentKeyResult.id,
                objective_id: currentKeyResult.objective_id,
                assigned_to: currentKeyResult.assigned_to,
                user_id: currentKeyResult.user_id,
                fullKeyResult: currentKeyResult
            });
            
            setFormData({
                progress_value: parseFloat(currentKeyResult.current_value) || 0,
                progress_percent: parseFloat(currentKeyResult.progress_percent) || 0,
                check_in_type: 'quantity',
                status: currentKeyResult.status || '',
                notes: ''
            });
            setError(''); // Reset error khi keyResult thay đổi
        } else if (open) {
            // Chỉ warning nếu modal đang mở
            console.warn('🔧 CheckInModal: keyResult is null or undefined but modal is open');
        }
    }, [keyResult, open]);

    // Load checkin history khi modal mở
    useEffect(() => {
        const currentKeyResult = keyResult;
        const currentObjectiveId = objectiveId || currentKeyResult?.objective_id;
        
        if (open && currentKeyResult && currentObjectiveId) {
            loadCheckInHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, keyResult, objectiveId]);

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

    // Kiểm tra quyền check-in khi modal mở
    useEffect(() => {
        if (open && keyResult && objective && currentUser) {
            const hasPermission = canCheckInKeyResult(currentUser, keyResult, objective);
            if (!hasPermission) {
                setError('Bạn không có quyền check-in cho Key Result này.');
                // Đóng modal sau 2 giây
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        }
    }, [open, keyResult, objective, currentUser, onClose]);

    // Null check for keyResult - hiển thị message thay vì return null
    // Phải đặt sau tất cả hooks để tuân thủ Rules of Hooks
    const currentKeyResult = keyResult;
    if (!currentKeyResult) {
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

    // Kiểm tra quyền trước khi render form
    const hasPermission = currentUser && objective 
        ? canCheckInKeyResult(currentUser, keyResult, objective)
        : true; // Nếu không có currentUser hoặc objective, để backend xử lý

    const getStatusOption = (value) => statusOptions.find((opt) => opt.value === value) || null;

    const handleInputChange = (field, value) => {
        const currentKeyResult = keyResult;
        console.log('🔧 handleInputChange called:', { field, value, type: typeof value });
        
        if (field === 'progress_value') {
            const numValue = parseFloat(value) || 0;
            console.log('🔧 Progress value change:', { 
                old_value: formData.progress_value, 
                new_value: numValue,
                target_value: currentKeyResult?.target_value 
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
                target_value: currentKeyResult?.target_value 
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

        // Sử dụng keyResult từ prop
        const currentKeyResult = keyResult;

        // Kiểm tra keyResult trước
        if (!currentKeyResult) {
            setError('Không tìm thấy thông tin Key Result. Vui lòng đóng và mở lại modal.');
            setLoading(false);
            return;
        }

        // Đảm bảo có objective_id
        const currentObjectiveId = objectiveId || currentKeyResult.objective_id;
        if (!currentObjectiveId) {
            console.error('CheckInModal: Missing objective_id:', currentKeyResult);
            setError('Không tìm thấy Objective ID. Vui lòng thử lại.');
            setLoading(false);
            return;
        }

        const krId = currentKeyResult.kr_id || currentKeyResult.key_result_id || currentKeyResult.id;
        if (!krId) {
            console.error('CheckInModal: keyResult missing ID:', currentKeyResult);
            setError('Không tìm thấy Key Result ID. Vui lòng thử lại.');
            setLoading(false);
            return;
        }

        // Kiểm tra quyền check-in trước khi submit
        if (currentUser && objective) {
            const hasPermission = canCheckInKeyResult(currentUser, keyResult, objective);
            if (!hasPermission) {
                setError('Bạn không có quyền check-in cho Key Result này.');
                setLoading(false);
                return;
            }
        }

        if (formData.progress_value < 0) {
            setError('Giá trị tiến độ không thể âm');
            setLoading(false);
            return;
        }

        // Debug: Log form data before submit
        console.log('🔧 Submitting check-in:', {
            objectiveId: currentObjectiveId,
            krId: krId,
            keyResult: {
                kr_id: currentKeyResult.kr_id,
                key_result_id: currentKeyResult.key_result_id,
                id: currentKeyResult.id,
                assigned_to: currentKeyResult.assigned_to,
                user_id: currentKeyResult.user_id,
            },
            formData: {
                progress_value: formData.progress_value,
                progress_percent: formData.progress_percent,
                check_in_type: formData.check_in_type,
                status: formData.status,
                notes: formData.notes
            }
        });

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            if (!token) {
                throw new Error('Không tìm thấy CSRF token. Vui lòng tải lại trang.');
            }
            
            const checkInUrl = `/check-in/${currentObjectiveId}/${krId}`;
            console.log('🔧 Check-in URL:', checkInUrl);
            
            const response = await fetch(checkInUrl, {
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

            console.log('🔧 Check-in response:', {
                ok: response.ok,
                status: response.status,
                success: data.success,
                message: data.message,
                data: data.data
            });

            if (!response.ok || !data.success) {
                const errorMessage = data.message || `Cập nhật tiến độ thất bại (${response.status})`;
                console.error('🔧 Check-in failed:', errorMessage, data);
                throw new Error(errorMessage);
            }

            // Reload checkin history để cập nhật chart
            await loadCheckInHistory();

            // Gọi callback để cập nhật UI
            if (onSuccess) {
                // Backend trả về: { success: true, message: "...", data: { objective: ... } }
                // Cần truyền data.data (chứa objective) cho onSuccess
                const responseData = data.data || {};
                console.log('🔧 Calling onSuccess with:', {
                    has_objective: !!responseData.objective,
                    objective_id: responseData.objective?.objective_id,
                    key_results_count: responseData.objective?.key_results?.length || responseData.objective?.keyResults?.length || 0,
                    sample_kr: responseData.objective?.key_results?.[0] || responseData.objective?.keyResults?.[0] || null
                });
                onSuccess(responseData);
            } else {
                console.warn('🔧 onSuccess callback is not provided');
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

    // Kiểm tra xem Key Result đã hoàn thành chưa
    const isCompleted = currentKeyResult?.status === 'completed' || currentKeyResult?.status === 'closed';

    return (
        <Modal open={open} onClose={onClose} title="Cập nhật tiến độ Key Result">
            <form onSubmit={handleSubmit} className="space-y-3 -m-2">
                {/* Disable form nếu không có quyền */}
                {!hasPermission && (
                    <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm mb-4">
                        Bạn không có quyền check-in cho Key Result này.
                    </div>
                )}
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
                            {currentKeyResult.kr_title}
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
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            placeholder="Nhập giá trị..."
                            required
                            disabled={!hasPermission}
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
                        Trạng thái
                    </label>
                    <div className="relative" ref={statusDropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                if (!hasPermission) return;
                                setShowStatusList((prev) => !prev);
                            }}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-left flex items-center justify-between gap-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${!hasPermission ? 'bg-slate-100 text-slate-400' : ''}`}
                            disabled={!hasPermission}
                        >
                            <span className="flex items-center gap-2">
                                {getStatusOption(formData.status)?.value ? (
                                    <>
                                        <span
                                            className="inline-block h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: getStatusOption(formData.status)?.color }}
                                        ></span>
                                        <span>{getStatusOption(formData.status)?.label}</span>
                                    </>
                                ) : (
                                    <span className="text-slate-400">-- chọn trạng thái --</span>
                                )}
                            </span>
                            <svg
                                className="h-4 w-4 text-slate-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showStatusList && (
                            <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                                <ul className="max-h-56 overflow-y-auto py-1">
                                    {statusOptions.map((option) => (
                                        <li key={option.value}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleInputChange('status', option.value);
                                                    setShowStatusList(false);
                                                }}
                                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-100 ${
                                                    formData.status === option.value ? 'bg-slate-50' : ''
                                                }`}
                                            >
                                                <span
                                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: option.color }}
                                                ></span>
                                                <span>{option.label}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                    {/* Tabs for Chart and History */}
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('chart')}
                                className={`${
                                    activeTab === 'chart'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                Biểu đồ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`${
                                    activeTab === 'history'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                Lịch sử
                            </button>
                        </nav>
                    </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'chart' && (
                        <>
                            {!loadingHistory && checkIns && checkIns.length > 0 && keyResult && (
                                <div className="w-full overflow-x-auto">
                                    <CheckInProgressChart
                                        checkIns={checkIns}
                                        width={700}
                                        height={200}
                                        keyResult={keyResult}
                                    />
                                </div>
                            )}
                            {loadingHistory && <div className="text-center py-4">Đang tải biểu đồ...</div>}
                            {!loadingHistory && (!checkIns || checkIns.length === 0) && (
                                <div className="text-center py-4 text-slate-500">Chưa có dữ liệu check-in.</div>
                            )}
                        </>
                    )}
                    {activeTab === 'history' && (
                        <div className="max-h-48 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ngày</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Giá trị</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tiến độ</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {checkIns.map(checkin => (
                                        <tr key={checkin.id}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{new Date(checkin.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900 font-medium">{checkin.progress_value}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{checkin.progress_percent.toFixed(1)}%</td>
                                            <td className="px-4 py-2 text-sm text-slate-500">{checkin.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Ghi chú (tùy chọn)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        placeholder="Mô tả ngắn về tiến độ công việc..."
                        rows={2}
                        maxLength={1000}
                        disabled={!hasPermission}
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
                        disabled={loading || !hasPermission}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Đang lưu...' : 'Cập nhật'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}