import React, { useEffect } from 'react';

export function Toast({ type='success', message, onClose, timeout=2500 }) {
    if (!message) return null;
    const color = type === 'success' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500';
    useEffect(() => {
        const t = setTimeout(() => onClose && onClose(), timeout);
        return () => clearTimeout(t);
    }, [message]);
    return (
        <div className="fixed right-4 top-4 z-50">
            <div className={`rounded-xl bg-gradient-to-r ${color} px-4 py-3 text-white shadow-lg`}>
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6h2V7zm0 8h-2v2h2v-2z"/></svg>
                    <span className="text-sm font-semibold">{message}</span>
                    <button onClick={onClose} className="ml-2 rounded-md bg-white/20 px-2 text-xs">Đóng</button>
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

export function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.59 16.89 4.29z"/></svg>
                    </button>
                </div>
                <div className="p-6">{children}</div>
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

export function Select({ value, onChange, options, placeholder }) {
    return (
        <select value={value} onChange={e=>onChange(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{placeholder}</option>
            {options.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

export default { Toast, Modal, Badge, Select, GradientText };


