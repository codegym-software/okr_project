import React, { useRef, useState, useEffect } from "react";
import Dropdown, { DropdownItem, DropdownHeader, DropdownContent } from "../components/Dropdown";
import { navigateTo } from "../utils/navigation";

function SidebarItem({ icon, label, href, collapsed }) {
    return (
        <a
            href={href}
            className={`group flex items-center gap-4 rounded-xl px-4 py-3.5 text-[16px] font-semibold text-slate-700 hover:bg-slate-50 ${
                collapsed ? "justify-center" : ""
            }`}
        >
            <span className="inline-flex h-6 w-6 items-center justify-center text-slate-500 group-hover:text-blue-600">
                {icon}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
        </a>
    );
}

function DashboardSidebar({ open, user }) {
    const collapsed = !open;
    const isAdmin = user?.is_admin === true;
    const isMember = user?.role?.role_name?.toLowerCase() === 'member';
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
                        label="Chu kỳ"
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
                    href="/departments"
                    label="Phòng ban & Đội nhóm"
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
                {/* Báo cáo - chỉ hiển thị cho Manager */}
                {user?.role?.role_name?.toLowerCase() === 'manager' && (
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
                        <div className="text-sm text-slate-500">
                            {email}
                        </div>
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
            <div className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-10">
                <div className="p-6">
                    <div className="mb-8 flex items-center gap-3 px-2">
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
                        <a
                            href="/dashboard"
                            className="text-xl font-extrabold text-slate-900"
                        >
                            OKRun
                        </a>
                    </div>
                    <nav className="space-y-1">
                        <SidebarItem
                            collapsed={false}
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
                        />
                        {/* Chu kỳ - chỉ hiển thị cho Admin và Manager */}
                        {(!user?.role?.role_name || 
                          user.role.role_name.toLowerCase() === 'admin' || 
                          user.role.role_name.toLowerCase() === 'manager') && (
                            <SidebarItem
                                collapsed={false}
                                href="/cycles"
                                label="Chu kỳ"
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
                            collapsed={false}
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
                        {/* Báo cáo tổng quan - chỉ Admin */}
                        {user?.is_admin === true && (
                            <SidebarItem
                                collapsed={false}
                                href="/reports/company-overview"
                                label="Báo cáo"
                                icon={
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-10h4v24h-4V-3z" />
                                    </svg>
                                }
                            />
                        )}
                        {/* Phòng ban/Đội nhóm - chỉ hiển thị cho Admin và Manager */}
                        {(!user?.role?.role_name || 
                          user.role.role_name.toLowerCase() === 'admin' || 
                          user.role.role_name.toLowerCase() === 'manager') && (
                            <SidebarItem
                                collapsed={false}
                                href="/departments"
                                label="Phòng ban/Đội nhóm"
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
                        {/* Quản lý người dùng - chỉ hiển thị cho Admin */}
                        {user?.is_admin === true && (
                            <SidebarItem
                                collapsed={false}
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
                        {/* Báo cáo - chỉ hiển thị cho Manager */}
                        {user?.role?.role_name?.toLowerCase() === 'manager' && (
                            <SidebarItem
                                collapsed={false}
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
                </div>
            </div>
            
            {/* Header */}
            <div className="ml-64 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {/* Header title removed */}
                    </div>
                    <div className="flex items-center space-x-4">
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
            <div className="ml-64">
                {children}
            </div>
        </div>
    );
}
