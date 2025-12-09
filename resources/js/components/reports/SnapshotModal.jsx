import React from 'react';

export default function SnapshotModal({ 
    isOpen, 
    onClose, 
    title, 
    onTitleChange, 
    onSubmit, 
    isSubmitting 
}) {
    if (!isOpen) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-black/30 bg-opacity-70 flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div 
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-5 p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-slate-900">Tạo Báo cáo</h3>
                        <button 
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg p-2 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 pt-0 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tên Báo cáo Cuối kỳ <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => onTitleChange(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="VD: Báo cáo Tuần 42/2025"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={isSubmitting || !title.trim()}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                    </svg>
                                    Đang tạo...
                                </>
                            ) : (
                                'Xác nhận'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

