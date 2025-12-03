import React, { useState } from 'react';
import { Modal, Select, Toast } from '../components/ui';

const InviteUserModal = ({ isOpen, onClose, onSuccess, departments, roles }) => {
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role_name: '',
        level: 'unit', // Mặc định là phòng ban
        department_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ type: 'success', message: '' });
    const [validationErrors, setValidationErrors] = useState({});

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast({ type: 'success', message: '' }), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Reset validation errors
        setValidationErrors({});
        
        // Validation frontend - chỉ kiểm tra có điền đầy đủ thông tin
        const errors = {};
        if (!formData.email) errors.email = 'Email là bắt buộc';
        if (!formData.full_name) errors.full_name = 'Họ và tên là bắt buộc';
        if (!formData.role_name) errors.role_name = 'Vai trò là bắt buộc';
        if (!formData.department_id) errors.department_id = 'Phòng ban là bắt buộc';
        
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (!token) {
                showToast('error', 'Không tìm thấy CSRF token. Vui lòng tải lại trang.');
                setLoading(false);
                return;
            }

            const response = await fetch('/admin/invite-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            // Xử lý các trường hợp lỗi khác nhau
            if (response.status === 422) {
                // Validation errors từ backend - hiển thị trong modal
                if (result.errors) {
                    const backendErrors = {};
                    Object.keys(result.errors).forEach(field => {
                        backendErrors[field] = result.errors[field][0];
                    });
                    setValidationErrors(backendErrors);
                } else {
                    setValidationErrors({ _general: result.message || 'Dữ liệu không hợp lệ' });
                }
                setLoading(false);
                return;
            } else if (response.status === 500) {
                // Server errors
                if (result.message) {
                    showToast('error', result.message);
                } else {
                    showToast('error', 'Có lỗi xảy ra ở máy chủ. Vui lòng thử lại sau.');
                }
            } else if (result.success) {
                // Thành công
                if (result.warning) {
                    // Trường hợp có cảnh báo (tài khoản tạo thành công nhưng email không gửi được)
                    showToast('error', result.message || 'Tài khoản đã được tạo nhưng không thể gửi email mời.');
                } else {
                    showToast('success', result.message || 'Email mời đã được gửi thành công!');
                }
                setTimeout(() => {
                    onSuccess();
                    handleClose();
                }, result.warning ? 2000 : 1000);
            } else {
                // Lỗi khác
                showToast('error', result.message || 'Có lỗi xảy ra khi gửi email mời. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error inviting user:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                showToast('error', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
            } else {
                showToast('error', 'Có lỗi xảy ra khi gửi email mời. Vui lòng thử lại sau.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            email: '',
            full_name: '',
            role_name: '',
            level: 'unit', // Mặc định là phòng ban
            department_id: ''
        });
        setValidationErrors({});
        onClose();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Xóa lỗi validation của field khi user bắt đầu nhập
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Lọc departments - chỉ hiển thị phòng ban
    const getDepartmentOptions = () => {
        return departments.map(d => ({
            value: String(d.department_id),
            label: d.d_name
        }));
    };

    return (
        <>
            <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: 'success', message: '' })} />
            
            <Modal open={isOpen} onClose={handleClose} title="Mời người dùng mới">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Thông báo lỗi tổng */}
                    {validationErrors._general && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{validationErrors._general}</p>
                        </div>
                    )}

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="Nhập email người dùng"
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                                validationErrors.email
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            required
                        />
                        {validationErrors.email && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                        )}
                    </div>

                    {/* Họ tên */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Họ và tên <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => handleInputChange('full_name', e.target.value)}
                            placeholder="Nhập họ và tên"
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                                validationErrors.full_name
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            required
                        />
                        {validationErrors.full_name && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.full_name}</p>
                        )}
                    </div>

                    {/* Vai trò */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vai trò <span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={formData.role_name}
                            onChange={(value) => handleInputChange('role_name', value)}
                            placeholder="-- Chọn vai trò --"
                            options={[
                                { value: 'member', label: 'Thành viên' },
                                { value: 'manager', label: 'Quản lý' },
                            ]}
                            className="w-full"
                        />
                        {validationErrors.role_name && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.role_name}</p>
                        )}
                    </div>

                    {/* Phòng ban */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phòng ban <span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={formData.department_id}
                            onChange={(value) => handleInputChange('department_id', value)}
                            placeholder="-- Chọn phòng ban --"
                            options={getDepartmentOptions()}
                            className="w-full"
                        />
                        {validationErrors.department_id && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.department_id}</p>
                        )}
                    </div>

                    {/* Thông báo */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-blue-700">
                                <p className="font-medium">Lưu ý:</p>
                                <ul className="mt-1 space-y-1">
                                    <li>• Email mời sẽ được gửi đến địa chỉ trên</li>
                                    <li>• Người dùng sẽ nhận được mật khẩu tạm thời</li>
                                    <li>• Họ sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                loading
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang gửi...
                                </div>
                            ) : (
                                'Gửi lời mời'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default InviteUserModal;
