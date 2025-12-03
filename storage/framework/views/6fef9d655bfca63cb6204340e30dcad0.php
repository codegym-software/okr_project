<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo OKR Công ty - <?php echo e($cycleName); ?></title>
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
            grid-template-columns: repeat(5, 1fr);
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
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
        }
        .status-on-track {
            background: #d1fae5;
            color: #065f46;
        }
        .status-at-risk {
            background: #fef3c7;
            color: #92400e;
        }
        .status-off-track {
            background: #fee2e2;
            color: #991b1b;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
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
        <h1>BÁO CÁO TỔNG QUAN OKR CÔNG TY</h1>
        <div class="meta">
            Chu kỳ: <strong><?php echo e($cycleName); ?></strong> | 
            Ngày xuất: <?php echo e($generatedAt); ?>

        </div>
    </div>

    <div class="section">
        <div class="section-title">Tổng quan</div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Tổng số OKR</div>
                <div class="kpi-value"><?php echo e($data['overall']['totalObjectives'] ?? 0); ?></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Tiến độ TB</div>
                <div class="kpi-value"><?php echo e(number_format($data['overall']['averageProgress'] ?? 0, 1)); ?>%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">On Track</div>
                <div class="kpi-value"><?php echo e($data['overall']['statusCounts']['onTrack'] ?? 0); ?></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">At Risk</div>
                <div class="kpi-value"><?php echo e($data['overall']['statusCounts']['atRisk'] ?? 0); ?></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Off Track</div>
                <div class="kpi-value"><?php echo e($data['overall']['statusCounts']['offTrack'] ?? 0); ?></div>
            </div>
        </div>
    </div>

    <?php if(!empty($data['departmentsHierarchy'])): ?>
    <div class="section">
        <div class="section-title">Chi tiết theo phòng ban</div>
        <table>
            <thead>
                <tr>
                    <th>Phòng ban</th>
                    <th>Số OKR</th>
                    <th>Tiến độ TB</th>
                    <th>On Track</th>
                    <th>At Risk</th>
                    <th>Off Track</th>
                </tr>
            </thead>
            <tbody>
                <?php $__currentLoopData = $data['departmentsHierarchy']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $dept): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <?php if(($dept['departmentName'] ?? '') !== 'Công ty'): ?>
                    <tr>
                        <td><?php echo e($dept['departmentName'] ?? 'N/A'); ?></td>
                        <td><?php echo e($dept['count'] ?? 0); ?></td>
                        <td><?php echo e(number_format($dept['averageProgress'] ?? 0, 2)); ?>%</td>
                        <td><?php echo e($dept['onTrack'] ?? 0); ?> (<?php echo e(number_format($dept['onTrackPct'] ?? 0, 1)); ?>%)</td>
                        <td><?php echo e($dept['atRisk'] ?? 0); ?> (<?php echo e(number_format($dept['atRiskPct'] ?? 0, 1)); ?>%)</td>
                        <td><?php echo e($dept['offTrack'] ?? 0); ?> (<?php echo e(number_format($dept['offTrackPct'] ?? 0, 1)); ?>%)</td>
                    </tr>
                    <?php endif; ?>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>

    <?php if(!empty($data['risks'])): ?>
    <div class="section">
        <div class="section-title">Cảnh báo rủi ro</div>
        <table>
            <thead>
                <tr>
                    <th>Objective</th>
                    <th>Phòng ban</th>
                    <th>Tiến độ</th>
                    <th>Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                <?php $__currentLoopData = $data['risks']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $risk): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                    <td><?php echo e($risk['objective_title'] ?? 'N/A'); ?></td>
                    <td><?php echo e($risk['department_name'] ?? '—'); ?></td>
                    <td><?php echo e(number_format($risk['progress'] ?? 0, 2)); ?>%</td>
                    <td>
                        <?php if(($risk['status'] ?? '') === 'on_track'): ?>
                            <span class="status-badge status-on-track">On Track</span>
                        <?php elseif(($risk['status'] ?? '') === 'at_risk'): ?>
                            <span class="status-badge status-at-risk">At Risk</span>
                        <?php else: ?>
                            <span class="status-badge status-off-track">Off Track</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>

    <div class="footer">
        <p>Báo cáo được tạo tự động từ hệ thống OKR</p>
        <p>© <?php echo e(date('Y')); ?> - OKRun System</p>
    </div>

    <script>
        // Auto print when loaded (optional)
        // window.onload = function() {
        //     window.print();
        // }
    </script>
</body>
</html>

<?php /**PATH D:\Thuc_tap\New folder (2)\OKR_Project\resources\views/reports/company-okr-pdf.blade.php ENDPATH**/ ?>