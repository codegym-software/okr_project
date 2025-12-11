import React from "react";

const ConfirmationModal = ({ confirmModal, closeConfirm }) => {
    if (!confirmModal.show) return null;

    return (
        <>
            {/* Overlay để chặn tương tác với trang bên dưới */}
            <div 
                className="fixed inset-0 bg-black/30 z-40"
                onClick={closeConfirm}
            />
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 text-left">
                        {confirmModal.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-5 text-left">
                        {confirmModal.message}
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={closeConfirm}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                        >
                            {confirmModal.cancelText}
                        </button>
                        <button
                            onClick={() => {
                                if (confirmModal.onConfirm) {
                                    confirmModal.onConfirm();
                                }
                                closeConfirm();
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                        >
                            {confirmModal.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationModal;
