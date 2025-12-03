export default function StatCard({ title, value, suffix = '%', hint }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-500">{title}</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}{suffix}</div>
            {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
    );
}

