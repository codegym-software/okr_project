<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo OKR Phòng ban - {{ $data['department']['department_name'] }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 12px;
            color: #1f2937;
            line-height: 1.5;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
        }
        .header h1 {
            font-size: 24px;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .header .meta {
            font-size: 11px;
            color: #6b7280;
        }
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            border-left: 4px solid #3b82f6;
            padding-left: 10px;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .kpi-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px;
            text-align: center;
        }
        .kpi-label {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .kpi-value {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        table th {
            background: #3b82f6;
            color: white;
            padding: 8px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
        }
        table td {
            padding: 8px;
            border: 1px solid #e5e7eb;
            font-size: 11px;
        }
        table tr:nth-child(even) {
            background: #f9fafb;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 5px;
        }
        .progress-fill {
            height: 100%;
            background: #3b82f6;
            transition: width 0.3s;
        }
        .progress-fill.completed {
            background: #10b981;
        }
        .progress-fill.at-risk {
            background: #f59e0b;
        }
        .progress-fill.not-started {
            background: #ef4444;
        }
        .okr-item {
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            background: #ffffff;
        }
        .okr-header {
            font-weight: bold;
            font-size: 13px;
            color: #1e40af;
            margin-bottom: 8px;
        }
        .okr-description {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        .kr-item {
            margin-left: 15px;
            margin-bottom: 5px;
            font-size: 11px;
            padding: 5px;
            background: #f9fafb;
            border-left: 3px solid #3b82f6;
        }
        @media print {
            body {
                padding: 10px;
            }
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Báo cáo OKR Phòng ban</h1>
        <div class="meta">
            <div>Phòng ban: <strong>{{ $data['department']['department_name'] }}</strong></div>
            <div>Chu kỳ: <strong>{{ $data['cycle_name'] }}</strong></div>
            <div>Ngày tạo: {{ $generatedAt }}</div>
        </div>
    </div>

    <!-- Tổng quan -->
    <div class="section">
        <div class="section-title">Tổng quan</div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Tổng số OKR</div>
                <div class="kpi-value">{{ $data['summary']['total_okrs'] }}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Tiến độ trung bình</div>
                <div class="kpi-value">{{ number_format($data['summary']['average_progress'], 1) }}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Tỷ lệ hoàn thành</div>
                <div class="kpi-value">{{ number_format($data['summary']['completion_rate'], 1) }}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Đã hoàn thành</div>
                <div class="kpi-value">{{ $data['summary']['completed_okrs'] }}</div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Trạng thái</th>
                    <th>Số lượng</th>
                    <th>Tỷ lệ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Hoàn thành</td>
                    <td>{{ $data['summary']['completed_okrs'] }}</td>
                    <td>{{ $data['summary']['total_okrs'] > 0 ? number_format(($data['summary']['completed_okrs'] / $data['summary']['total_okrs']) * 100, 1) : 0 }}%</td>
                </tr>
                <tr>
                    <td>Đang tiến hành</td>
                    <td>{{ $data['summary']['in_progress_okrs'] }}</td>
                    <td>{{ $data['summary']['total_okrs'] > 0 ? number_format(($data['summary']['in_progress_okrs'] / $data['summary']['total_okrs']) * 100, 1) : 0 }}%</td>
                </tr>
                <tr>
                    <td>Có rủi ro</td>
                    <td>{{ $data['summary']['at_risk_okrs'] }}</td>
                    <td>{{ $data['summary']['total_okrs'] > 0 ? number_format(($data['summary']['at_risk_okrs'] / $data['summary']['total_okrs']) * 100, 1) : 0 }}%</td>
                </tr>
                <tr>
                    <td>Chưa bắt đầu</td>
                    <td>{{ $data['summary']['not_started_okrs'] }}</td>
                    <td>{{ $data['summary']['total_okrs'] > 0 ? number_format(($data['summary']['not_started_okrs'] / $data['summary']['total_okrs']) * 100, 1) : 0 }}%</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Tiến độ thành viên -->
    @if(count($data['member_progress']) > 0)
    <div class="section">
        <div class="section-title">Tiến độ thành viên</div>
        <table>
            <thead>
                <tr>
                    <th>Thành viên</th>
                    <th>Chức vụ</th>
                    <th>Số OKR</th>
                    <th>Tiến độ TB</th>
                </tr>
            </thead>
            <tbody>
                @foreach($data['member_progress'] as $member)
                <tr>
                    <td>{{ $member['full_name'] }}</td>
                    <td>{{ $member['job_title'] ?? 'N/A' }}</td>
                    <td>{{ $member['total_okrs'] }}</td>
                    <td>
                        {{ number_format($member['average_progress'], 1) }}%
                        <div class="progress-bar">
                            <div class="progress-fill {{ $member['average_progress'] >= 100 ? 'completed' : ($member['average_progress'] >= 70 ? '' : ($member['average_progress'] >= 40 ? 'at-risk' : 'not-started')) }}" 
                                 style="width: {{ min($member['average_progress'], 100) }}%"></div>
                        </div>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <!-- OKR cá nhân -->
    @if(count($data['personal_okrs']) > 0)
    <div class="section">
        <div class="section-title">OKR Cá nhân</div>
        @foreach($data['personal_okrs'] as $okr)
        <div class="okr-item">
            <div class="okr-header">{{ $okr['objective_title'] }}</div>
            <div class="okr-description">{{ $okr['objective_description'] ?? '' }}</div>
            <div style="margin-bottom: 8px;">
                <strong>Thành viên:</strong> {{ $okr['member_name'] }} | 
                <strong>Chu kỳ:</strong> {{ $okr['cycle_name'] }} | 
                <strong>Tiến độ:</strong> {{ number_format($okr['overall_progress'], 1) }}%
            </div>
            <div class="progress-bar">
                <div class="progress-fill {{ $okr['overall_progress'] >= 100 ? 'completed' : ($okr['overall_progress'] >= 70 ? '' : ($okr['overall_progress'] >= 40 ? 'at-risk' : 'not-started')) }}" 
                     style="width: {{ min($okr['overall_progress'], 100) }}%"></div>
            </div>
            @if(count($okr['key_results']) > 0)
            <div style="margin-top: 10px;">
                <strong>Key Results:</strong>
                @foreach($okr['key_results'] as $kr)
                <div class="kr-item">
                    {{ $kr['kr_title'] }}: {{ number_format($kr['current_value'], 2) }} / {{ number_format($kr['target_value'], 2) }} {{ $kr['unit'] ?? '' }} 
                    ({{ number_format($kr['progress_percent'], 1) }}%)
                </div>
                @endforeach
            </div>
            @endif
        </div>
        @endforeach
    </div>
    @endif

    <!-- OKR cấp nhóm -->
    @if(count($data['team_okrs']) > 0)
    <div class="section">
        <div class="section-title">OKR Cấp nhóm (Phòng ban)</div>
        @foreach($data['team_okrs'] as $okr)
        <div class="okr-item">
            <div class="okr-header">{{ $okr['objective_title'] }}</div>
            <div class="okr-description">{{ $okr['objective_description'] ?? '' }}</div>
            <div style="margin-bottom: 8px;">
                <strong>Chu kỳ:</strong> {{ $okr['cycle_name'] }} | 
                <strong>Tiến độ:</strong> {{ number_format($okr['overall_progress'], 1) }}%
            </div>
            <div class="progress-bar">
                <div class="progress-fill {{ $okr['overall_progress'] >= 100 ? 'completed' : ($okr['overall_progress'] >= 70 ? '' : ($okr['overall_progress'] >= 40 ? 'at-risk' : 'not-started')) }}" 
                     style="width: {{ min($okr['overall_progress'], 100) }}%"></div>
            </div>
            @if(count($okr['key_results']) > 0)
            <div style="margin-top: 10px;">
                <strong>Key Results:</strong>
                @foreach($okr['key_results'] as $kr)
                <div class="kr-item">
                    {{ $kr['kr_title'] }}: {{ number_format($kr['current_value'], 2) }} / {{ number_format($kr['target_value'], 2) }} {{ $kr['unit'] ?? '' }} 
                    ({{ number_format($kr['progress_percent'], 1) }}%)
                </div>
                @endforeach
            </div>
            @endif
        </div>
        @endforeach
    </div>
    @endif

    @if($data['summary']['total_okrs'] == 0)
    <div class="section">
        <div style="text-align: center; padding: 40px; color: #6b7280;">
            <p>Không có dữ liệu OKR cho phòng ban này trong chu kỳ được chọn.</p>
        </div>
    </div>
    @endif
</body>
</html>

