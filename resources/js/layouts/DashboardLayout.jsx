import React, { useState } from "react";
import Dropdown, {
    DropdownItem,
    DropdownHeader,
    DropdownContent,
} from "../components/Dropdown";
import NotificationBell from "../components/NotificationBell";

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

    // Helper: kiểm tra trang hiện tại
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    const isActive = (paths) =>
        Array.isArray(paths)
            ? paths.some((p) => currentPath.startsWith(p))
            : currentPath.startsWith(paths);
    const isTeamReportActive = currentPath === "/reports" || currentPath === "/reports/manager";
    const isCompanyReportActive = currentPath.startsWith("/reports/company-overview");

    return (
        <div className="min-h-screen bg-white">
            {/* Sidebar */}
            <div
                className={`${
                    sidebarOpen ? "w-67" : "w-20"
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
                        {/* Tổng quan */}
                        <SidebarItem
                            collapsed={!sidebarOpen}
                            href="/dashboard"
                            label="Tổng quan"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                                </svg>
                            }
                            isActive={isActive("/dashboard")}
                        />

                        {/* MỤC TIÊU */}
                        <div className="rounded-xl">
                            {sidebarOpen ? (
                                <details className="group [&_summary::-webkit-details-marker]:hidden" open={isActive(["/my-objectives", "/company-okrs"])}>
                                    <summary className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                                        ${isActive(["/my-objectives", "/company-okrs"]) ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                                        <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                            ${isActive(["/my-objectives", "/company-okrs"]) ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 015 5h2a7 7 0 10-7 7v-2a5 5 0 115-5h-2a3 3 0 11-3-3V7z" />
                                            </svg>
                                        </span>
                                        <span className="truncate">Mục tiêu</span>
                                        <span className="ml-auto text-slate-400 group-open:rotate-180 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    </summary>
                                    <div className="mt-1 pl-12 pr-2 space-y-1">
                                        <a href="/my-objectives" className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all
                                            ${isActive("/my-objectives") ? "bg-blue-50 text-blue-700 font-bold shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}>
                                            Mục tiêu của tôi
                                        </a>
                                        <a href="/company-okrs" className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all
                                            ${isActive("/company-okrs") ? "bg-blue-50 text-blue-700 font-bold shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}>
                                            Mục tiêu công ty
                                        </a>
                                    </div>
                                </details>
                            ) : (
                                <a href="/my-objectives" className={`group flex items-center justify-center rounded-xl px-4 py-3.5 transition-all
                                    ${isActive(["/my-objectives", "/company-okrs"]) ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`} title="Mục tiêu">
                                    <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                        ${isActive(["/my-objectives", "/company-okrs"]) ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 015 5h2a7 7 0 10-7 7v-2a5 5 0 115-5h-2a3 3 0 11-3-3V7z" />
                                        </svg>
                                    </span>
                                </a>
                            )}
                        </div>

                        {/* BÁO CÁO */}
                        {(canSeeTeamReport || canSeeCompanyReport) && (
                            <div className="rounded-xl">
                                {canSeeTeamReport && !canSeeCompanyReport ? (
                                    // Chỉ có Báo cáo nhóm (Manager)
                                    sidebarOpen ? (
                                        <a
                                            href="/reports/manager"
                                            className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                                            ${isTeamReportActive ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                            ${isTeamReportActive ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-8h4v22h-4z" />
                                                </svg>
                                            </span>
                                            <span className="truncate">Báo cáo phòng ban</span>
                                        </a>
                                    ) : (
                                        <a
                                            href="/reports/manager"
                                            className={`group flex items-center justify-center rounded-xl px-4 py-3.5 transition-all
                                            ${isTeamReportActive ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                                            title="Báo cáo"
                                        >
                                            <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                            ${isTeamReportActive ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-8h4v22h-4z" />
                                                </svg>
                                            </span>
                                        </a>
                                    )
                                ) : (
                                    // Admin có cả 2 báo cáo
                                    sidebarOpen ? (
                                        <details
                                            className="group [&_summary::-webkit-details-marker]:hidden"
                                            open={isTeamReportActive || isCompanyReportActive}
                                        >
                                            <summary
                                                className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                                                ${isTeamReportActive || isCompanyReportActive ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                                            >
                                                <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                                ${isTeamReportActive || isCompanyReportActive ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-8h4v22h-4z" />
                                                    </svg>
                                                </span>
                                                <span className="truncate">Báo cáo</span>
                                                <span className="ml-auto text-slate-400 group-open:rotate-180 transition-transform">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            </summary>
                                            <div className="mt-1 pl-12 pr-2 space-y-1">
                                                {canSeeTeamReport && (
                                                    <a
                                                        href="/reports/manager"
                                                        className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all
                                                        ${isTeamReportActive ? "bg-blue-50 text-blue-700 font-bold shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
                                                    >
                                                        Báo cáo phòng ban
                                                    </a>
                                                )}
                                                {canSeeCompanyReport && (
                                                    <a
                                                        href="/reports/company-overview"
                                                        className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all
                                                        ${isCompanyReportActive ? "bg-blue-50 text-blue-700 font-bold shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
                                                    >
                                                        Báo cáo công ty
                                                    </a>
                                                )}
                                            </div>
                                        </details>
                                    ) : (
                                        <a
                                            href="/reports/manager"
                                            className={`group flex items-center justify-center rounded-xl px-4 py-3.5 transition-all
                                            ${isTeamReportActive || isCompanyReportActive ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                                            title="Báo cáo"
                                        >
                                            <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                            ${isTeamReportActive || isCompanyReportActive ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-8h4v22h-4z" />
                                                </svg>
                                            </span>
                                        </a>
                                    )
                                )}
                            </div>
                        )}

                        {/* QUẢN TRỊ - chỉ Admin */}
                        {isAdmin && (
                            <div className="rounded-xl">
                                {sidebarOpen ? (
                                    <details className="group [&_summary::-webkit-details-marker]:hidden" open={isActive(["/cycles", "/departments", "/users"])}>
                                        <summary className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold transition-all
                                            ${isActive(["/cycles", "/departments", "/users"]) ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                                            <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                                ${isActive(["/cycles", "/departments", "/users"]) ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                                                </svg>
                                            </span>
                                            <span className="truncate">Quản trị</span>
                                            <span className="ml-auto text-slate-400 group-open:rotate-180 transition-transform">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        </summary>
                                        <div className="mt-1 pl-12 pr-2 space-y-1">
                                            {["/cycles", "/departments", "/users"].map((path, i) => {
                                                const labels = ["Quản lý chu kỳ", "Quản lý phòng ban", "Quản lý người dùng"];
                                                return (
                                                    <a
                                                        key={path}
                                                        href={path}
                                                        className={`block rounded-lg px-3 py-2 text-[15px] font-medium transition-all
                                                            ${isActive(path) ? "bg-blue-50 text-blue-700 font-bold shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
                                                    >
                                                        {labels[i]}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </details>
                                ) : (
                                    <a href="/cycles" className={`group flex items-center justify-center rounded-xl px-4 py-3.5 transition-all
                                        ${isActive(["/cycles", "/departments", "/users"]) ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`} title="Quản trị">
                                        <span className={`inline-flex h-6 w-6 items-center justify-center transition-colors
                                            ${isActive(["/cycles", "/departments", "/users"]) ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                                            </svg>
                                        </span>
                                    </a>
                                )}
                            </div>
                        )}
                    </nav>                       
                </div>
            </div>

            {/* Header */}
            <div
                className={`${
                    sidebarOpen ? "ml-67" : "ml-20"
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
                                        src={user?.avatar || "/images/default.png"}
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
                    sidebarOpen ? "ml-67" : "ml-20"
                } transition-all duration-300`}
            >
                {children}
            </div>
        </div>
    );
}
