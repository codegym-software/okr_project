import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function ProgressChart() {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWarning, setShowWarning] = useState(true);

    useEffect(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        };

        if (token) {
            headers["X-CSRF-TOKEN"] = token;
        }

        fetch("/api/dashboard/progress-chart", { headers })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                setChartData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load progress chart data", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-center h-64">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        );
    }

    if (error || !chartData) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-center h-64">
                    <p className="text-slate-500">Không thể tải dữ liệu biểu đồ</p>
                </div>
            </div>
        );
    }

    const data = {
        labels: chartData.weeks,
        datasets: [
            {
                label: 'Tiến độ thực tế',
                data: chartData.actual,
                borderColor: '#3B82F6', 
                backgroundColor: '#3B82F6',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: 'Mục tiêu lý tưởng',
                data: chartData.target,
                borderColor: '#9CA3AF', 
                backgroundColor: '#9CA3AF',
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 0,
            },
            {
                label: 'Tiến độ phòng ban',
                data: chartData.department,
                borderColor: '#10B981', 
                backgroundColor: '#10B981',
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                },
            },
            title: {
                display: true,
                text: `Tiến độ ${chartData.cycle.name} - ${chartData.cycle.objectivesCount} mục tiêu`,
                font: {
                    size: 16,
                    weight: 'bold',
                },
                padding: {
                    top: 10,
                    bottom: 20,
                },
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y}%`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: function(value) {
                        return value + '%';
                    },
                },
                grid: {
                    color: '#F1F5F9',
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                },
            },
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

    return (
        <>
            {chartData.isBehind && showWarning && (
                <div className="mb-4">
                    <div
                        className="
                            relative w-full
                            px-5 py-4
                            bg-red-50
                            border border-red-200
                            border-t-4 border-t-red-500
                            rounded-md
                        "
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-4">
                                <svg
                                    className="h-5 w-5 text-red-500 flex-shrink-0 mt-[2px]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>

                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Cảnh báo tiến độ: OKR đang chậm so với kế hoạch
                                    </p>

                                    <div className="mt-1 text-xs text-slate-700 flex flex-col gap-1">
                                        <span>Thực tế hiện tại: {chartData.currentProgress}%</span>
                                        <span>Kế hoạch tại thời điểm này: {chartData.targetProgress}%</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowWarning(false)}
                                className="text-red-400 hover:text-red-600 transition"
                                aria-label="Đóng cảnh báo"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="h-80 mb-4">
                    <Line data={data} options={options} />
                </div>

                <div className="mt-2 mb-6 text-xs text-slate-500 text-center">
                    Biểu đồ cập nhật theo tuần, bắt đầu từ ngày tạo mục tiêu đầu tiên trong chu kỳ
                </div>
            </div>
        </>
    );
}