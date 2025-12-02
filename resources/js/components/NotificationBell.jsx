import React, { useState, useEffect, useRef } from 'react';

export default function NotificationBell() {
    console.log('🔔 NotificationBell: Component rendering');
    
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Debug: Log when component mounts
    useEffect(() => {
        console.log('🔔 NotificationBell: Component mounted, fetching unread count');
        fetchUnreadCount();
    }, []);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch('/api/notifications?per_page=10', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotifications(data.data.notifications);
                    setUnreadCount(data.data.unread_count);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch unread count only
    const fetchUnreadCount = async () => {
        try {
            console.log('🔔 NotificationBell: Fetching unread count');
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (!token) {
                console.warn('🔔 NotificationBell: No CSRF token found');
            }
            const response = await fetch('/api/notifications/unread-count', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
            });

            console.log('🔔 NotificationBell: Unread count response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('🔔 NotificationBell: Unread count data:', data);
                if (data.success) {
                    setUnreadCount(data.data.unread_count);
                }
            } else {
                console.error('🔔 NotificationBell: Failed to fetch unread count:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('🔔 NotificationBell: Error fetching unread count:', error);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update local state
                    setNotifications(prev => 
                        prev.map(n => 
                            n.notification_id === notificationId 
                                ? { ...n, is_read: true }
                                : n
                        )
                    );
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                }
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId) => {
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
                    // Update unread count if it was unread
                    const deleted = notifications.find(n => n.notification_id === notificationId);
                    if (deleted && !deleted.is_read) {
                        setUnreadCount(prev => Math.max(0, prev - 1));
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Fetch on mount and when dropdown opens
    useEffect(() => {
        fetchUnreadCount();
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchUnreadCount();
            if (isOpen) {
                fetchNotifications();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        
        return date.toLocaleDateString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    return (
        <div className="relative" ref={dropdownRef} style={{ display: 'block' }}>
            <button
                onClick={() => {
                    console.log('Notification bell clicked, isOpen:', isOpen);
                    setIsOpen(!isOpen);
                }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                aria-label="Thông báo"
                type="button"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 max-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <p className="mt-2">Đang tải...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <svg
                                    className="mx-auto h-12 w-12 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                                <p className="mt-2">Không có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notification) => {
                                    // Check if this is a link request notification
                                    const isLinkRequest = notification.type === 'link_request' || 
                                        notification.message?.includes('đề nghị liên kết') ||
                                        notification.message?.includes('yêu cầu liên kết');
                                    
                                    const handleNotificationClick = () => {
                                        // Mark as read first
                                        if (!notification.is_read) {
                                            markAsRead(notification.notification_id);
                                        }
                                        // Navigate based on notification type
                                        if (isLinkRequest) {
                                            setIsOpen(false);
                                            window.location.href = '/my-objectives';
                                        }
                                    };

                                    return (
                                        <div
                                            key={notification.notification_id}
                                            className={`p-4 hover:bg-slate-50 transition-colors ${
                                                !notification.is_read ? 'bg-blue-50' : ''
                                            } ${isLinkRequest ? 'cursor-pointer' : ''}`}
                                            onClick={isLinkRequest ? handleNotificationClick : undefined}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                                    !notification.is_read ? 'bg-blue-600' : 'bg-transparent'
                                                }`}></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${
                                                        !notification.is_read 
                                                            ? 'font-semibold text-slate-900' 
                                                            : 'text-slate-700'
                                                    }`}>
                                                        {notification.message}
                                                        {isLinkRequest && (
                                                            <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                                                                <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {formatDate(notification.created_at)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={() => markAsRead(notification.notification_id)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                            title="Đánh dấu đã đọc"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.notification_id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-200 text-center">
                            <a
                                href="#"
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                onClick={(e) => {
                                    e.preventDefault();
                                    // TODO: Navigate to full notifications page
                                }}
                            >
                                Xem tất cả thông báo
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

