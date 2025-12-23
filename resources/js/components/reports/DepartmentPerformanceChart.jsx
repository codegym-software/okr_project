import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DepartmentPerformanceChart({ chartData }) {
    if (!chartData || chartData.length === 0) {
        return <div className="text-center py-10 text-gray-500">Không có dữ liệu phòng ban.</div>;
    }

    const data = {
        labels: chartData.map(d => d.department_name),
        datasets: [
            {
                label: 'Tiến độ TB (%)',
                data: chartData.map(d => d.average_progress),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
            },
        ]
    };

    const options = {
        indexAxis: 'y', // Horizontal bar chart
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Đóng góp Hiệu suất theo Phòng ban',
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: {
                    bottom: 20
                }
            },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#333',
                bodyColor: '#666',
                borderColor: '#ddd',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.x !== null) {
                            label += `${context.parsed.x.toFixed(2)}%`;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    stepSize: 20,
                    callback: function(value) {
                        return value + '%';
                    }
                },
                grid: {
                    drawBorder: false,
                }
            },
            y: {
                grid: {
                    display: false
                }
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 h-96">
            <Bar options={options} data={data} />
        </div>
    );
}
