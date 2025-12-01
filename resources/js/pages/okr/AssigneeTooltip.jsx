// src/components/okr/AssigneeTooltip.jsx
export default function AssigneeTooltip({ tooltip }) {
    if (!tooltip?.info) return null;

    const { info, position } = tooltip;

    return (
        <div
            className="pointer-events-none fixed z-[2000]"
            style={{
                left: position.x + window.scrollX,
                top: position.y + window.scrollY - 12,
            }}
        >
            <div className="relative -translate-x-1/2 -translate-y-full rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-slate-100">
                <div className="flex items-start gap-3">
                    {info.avatar ? (
                        <img
                            src={info.avatar}
                            alt={info.name}
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100"
                        />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-700">
                            {info.name?.[0] || "?"}
                        </div>
                    )}
                    <div className="min-w-[180px]">
                        <p className="text-base font-semibold text-slate-900">
                            {info.name || "Không rõ"}
                        </p>
                        <p className="text-sm text-slate-500">
                            {info.department || "Phòng ban: Chưa xác định"}
                        </p>
                        {info.email && (
                            <p className="mt-1 text-xs text-slate-400">
                                {info.email}
                            </p>
                        )}
                    </div>
                </div>
                <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-[1px_1px_2px_rgba(15,23,42,.15)]"></div>
            </div>
        </div>
    );
}
