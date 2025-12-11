// src/components/okr/utils/formatters.js
export const formatPercent = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
};

export const getStatusText = (status) => {
    switch ((status || "").toLowerCase()) {
        
        case "not_start":
            return "Bản nháp";
        case "active":
        case "on_track":
            return "Đang thực hiện";
        case "at_risk":
            return "Nguy cơ bị trễ";
        case "in_trouble":
            return "Gặp vấn đề";
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

const DEFAULT_AVATAR_URL = "/images/default.png";

export const getAssigneeInfo = (kr) => {
    if (!kr)
        return {
            name: "",
            avatar: DEFAULT_AVATAR_URL,
            department: null,
            email: "",
            role: "",
        };
    const user = kr.assigned_user || kr.assignedUser || kr.assignee || null;

    if (user) {
        const roleName = user.role?.role_name?.toLowerCase() || "";
        return {
            name:
                user.full_name ||
                user.fullName ||
                user.name ||
                user.username ||
                user.email ||
                `User ${user.user_id || ""}`,
            avatar:
                user.avatar_url ||
                user.avatar ||
                user.profile_photo_url ||
                user.profile_photo_path ||
                user.photo_url ||
                DEFAULT_AVATAR_URL,
            department:
                user.department?.d_name ||
                user.department?.name ||
                user.department_name ||
                user.department ||
                null,
            email: user.email || "",
            role: roleName,
        };
    }

    return {
        name: kr.assigned_to || "",
        avatar: DEFAULT_AVATAR_URL,
        department: null,
        email: "",
        role: "",
    };
};
