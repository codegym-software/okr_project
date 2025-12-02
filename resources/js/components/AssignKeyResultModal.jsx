import React, { useState, useEffect } from "react";
import { Modal } from "./ui";
import UserSearchInput from './UserSearchInput'; // NEW

export default function AssignKeyResultModal({
    show,
    kr,
    objective,
    loading,
    onConfirm, // Will now receive userId directly
    onClose,
    currentUserRole, // NEW
}) {
    // NEW state to hold the selected user from the search input
    const [selectedAssignee, setSelectedAssignee] = useState(null);

    // Dynamic title and button text
    const isReassign = kr && kr.assigned_to;
    const modalTitle = isReassign ? "Giao lại Key Result" : "Giao Key Result";
    const confirmButtonText = isReassign ? "Giao lại" : "Giao việc";

    // Set initial selected assignee when modal opens or KR changes
    useEffect(() => {
        if (kr && kr.assigned_user) {
            setSelectedAssignee(kr.assigned_user);
        } else {
            setSelectedAssignee(null); // Reset if no assignee or new KR
        }
    }, [kr]);

    // Handle form submission
    const handleSubmit = () => {
        if (selectedAssignee) {
            onConfirm(selectedAssignee.user_id); // Pass user_id directly
        }
    };

    if (!show || !kr || !objective) return null; // Ensure kr and objective are present

    return (
        <Modal open={show} onClose={onClose} title={modalTitle}>
            <div className="space-y-4">
                <div className="mb-4">
                    <p className="text-sm text-slate-700 font-medium">
                        <span className="font-bold">{objective.obj_title}</span> › {kr.kr_title}
                    </p>
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
                        initialUser={selectedAssignee} // Pass currently selected user to pre-fill
                        objectiveDepartmentId={objective.department_id} // For departmental filtering
                        currentUserRole={currentUserRole?.role_name} // For role-based filtering
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button" // Important for preventing form submission
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button" // Important for preventing form submission
                        onClick={handleSubmit} // Call our new handler
                        disabled={loading || !selectedAssignee} // Disable if no user selected
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
                                Đang giao...
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
