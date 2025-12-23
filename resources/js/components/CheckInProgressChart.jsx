import React from "react";

/**
 * Component hiển thị biểu đồ tiến độ checkin theo thời gian
 * Tương tự như Profit.co - hiển thị progress_percent theo thời gian
 */
export default function CheckInProgressChart({
    checkIns = [],
    width = 600,
    height = 300,
    color = "#2563eb",
    keyResult = null,
}) {
    const paddingLeft = 60;
    const paddingRight = 40;
    const paddingTop = 40;
    const paddingBottom = 60;
    const w = width;
    const h = height;
    const innerW = w - paddingLeft - paddingRight;
    const innerH = h - paddingTop - paddingBottom;

    // Format dữ liệu checkins thành format cho chart
    // Sắp xếp theo thời gian (từ cũ đến mới)
    // Kiểm tra và filter các checkin hợp lệ
    const validCheckIns = Array.isArray(checkIns) 
        ? checkIns.filter(ci => ci && ci.created_at && ci.progress_percent !== undefined)
        : [];
    
    const sortedCheckIns = [...validCheckIns].sort((a, b) => {
        try {
            return new Date(a.created_at) - new Date(b.created_at);
        } catch (e) {
            return 0;
        }
    });

    // Nếu không có checkin, hiển thị empty state
    if (sortedCheckIns.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-3 text-sm font-semibold text-slate-700">
                    Biểu đồ tiến độ Check-in
                </div>
                <div className="flex items-center justify-center h-48 text-slate-400">
                    <div className="text-center">
                        <svg className="h-12 w-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-sm">Chưa có dữ liệu check-in</p>
                    </div>
                </div>
            </div>
        );
    }

    // Lấy giá trị progress_percent từ checkins
    const values = sortedCheckIns.map((ci) => parseFloat(ci.progress_percent) || 0);
    const maxV = Math.max(100, Math.max(0, ...values));
    const minV = 0;

    // Tính toán vị trí các điểm trên chart
    const xStep = sortedCheckIns.length > 1 ? innerW / (sortedCheckIns.length - 1) : innerW;
    
    // Tính toán tọa độ cho từng điểm
    const points = sortedCheckIns.map((ci, i) => {
        const progress = parseFloat(ci.progress_percent) || 0;
        const x = paddingLeft + i * xStep;
        const y =
            paddingTop +
            innerH -
            ((progress - minV) / (maxV - minV)) * innerH;
        return {
            x,
            y: isFinite(y) ? y : paddingTop + innerH,
            date: new Date(ci.created_at),
            progress
        };
    });

    // Tính toán khoảng cách thời gian giữa các checkin (tính bằng ngày)
    const getDaysBetween = (date1, date2) => {
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Format ngày tháng cho x-axis
    const formatDateLabel = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return `${day}/${month}`;
    };

    // Format ngày tháng đầy đủ cho tooltip
    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Tạo Y-axis ticks (0, 25, 50, 75, 100)
    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">
                    Biểu đồ tiến độ Check-in
                </div>
                {keyResult && (
                    <div className="text-xs text-slate-500">
                        Mục tiêu: {keyResult.target_value} {keyResult.unit || ''}
                    </div>
                )}
            </div>
            <svg width={w} height={h} className="w-full max-w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
                {/* Axes */}
                <line
                    x1={paddingLeft}
                    y1={paddingTop}
                    x2={paddingLeft}
                    y2={h - paddingBottom}
                    stroke="#e5e7eb"
                    strokeWidth="1.5"
                />
                <line
                    x1={paddingLeft}
                    y1={h - paddingBottom}
                    x2={w - paddingRight}
                    y2={h - paddingBottom}
                    stroke="#e5e7eb"
                    strokeWidth="1.5"
                />

                {/* Horizontal grid lines + Y-axis ticks */}
                {yTicks.map((v) => {
                    const y = paddingTop + innerH - (v / 100) * innerH;
                    return (
                        <g key={`y-${v}`}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={w - paddingRight}
                                y2={y}
                                stroke="#f1f5f9"
                                strokeWidth="1"
                            />
                            <text
                                x={paddingLeft - 12}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="11"
                                fill="#64748b"
                                fontWeight="500"
                            >
                                {v}%
                            </text>
                        </g>
                    );
                })}

                {/* Vertical grid lines + X-axis labels */}
                {sortedCheckIns.map((ci, idx) => {
                    const x = paddingLeft + idx * xStep;
                    return (
                        <g key={`x-${idx}`}>
                            <line
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={h - paddingBottom}
                                stroke="#f8fafc"
                                strokeWidth="1"
                            />
                            <text
                                x={x}
                                y={h - paddingBottom + 20}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#64748b"
                            >
                                {formatDateLabel(ci.created_at)}
                            </text>
                        </g>
                    );
                })}

                {/* Đường nối các điểm - nét đứt cho khoảng thời gian không checkin */}
                {points.length > 1 && points.map((point, i) => {
                    if (i === 0) return null; // Bỏ qua điểm đầu tiên
                    
                    const prevPoint = points[i - 1];
                    const daysBetween = getDaysBetween(prevPoint.date, point.date);
                    const isGap = daysBetween > 1; // Nếu cách nhau > 1 ngày thì dùng nét đứt
                    
                    return (
                        <line
                            key={`line-${i}`}
                            x1={prevPoint.x}
                            y1={prevPoint.y}
                            x2={point.x}
                            y2={point.y}
                            stroke={color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={isGap ? "5,5" : "0"} // Nét đứt nếu có khoảng cách
                            opacity={isGap ? 0.6 : 1} // Mờ hơn nếu là nét đứt
                        />
                    );
                })}

                {/* Data points - các điểm trên chart */}
                {points.map((point, i) => {
                    const ci = sortedCheckIns[i];
                    const progress = point.progress;
                    const x = point.x;
                    const y = point.y;
                    const isCompleted = ci.is_completed;
                    
                    return (
                        <g key={i}>
                            {/* Outer circle for completed checkins */}
                            {isCompleted && (
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="8"
                                    fill="#10b981"
                                    opacity="0.2"
                                />
                            )}
                            {/* Main point */}
                            <circle
                                cx={x}
                                cy={y}
                                r={isCompleted ? "6" : "5"}
                                fill={isCompleted ? "#10b981" : color}
                                stroke="#ffffff"
                                strokeWidth="2"
                                className="cursor-pointer hover:r-7 transition-all"
                            >
                                <title>
                                    {`${formatFullDate(ci.created_at)}\nTiến độ: ${progress.toFixed(2)}%\nGiá trị: ${Math.round(parseFloat(ci.progress_value))} ${keyResult?.unit || ''}${ci.is_completed ? '\n✓ Hoàn thành' : ''}`}
                                </title>
                            </circle>
                        </g>
                    );
                })}

                {/* Axis labels */}
                <text
                    x={w / 2}
                    y={h - 12}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="500"
                    fill="#64748b"
                >
                    Thời gian
                </text>
                <text
                    x={12}
                    y={h / 2}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="500"
                    fill="#64748b"
                    transform={`rotate(-90, 12, ${h / 2})`}
                >
                    Tiến độ (%)
                </text>
            </svg>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
                <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-slate-600">Tiến độ</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-600">Hoàn thành</span>
                </div>
            </div>
        </div>
    );
}

