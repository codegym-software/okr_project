import React, { useRef, useState, useEffect } from "react";

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
                <SidebarItem
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
                />
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
                    label="Phòng ban"
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
    const [open, setOpen] = useState(false);
    const toggle = () => setOpen((o) => !o);
    const triggerRef = useRef(null);
    const [triggerWidth, setTriggerWidth] = useState(0);
    useEffect(() => {
        const measure = () => {
            if (triggerRef.current)
                setTriggerWidth(triggerRef.current.offsetWidth);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);
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
                <div className="relative">
                    <button
                        ref={triggerRef}
                        onClick={toggle}
                        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white pl-3 pr-4 py-2 hover:bg-slate-50"
                        aria-haspopup="menu"
                    >
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
                    {open && (
                        <div
                            className="absolute right-0 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                            style={{ minWidth: Math.max(triggerWidth, 360) }}
                        >
                            <div className="border-b border-slate-200 p-5">
                                <div className="font-semibold text-slate-900">
                                    {displayName}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {email}
                                </div>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        onOpenProfile();
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 1114 0H5z" />
                                    </svg>
                                    Hồ sơ cá nhân
                                </button>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        onOpenPassword();
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 11-16 0 8 8 0 0116 0z" />
                                    </svg>
                                    Đổi mật khẩu
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3H10a2 2 0 00-2 2v4h2V5h10v14H10v-4H8v4a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
                                    </svg>
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
    return (
        <div className="flex min-h-screen bg-slate-50">
            <DashboardSidebar open={sidebarOpen} user={user} />
            <div className="flex w-full flex-col">
                <DashboardTopbar
                    user={user}
                    onLogout={logout}
                    onToggleSidebar={() => setSidebarOpen((o) => !o)}
                    onOpenProfile={() => {
                        window.history.pushState({}, "", "/profile");
                        window.dispatchEvent(new Event("popstate"));
                    }}
                    onOpenPassword={() => {
                        window.history.pushState({}, "", "/change-password");
                        window.dispatchEvent(new Event("popstate"));
                    }}
                />
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
