import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const createGradient = (ctx, area) => {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
    return gradient;
};

export default function ProgressOverTimeChart({ chartData }) {
    if (!chartData || chartData.length === 0) {
        return <div className="text-center py-10 text-gray-500">Không có dữ liệu xu hướng.</div>;
    }

    const data = {
        labels: chartData.map(d => d.bucket.replace('-', '/W')),
        datasets: [
            {
                label: 'Tiến độ Thực tế (%)',
                data: chartData.map(d => d.avg_progress),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) {
                        return null;
                    }
                    return createGradient(ctx, chartArea);
                },
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(59, 130, 246)',

            },
            {
                label: 'Tiến độ Lý tưởng (%)',
                data: chartData.map(d => d.ideal_progress),
                borderColor: 'rgb(160, 174, 192)',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4,
                pointBackgroundColor: 'rgb(160, 174, 192)',
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 20
                }
            },
            title: {
                display: true,
                text: 'Tiến độ O Cấp Công ty Theo Thời gian',
                font: {
                    size: 16,
                    weight: 'bold',
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
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += `${context.parsed.y}%`;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
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
            x: {
                grid: {
                    display: false,
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 h-96">
            <Line options={options} data={data} />
        </div>
    );
}
