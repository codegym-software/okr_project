import React, { useState, useEffect } from "react";
import { Modal } from "./ui";
import UserSearchInput from './UserSearchInput';
import { FaBullseye, FaKey } from "react-icons/fa";

export default function AssignKeyResultModal({
    show,
    kr,
    objective,
    loading,
    onConfirm,
    onClose,
    currentUserRole,
}) {
    const [selectedAssignee, setSelectedAssignee] = useState(null);

    // Dynamic title and button text based on context
    const isCurrentlyAssigned = kr && kr.assigned_user;
    const isAssigningNew = selectedAssignee && (!isCurrentlyAssigned || selectedAssignee.user_id !== kr.assigned_user?.user_id);
    const isUnassigning = !selectedAssignee && isCurrentlyAssigned;
    const isNoChange = selectedAssignee && isCurrentlyAssigned && selectedAssignee.user_id === kr.assigned_user?.user_id;

    const modalTitle = isCurrentlyAssigned ? "Giao lại Key Result" : "Giao Key Result";
    let confirmButtonText = "Giao việc";
    if (isUnassigning) {
        confirmButtonText = "Bỏ giao";
    } else if (isAssigningNew) {
        confirmButtonText = "Giao việc";
    } else if (isNoChange) {
        confirmButtonText = "Đã giao";
    }
    
    const isSubmitDisabled = loading || isNoChange;

    const handleSubmit = () => {
        onConfirm(selectedAssignee ? selectedAssignee.user_id : null);
    };

    if (!show || !kr || !objective) return null;

    return (
        <Modal open={show} onClose={onClose} title={modalTitle}>
            <div className="space-y-4">
                <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600">
                            <FaBullseye className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-slate-800 font-semibold">
                            {objective.obj_title}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-amber-600">
                            <FaKey className="w-3 h-3" />
                        </div>
                        <p className="text-sm text-slate-700 font-medium">
                            {kr.kr_title}
                        </p>
                    </div>
                </div>

                {/* Display Current Assignee */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Người thực hiện hiện tại:
                    </label>
                    <div className="p-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600 text-sm">
                        {kr.assigned_user ? 
                            <div className="flex items-center gap-2">
                                {kr.assigned_user.avatar_url ? (
                                    <img src={kr.assigned_user.avatar_url} alt={kr.assigned_user.full_name} className="h-5 w-5 rounded-full object-cover" />
                                ) : (
                                    <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700">
                                        {kr.assigned_user.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {kr.assigned_user.full_name} ({kr.assigned_user.email})
                            </div>
                            : "Chưa giao"
                        }
                    </div>
                </div>

                {/* Replace email input with UserSearchInput */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Giao cho:
                    </label>
                    <UserSearchInput
                        onUserSelect={setSelectedAssignee}
                        initialUser={null} // Default to null (empty) as per user request
                        objectiveDepartmentId={objective.department_id}
                        currentUserRole={currentUserRole?.role_name}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="opacity-25"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8z"
                                        className="opacity-75"
                                    />
                                </svg>
                                Đang xử lý...
                            </>
                        ) : (
                            confirmButtonText
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
