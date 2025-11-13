// import React, { useEffect, useMemo, useState } from "react";

// function classNames(...xs) {
//     return xs.filter(Boolean).join(" ");
// }

// function ProgressBar({ value }) {
//     const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
//     const color = v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-rose-500";
//     return (
//         <div className="w-full rounded-full bg-slate-100">
//             <div
//                 className={classNames("h-2 rounded-full transition-all", color)}
//                 style={{ width: `${v}%` }}
//             />
//         </div>
//     );
// }

// function OkrTable({ data, showOwner = false }) {
//     const rows = data || [];
//     const computeAvg = (obj) => {
//         const kr = obj.key_results || obj.keyResults || [];
//         if (!kr.length) return 0;
//         const sum = kr.reduce((s, k) => s + Number(k.progress_percent ?? 0), 0);
//         return sum / kr.length;
//     };
//     const getOwner = (obj) => {
//         const owner = obj.user || (obj.assignments && obj.assignments[0]?.user) || null;
//         return owner?.full_name || owner?.name || "-";
//     };
//     const getDeptName = (obj) => {
//         const d = obj.department || {};
//         return d.d_name || d.department_name || "-";
//     };

//     return (
//         <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
//             <table className="min-w-full table-auto text-sm">
//                 <thead className="bg-slate-50 text-slate-700">
//                     <tr>
//                         {showOwner && <th className="px-4 py-3 text-left font-semibold">Owner</th>}
//                         <th className="px-4 py-3 text-left font-semibold">Objective</th>
//                         <th className="px-4 py-3 text-left font-semibold">Level</th>
//                         <th className="px-4 py-3 text-left font-semibold">Department</th>
//                         <th className="px-4 py-3 text-left font-semibold">Cycle</th>
//                         <th className="px-4 py-3 text-left font-semibold">Status</th>
//                         <th className="px-4 py-3 text-left font-semibold">Progress</th>
//                     </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                     {rows.map((o) => {
//                         const avg = computeAvg(o);
//                         return (
//                             <tr key={o.objective_id || o.id} className="hover:bg-slate-50/60">
//                                 {showOwner && (
//                                     <td className="px-4 py-3 align-top text-slate-800">{getOwner(o)}</td>
//                                 )}
//                                 <td className="px-4 py-3 align-top">
//                                     <div className="font-medium text-slate-900">{o.obj_title}</div>
//                                 </td>
//                                 <td className="px-4 py-3 align-top text-slate-700">{o.level || '-'}</td>
//                                 <td className="px-4 py-3 align-top text-slate-700">{getDeptName(o)}</td>
//                                 <td className="px-4 py-3 align-top text-slate-700">
//                                     {o.cycle?.cycle_name || '-'}
//                                 </td>
//                                 <td className="px-4 py-3 align-top text-slate-700">{o.status || '-'}</td>
//                                 <td className="px-4 py-3 align-top w-56">
//                                     <div className="flex items-center gap-3">
//                                         <div className="w-28">
//                                             <ProgressBar value={avg} />
//                                         </div>
//                                         <div className="text-xs font-semibold text-slate-800">{Math.round(avg)}%</div>
//                                     </div>
//                                 </td>
//                             </tr>
//                         );
//                     })}
//                 </tbody>
//             </table>
//             {rows.length === 0 && (
//                 <div className="p-8 text-center text-slate-600">Không có dữ liệu.</div>
//             )}
//         </div>
//     );
// }

// export default function DashboardPage({ user }) {
//     const [tab, setTab] = useState("my");
//     const [loading, setLoading] = useState(true);
//     const [cycles, setCycles] = useState([]);
//     const [cycleId, setCycleId] = useState("");
//     const [myData, setMyData] = useState({ data: [], meta: null });
//     const [teamData, setTeamData] = useState({ data: [], meta: null });
//     const isManagerOrAdmin = !!(user?.is_admin || user?.role?.role_name === "manager");

