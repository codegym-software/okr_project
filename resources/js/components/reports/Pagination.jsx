export default function Pagination({ currentPage, lastPage, onPageChange }) {
    if (lastPage <= 1) return null;

    return (
        <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: lastPage }, (_, i) => i + 1).map((pageNumber) => {
                        if (
                            pageNumber === 1 ||
                            pageNumber === lastPage ||
                            (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                            return (
                                <button
                                    key={pageNumber}
                                    onClick={() => onPageChange(pageNumber)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === pageNumber
                                            ? "bg-blue-600 text-white"
                                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    {pageNumber}
                                </button>
                            );
                        } else if (
                            pageNumber === currentPage - 2 ||
                            pageNumber === currentPage + 2
                        ) {
                            return (
                                <span
                                    key={pageNumber}
                                    className="px-2 text-gray-400"
                                >
                                    ...
                                </span>
                            );
                        }
                        return null;
                    })}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
                    disabled={currentPage === lastPage}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === lastPage
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}

