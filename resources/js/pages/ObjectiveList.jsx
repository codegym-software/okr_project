import React from "react";

export default function ObjectiveList({
    items,
    departments,
    cyclesList,
    loading,
    openObj,
    setOpenObj,
    setCreatingFor,
    setEditingObjective,
    setEditingKR,
    setCreatingObjective,
}) {
    const formatPercent = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : "";
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex w-full items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                    Danh sách mục tiêu
                </h2>
                <button
                    onClick={() => setCreatingObjective(true)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    Thêm Objective
                </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-xs md:text-sm">
                    <thead className="bg-slate-50 text-left font-semibold text-slate-700">
                        <tr>
                            <th className="px-3 py-2 border-r border-slate-200 w-[30%] text-left">
                                Tiêu đề
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[14%] text-center">
                                Phòng ban
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Chu kỳ
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[12%] text-center">
                                Trạng thái
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[8%] text-center">
                                Đơn vị
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[8%] text-center">
                                Thực tế
                            </th>
                            <th className="px-3 py-2 border-r border-slate-200 w-[8%] text-center">
                                Mục tiêu
                            </th>
                            <th className="px-3 py-2 w-[8%] text-center">
                                Tiến độ (%)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-5 text-center text-slate-500"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            items.map((obj, index) => (
                                <React.Fragment key={obj.objective_id}>
                                    <tr
                                        className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200 ${
                                            index > 0 ? "mt-4" : ""
                                        }`}
                                    >
                                        <td colSpan={8} className="px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="inline-flex items-center gap-3">
                                                    <button
                                                        onClick={() =>
                                                            setOpenObj(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [obj.objective_id]:
                                                                        prev[
                                                                            obj
                                                                                .objective_id
                                                                        ] ===
                                                                        false,
                                                                })
                                                            )
                                                        }
                                                        className="rounded-md border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 shadow-sm"
                                                        title="Đóng/mở Key Results"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                            className={`h-4 w-4 transition-transform ${
                                                                openObj[
                                                                    obj
                                                                        .objective_id
                                                                ] === false
                                                                    ? ""
                                                                    : "rotate-180"
                                                            }`}
                                                        >
                                                            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setEditingObjective(
                                                                obj
                                                            )
                                                        }
                                                        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                                                        title="Sửa Objective"
                                                    >
                                                        {obj.obj_title}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setCreatingFor(obj)
                                                    }
                                                    title="Thêm Key Result"
                                                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                                                >
                                                    Thêm KR
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {openObj[obj.objective_id] === false
                                        ? null
                                        : (obj.key_results || []).map((kr) => (
                                              <tr
                                                  key={kr.kr_id}
                                                  className="hover:bg-slate-50 bg-white border-l-4 border-l-blue-200"
                                              >
                                                  <td className="px-6 py-3 border-r border-slate-200">
                                                      <button
                                                          onClick={() =>
                                                              setEditingKR({
                                                                  ...kr,
                                                                  objective_id:
                                                                      obj.objective_id,
                                                              })
                                                          }
                                                          className="inline-flex items-center gap-2 text-left text-slate-900"
                                                      >
                                                          <span className="underline-offset-2 hover:underline font-medium">
                                                              {kr.kr_title ||
                                                                  ""}
                                                          </span>
                                                      </button>
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {obj.department?.d_name ||
                                                          departments.find(
                                                              (d) =>
                                                                  String(
                                                                      d.department_id
                                                                  ) ===
                                                                  String(
                                                                      obj.department_id
                                                                  )
                                                          )?.d_name ||
                                                          ""}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {(() => {
                                                          const cy =
                                                              cyclesList.find(
                                                                  (c) =>
                                                                      String(
                                                                          c.cycle_id
                                                                      ) ===
                                                                      String(
                                                                          kr.cycle_id
                                                                      )
                                                              );
                                                          return (
                                                              cy?.cycle_name ||
                                                              ""
                                                          );
                                                      })()}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      <span
                                                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                              (
                                                                  kr.status ||
                                                                  ""
                                                              ).toUpperCase() ===
                                                              "COMPLETED"
                                                                  ? "bg-emerald-100 text-emerald-700"
                                                                  : (
                                                                        kr.status ||
                                                                        ""
                                                                    ).toUpperCase() ===
                                                                    "ACTIVE"
                                                                  ? "bg-blue-100 text-blue-700"
                                                                  : "bg-slate-100 text-slate-700"
                                                          }`}
                                                      >
                                                          {kr.status || ""}
                                                      </span>
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.unit || ""}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.current_value ?? ""}
                                                  </td>
                                                  <td className="px-3 py-3 border-r border-slate-200 text-center">
                                                      {kr.target_value ?? ""}
                                                  </td>
                                                  <td className="px-3 py-3 text-center">
                                                      {formatPercent(
                                                          kr.progress_percent
                                                      )}
                                                  </td>
                                              </tr>
                                          ))}
                                </React.Fragment>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