//     useEffect(() => {
//         // load cycles for filter
//         fetch(`/cycles`, { headers: { Accept: "application/json" } })
//             .then((r) => r.json())
//             .then((j) => {
//                 if (j?.success) setCycles(j.data || []);
//             })
//             .catch(() => {})
//             .finally(() => {});
//     }, []);

//     useEffect(() => {
//         setLoading(true);
//         const qsMy = new URLSearchParams();
//         qsMy.set("my_okr", "1");
//         if (cycleId) qsMy.set("cycle_id", cycleId);
//         const myReq = fetch(`/my-objectives?${qsMy.toString()}`, {
//             headers: { Accept: "application/json" },
//         }).then((r) => r.json());

//         // For team: reuse endpoint without my_okr to leverage manager visibility
//         const qsTeam = new URLSearchParams();
//         if (cycleId) qsTeam.set("cycle_id", cycleId);
//         const teamReq = isManagerOrAdmin
//             ? fetch(`/my-objectives?${qsTeam.toString()}`, {
//                   headers: { Accept: "application/json" },
//               }).then((r) => r.json())
//             : Promise.resolve(null);

//         Promise.all([myReq, teamReq])
//             .then(([myRes, teamRes]) => {
//                 if (myRes?.success) setMyData({ data: myRes.data?.data || [], meta: myRes.data });
//                 else setMyData({ data: [], meta: null });

//                 if (isManagerOrAdmin && teamRes?.success) {
//                     // filter out my own objectives for team list
//                     const meId = window.__USER__?.user_id || null; // may not be present
//                     const arr = (teamRes.data?.data || []).filter((o) => {
//                         const ownerId = o.user_id;
//                         return meId ? ownerId !== meId : true;
//                     });
//                     setTeamData({ data: arr, meta: teamRes.data });
//                 } else setTeamData({ data: [], meta: null });
//             })
//             .finally(() => setLoading(false));
//     }, [cycleId, isManagerOrAdmin]);

//     // Flat list rendering; no grouping by owner for table view
//     const teamList = useMemo(() => teamData.data || [], [teamData]);

//     return (
//         <div className="space-y-6">
//             <div className="flex flex-wrap items-center justify-between gap-3">
//                 <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
//                 <div className="flex items-center gap-2">
//                     <select
//                         className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none"
//                         value={cycleId}
//                         onChange={(e) => setCycleId(e.target.value)}
//                     >
//                         <option value="">Tất cả chu kỳ</option>
//                         {cycles.map((c) => (
//                             <option key={c.cycle_id} value={c.cycle_id}>
//                                 {c.cycle_name}
//                             </option>
//                         ))}
//                     </select>
//                     <a
//                         href="/my-objectives"
//                         className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
//                     >
//                         + Tạo Objective
//                     </a>
//                 </div>
//             </div>

//             <div className="flex items-center gap-2">
//                 <button
//                     className={classNames(
//                         "rounded-lg px-3 py-2 text-sm font-semibold",
//                         tab === "my"
//                             ? "bg-slate-900 text-white"
//                             : "bg-white text-slate-700 border border-slate-300"
//                     )}
//                     onClick={() => setTab("my")}
//                 >
//                     My OKR
//                 </button>
//                 {isManagerOrAdmin && (
//                     <button
//                         className={classNames(
//                             "rounded-lg px-3 py-2 text-sm font-semibold",
//                             tab === "team"
//                                 ? "bg-slate-900 text-white"
//                                 : "bg-white text-slate-700 border border-slate-300"
//                         )}
//                         onClick={() => setTab("team")}
//                     >
//                         OKR thành viên
//                     </button>
//                 )}
//             </div>

//             {loading ? (
//                 <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
//                     Đang tải dữ liệu...
//                 </div>
//             ) : tab === "my" ? (
//                 <OkrTable data={myData.data} showOwner={false} />
//             ) : (
//                 <OkrTable data={teamList} showOwner={true} />
//             )}
//         </div>
//     );
// }
