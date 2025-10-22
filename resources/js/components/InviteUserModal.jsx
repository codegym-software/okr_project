import React, { useState } from 'react';
import { Modal, Select, Toast } from '../components/ui';

const InviteUserModal = ({ isOpen, onClose, onSuccess, departments, roles }) => {
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role_name: 'member',
        level: 'unit',
        department_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast({ type: 'success', message: '' }), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.email || !formData.full_name) {
            showToast('error', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        if (!formData.email.includes('@')) {
            showToast('error', 'Email không hợp lệ');
            return;
        }

        setLoading(true);

        try {
            const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
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

            if (result.success) {
                showToast('success', result.message);
                onSuccess();
                handleClose();
            } else {
                showToast('error', result.message || 'Có lỗi xảy ra khi gửi email mời');
            }
        } catch (error) {
            console.error('Error inviting user:', error);
            showToast('error', 'Có lỗi xảy ra khi gửi email mời');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            email: '',
            full_name: '',
            role_name: 'member',
            level: 'unit',
            department_id: ''
        });
        onClose();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };
            
            // Khi thay đổi level, reset department_id
            if (field === 'level') {
                newData.department_id = '';
            }
            
            return newData;
        });
    };

    // Lọc departments theo level
    const getFilteredDepartments = () => {
        if (formData.level === 'unit') {
            // Chỉ hiển thị phòng ban (parent_department_id === null và type === "phòng ban")
            return departments.filter(d => 
                d.parent_department_id === null && d.type === "phòng ban"
            );
        } else if (formData.level === 'team') {
            // Chỉ hiển thị nhóm (type === "đội nhóm")
            return departments.filter(d => d.type === "đội nhóm");
        }
        return departments;
    };

    // Tạo options cho dropdown phòng ban
    const getDepartmentOptions = () => {
        const filteredDepts = getFilteredDepartments();
        
        return [
            { value: '', label: 'Không chọn' },
            ...filteredDepts.map(d => {
                let label = d.d_name;
                
                // Nếu là nhóm, thêm tên phòng ban vào đằng sau
                if (formData.level === 'team' && d.parent_department_id) {
                    const parentDept = departments.find(pd => pd.department_id === d.parent_department_id);
                    if (parentDept) {
                        label = `${d.d_name} (${parentDept.d_name})`;
                    }
                }
                
                return {
                    value: String(d.department_id),
                    label: label
                };
            })
        ];
    };

    return (
        <>
            <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: 'success', message: '' })} />
            
            <Modal open={isOpen} onClose={handleClose} title="Mời người dùng mới">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Vai trò */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vai trò <span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={formData.role_name}
                            onChange={(value) => handleInputChange('role_name', value)}
                            placeholder="Chọn vai trò"
                            options={[
                                { value: 'member', label: 'Thành viên' },
                                { value: 'manager', label: 'Quản lý' }
                            ]}
                        />
                    </div>

                    {/* Cấp độ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cấp độ <span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={formData.level}
                            onChange={(value) => handleInputChange('level', value)}
                            placeholder="Chọn cấp độ"
                            options={[
                                { value: 'unit', label: 'Đơn vị' },
                                { value: 'team', label: 'Nhóm' }
                            ]}
                        />
                    </div>

                    {/* Phòng ban */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.level === 'unit' ? 'Phòng ban' : 'Nhóm'}
                        </label>
                        <Select
                            value={formData.department_id}
                            onChange={(value) => handleInputChange('department_id', value)}
                            placeholder={`Chọn ${formData.level === 'unit' ? 'phòng ban' : 'nhóm'} (tùy chọn)`}
                            options={getDepartmentOptions()}
                        />
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

                    {/* Buttons */}
                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Hủy
                        </button>
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
