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
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import FirstLoginChangePasswordPage from "./pages/FirstLoginChangePasswordPage";
import ArchivedOkrsPage from "./pages/ArchivedOkrsPage";
import ObjectiveDetailPage from "./pages/Objective/Detail";
import KeyResultDetailPage from "./pages/KeyResult/Detail";

function NavBar() {
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
                <a
                    href="/home"
                    className="flex items-center gap-2"
                    onClick={(e) => {
                        e.preventDefault();
                        window.location.href = "/home";
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

function Hero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100">
            <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-300/50 blur-3xl" />
            <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-indigo-300/50 blur-3xl" />
            <div className="mx-auto w-full px-4 pb-32 pt-40 text-center sm:px-6 lg:px-8">
                <h1 className="text-5xl font-extrabold leading-tight text-slate-900 sm:text-6xl">
                    <GradientText>OKR hiện đại</GradientText> giúp đội ngũ
                    <br />
                    tập trung và bứt phá
                </h1>
                <p className="mx-auto mt-6 max-w-4xl text-xl leading-9 text-slate-600">
                    Đặt mục tiêu rõ ràng, theo dõi kết quả theo thời gian thực
                    và cộng tác mượt mà. OKRun mang đến trải nghiệm OKR trực
                    quan, mạnh mẽ và dễ sử dụng.
                </p>
                
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <a
                        href="#features"
                        onClick={(e) => {
                            e.preventDefault();
                            const featuresSection = document.getElementById('features');
                            if (featuresSection) {
                                featuresSection.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="inline-flex items-center justify-center rounded-2xl border-2 border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400"
                    >
                        Tìm hiểu thêm
                    </a>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Bảo mật OAuth2/OIDC</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Triển khai nhanh chóng</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Features() {
    const features = [
        {
            title: "Quản lý OKR thông minh",
            desc: "Thiết lập và theo dõi Objectives cùng Key Results với cấu trúc phân cấp rõ ràng. Hỗ trợ liên kết OKR giữa các cấp độ và workflow phê duyệt.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            ),
            color: "from-blue-600 to-indigo-600",
        },
        {
            title: "Báo cáo & Phân tích nâng cao",
            desc: "Dashboard với biểu đồ trực quan. Snapshot để lưu trữ và so sánh báo cáo theo thời gian.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
            ),
            color: "from-emerald-600 to-teal-600",
        },
        {
            title: "Check-in theo thời gian thực",
            desc: "Cập nhật tiến độ và ghi chú check-in dễ dàng. Theo dõi lịch sử thay đổi, xu hướng hiệu suất và trạng thái OKR.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            ),
            color: "from-purple-600 to-fuchsia-600",
        },
        {
            title: "Thông báo thông minh",
            desc: "Nhận thông báo real-time về cập nhật OKR, check-in và các hoạt động quan trọng. Quản lý thông báo dễ dàng và không bỏ lỡ thông tin quan trọng.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
            ),
            color: "from-amber-600 to-orange-600",
        },
        {
            title: "Quản lý tổ chức toàn diện",
            desc: "Quản lý phòng ban phân cấp, người dùng và phân quyền linh hoạt. Hỗ trợ gán OKR, theo dõi trách nhiệm và mời thành viên mới.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
            ),
            color: "from-teal-600 to-cyan-600",
        },
        {
            title: "Liên kết & Căn chỉnh OKR",
            desc: "Liên kết OKR cấp dưới với cấp trên, hiển thị mối quan hệ và tác động giữa các mục tiêu. Đảm bảo toàn bộ tổ chức hướng về cùng một mục tiêu.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
            ),
            color: "from-pink-600 to-rose-600",
        },
    ];

    return (
        <section id="features" className="bg-white py-20">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                        Tính năng nổi bật
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Tất cả công cụ bạn cần để quản lý OKR hiệu quả
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                        >
                            <div
                                className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white shadow`}
                            >
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Benefits() {
    const benefits = [
        {
            title: "Tăng năng suất đội ngũ",
            desc: "Tập trung vào mục tiêu quan trọng, loại bỏ công việc không cần thiết và tăng hiệu quả làm việc lên đến 50%.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
            ),
            color: "from-blue-600 to-indigo-600",
        },
        {
            title: "Minh bạch và trách nhiệm",
            desc: "Mọi thành viên đều thấy rõ mục tiêu, tiến độ và trách nhiệm của mình. Tạo môi trường làm việc minh bạch và hiệu quả.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            ),
            color: "from-emerald-600 to-teal-600",
        },
        {
            title: "Quyết định dựa trên dữ liệu",
            desc: "Báo cáo chi tiết và phân tích xu hướng giúp lãnh đạo đưa ra quyết định nhanh chóng và chính xác dựa trên dữ liệu thực tế.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
            ),
            color: "from-purple-600 to-fuchsia-600",
        },
        {
            title: "Dễ triển khai và sử dụng",
            desc: "Giao diện trực quan, dễ sử dụng. Hỗ trợ đầy đủ tài liệu và hướng dẫn. Triển khai nhanh chóng, không cần đào tạo phức tạp.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
                </svg>
            ),
            color: "from-amber-600 to-orange-600",
        },
    ];

    return (
        <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                        Lợi ích khi sử dụng OKRun
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Tại sao tổ chức nên tin tưởng OKRun?
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {benefits.map((benefit, index) => (
                        <div
                            key={index}
                            className="text-center"
                        >
                            <div
                                className={`mx-auto mb-4 inline-flex rounded-2xl bg-gradient-to-br ${benefit.color} p-4 text-white shadow-lg`}
                            >
                                {benefit.icon}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {benefit.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {benefit.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer id="contact" className="bg-white w-full border-t border-slate-200">
            <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="flex flex-col text-center sm:text-left">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-white"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                </svg>
                            </div>
                            <span className="text-base font-extrabold text-slate-900">
                                OKRun
                            </span>
                        </div>
                        <p className="text-center text-xs text-slate-600 leading-relaxed">
                            Phần mềm OKR hiện đại cho mọi quy mô tổ chức.
                        </p>
                    </div>
                    <div className="flex flex-col text-center sm:text-left">
                        <h4 className="text-center text-xs font-bold text-slate-900 mb-2">Hỗ trợ</h4>
                        <ul className="space-y-1.5 text-center text-xs text-slate-600">
                            <li>
                                <a
                                    className="hover:text-blue-600 transition-colors"
                                    href="/auth/forgot"
                                >
                                    Quên mật khẩu
                                </a>
                            </li>
                            <li>
                                <a
                                    className="hover:text-blue-600 transition-colors"
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
                    <div className="flex flex-col text-center sm:text-left">
                        <h4 className="text-center text-xs font-bold text-slate-900 mb-2">
                            Liên hệ
                        </h4>
                        <ul className="space-y-1.5 text-center text-xs text-slate-600">
                            <li>Email: support@okrun.app</li>
                            <li>Hotline: 0123 456 789</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-6 pt-4 text-center text-xs text-slate-700">
                    © {new Date().getFullYear()} OKRun. All rights reserved.
                </div>
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
        else if (p.startsWith("/company-okrs/detail/kr/"))
            content = <KeyResultDetailPage />;
        else if (p.startsWith("/company-okrs/detail/"))
            content = <ObjectiveDetailPage />;
        else if (p.startsWith("/company-okrs"))
            content = <CompanyOkrList currentUser={user} />;
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

    // Render landing page only for /home route
    if (p === "/home" || p === "/") {
        return (
            <div className="min-h-screen flex flex-col bg-white text-slate-900">
                <NavBar />
                <main className="flex-1">
                    <Hero />
                    <Features />
                    <Benefits />
                </main>
                <Footer />
            </div>
        );
    }

    // Default: redirect to home if route not found
    return (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
            <NavBar />
            <main className="flex-1">
                <Hero />
                <Features />
                <Benefits />
            </main>
            <Footer />
        </div>
    );
}
