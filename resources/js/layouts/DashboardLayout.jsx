import React, { useRef, useState, useEffect, useCallback } from "react";
import Dropdown, {
    DropdownItem,
    DropdownHeader,
    DropdownContent,
} from "../components/Dropdown";
import { navigateTo } from "../utils/navigation";

function SidebarItem({ icon, label, href, collapsed, isActive = false }) {
    return (
        <a
            href={href}
            className={`group flex items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                ${
                    isActive
                        ? "bg-slate-100 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                } ${collapsed ? "justify-center" : ""}`}
        >
            <span
                className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                ${
                    isActive
                        ? "text-blue-600"
                        : "text-slate-500 group-hover:text-blue-600"
                }`}
            >
                {icon}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
        </a>
    );
}

function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetch("/api/notifications", {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Không thể tải thông báo");
            }
            setNotifications(json.data?.items || []);
            setUnreadCount(json.data?.unread ?? 0);
        } catch (err) {
            setError(err.message || "Không thể tải thông báo");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const csrfToken =
        typeof document !== "undefined"
            ? document
                  .querySelector('meta[name="csrf-token"]')
                  ?.getAttribute("content") || ""
            : "";

    const updateLocalReadState = (ids) => {
        const map = new Set(ids);
        setNotifications((prev) =>
            prev.map((item) =>
                map.has(item.notification_id)
                    ? { ...item, is_read: true }
                    : item
            )
        );
    };

    const markAsRead = async (notificationId) => {
        if (!notificationId) return;

        if (!csrfToken) {
            setError("Thiếu CSRF token. Vui lòng tải lại trang.");
            return;
        }

        try {
            const res = await fetch(
                `/api/notifications/${notificationId}/read`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRF-TOKEN": csrfToken,
                        Accept: "application/json",
                    },
                }
            );
            if (!res.ok) {
                throw new Error("Không thể cập nhật thông báo");
            }
            updateLocalReadState([notificationId]);
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            setError(err.message || "Không thể cập nhật thông báo");
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;

        if (!csrfToken) {
            setError("Thiếu CSRF token. Vui lòng tải lại trang.");
            return;
        }

        try {
            const res = await fetch("/api/notifications/mark-all-read", {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                    Accept: "application/json",
                },
            });
            if (!res.ok) {
                throw new Error("Không thể cập nhật thông báo");
            }
            updateLocalReadState(
                notifications.map((item) => item.notification_id)
            );
            setUnreadCount(0);
        } catch (err) {
            setError(err.message || "Không thể cập nhật thông báo");
            fetchNotifications();
        }
    };

    const formatTimestamp = (value) => {
        if (!value) return "";
        try {
            return new Date(value).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
            });
        } catch (e) {
            return value;
        }
    };

    const formatTypeLabel = (type) => {
        if (!type) return "THÔNG BÁO";
        const map = {
            okr_link: "OKR LINK",
        };
        return map[type] || type.replace(/_/g, " ").toUpperCase();
    };

    return (
        <Dropdown
            position="right"
            zIndex={10000}
            className="min-w-[320px]"
            trigger={
                <button
                    className="relative rounded-full border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 transition"
                    aria-label="Thông báo"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M12 2a7 7 0 00-7 7v4.09l-.94 1.88A1 1 0 005 16h14a1 1 0 00.88-1.45L19 13.09V9a7 7 0 00-7-7zm0 20a3 3 0 01-2.995-2.824L9 19h6a3 3 0 01-2.824 2.995L12 22z" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
            }
        >
            <DropdownHeader>
                <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">Thông báo</p>
                    <button
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        Đánh dấu đã đọc
                    </button>
                </div>
            </DropdownHeader>
            <DropdownContent>
                <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                    {loading && (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                            Đang tải thông báo...
                        </div>
                    )}
                    {!loading && notifications.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                            Bạn chưa có thông báo mới
                        </div>
                    )}
                    {!loading &&
                        notifications.map((item) => (
                            <button
                                key={item.notification_id}
                                onClick={() => markAsRead(item.notification_id)}
                                className={`w-full text-left px-4 py-3 text-sm transition ${
                                    item.is_read
                                        ? "bg-white hover:bg-slate-50"
                                        : "bg-indigo-50/80 hover:bg-indigo-100"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                            item.is_read
                                                ? "bg-slate-300"
                                                : "bg-indigo-500"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900 whitespace-pre-line leading-snug">
                                            {item.message}
                                        </p>
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                                {formatTypeLabel(item.type)}
                                            </span>
                                            <span className="tabular-nums">
                                                {formatTimestamp(
                                                    item.created_at
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                </div>
                {error && (
                    <div className="px-4 py-2 text-xs text-rose-600">
                        {error}
                    </div>
                )}
            </DropdownContent>
        </Dropdown>
    );
}

function DashboardSidebar({ open, user }) {
    const collapsed = !open;
    const isAdmin = user?.is_admin === true;
    const isMember = user?.role?.role_name?.toLowerCase() === "member";
    return (
        <aside
            className={`${
                open ? "w-72" : "w-20"
            } sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white p-4 transition-all duration-200 md:block`}
        >
            <div
                className={`mb-8 flex items-center ${
                    collapsed ? "justify-center" : "gap-3 px-2"
                }`}
            >
                <a
                    href="/dashboard"
                    className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-3"
                    title="Dashboard"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                </a>
                {!collapsed && (
                    <a
                        href="/dashboard"
                        className="text-xl font-extrabold text-slate-900"
                    >
                        OKRun
                    </a>
                )}
            </div>
            <nav className="space-y-1">
                <SidebarItem
                    collapsed={collapsed}
                    href="/dashboard"
                    label="Dashboard"
                    icon={
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                    }
                />
                {/* <SidebarItem
                    collapsed={collapsed}
                    href="/team"
                    label="Đội nhóm"
                    icon={
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13z" />
                        </svg>
                    }
                {/* Chu kỳ - Ẩn cho Member */}
                {!isMember && (
                    <SidebarItem
                        collapsed={collapsed}
                        href="/cycles"
                        label="Quản lý chu kỳ"
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 6V2l6 6-6 6V10C7.03 10 3 14.03 3 19c0 1.05.17 2.06.49 3.01C2.02 20.54 1 17.89 1 15c0-5.52 4.48-10 10-10z" />
                            </svg>
                        }
                    />
                )}
                <SidebarItem
                    collapsed={collapsed}
                    href="/my-objectives"
                    label="Mục tiêu"
                    icon={
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 015 5h2a7 7 0 10-7 7v-2a5 5 0 115-5h-2a3 3 0 11-3-3V7z" />
                        </svg>
                    }
                />
                <SidebarItem
                    collapsed={collapsed}
                    href="/company-okrs"
                    label="Mục tiêu công ty"
                    icon={
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 015 5h2a7 7 0 10-7 7v-2a5 5 0 115-5h-2a3 3 0 11-3-3V7z" />
                        </svg>
                    }
                />
                {/* Phòng ban & Đội nhóm - chỉ hiển thị cho Admin */}
                {isAdmin && (
                    <SidebarItem
                        collapsed={collapsed}
                        href="/departments"
                        label="Quản lý phòng ban"
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M3 4h18v2H3V4zm2 4h14v12H5V8zm4 2v8h6v-8H9z" />
                            </svg>
                        }
                    />
                )}
                {isAdmin && (
                    <SidebarItem
                        collapsed={collapsed}
                        href="/users"
                        label="Quản lý người dùng"
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13z" />
                            </svg>
                        }
                    />
                )}
                {/* Báo cáo - hiển thị cho Admin, CEO, Manager */}
                {canSeeReports && (
                    <SidebarItem
                        collapsed={collapsed}
                        href="/reports"
                        label="Báo cáo"
                        icon={
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                            </svg>
                        }
                    />
                )}
            </nav>
        </aside>
    );
}

