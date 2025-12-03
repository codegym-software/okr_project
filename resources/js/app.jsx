import React, { useState, useEffect } from "react";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./components/Dashboard";
import UsersPage from "./pages/UsersPage";
import ReportPage from "./pages/ReportPage";
import CyclesPanel from "./pages/CyclesPanel";
import DepartmentsPanel from "./pages/DepartmentsPanel";
import ObjectivesPage from "./pages/ObjectivesPage";
import ProfileSettings from "./pages/ProfileSettings";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import CompanyOverviewReport from "./pages/CompanyOverviewReport";
import ReportManager from "./pages/ReportManager";
import { GradientText } from "./components/ui";
import CompanyOkrList from "./pages/CompanyOkrList";
import OKRTreePage from "./pages/OKRTreePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import FirstLoginChangePasswordPage from "./pages/FirstLoginChangePasswordPage";
import ArchivedOkrsPage from "./pages/ArchivedOkrsPage";

function NavBar({ activeTab, onChangeTab }) {
    const go = (tab) => {
        onChangeTab(tab);
        window.history.pushState(
            {},
            "",
            tab === "features"
                ? "/#features"
                : tab === "pricing"
                ? "/#pricing"
                : "/"
        );
    };
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
                <a
                    href="/"
                    className="flex items-center gap-2"
                    onClick={(e) => {
                        e.preventDefault();
                        go("home");
                    }}
                >
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-sm">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5a1 1 0 10-2 0v4.382l-3.447 3.447a1 1 0 101.414 1.414l3.74-3.74A1 1 0 0013 12V7z" />
                        </svg>
                    </div>
                    <span className="text-xl font-extrabold tracking-tight text-slate-900">
                        OKRun
                    </span>
                </a>
                <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 sm:flex">
                    <a
                        className={`${
                            activeTab === "features"
                                ? "text-blue-600"
                                : "hover:text-blue-600"
                        } transition`}
                        href="#features"
                        onClick={(e) => {
                            e.preventDefault();
                            go("features");
                        }}
                    >
                        Tính năng
                    </a>
                    <a
                        className={`${
                            activeTab === "pricing"
                                ? "text-blue-600"
                                : "hover:text-blue-600"
                        } transition`}
                        href="#pricing"
                        onClick={(e) => {
                            e.preventDefault();
                            go("pricing");
                        }}
                    >
                        Giá
                    </a>
                </nav>
                <div className="flex items-center gap-3">
                    <a
                        href="/signup"
                        onClick={(e) => {
                            e.preventDefault();
                            window.location.href = "/signup";
                        }}
                        className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 sm:block"
                    >
                        Đăng ký
                    </a>
                    <a
                        href="/login"
                        onClick={(e) => {
                            e.preventDefault();
                            window.location.href = "/login";
                        }}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                    >
                        Đăng nhập
                    </a>
                </div>
            </div>
        </header>
    );
}

function Hero({ onShowFeatures }) {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="mx-auto max-w-6xl items-center gap-10 px-4 pb-28 pt-40 text-center sm:px-6 lg:px-8">
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Ra
                    mắt bản Beta AI khuyến nghị OKR
                </p>
                <h1 className="text-5xl font-extrabold leading-tight text-slate-900 sm:text-6xl">
                    <GradientText>OKR hiện đại</GradientText> giúp đội ngũ tập
                    trung và bứt phá
                </h1>
                <p className="mx-auto mt-6 max-w-4xl text-xl leading-9 text-slate-600">
                    Đặt mục tiêu rõ ràng, theo dõi kết quả theo thời gian thực
                    và cộng tác mượt mà. OKRun mang đến trải nghiệm OKR trực
                    quan, mạnh mẽ và dễ sử dụng.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <a
                        href="/signup"
                        onClick={(e) => {
                            e.preventDefault();
                            window.location.href = "/signup";
                        }}
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-4 text-lg font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl"
                    >
                        Dùng thử miễn phí
                    </a>
                    <button
                        onClick={onShowFeatures}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Xem tính năng
                    </button>
                </div>
                <div className="mt-7 flex items-center justify-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                        99.9% uptime
                    </div>
                    <div>|</div>
                    <div>Bảo mật theo tiêu chuẩn OAuth2/OIDC</div>
                </div>
            </div>
        </section>
    );
}

function Section({ id, title, children }) {
    return (
        <section id={id} className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        {title}
                    </h2>
                </div>
                <div className="mt-10">{children}</div>
            </div>
        </section>
    );
}

