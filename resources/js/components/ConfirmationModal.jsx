import React from "react";

const ConfirmationModal = ({ confirmModal, closeConfirm }) => {
    return (
        confirmModal.show && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {confirmModal.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-5">
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
                                confirmModal.onConfirm();
                                closeConfirm();
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                        >
                            {confirmModal.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        )
    );
};

export default ConfirmationModal;
