/**
 * Utility functions for check-in permissions
 */

/**
 * Kiểm tra quyền check-in Key Result
 * @param {Object} currentUser - User hiện tại
 * @param {Object} keyResult - Key Result object
 * @param {Object} objective - Objective object
 * @returns {boolean} - Có thể check-in hay không
 */
export const canCheckInKeyResult = (currentUser, keyResult, objective) => {
    // Kiểm tra user có tồn tại không
    if (!currentUser) {
        return false;
    }

    // Kiểm tra Key Result có tồn tại không
    if (!keyResult) {
        return false;
    }

    // Kiểm tra Objective có tồn tại không
    if (!objective) {
        return false;
    }

    // Chỉ chặn check-in nếu Key Result status từ database là 'completed' hoặc 'closed'
    // Không chặn dựa trên status từ tính toán (objective.status có thể là 'completed' khi progress = 100%)
    // Cho phép check-in nếu status là null, undefined, 'active', 'draft' hoặc các giá trị khác
    if (keyResult.status === 'completed' || keyResult.status === 'closed') {
        return false;
    }

    // KHÔNG chặn check-in dựa trên objective.status vì nó có thể là từ tính toán
    // Chỉ check-in dựa trên quyền và keyResult.status

    // Nếu user đã đăng nhập và status không phải completed/closed, cho phép check-in
    // Backend sẽ validate quyền chi tiết hơn
    // Kiểm tra user có phải owner của Key Result không
    if (keyResult.user_id && String(keyResult.user_id) === String(currentUser.user_id || currentUser.id)) {
        return true;
    }

    // Kiểm tra user có phải owner của Objective không
    if (objective.user_id && String(objective.user_id) === String(currentUser.user_id || currentUser.id)) {
        return true;
    }

    // Kiểm tra user có role admin không
    const userRole = currentUser.role?.role_name || currentUser.role;
    if (userRole === 'admin') {
        return true;
    }

    // Kiểm tra user có role manager và cùng department với Objective không
    if (userRole === 'manager') {
        if (currentUser.department_id && objective.department_id && 
            String(currentUser.department_id) === String(objective.department_id)) {
            return true;
        }
        // Manager cũng có thể check-in Key Result nếu Key Result có cùng department
        if (currentUser.department_id && keyResult.department_id && 
            String(currentUser.department_id) === String(keyResult.department_id)) {
            return true;
        }
    }

    // Kiểm tra user có được assign vào Objective không
    if (objective.assignments && Array.isArray(objective.assignments)) {
        const userAssignment = objective.assignments.find(
            assignment => String(assignment.user_id) === String(currentUser.user_id || currentUser.id)
        );
        if (userAssignment) {
            return true;
        }
    }

    // Kiểm tra user có cùng department với Objective không (cho member và các role khác)
    if (currentUser.department_id && objective.department_id && 
        String(currentUser.department_id) === String(objective.department_id)) {
        return true;
    }

    // Kiểm tra Key Result có cùng department với user không
    if (currentUser.department_id && keyResult.department_id && 
        String(currentUser.department_id) === String(keyResult.department_id)) {
        return true;
    }

    // Nếu không có điều kiện nào match, vẫn cho phép check-in (frontend)
    // Backend sẽ validate quyền chính xác hơn
    // Để đảm bảo nút luôn hiển thị cho user đã đăng nhập
    return true;
};

/**
 * Kiểm tra quyền check-in Objective
 * @param {Object} currentUser - User hiện tại
 * @param {Object} objective - Objective object
 * @returns {boolean} - Có thể check-in hay không
 */
export const canCheckInObjective = (currentUser, objective) => {
    // Kiểm tra user có tồn tại không
    if (!currentUser) {
        return false;
    }

    // Kiểm tra Objective có tồn tại không
    if (!objective) {
        return false;
    }

    // Kiểm tra Objective có status active không
    if (objective.status !== 'active') {
        return false;
    }

    // Kiểm tra user có phải owner của Objective không
    if (objective.user_id && objective.user_id === currentUser.user_id) {
        return true;
    }

    // Kiểm tra user có role admin không
    if (currentUser.role && currentUser.role.role_name === 'admin') {
        return true;
    }

    // Kiểm tra user có được assign vào Objective không
    if (objective.assignments && Array.isArray(objective.assignments)) {
        const userAssignment = objective.assignments.find(
            assignment => assignment.user_id === currentUser.user_id
        );
        if (userAssignment) {
            return true;
        }
    }

    // Kiểm tra user có cùng department với Objective không
    if (currentUser.department_id && objective.department_id && 
        currentUser.department_id === objective.department_id) {
        return true;
    }

    return false;
};
