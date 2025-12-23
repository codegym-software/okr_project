import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Nhập email, 2: Nhập code và mật khẩu mới
    const [successMessage, setSuccessMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [showAllPasswords, setShowAllPasswords] = useState(false);
    const [passwordFieldReady, setPasswordFieldReady] = useState(false);
    const [passwordConfirmationFieldReady, setPasswordConfirmationFieldReady] = useState(false);
    
    // Password requirements checklist
    const [passwordRequirements, setPasswordRequirements] = useState({
        minLength: false,
        hasLowercase: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        noSpaces: false,
    });

    // Validate password requirements
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

    // Cấu hình axios để gửi CSRF token
    useEffect(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        }
    }, []);

    // Ẩn browser autofill icons
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            /* Chrome, Safari, Edge */
            input#new-password-reset::-webkit-credentials-auto-fill-button,
            input#new-password-reset::-webkit-strong-password-auto-fill-button,
            input#confirm-password-reset::-webkit-credentials-auto-fill-button,
            input#confirm-password-reset::-webkit-strong-password-auto-fill-button {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                right: -9999px !important;
                width: 0 !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Firefox */
            input#new-password-reset::-moz-credentials-auto-fill-button,
            input#confirm-password-reset::-moz-credentials-auto-fill-button {
                display: none !important;
            }
            
            /* General - Ẩn tất cả autofill icons */
            input[type="password"]::-webkit-credentials-auto-fill-button,
            input[type="password"]::-webkit-strong-password-auto-fill-button {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                right: -9999px !important;
                width: 0 !important;
                height: 0 !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    // Trick để ngăn browser autofill - delay để input sẵn sàng
    useEffect(() => {
        if (step === 2) {
            // Delay một chút để browser không autofill
            setTimeout(() => {
                setPasswordFieldReady(true);
                setPasswordConfirmationFieldReady(true);
            }, 100);
        } else {
            setPasswordFieldReady(false);
            setPasswordConfirmationFieldReady(false);
        }
    }, [step]);

    const handleSubmitEmail = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccessMessage("");
        setLoading(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await axios.post("/forgot-password", {
                email,
            }, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.data.success) {
                setSuccessMessage(response.data.message || "Mã xác nhận đã được gửi đến email của bạn.");
                setStep(2);
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            
            if (error.response) {
                if (error.response.data?.errors) {
                    setErrors(error.response.data.errors);
                } else if (error.response.data?.message) {
                    setErrors({ email: [error.response.data.message] });
                } else {
                    setErrors({ email: ["Không thể gửi mã xác nhận. Vui lòng thử lại."] });
                }
            } else {
                setErrors({ email: ["Có lỗi xảy ra. Vui lòng thử lại."] });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPassword = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        if (password !== passwordConfirmation) {
            setErrors({ password_confirmation: ["Mật khẩu xác nhận không khớp."] });
            setLoading(false);
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await axios.post("/confirm-forgot-password", {
                email,
                code,
                password,
                password_confirmation: passwordConfirmation,
            }, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.data.success) {
                // Redirect to login page
                window.location.href = "/login?reset=success";
            }
        } catch (error) {
            console.error('Confirm forgot password error:', error);
            
            if (error.response) {
                if (error.response.data?.errors) {
                    setErrors(error.response.data.errors);
                } else if (error.response.data?.message) {
                    setErrors({ code: [error.response.data.message] });
                } else {
                    setErrors({ code: ["Không thể đặt lại mật khẩu. Vui lòng thử lại."] });
                }
            } else {
                setErrors({ code: ["Có lỗi xảy ra. Vui lòng thử lại."] });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Quên mật khẩu
                    </h2>
                    <p className="text-sm text-gray-600">
                        {step === 1 
                            ? "Nhập email của bạn để nhận mã xác nhận đặt lại mật khẩu."
                            : "Nhập mã xác nhận và mật khẩu mới của bạn."}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {step === 1 ? (
                        <form onSubmit={handleSubmitEmail} className="space-y-5">
                            {/* Email Field */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.email;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    className={`w-full px-4 py-3 rounded-lg border ${
                                        errors.email
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    } placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200`}
                                    placeholder="Nhập email của bạn"
                                />
                                {errors.email && (
                                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                                        <svg
                                            className="w-4 h-4 mr-1"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        {Array.isArray(errors.email)
                                            ? errors.email[0]
                                            : errors.email}
                                    </p>
                                )}
                            </div>

                            {successMessage && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800">{successMessage}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? "Đang gửi..." : "Gửi mã xác nhận"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleConfirmPassword} className="space-y-5">
                            {/* Code Field */}
                            <div>
                                <label
                                    htmlFor="code"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Mã xác nhận
                                </label>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                    required
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value);
                                        if (errors.code) {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.code;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    className={`w-full px-4 py-3 rounded-lg border ${
                                        errors.code
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    } placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200`}
                                    placeholder="Nhập mã xác nhận"
                                />
                                {errors.code && (
                                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                                        <svg
                                            className="w-4 h-4 mr-1"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        {Array.isArray(errors.code)
                                            ? errors.code[0]
                                            : errors.code}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Mật khẩu mới
                                </label>
                                <div className="relative">
                                    {/* Fake input để đánh lừa browser */}
                                    <input
                                        type="password"
                                        name="fake-password"
                                        autoComplete="new-password"
                                        style={{
                                            position: 'absolute',
                                            left: '-9999px',
                                            opacity: 0,
                                            pointerEvents: 'none',
                                        }}
                                        tabIndex={-1}
                                        readOnly
                                    />
                                    <input
                                        id="new-password-reset"
                                        name="new-password-reset"
                                        type={showAllPasswords || showPassword ? "text" : (passwordFieldReady ? "password" : "text")}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                        data-form-type="other"
                                        data-lpignore="true"
                                        data-1p-ignore="true"
                                        readOnly={!passwordFieldReady}
                                        onFocus={(e) => {
                                            if (!passwordFieldReady) {
                                                setPasswordFieldReady(true);
                                                e.target.removeAttribute('readonly');
                                                e.target.type = showAllPasswords || showPassword ? "text" : "password";
                                            }
                                        }}
                                        required
                                        value={password}
                                        onChange={(e) => {
                                            const newPassword = e.target.value;
                                            setPassword(newPassword);
                                            // Validate password requirements
                                            validatePasswordRequirements(newPassword);
                                            if (errors.password) {
                                                setErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.password;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                                            errors.password
                                                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        } placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 bg-white`}
                                        placeholder="Nhập mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-0 bottom-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-20 pointer-events-auto"
                                        style={{
                                            background: 'transparent',
                                            marginRight: '1px',
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const newValue = !showPassword;
                                            setShowPassword(newValue);
                                            // Đồng bộ với checkbox nếu đang bật
                                            if (showAllPasswords && !newValue) {
                                                setShowAllPasswords(false);
                                            }
                                        }}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                
                                {/* Password Requirements Checklist */}
                                {password && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Yêu cầu mật khẩu:</p>
                                        <ul className="space-y-1.5">
                                            <li className={`flex items-center text-xs ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passwordRequirements.minLength ? (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Ít nhất 8 ký tự
                                            </li>
                                            <li className={`flex items-center text-xs ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passwordRequirements.hasLowercase ? (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Có ít nhất 1 chữ thường
                                            </li>
                                            <li className={`flex items-center text-xs ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passwordRequirements.hasUppercase ? (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Có ít nhất 1 chữ hoa
                                            </li>
                                            <li className={`flex items-center text-xs ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passwordRequirements.hasNumber ? (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Có ít nhất 1 số
                                            </li>
                                            <li className={`flex items-center text-xs ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passwordRequirements.hasSpecialChar ? (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Có ít nhất 1 ký tự đặc biệt (@$!%*?&)
                                            </li>
                                            <li className={`flex items-center text-xs ${passwordRequirements.noSpaces ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passwordRequirements.noSpaces ? (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Không chứa khoảng trắng
                                            </li>
                                        </ul>
                                    </div>
                                )}
                                
                                {errors.password && (
                                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                                        {Array.isArray(errors.password)
                                            ? errors.password[0]
                                            : errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Password Confirmation Field */}
                            <div>
                                <label
                                    htmlFor="password_confirmation"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Xác nhận mật khẩu mới
                                </label>
                                <div className="relative">
                                    {/* Fake input để đánh lừa browser */}
                                    <input
                                        type="password"
                                        name="fake-password-confirmation"
                                        autoComplete="new-password"
                                        style={{
                                            position: 'absolute',
                                            left: '-9999px',
                                            opacity: 0,
                                            pointerEvents: 'none',
                                        }}
                                        tabIndex={-1}
                                        readOnly
                                    />
                                    <input
                                        id="confirm-password-reset"
                                        name="confirm-password-reset"
                                        type={showAllPasswords || showPasswordConfirmation ? "text" : (passwordConfirmationFieldReady ? "password" : "text")}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                        data-form-type="other"
                                        data-lpignore="true"
                                        data-1p-ignore="true"
                                        readOnly={!passwordConfirmationFieldReady}
                                        onFocus={(e) => {
                                            if (!passwordConfirmationFieldReady) {
                                                setPasswordConfirmationFieldReady(true);
                                                e.target.removeAttribute('readonly');
                                                e.target.type = showAllPasswords || showPasswordConfirmation ? "text" : "password";
                                            }
                                        }}
                                        required
                                        value={passwordConfirmation}
                                        onChange={(e) => {
                                            setPasswordConfirmation(e.target.value);
                                            if (errors.password_confirmation) {
                                                setErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.password_confirmation;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                                            errors.password_confirmation
                                                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        } placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 bg-white`}
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-0 bottom-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-20 pointer-events-auto"
                                        style={{
                                            background: 'transparent',
                                            marginRight: '1px',
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const newValue = !showPasswordConfirmation;
                                            setShowPasswordConfirmation(newValue);
                                            // Đồng bộ với checkbox nếu đang bật
                                            if (showAllPasswords && !newValue) {
                                                setShowAllPasswords(false);
                                            }
                                        }}
                                        tabIndex={-1}
                                    >
                                        {showPasswordConfirmation ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                                        {Array.isArray(errors.password_confirmation)
                                            ? errors.password_confirmation[0]
                                            : errors.password_confirmation}
                                    </p>
                                )}
                            </div>

                            {/* Show Password Checkbox */}
                            <div className="flex items-center">
                                <input
                                    id="show-all-passwords"
                                    name="show-all-passwords"
                                    type="checkbox"
                                    checked={showAllPasswords}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setShowAllPasswords(checked);
                                        // Đồng bộ cả 2 trường khi checkbox thay đổi
                                        if (checked) {
                                            setShowPassword(true);
                                            setShowPasswordConfirmation(true);
                                        } else {
                                            setShowPassword(false);
                                            setShowPasswordConfirmation(false);
                                        }
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                />
                                <label
                                    htmlFor="show-all-passwords"
                                    className="ml-2 block text-sm text-gray-700 cursor-pointer"
                                >
                                    Hiển thị mật khẩu
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                            </button>
                        </form>
                    )}

                    {/* Back to Login Link */}
                    <div className="text-center pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                            Nhớ mật khẩu?{" "}
                            <a
                                href="/login"
                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                            >
                                Đăng nhập ngay
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

