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

    // Kiểm tra Key Result có status active không
    if (keyResult.status !== 'active') {
        return false;
    }

    // Kiểm tra Objective có status active không
    if (objective.status !== 'active') {
        return false;
    }

    // Kiểm tra user có phải owner của Key Result không
    if (keyResult.user_id && keyResult.user_id === currentUser.user_id) {
        return true;
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
