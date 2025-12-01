// src/components/okr/utils/formatters.js
export const formatPercent = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
};

export const getStatusText = (status) => {
    switch ((status || "").toLowerCase()) {
        case "draft":
            return "Bản nháp";
        case "active":
            return "Đang thực hiện";
        case "completed":
            return "Hoàn thành";
        default:
            return status || "";
    }
};

export const getUnitText = (unit) => {
    switch ((unit || "").toLowerCase()) {
        case "number":
            return "Số lượng";
        case "percent":
            return "Phần trăm";
        case "completion":
            return "Hoàn thành";
        default:
            return unit || "";
    }
};

export const getAssigneeInfo = (kr) => {
    const user = kr.assigned_user || kr.assignedUser || kr.assignee || null;
    if (user) {
        return {
            name:
                user.full_name ||
                user.fullName ||
                user.name ||
                user.username ||
                user.email ||
                "User",
            avatar:
                user.avatar_url ||
                user.avatar ||
                user.profile_photo_url ||
                null,
            department:
                user.department?.d_name ||
                user.department?.name ||
                user.department_name ||
                null,
            email: user.email || "",
        };
    }
    return { name: "", avatar: null, department: null, email: "" };
};
