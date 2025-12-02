import React, { useEffect, useRef, useState } from 'react';

export function Toast({ type='success', message, onClose, timeout=2500 }) {
    if (!message) return null;
    const color = type === 'success' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500';
    useEffect(() => {
        const t = setTimeout(() => onClose && onClose(), timeout);
        return () => clearTimeout(t);
    }, [message]);

    // Split message by newlines and render each line
    const messageLines = message.split('\n');

    return (
        <div className="fixed right-4 top-4 z-50">
            <div className={`rounded-xl bg-gradient-to-r ${color} px-4 py-3 text-white shadow-lg max-w-md`}>
                <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6h2V7zm0 8h-2v2h2v-2z"/></svg>
                    <div className="flex-1">
                        {messageLines.map((line, index) => (
                            <div key={index} className="text-sm font-semibold">
                                {line}
                            </div>
                        ))}
                    </div>
                    <button onClick={onClose} className="ml-2 rounded-md bg-white/20 px-2 text-xs flex-shrink-0">Đóng</button>
                </div>
            </div>
        </div>
    );
}

export function GradientText({ children }) {
    return (
        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {children}
        </span>
    );
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className={`relative w-full ${maxWidth} max-h-[90vh] rounded-2xl bg-white shadow-xl flex flex-col`}>
                <div className="flex items-center justify-between border-b border-slate-200 p-4 flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.59 16.89 4.29z"/></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
}

export function Badge({ color='emerald', children }) {
    const map = {
        emerald: 'bg-emerald-100 text-emerald-700',
        slate: 'bg-slate-100 text-slate-700',
        red: 'bg-rose-100 text-rose-700',
        blue: 'bg-blue-100 text-blue-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        amber: 'bg-amber-100 text-amber-700',
    };
    return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${map[color]}`}>{children}</span>;
}

export function Select({ value, onChange, options, placeholder, className = '', disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const selectRef = useRef(null);
    const dropdownRef = useRef(null);

    // Tìm option được chọn
    const selectedOption = options.find(option => option.value === value);
    const displayValue = selectedOption ? selectedOption.label : placeholder;

    // Chiều rộng bằng với container (input fields)
    const getMinWidth = () => {
        return '100%'; // Sử dụng full width của container
    };

    // Xử lý click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Xử lý keyboard navigation
    const handleKeyDown = (e) => {
        if (disabled) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    const option = options[highlightedIndex];
                    onChange(option.value);
                    setIsOpen(false);
                    setHighlightedIndex(-1);
                } else {
                    setIsOpen(!isOpen);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev =>
                        prev < options.length - 1 ? prev + 1 : 0
                    );
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : options.length - 1
                    );
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleOptionClick = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    return (
        <div ref={selectRef} className={`relative w-full ${className}`}>
            {/* Select Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`
                    relative w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm
                    shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    ${disabled
                        ? 'cursor-not-allowed bg-slate-50 text-slate-400'
                        : 'cursor-pointer hover:border-slate-400'
                    }
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
                `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={`block truncate ${!selectedOption ? 'text-slate-500' : 'text-slate-900'}`} title={displayValue}>
                    {displayValue}
                </span>

                {/* Arrow Icon */}
                <span className={`
                    absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none
                    transition-transform duration-200
                    ${isOpen ? 'rotate-180' : ''}
                `}>
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-[10000] mt-1 w-full min-w-[120px] rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5"
                    role="listbox"
                >
                    <div className="max-h-60 overflow-auto rounded-lg">
                        {options.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionClick(option.value)}
                                className={`
                                    relative w-full cursor-pointer select-none px-3 py-2 text-left text-sm
                                    transition-colors duration-150 ease-out
                                    ${index === highlightedIndex
                                        ? 'bg-blue-50 text-blue-900'
                                        : 'text-slate-900 hover:bg-slate-50'
                                    }
                                    ${option.value === value
                                        ? 'bg-blue-100 text-blue-900 font-medium'
                                        : ''
                                    }
                                `}
                                role="option"
                                aria-selected={option.value === value}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                onMouseLeave={() => setHighlightedIndex(-1)}
                            >
                                <span className="block whitespace-nowrap" title={option.label}>{option.label}</span>

                                {/* Check Icon for Selected Option */}
                                {option.value === value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default { Toast, Modal, Badge, Select, GradientText };


