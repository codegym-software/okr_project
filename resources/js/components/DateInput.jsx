import React, { useEffect, useRef, useState } from 'react';

export default function DateInput({ name, value, defaultValue, onChange, required, placeholder = "dd/MM/yyyy" }) {
    const [iso, setIso] = useState(value ?? '');
    const [showPicker, setShowPicker] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef(null);
    
    useEffect(() => { 
        if (defaultValue && !value) {
            setIso(defaultValue);
            // Set currentMonth dựa trên ngày đã chọn
            const date = new Date(defaultValue);
            if (!isNaN(date.getTime())) {
                setCurrentMonth(date);
            }
        }
    }, [defaultValue, value]);
    
    // Sync internal state with prop value changes
    useEffect(() => {
        if (value !== undefined) {
            setIso(value);
        }
    }, [value]);
    
    useEffect(() => {
        // Cập nhật currentMonth khi có ngày được chọn
        if (iso) {
            // Parse YYYY-MM-DD thủ công để tránh lỗi timezone
            if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                const [y, m, d] = iso.split('-').map(Number);
                setCurrentMonth(new Date(y, m - 1, d));
            } else {
                const date = new Date(iso);
                if (!isNaN(date.getTime())) {
                    setCurrentMonth(date);
                }
            }
        }
    }, [iso]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const formatDMY = (v) => {
        if (!v) return '';
        // Ưu tiên parse chuỗi YYYY-MM-DD trực tiếp
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
            const [y, m, d] = v.split('-');
            return `${d}/${m}/${y}`;
        }
        
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };
    
    const openPicker = () => setShowPicker(!showPicker);
    
    const handleDateSelect = (date, event) => {
        // Ngăn form submit
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Lấy ngày tháng từ ô lịch đã render (đảm bảo là local date)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Ghép chuỗi thủ công, KHÔNG dùng toISOString() hay bất kỳ hàm Date nào khác
        const isoString = `${year}-${month}-${day}`;
        
        setIso(isoString);
        onChange && onChange(isoString);
        setShowPicker(false);
    };
    
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };
    
    const prevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
    
    const nextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };
    
    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    };
    
    const isSelected = (date) => {
        if (!iso) return false;
        const selected = new Date(iso);
        return date.getDate() === selected.getDate() && 
               date.getMonth() === selected.getMonth() && 
               date.getFullYear() === selected.getFullYear();
    };
    
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                       'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const days = getDaysInMonth(currentMonth);
    
    return (
        <div ref={containerRef} className="relative">
            <input 
                type="text" 
                name={name}
                readOnly 
                value={formatDMY(iso)} 
                placeholder={placeholder} 
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-500" 
                required={required || false} 
                onClick={openPicker} 
            />
            <button 
                type="button" 
                onClick={openPicker} 
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500" 
                aria-label="Open calendar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
            </button>
            {showPicker && (
                <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <button type="button" onClick={prevMonth} className="rounded-lg p-1 hover:bg-slate-100">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="font-semibold text-slate-900">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </div>
                        <button type="button" onClick={nextMonth} className="rounded-lg p-1 hover:bg-slate-100">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-3">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="p-2 text-center text-xs font-semibold text-slate-500">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((date, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={(e) => date && handleDateSelect(date, e)}
                                    disabled={!date}
                                    className={`p-2 text-sm rounded-lg ${
                                        !date ? 'invisible' :
                                        isSelected(date) ? 'bg-blue-600 text-white' :
                                        isToday(date) ? 'bg-blue-100 text-blue-700 font-semibold' :
                                        'hover:bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    {date ? date.getDate() : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
