import React, { useState, useRef, useEffect } from "react";

/**
 * Dropdown Component - Tái sử dụng cho các dropdown menu
 * @param {Object} props
 * @param {React.ReactNode} props.trigger - Element trigger dropdown
 * @param {React.ReactNode} props.children - Nội dung dropdown
 * @param {string} props.className - CSS classes cho dropdown container
 * @param {string} props.position - Vị trí dropdown: 'left', 'right', 'center'
 * @param {number} props.zIndex - Z-index cho dropdown (default: 10000)
 * @param {boolean} props.closeOnClickOutside - Đóng khi click outside (default: true)
 */
export function Dropdown({
    trigger,
    children,
    className = "",
    position = "right",
    zIndex = 10000,
    closeOnClickOutside = true,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);

    // Xử lý click outside
    useEffect(() => {
        if (!closeOnClickOutside) return;

        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [closeOnClickOutside]);

    // Xử lý keyboard
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen]);

    // Xử lý navigation - đóng dropdown khi chuyển trang
    useEffect(() => {
        const handleNavigation = () => {
            setIsOpen(false);
        };

        // Listen for popstate events (back/forward navigation)
        window.addEventListener("popstate", handleNavigation);

        // Listen for custom navigation events (programmatic navigation)
        window.addEventListener("navigation", handleNavigation);

        return () => {
            window.removeEventListener("popstate", handleNavigation);
            window.removeEventListener("navigation", handleNavigation);
        };
    }, []);

    const getPositionClasses = () => {
        switch (position) {
            case "left":
                return "left-0";
            case "center":
                return "left-1/2 transform -translate-x-1/2";
            case "right":
            default:
                return "right-0";
        }
    };

    const closeDropdown = () => setIsOpen(false);

    return (
        <div className="relative">
            <div
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer"
            >
                {trigger}
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className={`absolute ${getPositionClasses()} mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${className}`}
                    style={{ zIndex }}
                >
                    {/* Clone children và truyền onClose prop */}
                    {React.Children.map(children, (child) => {
                        if (React.isValidElement(child)) {
                            return React.cloneElement(child, {
                                onClose: closeDropdown,
                            });
                        }
                        return child;
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * DropdownItem Component - Item trong dropdown
 */
export function DropdownItem({
    children,
    onClick,
    className = "",
    variant = "default",
    onClose,
}) {
    const baseClasses =
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150";

    const variantClasses = {
        default: "hover:bg-slate-50",
        danger: "text-red-600 hover:bg-red-50",
        primary: "text-blue-600 hover:bg-blue-50",
    };

    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
        }
        // Đóng dropdown sau khi click
        if (onClose) {
            onClose();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

/**
 * DropdownDivider Component - Phân cách trong dropdown
 */
export function DropdownDivider() {
    return <div className="border-t border-slate-200 my-1" />;
}

/**
 * DropdownHeader Component - Header của dropdown
 */
export function DropdownHeader({ children, className = "" }) {
    return (
        <div className={`border-b border-slate-200 p-5 ${className}`}>
            {children}
        </div>
    );
}

/**
 * DropdownContent Component - Nội dung chính của dropdown
 */
export function DropdownContent({ children, className = "" }) {
    return <div className={`p-2 ${className}`}>{children}</div>;
}

/**
 * CycleDropdown Component - Dropdown chọn chu kỳ
 */
export function CycleDropdown({
    cyclesList,
    cycleFilter,
    handleCycleChange,
    dropdownOpen,
    setDropdownOpen,
}) {
    return (
        <div className="relative w-40">
            <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
                <span className="flex items-center gap-2">
                    {cyclesList.find(
                        (c) => String(c.cycle_id) === String(cycleFilter)
                    )?.cycle_name || "Chọn chu kỳ"}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                    {cyclesList.map((cycle) => {
                        const match =
                            cycle.cycle_name.match(/Quý (\d+) năm (\d+)/);
                        const quarter = match ? parseInt(match[1]) : null;
                        const year = match ? parseInt(match[2]) : null;
                        const now = new Date();
                        const currentQuarter = Math.ceil(
                            (now.getMonth() + 1) / 3
                        );
                        const currentYear = now.getFullYear();
                        const isCurrent =
                            quarter === currentQuarter && year === currentYear;

                        return (
                            <label
                                key={cycle.cycle_id}
                                className={`flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                                    String(cycleFilter) === String(cycle.cycle_id)
                                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="cycle"
                                    value={cycle.cycle_id}
                                    checked={
                                        String(cycleFilter) ===
                                        String(cycle.cycle_id)
                                    }
                                    onChange={(e) => {
                                        handleCycleChange(e.target.value);
                                        setDropdownOpen(false);
                                    }}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                        {cycle.cycle_name}
                                        {isCurrent && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Hiện tại
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Dropdown;