function DashboardTopbar({
    onLogout,
    onToggleSidebar,
    user,
    onOpenProfile,
    onOpenPassword,
}) {
    const displayName = user?.name || "User";
    const email = user?.email || "user@example.com";
    const avatar = user?.avatar || "/images/default.png";

    return (
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:bg-slate-50"
                    aria-label="Toggle sidebar"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
                    </svg>
                </button>
                <input
                    className="hidden lg:block w-80 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tìm kiếm..."
                />
            </div>
            <div className="flex items-center gap-3">
                <NotificationBell />
                <Dropdown
                    position="right"
                    zIndex={10000}
                    className="min-w-[360px]"
                    trigger={
                        <button className="flex items-center gap-3 rounded-full border border-slate-200 bg-white pl-3 pr-4 py-2 hover:bg-slate-50">
                            <img
                                src={avatar}
                                alt="avatar"
                                className="h-10 w-10 rounded-full object-cover"
                            />
                            <span className="hidden md:block text-base font-semibold text-slate-700">
                                {displayName}
                            </span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-slate-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    }
                >
                    <DropdownHeader>
                        <div className="font-semibold text-slate-900">
                            {displayName}
                        </div>
                        <div className="text-sm text-slate-500">{email}</div>
                    </DropdownHeader>
                    <DropdownContent>
                        <DropdownItem onClick={onOpenProfile}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 1114 0H5z" />
                            </svg>
                            Hồ sơ cá nhân
                        </DropdownItem>
                        <DropdownItem onClick={onOpenPassword}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 11-16 0 8 8 0 0116 0z" />
                            </svg>
                            Đổi mật khẩu
                        </DropdownItem>
                        <DropdownItem onClick={onLogout} variant="danger">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3H10a2 2 0 00-2 2v4h2V5h10v14H10v-4H8v4a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
                            </svg>
                            Đăng xuất
                        </DropdownItem>
                    </DropdownContent>
                </Dropdown>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children, user }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const roleName = (user?.role?.role_name || "").toLowerCase();
    const isAdmin = user?.is_admin === true;
    const isManager = roleName === "manager";
    const canSeeTeamReport = isAdmin || isManager;
    const canSeeCompanyReport = isAdmin;

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const logout = async () => {
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");
            await fetch("/auth/logout", {
                method: "POST",
                headers: { "X-CSRF-TOKEN": token },
            });
            window.location.href = "/landingpage";
        } catch (e) {
            console.error(e);
        }
    };

    const openProfile = () => {
        window.location.href = "/profile";
    };

    const openPassword = () => {
        window.location.href = "/change-password";
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Sidebar */}
            <div
                className={`${
                    sidebarOpen ? "w-64" : "w-20"
                } bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-10 transition-all duration-300`}
            >
                <div className={`p-6 ${!sidebarOpen ? "px-3" : ""}`}>
                    <div
                        className={`mb-8 flex items-center gap-3 ${
                            !sidebarOpen ? "justify-center px-0" : "px-2"
                        }`}
                    >
                        <a
                            href="/dashboard"
                            className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-3 shrink-0"
                            title="Dashboard"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-white"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                            </svg>
                        </a>
                        {sidebarOpen && (
                            <a
                                href="/dashboard"
                                className="text-xl font-extrabold text-slate-900"
                            >
                                OKRun
                            </a>
                        )}
                    </div>
                    <nav className="space-y-2">
                        {/* Helper: kiểm tra trang hiện tại */}
                        {(() => {
                            const currentPath =
                                typeof window !== "undefined"
                                    ? window.location.pathname
                                    : "";
                            const isActive = (paths) =>
                                Array.isArray(paths)
                                    ? paths.some((p) =>
                                          currentPath.startsWith(p)
                                      )
                                    : currentPath.startsWith(paths);
                            const isTeamReportActive =
                                currentPath === "/reports";
                            const isCompanyReportActive =
                                currentPath.startsWith(
                                    "/reports/company-overview"
                                );

                            return (
                                <>
                                    {/* Tổng quan */}
                                    <SidebarItem
                                        collapsed={!sidebarOpen}
                                        href="/dashboard"
                                        label="Tổng quan"
                                        icon={
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-6 w-6"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                            >
                                                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                                            </svg>
                                        }
                                        isActive={isActive("/dashboard")}
                                    />

                                    {/* MỤC TIÊU - DROPDOWN HOÀN HẢO */}
                                    <div className="rounded-xl">
                                        {sidebarOpen ? (
                                            <details
                                                className="group [&_summary::-webkit-details-marker]:hidden"
                                                open={isActive([
                                                    "/my-objectives",
                                                    "/company-okrs",
                                                ])}
                                            >
                                                <summary
                                                    className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                                ${
                                    isActive([
                                        "/my-objectives",
                                        "/company-okrs",
                                    ])
                                        ? "bg-slate-100 text-blue-700"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                                                >
                                                    <span
                                                        className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                    ${
                                        isActive([
                                            "/my-objectives",
                                            "/company-okrs",
                                        ])
                                            ? "text-blue-600"
                                            : "text-slate-500 group-hover:text-blue-600"
                                    }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-6 w-6"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 015 5h2a7 7 0 10-7 7v-2a5 5 0 115-5h-2a3 3 0 11-3-3V7z" />
                                                        </svg>
                                                    </span>
                                                    <span className="truncate">
                                                        Mục tiêu
                                                    </span>
                                                    <span className="ml-auto text-slate-400 group-open:rotate-180 transition-transform">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75 75 0 01.02-1.06z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    </span>
                                                </summary>

                                                <div className="mt-1 pl-12 pr-2 space-y-1">
                                                    <a
                                                        href="/my-objectives"
                                                        className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all
                                        ${
                                            isActive("/my-objectives")
                                                ? "bg-blue-50 text-blue-700 font-bold shadow-sm"
                                                : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                                    >
                                                        Mục tiêu của tôi
                                                    </a>
                                                    <a
                                                        href="/company-okrs"
                                                        className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all
                                        ${
                                            isActive("/company-okrs")
                                                ? "bg-blue-50 text-blue-700 font-bold shadow-sm"
                                                : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                                    >
                                                        Mục tiêu công ty
                                                    </a>
                                                </div>
                                            </details>
                                        ) : (
                                            <a
                                                href="/my-objectives"
                                                className={`group flex items-center justify-center rounded-xl px-4 py-3.5 transition-all
                                ${
                                    isActive([
                                        "/my-objectives",
                                        "/company-okrs",
                                    ])
                                        ? "bg-slate-100 text-blue-700"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                                                title="Mục tiêu"
                                            >
                                                <span
                                                    className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                ${
                                    isActive([
                                        "/my-objectives",
                                        "/company-okrs",
                                    ])
                                        ? "text-blue-600"
                                        : "text-slate-500 group-hover:text-blue-600"
                                }`}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-6 w-6"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 015 5h2a7 7 0 10-7 7v-2a5 5 0 115-5h-2a3 3 0 11-3-3V7z" />
                                                    </svg>
                                                </span>
                                            </a>
                                        )}
                                    </div>

                                    {canSeeTeamReport && (
                                        <SidebarItem
                                            collapsed={!sidebarOpen}
                                            href="/reports"
                                            label={
                                                canSeeCompanyReport
                                                    ? "Báo cáo nhóm"
                                                    : "Báo cáo"
                                            }
                                            icon={
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-6 w-6"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                >
                                                    <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-8h4v22h-4z" />
                                                </svg>
                                            }
                                            isActive={isTeamReportActive}
                                        />
                                    )}
                                    {canSeeCompanyReport && (
                                        <SidebarItem
                                            collapsed={!sidebarOpen}
                                            href="/reports/company-overview"
                                            label="Báo cáo"
                                            icon={
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-6 w-6"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                >
                                                    <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-10h4v24h-4V-3z" />
                                                </svg>
                                            }
                                            isActive={isCompanyReportActive}
                                        />
                                    )}

                                    {/* Quản trị - Admin only */}
                                    {isAdmin && (
                                        <div className="rounded-xl">
                                            {sidebarOpen ? (
                                                <details
                                                    className="group [&_summary::-webkit-details-marker]:hidden"
                                                    open={isActive([
                                                        "/cycles",
                                                        "/departments",
                                                        "/users",
                                                    ])}
                                                >
                                                    <summary
                                                        className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                                    ${
                                        isActive([
                                            "/cycles",
                                            "/departments",
                                            "/users",
                                        ])
                                            ? "bg-slate-100 text-blue-700"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                                    >
                                                        <span
                                                            className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                        ${
                                            isActive([
                                                "/cycles",
                                                "/departments",
                                                "/users",
                                            ])
                                                ? "text-blue-600"
                                                : "text-slate-500 group-hover:text-blue-600"
                                        }`}
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-6 w-6"
                                                                viewBox="0 0 24 24"
                                                                fill="currentColor"
                                                            >
                                                                <path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                                                            </svg>
                                                        </span>
                                                        <span className="truncate">
                                                            Quản trị
                                                        </span>
                                                        <span className="ml-auto text-slate-400 group-open:rotate-180 transition-transform">
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75 75 0 01.02-1.06z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </span>
                                                    </summary>
                                                    <div className="mt-1 pl-12 pr-2 space-y-1">
                                                        {[
                                                            "/cycles",
                                                            "/departments",
                                                            "/users",
                                                        ].map((path, i) => {
                                                            const labels = [
                                                                "Quản lý chu kỳ",
                                                                "Quản lý phòng ban",
                                                                "Quản lý người dùng",
                                                            ];
                                                            return (
                                                                <a
                                                                    key={path}
                                                                    href={path}
                                                                    className={`block rounded-lg px-3 py-2 text-[15px] font-medium transition-all
                                                    ${
                                                        isActive(path)
                                                            ? "bg-blue-50 text-blue-700 font-bold shadow-sm"
                                                            : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                                                >
                                                                    {labels[i]}
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </details>
                                            ) : (
                                                <a
                                                    href="/cycles"
                                                    className={`group flex items-center justify-center rounded-xl px-4 py-3.5 transition-all
                                    ${
                                        isActive([
                                            "/cycles",
                                            "/departments",
                                            "/users",
                                        ])
                                            ? "bg-slate-100 text-blue-700"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                                    title="Quản trị"
                                                >
                                                    <span
                                                        className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                    ${
                                        isActive([
                                            "/cycles",
                                            "/departments",
                                            "/users",
                                        ])
                                            ? "text-blue-600"
                                            : "text-slate-500 group-hover:text-blue-600"
                                    }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-6 w-6"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                                                        </svg>
                                                    </span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </nav>
                </div>
            </div>

            {/* Header */}
            <div
                className={`${
                    sidebarOpen ? "ml-64" : "ml-20"
                } bg-white border-b border-gray-200 px-6 py-4 transition-all duration-300`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleSidebar}
                            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center space-x-4">
                        <NotificationBell />
                        <Dropdown
                            position="right"
                            zIndex={10000}
                            className="min-w-[360px]"
                            trigger={
                                <button className="flex items-center gap-3 rounded-full border border-slate-200 bg-white pl-3 pr-4 py-2 hover:bg-slate-50">
                                    <img
                                        src={
                                            user?.avatar ||
                                            "/images/default.png"
                                        }
                                        alt="avatar"
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <span className="hidden md:block text-base font-semibold text-slate-700">
                                        {user?.name || "User"}
                                    </span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 text-slate-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            }
                        >
                            <DropdownHeader>
                                <div className="font-semibold text-slate-900">
                                    {user?.name || "User"}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {user?.email || "user@example.com"}
                                </div>
                            </DropdownHeader>
                            <DropdownContent>
                                <DropdownItem onClick={openProfile}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 1114 0H5z" />
                                    </svg>
                                    Hồ sơ cá nhân
                                </DropdownItem>
                                <DropdownItem onClick={openPassword}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 11-16 0 8 8 0 0116 0z" />
                                    </svg>
                                    Đổi mật khẩu
                                </DropdownItem>
                                <DropdownItem onClick={logout} variant="danger">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3H10a2 2 0 00-2 2v4h2V5h10v14H10v-4H8v4a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
                                    </svg>
                                    Đăng xuất
                                </DropdownItem>
                            </DropdownContent>
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div
                className={`${
                    sidebarOpen ? "ml-64" : "ml-20"
                } transition-all duration-300`}
            >
                {children}
            </div>
        </div>
    );
}
