import React, { useState, useEffect } from 'react';

export default function CheckInReminderBanner({ onDismiss }) {
    const [reminders, setReminders] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const fetchReminders = async () => {
            try {
                console.log('🔔 CheckInReminderBanner: Fetching reminders...');
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const response = await fetch('/my-objectives/check-in-reminders', {
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': token,
                    },
                });

                console.log('🔔 CheckInReminderBanner: Response status:', response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log('🔔 CheckInReminderBanner: Response data:', data);
                    if (data.success) {
                        console.log('🔔 CheckInReminderBanner: Has reminders:', data.data?.has_reminders);
                        console.log('🔔 CheckInReminderBanner: Total key results:', data.data?.total_key_results);
                        setReminders(data.data);
                    } else {
                        console.warn('🔔 CheckInReminderBanner: API returned success=false');
                    }
                } else {
                    console.error('🔔 CheckInReminderBanner: API error:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('🔔 CheckInReminderBanner: Error fetching check-in reminders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReminders();
    }, []);

    // Kiểm tra xem hôm nay có phải là thứ 2 (ngày đầu tuần) không
    const isWeeklyReminderDay = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
        // Thứ 2 = 1, hoặc có thể cấu hình để là ngày đầu tuần
        return dayOfWeek === 1; // Chỉ hiển thị vào thứ 2
    };

    // Kiểm tra xem có phải là ngày đầu tuần (Thứ 2) hoặc đã qua 3 ngày từ lần check-in cuối
    const shouldShowReminder = () => {
        // Luôn hiển thị nếu có reminders (không cần đợi thứ 2)
        return true;
    };

    // Lấy tuần hiện tại (năm + số tuần trong năm)
    const getCurrentWeek = () => {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const days = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        return `${today.getFullYear()}-W${weekNumber}`;
    };

    const handleDismiss = () => {
        setDismissed(true);
        // Lưu vào localStorage theo tuần (không phải theo ngày)
        // Mỗi tuần mới sẽ reset dismiss
        const dismissedKey = `checkin_reminder_dismissed_${getCurrentWeek()}`;
        localStorage.setItem(dismissedKey, 'true');
        if (onDismiss) {
            onDismiss();
        }
    };

    // Kiểm tra xem đã dismiss trong tuần này chưa
    useEffect(() => {
        const dismissedKey = `checkin_reminder_dismissed_${getCurrentWeek()}`;
        if (localStorage.getItem(dismissedKey) === 'true') {
            setDismissed(true);
        }
    }, []);

    // Kiểm tra điều kiện hiển thị
    if (loading) {
        console.log('🔔 CheckInReminderBanner: Still loading...');
        return null;
    }

    if (!reminders) {
        console.log('🔔 CheckInReminderBanner: No reminders data');
        return null;
    }

    if (!reminders.has_reminders) {
        console.log('🔔 CheckInReminderBanner: has_reminders is false');
        return null;
    }

    // Nếu đã dismiss trong tuần này → không hiển thị
    if (dismissed) {
        console.log('🔔 CheckInReminderBanner: Already dismissed this week');
        return null;
    }

    console.log('🔔 CheckInReminderBanner: Will display banner');

    // Logic hiển thị: Hiển thị mọi ngày nếu có OKR cần check-in
    // (Đã bỏ giới hạn chỉ hiển thị vào thứ 2 để dễ test)

    const { total_objectives, total_key_results, reminders: reminderList } = reminders;

    return (
        <div className="mb-4 rounded-lg border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1">
                    <div className="rounded-full bg-amber-500 p-1.5 shadow-sm flex-shrink-0">
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-700">
                        Bạn có <strong className="text-amber-700 font-bold">{total_key_results}</strong> Key Result{total_key_results > 1 ? 's' : ''} cần được check-in
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => {
                            // Lấy Key Result đầu tiên cần check-in
                            const firstReminder = reminderList[0];
                            if (firstReminder && firstReminder.key_results && firstReminder.key_results.length > 0) {
                                const firstKR = firstReminder.key_results[0];
                                // Lưu thông tin Key Result vào localStorage để auto-open check-in modal
                                localStorage.setItem('autoOpenCheckIn', JSON.stringify({
                                    kr_id: firstKR.kr_id,
                                    objective_id: firstReminder.objective_id,
                                    kr_title: firstKR.kr_title,
                                    current_value: firstKR.current_value,
                                    target_value: firstKR.target_value,
                                    progress_percent: firstKR.progress_percent,
                                    unit: firstKR.unit,
                                }));
                            }
                            // Chuyển đến trang mục tiêu
                            window.location.href = '/my-objectives';
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Cập nhật ngay
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        title="Đóng"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

