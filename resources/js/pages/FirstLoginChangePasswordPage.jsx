import React, { useState, useEffect } from "react";
import axios from "axios";

export default function FirstLoginChangePasswordPage() {
    const email = window.__FIRST_LOGIN_EMAIL__;
    const name = window.__FIRST_LOGIN_NAME__;

    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showAllPasswords, setShowAllPasswords] = useState(false);
    const [passwordFieldReady, setPasswordFieldReady] = useState(false);
    const [passwordConfirmationFieldReady, setPasswordConfirmationFieldReady] =
        useState(false);

    const [passwordRequirements, setPasswordRequirements] = useState({
        minLength: false,
        hasLowercase: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        noSpaces: true,
    });

    const validatePasswordRequirements = (pwd) => {
        setPasswordRequirements({
            minLength: pwd.length >= 8,
            hasLowercase: /[a-z]/.test(pwd),
            hasUppercase: /[A-Z]/.test(pwd),
            hasNumber: /[0-9]/.test(pwd),
            hasSpecialChar: /[@$!%*?&]/.test(pwd),
            noSpaces: !/\s/.test(pwd),
        });
    };

    useEffect(() => {
        validatePasswordRequirements(password);
    }, [password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccessMessage("");

        if (!email) {
            setErrors({
                general: [
                    "Phiên đổi mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
                ],
            });
            return;
        }

        setLoading(true);
        try {
            const csrf = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            const response = await axios.post(
                "/first-login/change-password",
                {
                    password,
                    password_confirmation: passwordConfirmation,
                },
                {
                    headers: {
                        "X-CSRF-TOKEN": csrf,
                        Accept: "application/json",
                    },
                }
            );

            if (response.data?.success) {
                setSuccessMessage(
                    response.data.message ||
                        "Đổi mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới."
                );
                setTimeout(() => {
                    window.location.href =
                        response.data.redirect || "/login";
                }, 1500);
            } else {
                setErrors({
                    general: [
                        response.data?.message ||
                            "Không thể đổi mật khẩu. Vui lòng thử lại.",
                    ],
                });
            }
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else if (err.response?.data?.message) {
                setErrors({ general: [err.response.data.message] });
            } else {
                setErrors({
                    general: ["Có lỗi xảy ra. Vui lòng thử lại sau."],
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">
                        Phiên đã hết hạn
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Không tìm thấy thông tin đăng nhập lần đầu. Vui lòng
                        đăng nhập lại để tiếp tục đổi mật khẩu.
                    </p>
                    <a
                        href="/login"
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-white font-semibold shadow"
                    >
                        Quay lại trang đăng nhập
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-gray-900">
                        Đổi mật khẩu
                    </h2>
                    <p className="text-sm text-gray-600">
                        Chào {name || email}, vui lòng đặt mật khẩu mới trước khi tiếp tục.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            value={email}
                            readOnly
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                name="fake-password"
                                autoComplete="new-password"
                                tabIndex={-1}
                                readOnly
                                style={{
                                    position: "absolute",
                                    left: "-9999px",
                                    opacity: 0,
                                    pointerEvents: "none",
                                }}
                            />
                            <input
                                type={
                                    showAllPasswords || showPassword
                                        ? "text"
                                        : passwordFieldReady
                                        ? "password"
                                        : "text"
                                }
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    validatePasswordRequirements(e.target.value);
                                }}
                                readOnly={!passwordFieldReady}
                                onFocus={(e) => {
                                    if (!passwordFieldReady) {
                                        setPasswordFieldReady(true);
                                        e.target.removeAttribute("readonly");
                                        e.target.type =
                                            showAllPasswords || showPassword
                                                ? "text"
                                                : "password";
                                    }
                                }}
                                required
                                style={{
                                    WebkitTextSecurity:
                                        showAllPasswords || showPassword
                                            ? "none"
                                            : passwordFieldReady
                                            ? "disc"
                                            : "none",
                                }}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12 bg-white"
                                placeholder="Nhập mật khẩu mới"
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newValue = !showPassword;
                                    setShowPassword(newValue);
                                    if (showAllPasswords && !newValue) {
                                        setShowAllPasswords(false);
                                        setShowPasswordConfirmation(false);
                                    }
                                }}
                                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <ul className="mt-2 space-y-1 text-xs">
                            {[
                                {
                                    label: "Ít nhất 8 ký tự",
                                    met: passwordRequirements.minLength,
                                },
                                {
                                    label: "Chứa chữ thường",
                                    met: passwordRequirements.hasLowercase,
                                },
                                {
                                    label: "Chứa chữ hoa",
                                    met: passwordRequirements.hasUppercase,
                                },
                                {
                                    label: "Chứa số",
                                    met: passwordRequirements.hasNumber,
                                },
                                {
                                    label: "Chứa ký tự đặc biệt (@$!%*?&)",
                                    met: passwordRequirements.hasSpecialChar,
                                },
                                {
                                    label: "Không chứa khoảng trắng",
                                    met: passwordRequirements.noSpaces,
                                },
                            ].map((item) => (
                                <li
                                    key={item.label}
                                    className={`flex items-center gap-2 ${
                                        item.met
                                            ? "text-emerald-600"
                                            : "text-slate-500"
                                    }`}
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        {item.met ? (
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        ) : (
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 100 12A6 6 0 0010 4z"
                                                clipRule="evenodd"
                                            />
                                        )}
                                    </svg>
                                    {item.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Xác nhận mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                name="fake-password-confirmation"
                                autoComplete="new-password"
                                tabIndex={-1}
                                readOnly
                                style={{
                                    position: "absolute",
                                    left: "-9999px",
                                    opacity: 0,
                                    pointerEvents: "none",
                                }}
                            />
                            <input
                                type={
                                    showAllPasswords || showPasswordConfirmation
                                        ? "text"
                                        : passwordConfirmationFieldReady
                                        ? "password"
                                        : "text"
                                }
                                value={passwordConfirmation}
                                onChange={(e) =>
                                    setPasswordConfirmation(e.target.value)
                                }
                                readOnly={!passwordConfirmationFieldReady}
                                onFocus={(e) => {
                                    if (!passwordConfirmationFieldReady) {
                                        setPasswordConfirmationFieldReady(true);
                                        e.target.removeAttribute("readonly");
                                        e.target.type =
                                            showAllPasswords ||
                                            showPasswordConfirmation
                                                ? "text"
                                                : "password";
                                    }
                                }}
                                required
                                style={{
                                    WebkitTextSecurity:
                                        showAllPasswords ||
                                        showPasswordConfirmation
                                            ? "none"
                                            : passwordConfirmationFieldReady
                                            ? "disc"
                                            : "none",
                                }}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12 bg-white"
                                placeholder="Nhập lại mật khẩu mới"
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newValue = !showPasswordConfirmation;
                                    setShowPasswordConfirmation(newValue);
                                    if (showAllPasswords && !newValue) {
                                        setShowAllPasswords(false);
                                        setShowPassword(false);
                                    }
                                }}
                                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                                tabIndex={-1}
                            >
                                {showPasswordConfirmation ? (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            id="show_passwords"
                            type="checkbox"
                            checked={showAllPasswords}
                            onChange={(e) => {
                                const val = e.target.checked;
                                setShowAllPasswords(val);
                                setShowPassword(val);
                                setShowPasswordConfirmation(val);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="show_passwords">Hiển thị mật khẩu</label>
                    </div>
                    
                    {(errors.general || successMessage) && (
                        <div
                            className={`rounded-xl p-3 text-sm ${
                                successMessage
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                        >
                            {successMessage ||
                                (errors.general && errors.general[0]) ||
                                (errors.password && errors.password[0]) ||
                                (errors.password_confirmation &&
                                    errors.password_confirmation[0])}
                        </div>
                    )}
                    {errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                            {Array.isArray(errors.password)
                                ? errors.password[0]
                                : errors.password}
                        </p>
                    )}
                    {errors.password_confirmation && (
                        <p className="text-sm text-red-600 mt-1">
                            {Array.isArray(errors.password_confirmation)
                                ? errors.password_confirmation[0]
                                : errors.password_confirmation}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:opacity-95 ${
                            loading ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                    >
                        {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </button>

                </form>

            </div>
        </div>
    );
}