function Features() {
    const items = [
        {
            title: "Theo dõi tiến độ",
            desc: "Biểu đồ trực quan và báo cáo chi tiết giúp bám sát mục tiêu.",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 -4h4v18h-4V3z" />
                </svg>
            ),
            color: "from-blue-600 to-indigo-600",
        },
        {
            title: "Cộng tác đội nhóm",
            desc: "Phân quyền linh hoạt, bình luận và theo dõi hoạt động rõ ràng.",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13z" />
                </svg>
            ),
            color: "from-emerald-600 to-teal-600",
        },
        {
            title: "Đặt mục tiêu thông minh",
            desc: "Thiết lập SMART và gợi ý OKR phù hợp theo dữ liệu lịch sử.",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M11 2v20c-4.97-.5-9-4.78-9-10S6.03 2.5 11 2zm2 0c4.97.5 9 4.78 9 10s-4.03 9.5-9 10V2z" />
                </svg>
            ),
            color: "from-purple-600 to-fuchsia-600",
        },
    ];
    return (
        <Section id="features" title="Tính năng nổi bật">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f, i) => (
                    <div
                        key={i}
                        className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                        <div
                            className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${f.color} p-3 text-white shadow`}
                        >
                            {f.icon}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {f.title}
                        </h3>
                        <p className="mt-2 text-slate-600">{f.desc}</p>
                    </div>
                ))}
            </div>
        </Section>
    );
}

function Pricing() {
    return (
        <Section id="pricing" title="Gói giá">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900">
                        Starter
                    </h3>
                    <p className="mt-2 text-slate-600">
                        Dành cho nhóm nhỏ, thử nghiệm OKR.
                    </p>
                    <div className="mt-4 text-3xl font-extrabold">0đ</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900">Pro</h3>
                    <p className="mt-2 text-slate-600">
                        Tính năng đầy đủ, hỗ trợ triển khai.
                    </p>
                    <div className="mt-4 text-3xl font-extrabold">Liên hệ</div>
                </div>
            </div>
        </Section>
    );
}

function Footer() {
    return (
        <footer id="contact" className="border-t border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-white"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                            </svg>
                        </div>
                        <span className="text-lg font-extrabold text-slate-900">
                            OKRun
                        </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Phần mềm OKR hiện đại cho mọi quy mô tổ chức.
                    </p>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900">
                        Sản phẩm
                    </h4>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>
                            <a className="hover:text-blue-600" href="#features">
                                Tính năng
                            </a>
                        </li>
                        <li>
                            <a className="hover:text-blue-600" href="#pricing">
                                Giá
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Hỗ trợ</h4>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>
                            <a
                                className="hover:text-blue-600"
                                href="/auth/forgot"
                            >
                                Quên mật khẩu
                            </a>
                        </li>
                        <li>
                            <a
                                className="hover:text-blue-600"
                                href="/signup"
                                onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = "/signup";
                                }}
                            >
                                Đăng ký
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900">
                        Liên hệ
                    </h4>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>Email: support@okrun.app</li>
                        <li>Hotline: 0123 456 789</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} OKRun. All rights reserved.
            </div>
        </footer>
    );
}

export default function App() {
    const [path, setPath] = useState(
        window.location.pathname + window.location.hash
    );

    // Listen for pathname changes
    useEffect(() => {
        const handler = () => {
            setPath(window.location.pathname + window.location.hash);
        };

        // Listen for popstate (back/forward buttons)
        window.addEventListener("popstate", handler);

        // Also check on mount and when path might change
        const checkInterval = setInterval(() => {
            const currentPath = window.location.pathname + window.location.hash;
            if (currentPath !== path) {
                setPath(currentPath);
            }
        }, 50);

        return () => {
            window.removeEventListener("popstate", handler);
            clearInterval(checkInterval);
        };
    }, []);

    const p = window.location.pathname;

    // Render login page
    if (p === "/login" || p.startsWith("/login")) {
        return <LoginPage />;
    }

    // Render signup page
    if (p === "/signup" || p.startsWith("/signup")) {
        return <SignupPage />;
    }

    // Render forgot password page
    if (p === "/forgot-password" || p.startsWith("/forgot-password")) {
        return <ForgotPasswordPage />;
    }

    // Render first login change password page
    if (
        p === "/first-login/change-password" ||
        p.startsWith("/first-login/change-password")
    ) {
        return <FirstLoginChangePasswordPage />;
    }

    const isAdminArea =
        p.startsWith("/dashboard") ||
        p.startsWith("/users") ||
        p.startsWith("/cycles") ||
        p.startsWith("/departments") ||
        p.startsWith("/reports") ||
        p.startsWith("/my-objectives") ||
        p.startsWith("/company-okrs") ||
        p.startsWith("/okr-tree") ||
        p.startsWith("/archived-okrs") ||
        p.startsWith("/profile") ||
        p.startsWith("/change-password") ||
        p.startsWith("/reports");
    const user = window.__USER__ || null;

    if (isAdminArea) {
        let content = null;
        if (p.startsWith("/users")) content = <UsersPage />;
        else if (p.startsWith("/cycles")) content = <CyclesPanel />;
        else if (p.startsWith("/departments")) content = <DepartmentsPanel />;
        else if (p.startsWith("/my-objectives")) content = <ObjectivesPage />;
        else if (p.startsWith("/company-okrs"))
            content = <CompanyOkrList currentUser={user} />;
        else if (p.startsWith("/okr-tree")) content = <OKRTreePage />;
        else if (p.startsWith("/profile")) content = <ProfilePage />;
        else if (p.startsWith("/change-password"))
            content = <ChangePasswordPage />;
        else if (p.startsWith("/reports/company-overview"))
            content = <CompanyOverviewReport />;
        else if (p.startsWith("/reports/manager")) content = <ReportManager />;
        else if (p.startsWith("/reports")) content = <ReportPage />;
        else if (p.startsWith("/archived-okrs")) content = <ArchivedOkrsPage />;
        else if (p.startsWith("/dashboard")) content = <Dashboard />;
        return <DashboardLayout user={user}>{content}</DashboardLayout>;
    }

    const [activeTab, setActiveTab] = useState(() =>
        window.location.hash === "#features"
            ? "features"
            : window.location.hash === "#pricing"
            ? "pricing"
            : "home"
    );
    useEffect(() => {
        if (activeTab === "features" || activeTab === "pricing") {
            const id = activeTab;
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);
        } else if (activeTab === "home") {
            window.history.pushState({}, "", "/");
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [activeTab]);

    return (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
            <NavBar activeTab={activeTab} onChangeTab={setActiveTab} />
            <main className="flex-1">
                <Hero onShowFeatures={() => setActiveTab("features")} />
                {activeTab === "features" && <Features />}
                {activeTab === "pricing" && <Pricing />}
            </main>
            <Footer />
        </div>
    );
}
