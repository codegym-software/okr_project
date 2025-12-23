module.exports = {
    content: [
        "./resources/views/**/*.blade.php",
        "./resources/js/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Be Vietnam Pro"', 'sans-serif'],
            },
            colors: {
                "body-bg": "#3b82f6",
                "body-color": "#ffffff",
                "main-content-bg": "#ffffff",
                "main-content-color": "#ffffff",
                "sidebar-bg": "#3b82f6",
                "sidebar-color": "#ffffff",
                "sidebar-hover-bg": "#2a2a2a",
                "sidebar-border": "#333",
                "card-bg": "#333333",
                "card-color": "#ffffff",
                "progress-bg": "#4a4a4a",
                "form-container-bg": "#ffffff",
                "form-container-color": "#000000",
                "bg-primary": "#3b82f6",
                "bg-secondary": "#a1bffe",
                border: "#333",
                // Dark theme colors
                "dark-body-bg": "#1f2937",
                "dark-body-color": "#f3f4f6",
                "dark-sidebar-bg": "#1e40af",
                "dark-main-content-bg": "#1f2937",
                "dark-main-content-color": "#f3f4f6",
            },
        },
    },
    darkMode: "class",
    plugins: [],
};
