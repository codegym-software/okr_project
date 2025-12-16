import React from 'react';

const Tooltip = ({ children, text }) => {
    return (
        <div className="relative group flex items-center">
            {children}
            <div className="absolute bottom-full mb-2 w-max max-w-xs bg-slate-800 text-white text-xs font-semibold rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 left-1/2 -translate-x-1/2">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 transform rotate-45"></div>
            </div>
        </div>
    );
};

export default Tooltip;
