/**
 * Shared configuration options for Chart.js tooltips across the application.
 */
export const tooltipOptions = {
    enabled: true,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker background for better contrast
    titleColor: '#fff',
    bodyColor: '#fff',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    padding: 10,
    usePointStyle: true,
    boxPadding: 3,
    callbacks: {
        labelPointStyle: function(context) {
            return {
                pointStyle: 'triangle',
                rotation: 0
            };
        }
    }
};

/**
 * Shared configuration for chart legends.
 */
export const legendOptions = {
    position: 'bottom',
    labels: {
        usePointStyle: true,
        boxWidth: 8,
        padding: 20,
        color: '#475569' // slate-600
    }
};
