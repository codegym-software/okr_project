import React, { useEffect, useMemo, useState } from 'react';
import GroupedBarChart from '../components/GroupedBarChart';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

function StatCard({ title, value, suffix = '%', hint }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-500">{title}</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}{suffix}</div>
            {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
    );
}

export default function CompanyOverviewReport() {
    const [cycles, setCycles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [owners, setOwners] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [level, setLevel] = useState('departments'); 
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [showSnapshotModal, setShowSnapshotModal] = useState(false);
    const [snapshotTitleInput, setSnapshotTitleInput] = useState('');
    const [notification, setNotification] = useState({ type: '', message: '', visible: false });
    const [isReportReady, setIsReportReady] = useState(false);

    const [filters, setFilters] = useState({
        cycleId: '',
        departmentId: '',
        status: '',
        ownerId: '',
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [report, setReport] = useState({
        overall: { totalObjectives: 0, averageProgress: 0, statusCounts: { onTrack:0, atRisk:0, offTrack:0 }, statusDistribution: { onTrack:0, atRisk:0, offTrack:0 } },
        departments: [],
        trend: [],
        risks: [],
    });
    const [currentCycleMeta, setCurrentCycleMeta] = useState(null);

    const TrendIcon = ({ delta }) => {
        if (delta === null || delta === undefined) return <span className="text-slate-400">—</span>;
        const up = delta > 0; const down = delta < 0;
        const color = up ? 'text-emerald-600' : (down ? 'text-red-600' : 'text-slate-500');
        return (
            <span className={`inline-flex items-center gap-1 ${color}`} title={`${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`}>
                {up && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12l5-5 4 4 5-5v8H3z"/></svg>
                )}
                {down && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17 8l-5 5-4-4-5 5V6h14z"/></svg>
                )}
                {!up && !down && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 10h12v2H4z"/></svg>
                )}
                <span>{Math.abs(delta).toFixed(2)}%</span>
            </span>
        );
    };

    useEffect(() => {
        (async () => {
            try {
                const [rCycles, rDepts, rUsers] = await Promise.all([
                    fetch('/cycles', { headers: { Accept: 'application/json' }}),
                    fetch('/departments', { headers: { Accept: 'application/json' }}),
                    fetch('/users?per_page=1000', { headers: { Accept: 'application/json' }})
                ]);
                const dCycles = await rCycles.json();
                const dDepts = await rDepts.json();
                const dUsers = await rUsers.json();
                const listCycles = Array.isArray(dCycles.data) ? dCycles.data : [];
                const listDepts = Array.isArray(dDepts.data) ? dDepts.data : [];
                const listUsers = Array.isArray(dUsers.data) ? dUsers.data : [];
                setCycles(listCycles);
                setDepartments(listDepts);
                setOwners(listUsers);
                if (listCycles.length) {
                    const now = new Date();
                    const parse = (s) => (s ? new Date(s) : null);
                    const current = listCycles.find(c => {
                        const start = parse(c.start_date || c.startDate);
                        const end = parse(c.end_date || c.endDate);
                        return start && end && start <= now && now <= end;
                    }) || listCycles[0];
                    setFilters(f => ({ ...f, cycleId: current.cycle_id || current.cycleId }));
                    setCurrentCycleMeta({
                        id: current.cycle_id || current.cycleId,
                        name: current.cycle_name || current.cycleName,
                        start: current.start_date || current.startDate,
                        end: current.end_date || current.endDate,
                    });
                }
            } catch (e) { /* ignore */ }
        })();
    }, []);

    useEffect(() => {
        if (!filters.cycleId || !Array.isArray(cycles) || cycles.length === 0) return;
        const c = cycles.find(x => String(x.cycle_id || x.cycleId) === String(filters.cycleId));
        if (c) {
            setCurrentCycleMeta({
                id: c.cycle_id || c.cycleId,
                name: c.cycle_name || c.cycleName,
                start: c.start_date || c.startDate,
                end: c.end_date || c.endDate,
            });
        }
    }, [filters.cycleId, cycles]);

    useEffect(() => {
        if (filters.cycleId === undefined) return;
        setLoading(true);
        setError('');
        (async () => {
            try {
                const params = new URLSearchParams();
                if (filters.cycleId) params.set('cycle_id', filters.cycleId);
                if (filters.departmentId) params.set('department_id', filters.departmentId);
                if (filters.status) params.set('status', filters.status);
                if (filters.ownerId) params.set('owner_id', filters.ownerId);
                const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
                const res = await fetch(url, { headers: { Accept: 'application/json' } });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Load report failed');
                setReport(json.data);
            } catch (e) {
                setError(e.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        })();
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId]);

    useEffect(() => {
        if (!filters.cycleId) return;
        const timer = setInterval(() => {
            const params = new URLSearchParams();
            if (filters.cycleId) params.set('cycle_id', filters.cycleId);
            if (filters.departmentId) params.set('department_id', filters.departmentId);
            if (filters.status) params.set('status', filters.status);
            if (filters.ownerId) params.set('owner_id', filters.ownerId);
            const url = `/api/reports/okr-company${params.toString() ? `?${params.toString()}` : ''}`;
            fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-store' }})
                .then(r => r.json().then(j => ({ ok: r.ok, j })))
                .then(({ ok, j }) => { if (ok && j.success) setReport(j.data); })
                .catch(() => {});
        }, 60000); 
        return () => clearInterval(timer);
    }, [filters.cycleId, filters.departmentId, filters.status, filters.ownerId]);

    const pieData = useMemo(() => {
        const counts = report?.overall?.statusCounts || {};
        return [
            { label: 'On track', value: counts.onTrack || 0, color: '#22c55e' },
            { label: 'At risk', value: counts.atRisk || 0, color: '#f59e0b' },
            { label: 'Off track', value: counts.offTrack || 0, color: '#ef4444' },
        ];
    }, [report]);

    const groupedChartData = useMemo(() => {
        if (level === 'company') {
            const ov = report?.overall || { statusCounts: {} };
            return {
                categories: ['Công ty'],
                series: [
                    { name: 'On Track', color: '#22c55e', data: [ov.statusCounts?.onTrack || 0] },
                    { name: 'At Risk', color: '#f59e0b', data: [ov.statusCounts?.atRisk || 0] },
                    { name: 'Off Track', color: '#ef4444', data: [ov.statusCounts?.offTrack || 0] },
                ],
            };
        }
        if (level === 'departments') {
            const list = (report.departmentsHierarchy || report.departments || [])
              .filter(d => d.departmentId && (d.departmentName || '').toLowerCase() !== 'công ty');
            return {
                categories: list.map(d => d.departmentName),
                series: [
                    { name: 'On Track', color: '#22c55e', data: list.map(d => d.onTrack || 0) },
                    { name: 'At Risk', color: '#f59e0b', data: list.map(d => d.atRisk || 0) },
                    { name: 'Off Track', color: '#ef4444', data: list.map(d => d.offTrack || 0) },
                ],
            };
        }
        const list = [];
        return {
            categories: list.map(t => t.departmentName),
            series: [
                { name: 'On Track', color: '#22c55e', data: list.map(t => t.onTrack || 0) },
                { name: 'At Risk', color: '#f59e0b', data: list.map(t => t.atRisk || 0) },
                { name: 'Off Track', color: '#ef4444', data: list.map(t => t.offTrack || 0) },
            ],
        };
    }, [report, level]);

    useEffect(() => {
        const handler = (e) => {
            const pop = document.getElementById('okr-filter-popover');
            const btn = document.getElementById('okr-filter-button');
            if (!pop || !btn) return;
            if (!pop.contains(e.target) && !btn.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        if (filterOpen) document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [filterOpen]);

    useEffect(() => {
        if (showSnapshotModal || showSnapshots) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showSnapshotModal, showSnapshots]);

    const resetFilters = () => {
        setFilters(f => ({
            ...f,
            cycleId: currentCycleMeta?.id || f.cycleId,
            departmentId: '',
            status: '',
        }));
    };

    // Show notification
    const showNotification = (type, message, duration = 3000) => {
        setNotification({ type, message, visible: true });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, duration);
    };

    // Mở modal Chốt kỳ + nhập tên
    const openSnapshotModal = () => {
        if (!filters.cycleId) {
            showNotification('error', '⚠ Vui lòng chọn chu kỳ trước khi Chốt kỳ');
            return;
        }
        const defaultTitle = `Báo cáo OKR: ${currentCycleMeta?.name || 'Chu kỳ hiện tại'}`;
        setSnapshotTitleInput(defaultTitle);
        setShowSnapshotModal(true);
    };

    const confirmCreateSnapshot = async () => {
        if (!snapshotTitleInput.trim()) {
            showNotification('error', '�Warning Vui lòng nhập tên báo cáo chốt kỳ');
            return;
        }

        setIsCreatingSnapshot(true);
        try {
            const cleanSnapshotData = {
                overall: report.overall,
                departments: report.departmentsHierarchy?.length > 0 
                    ? report.departmentsHierarchy 
                    : (report.departments || []),
                trend: report.trend || [],
                risks: report.risks || [],
            };

            const response = await fetch('/api/reports/snapshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    cycle_id: filters.cycleId,
                    title: snapshotTitleInput.trim(),
                    data_snapshot: cleanSnapshotData,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Không thể tạo snapshot');
            }

            showNotification('success', 'Checkmark Chốt kỳ thành công!');
            loadSnapshots();

            setIsReportReady(true);

            setShowSnapshotModal(false);
            setSnapshotTitleInput('');
        } catch (error) {
            console.error('Lỗi khi Chốt kỳ:', error);
            showNotification('error', 'Crossmark ' + (error.message || 'Đã có lỗi xảy ra'));
        } finally {
            setIsCreatingSnapshot(false);
        }
    };

    const loadSnapshots = async () => {
        try {
            const cycleId = filters.cycleId ? `?cycle_id=${filters.cycleId}` : '';
            const response = await fetch(`/api/reports/snapshots${cycleId}`, {
                headers: { Accept: 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                setSnapshots(data.data.data || []);
            }
        } catch (error) {
            console.error('Lỗi khi tải snapshots:', error);
        }
    };

    const loadSnapshot = async (snapshotId) => {
        try {
            const response = await fetch(`/api/reports/snapshots/${snapshotId}`, {
                headers: { Accept: 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedSnapshot(data.data);
            }
        } catch (error) {
            console.error('Lỗi khi tải snapshot:', error);
        }
    };

    const handleViewSnapshots = () => {
        setShowSnapshots(!showSnapshots);
        if (!showSnapshots) {
            loadSnapshots();
        }
    };

    // State for export menu
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    // Export to PDF with professional UI-matching design
    const exportToPDF = async () => {
        try {
            setExportMenuOpen(false);

            const pdf = new jsPDF('p', 'mm', 'a4');

            // === THÊM FONT TIẾNG VIỆT (nếu có) ===
            let usedFont = 'helvetica';
            try {
                if (typeof robotoNormal !== 'undefined' && typeof robotoBold !== 'undefined') {
                    pdf.addFileToVFS('Roboto-Regular.ttf', robotoNormal);
                    pdf.addFileToVFS('Roboto-Bold.ttf', robotoBold);
                    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                    pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
                    usedFont = 'Roboto';
                } else {
                    // If base64 variables are not injected, attempt to fetch TTF files from /fonts
                    const toBase64 = async (url) => {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`Font not found: ${url}`);
                        const ab = await res.arrayBuffer();
                        const u8 = new Uint8Array(ab);
                        let binary = '';
                        const chunk = 0x8000;
                        for (let i = 0; i < u8.length; i += chunk) {
                            binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)));
                        }
                        return btoa(binary);
                    };

                    try {
                        const normalB64 = await toBase64('/fonts/Roboto-Regular.ttf');
                        const boldB64 = await toBase64('/fonts/Roboto-Bold.ttf');
                        pdf.addFileToVFS('Roboto-Regular.ttf', normalB64);
                        pdf.addFileToVFS('Roboto-Bold.ttf', boldB64);
                        pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                        pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
                        usedFont = 'Roboto';
                    } catch (err) {
                        // fallback to a built-in font (may not cover full Vietnamese glyphs)
                        usedFont = 'helvetica';
                        // eslint-disable-next-line no-console
                        console.warn('Roboto fonts not available in base64 or /fonts, falling back to built-in font', err);
                    }
                }
            } catch (e) {
                usedFont = 'helvetica';
                // eslint-disable-next-line no-console
                console.warn('Error loading fonts for PDF export, using fallback font', e);
            }
            pdf.setFont(usedFont);

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 14;
            let yPosition = margin;

            // ============ HEADER ============
            pdf.setFontSize(24);
            pdf.setFont(usedFont, 'bold');
            pdf.setTextColor(15, 23, 42);
            pdf.text('BÁO CÁO OKR TỔNG QUAN', margin, yPosition);
            yPosition += 11;

            pdf.setFontSize(11);
            pdf.setFont(usedFont, 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Chu kỳ: ${currentCycleMeta?.name || 'Chưa chọn chu kỳ'}`, margin, yPosition);
            pdf.text(`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 10;

            // Đường kẻ ngang
            pdf.setDrawColor(220, 220, 220);
            pdf.setLineWidth(0.5);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 15;

            // ============ TÓM TẮT ĐIỀU HÀNH (nội dung cố định hoặc để bạn tự viết) =========
            pdf.setFontSize(13);
            pdf.setFont(usedFont, 'bold');
            pdf.setTextColor(37, 99, 235);
            pdf.text('Tóm tắt điều hành', margin, yPosition);
            yPosition += 8;

            pdf.setFontSize(10);
            pdf.setFont(usedFont, 'normal');
            pdf.setTextColor(51, 51, 51);

            // Build a safe summary text (use existing summary if available, otherwise generate brief overview)
            const summaryText = (
                report.overall?.summary || report.overall?.executiveSummary ||
                `Chu kỳ: ${currentCycleMeta?.name || 'Chưa chọn chu kỳ'}. Tổng OKR: ${report.overall?.totalObjectives || 0}. Tiến độ trung bình: ${(report.overall?.averageProgress ?? 0).toFixed(1)}%. On Track: ${report.overall?.statusCounts?.onTrack || 0}, At Risk: ${report.overall?.statusCounts?.atRisk || 0}, Off Track: ${report.overall?.statusCounts?.offTrack || 0}.`
            );

            const splitSummary = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin - 10);
            const boxHeight = splitSummary.length * 5 + 12;

            // Hộp nền xanh nhạt
            pdf.setFillColor(240, 248, 255);
            pdf.setDrawColor(180, 200, 255);
            pdf.setLineWidth(0.4);
            pdf.rect(margin, yPosition - 6, pageWidth - 2 * margin, boxHeight, 'FD');

            pdf.text(splitSummary, margin + 6, yPosition + 6);
            yPosition += boxHeight + 12;

            // ============ STAT CARDS ============
            pdf.setFontSize(12);
            pdf.setFont(usedFont, 'bold');
            pdf.setTextColor(37, 99, 235);
            pdf.text('Thống kê tổng quan', margin, yPosition);
            yPosition += 10;

            const stats = [
                { label: 'Tổng OKR', value: report.overall?.totalObjectives || 0, bg: [248, 250, 255], color: [15, 23, 42] },
                { label: 'Tiến độ trung bình', value: `${(report.overall?.averageProgress ?? 0).toFixed(1)}%`, bg: [248, 250,255], color: [15, 23, 42] },
                { label: 'On Track', value: report.overall?.statusCounts?.onTrack || 0, perc: report.overall?.statusDistribution?.onTrack, bg: [236, 253, 245], color: [22, 163, 74] },
                { label: 'At Risk', value: report.overall?.statusCounts?.atRisk || 0, perc: report.overall?.statusDistribution?.atRisk, bg: [255, 251, 235], color: [180, 83, 9] },
                { label: 'Off Track', value: report.overall?.statusCounts?.offTrack || 0, perc: report.overall?.statusDistribution?.offTrack, bg: [254, 242, 242], color: [185, 28, 28] },
            ];

            const cardWidth = (pageWidth - 2 * margin - 8) / 5;
            const cardHeight = 22;
            const startCardY = yPosition;

            stats.forEach((stat, index) => {
                const x = margin + index * (cardWidth + 2);

                pdf.setFillColor(...stat.bg);
                pdf.setDrawColor(200, 200, 200);
                pdf.roundedRect(x, startCardY, cardWidth, cardHeight, 2, 2, 'FD');

                pdf.setFontSize(8);
                pdf.setTextColor(80, 80, 80);
                pdf.text(stat.label, x + 4, startCardY + 6);

                pdf.setFontSize(16);
                pdf.setFont(usedFont, 'bold');
                pdf.setTextColor(...stat.color);
                pdf.text(String(stat.value), x + 4, startCardY + 14);

                if (stat.perc !== undefined) {
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`(${stat.perc}%)`, x + 4, startCardY + 19);
                }
            });

            yPosition = startCardY + cardHeight + 15;

            // ============ BẢNG PHÒNG BAN ============
            const deptBody = (report.departmentsHierarchy || report.departments || [])
                .filter(d => d.departmentName && !['công ty', 'company'].includes(d.departmentName.toLowerCase()))
                .slice(0, 30)
                .map(d => [
                    d.departmentName || 'Chưa xác định',
                    String(d.count || 0),
                    `${(d.averageProgress ?? 0).toFixed(1)}%`,
                    String(d.onTrack || 0),
                    String(d.atRisk || 0),
                    String(d.offTrack || 0),
                ]);

            if (deptBody.length > 0) {
                autoTable(pdf, {
                    head: [['Đơn vị', 'Số OKR', 'Tiến độ TB', 'On Track', 'At Risk', 'Off Track']],
                    body: deptBody,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { font: usedFont, fontSize: 9.5, cellPadding: 5, valign: 'middle' },
                    headStyles: { fillColor: [37, 99, 235], textColor: '#ffffff', fontStyle: 'bold', fontSize: 10.5 },
                    alternateRowStyles: { fillColor: [248, 250, 255] },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { halign: 'center' },
                        2: { halign: 'center' },
                        3: { halign: 'center' },
                        4: { halign: 'center' },
                        5: { halign: 'center' },
                    },
                    didDrawPage: data => {
                        yPosition = data.cursor.y + 12;
                    }
                });
            } else {
                yPosition += 20;
            }

            // ============ CẢNH BÁO RỦI RO ============
            const risks = (report.risks || []).filter(r => r.status === 'at_risk' || r.status === 'off_track');

            if (risks.length > 0) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(13);
                pdf.setFont(usedFont, 'bold');
                pdf.setTextColor(220, 38, 38);
                pdf.text('CẢNH BÁO RỦI RO', margin, yPosition);
                yPosition += 9;

                const riskRows = risks.slice(0, 20).map(r => [
                    (r.objective_title || 'Không có tiêu đề').substring(0, 55) + '...',
                    (report.departments || []).find(d => d.departmentId === r.department_id)?.departmentName || '—',
                    `${(r.progress ?? 0).toFixed(1)}%`,
                    r.status === 'off_track' ? 'OFF TRACK' : 'AT RISK',
                ]);

                autoTable(pdf, {
                    head: [['Mục tiêu (Objective)', 'Phòng ban', 'Tiến độ', 'Trạng thái']],
                    body: riskRows,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { font: usedFont, fontSize: 9, cellPadding: 4 },
                    headStyles: { fillColor: [220, 38, 38], textColor: '#fff', fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [254, 242, 242] },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        3: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'center' }
                    },
                    didDrawPage: data => {
                        yPosition = data.cursor.y + 10;
                    }
                });
            }

            // ============ FOOTER MỌI TRANG ============
            const totalPages = pdf.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);

                // Nền footer
                pdf.setFillColor(248, 250, 255);
                pdf.rect(0, pageHeight - 18, pageWidth, 18, 'F');

                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                pdf.setFont(usedFont, 'normal');

                pdf.text(`Xuất báo cáo lúc: ${new Date().toLocaleString('vi-VN')}`, margin, pageHeight - 8);
                pdf.text(`Trang ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            }

            // ============ LƯU FILE ============
            const safeCycleName = (currentCycleMeta?.name || 'TongQuan')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .trim()
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/-+/g, '_')
            .replace(/_+$/, '')
            .replace(/^_+/g, '')
            || 'TongQuan';

            const fileName = `OKR_BaoCao_${safeCycleName}_${new Date().toISOString().slice(0,10)}.pdf`;
            pdf.save(fileName);


            showNotification('success', 'Xuất PDF thành công!');

        } catch (error) {
            console.error('Lỗi xuất PDF:', error);
            showNotification('error', 'Xuất PDF thất bại: ' + (error.message || 'Lỗi không xác định'));
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        try {
            setExportMenuOpen(false);
            const workbook = XLSX.utils.book_new();

            // Sheet 1: Overall Stats
            const overallSheet = [
                ['Báo cáo OKR Tổng quan'],
                ['Chu kỳ', currentCycleMeta?.name || 'N/A'],
                ['Ngày xuất', new Date().toLocaleDateString('vi-VN')],
                [],
                ['Thống kê Tổng quan'],
                ['Chỉ số', 'Giá trị'],
                ['Tổng OKR', report.overall?.totalObjectives || 0],
                ['Tiến độ trung bình', (report.overall?.averageProgress ?? 0).toFixed(2) + '%'],
                ['On Track', `${report.overall?.statusCounts?.onTrack || 0} (${report.overall?.statusDistribution?.onTrack || 0}%)`],
                ['At Risk', `${report.overall?.statusCounts?.atRisk || 0} (${report.overall?.statusDistribution?.atRisk || 0}%)`],
                ['Off Track', `${report.overall?.statusCounts?.offTrack || 0} (${report.overall?.statusDistribution?.offTrack || 0}%)`],
            ];

            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(overallSheet), 'Tổng quan');

            // Sheet 2: Department Details
            const deptSheet = [
                ['Chi tiết theo đơn vị'],
                [],
                ['đơn vị', 'Số OKR', 'Tiến độ (%)', 'On Track', 'At Risk', 'Off Track'],
            ];

            (report.departmentsHierarchy || report.departments || [])
                .filter(d => d.departmentName?.toLowerCase() !== 'công ty')
                .forEach(d => {
                    deptSheet.push([
                        d.departmentName || 'N/A',
                        d.count || 0,
                        (d.averageProgress ?? 0).toFixed(2),
                        d.onTrack || 0,
                        d.atRisk || 0,
                        d.offTrack || 0,
                    ]);
                });

            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(deptSheet), 'Phòng ban');

            // Sheet 3: Risk alerts
            const risks = (report.risks || []).filter(r => r.status === 'at_risk' || r.status === 'off_track');
            if (risks.length > 0) {
                const risksSheet = [
                    ['Cảnh báo rủi ro'],
                    [],
                    ['Objective', 'Phòng ban', 'Tiến độ (%)', 'Trạng thái'],
                ];

                risks.forEach(r => {
                    risksSheet.push([
                        r.objective_title || 'N/A',
                        (report.departments || []).find(d => d.departmentId === r.department_id)?.departmentName || '—',
                        (r.progress ?? 0).toFixed(2),
                        r.status === 'off_track' ? 'OFF TRACK' : 'AT RISK',
                    ]);
                });

                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(risksSheet), 'Rủi ro');
            }

            // Set column widths
            const overallWs = workbook.Sheets['Tổng quan'];
            overallWs['!cols'] = [{ wch: 25 }, { wch: 20 }];

            const deptWs = workbook.Sheets['Phòng ban'];
            deptWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

            // Save Excel
            const filename = `OKR_Report_${currentCycleMeta?.name || 'Report'}_${new Date().getTime()}.xlsx`;
            XLSX.writeFile(workbook, filename);
            showNotification('success', '✓ Xuất Excel thành công!');
        } catch (error) {
            console.error('Lỗi khi xuất Excel:', error);
            showNotification('error', '✕ Xuất Excel thất bại. Vui lòng thử lại.');
        }
    };
    
    return (
        <div className="px-6 py-8 min-h-screen bg-gray-50">
            {/* ===================== HEADER - LUÔN HIỂN THỊ ===================== */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-900">Báo cáo tổng quan</h1>

                    <div className="flex items-center gap-3">
                    {/* Nút Tạo kết chuyển / Lập báo cáo cuối kỳ */}
                    <button
                        onClick={openSnapshotModal}
                        disabled={isCreatingSnapshot}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isCreatingSnapshot ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.507 3 7.938l3-2.647z"/>
                                </svg>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                {/* Icon: lưu trữ / kết chuyển (dùng icon archive-box hoặc document-check) */}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                Chốt kỳ
                            </>
                        )}
                    </button>

                    {/* Nút Xem lịch sử kết chuyển */}
                    <button
                        onClick={handleViewSnapshots}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-200"
                    >
                        {/* Icon: lịch sử / danh sách báo cáo */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Lịch sử chốt kỳ ({snapshots.length})
                    </button>

                        {/* Filter trạng thái + chu kỳ */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 10h13M3 16h13" />
                                </svg>
                                <select
                                    value={filters.status ?? ''}
                                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value || null }))}
                                    className="pl-10 pr-9 py-2.5 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="on_track">On Track</option>
                                    <option value="at_risk">At Risk</option>
                                    <option value="off_track">Off Track</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <select
                                    value={filters.cycleId ?? ''}
                                    onChange={(e) => setFilters(f => ({ ...f, cycleId: e.target.value || null }))}
                                    className="pl-10 pr-9 py-2.5 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {cycles.map(c => (
                                        <option key={c.cycle_id || c.cycleId} value={c.cycle_id || c.cycleId}>
                                            {c.cycle_name || c.cycleName}
                                        </option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Nút Export */}
                        <div className="relative">
                            <button
                                onClick={() => setExportMenuOpen(prev => !prev)}
                                className="p-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Xuất báo cáo"
                            >
                                <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </button>

                            {exportMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                                        <div className="py-1">
                                            <button onClick={exportToPDF} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition border-t border-slate-100 first:border-t-0">
                                                <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                                    <polyline points="10 9 9 9 8 9"/>
                                                </svg>
                                                <span className="text-sm font-medium text-slate-700">Xuất sang PDF</span>
                                            </button>
                                            <button onClick={exportToExcel} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition border-t border-slate-100">
                                                <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                    <path d="M9 13h6v6H9z"/>
                                                    <path d="M12 10v9"/>
                                                </svg>
                                                <span className="text-sm font-medium text-slate-700">Xuất sang XLS</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===================== NOTIFICATION TOAST ===================== */}
            {notification.visible && (
                <div className={`fixed top-4 right-4 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-50 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* ===================== NỘI DUNG BÁO CÁO - CHỈ HIỂN THỊ SAU KHI Chốt kỳ ===================== */}
            {isReportReady ? (
                <>
                    {/* 5 Cards Tổng quan */}
                    <div className="grid gap-6 md:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tổng OKR</div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <div className="text-2xl font-bold text-slate-900">{report.overall.totalObjectives}</div>
                                {report.overall.totalObjectivesDelta && <TrendIcon delta={report.overall.totalObjectivesDelta} />}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-slate-500">Tiến độ trung bình</div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <div className="text-2xl font-bold text-slate-900">
                                    {(report.overall.averageProgress || 0).toFixed(2)}%
                                </div>
                                {report.overall.averageProgressDelta && <TrendIcon delta={report.overall.averageProgressDelta} />}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-emerald-600">On Track</div>
                            <div className="mt-2 text-2xl font-extrabold text-slate-900">
                                {report.overall.statusCounts?.onTrack || 0}
                                <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.onTrack || 0}%)</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-amber-600">At Risk</div>
                            <div className="mt-2 text-2xl font-extrabold text-slate-900">
                                {report.overall.statusCounts?.atRisk || 0}
                                <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.atRisk || 0}%)</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="text-sm font-semibold text-red-600">Off Track</div>
                            <div className="mt-2 text-2xl font-extrabold text-slate-900">
                                {report.overall.statusCounts?.offTrack || 0}
                                <span className="ml-2 text-base text-slate-500">({report.overall.statusDistribution?.offTrack || 0}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Biểu đồ */}
                    <div className="mt-6 space-y-6">
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-semibold text-slate-700">
                                    <button onClick={() => setLevel('company')} className={`px-3 py-1.5 rounded-md ${level === 'company' ? 'bg-slate-100' : ''}`}>Công ty</button>
                                    <button onClick={() => setLevel('departments')} className={`px-3 py-1.5 rounded-md ${level === 'departments' ? 'bg-slate-100' : ''}`}>Phòng ban</button>
                                </div>
                            </div>
                            <GroupedBarChart
                                categories={groupedChartData.categories}
                                series={groupedChartData.series}
                                label={`Phân bổ trạng thái theo ${level === 'company' ? 'công ty' : 'phòng ban'}`}
                            />
                        </div>
                    </div>

                    {/* Bảng chi tiết theo cấp độ */}
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">
                        {level === 'company' ? 'Chi tiết công ty' : 'Chi tiết theo đơn vị'}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                            <th className="px-6 py-3 text-left">
                                {level === 'company' ? 'Đơn vị' : 'Đơn vị'}
                            </th>
                            <th className="px-6 py-3 text-center">Số OKR</th>
                            <th className="px-6 py-3 text-center">Tiến độ TB</th>
                            <th className="px-6 py-3 text-center">On Track</th>
                            <th className="px-6 py-3 text-center">At Risk</th>
                            <th className="px-6 py-3 text-center">Off Track</th>
                            </tr>
                        </thead>

                        <tbody>
                            {(level === 'company'
                            ? [
                                {
                                    departmentName: 'Công ty',
                                    count: report.overall?.totalObjectives || 0,
                                    averageProgress: report.overall?.averageProgress || 0,
                                    onTrack: report.overall?.statusCounts?.onTrack || 0,
                                    atRisk: report.overall?.statusCounts?.atRisk || 0,
                                    offTrack: report.overall?.statusCounts?.offTrack || 0,
                                    onTrackPct: report.overall?.statusDistribution?.onTrack || 0,
                                    atRiskPct: report.overall?.statusDistribution?.atRisk || 0,
                                    offTrackPct: report.overall?.statusDistribution?.offTrack || 0,
                                },
                                ]
                            : (report.departmentsHierarchy || report.departments || []).filter(
                                (d) =>
                                    d.departmentId &&
                                    (d.departmentName || '').toLowerCase() !== 'công ty'
                                )
                            ).map((d, i) => (
                            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                {/* Cột Đơn vị - căn trái */}
                                <td className="px-6 py-3 font-medium text-slate-900">
                                {d.departmentName || 'N/A'}
                                </td>

                                {/* Số OKR - căn giữa */}
                                <td className="px-6 py-3 text-center font-semibold text-slate-900">
                                {d.count ?? d.totalObjectives ?? 0}
                                </td>

                                {/* Tiến độ TB - căn giữa */}
                                <td className="px-6 py-3 text-center">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-32 bg-slate-200 rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full transition-all duration-300 ${
                                        (d.averageProgress ?? 0) >= 80
                                            ? 'bg-emerald-500'
                                            : (d.averageProgress ?? 0) >= 50
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(d.averageProgress ?? 0, 100)}%` }}
                                    />
                                    </div>
                                    <span className="text-sm font-bold tabular-nums text-slate-700">
                                    {(d.averageProgress ?? 0).toFixed(0)}%
                                    </span>
                                </div>
                                </td>

                                {/* On Track - căn giữa + màu xanh */}
                                <td className="px-6 py-3 text-center">
                                <div className="font-semibold text-emerald-700">
                                    {d.onTrack ?? 0}
                                </div>
                                <div className="text-xs text-slate-500">
                                    ({d.onTrackPct ?? d.onTrackPercent ?? 0}%)
                                </div>
                                </td>

                                {/* At Risk - căn giữa + màu vàng cam */}
                                <td className="px-6 py-3 text-center">
                                <div className="font-semibold text-amber-700">
                                    {d.atRisk ?? 0}
                                </div>
                                <div className="text-xs text-slate-500">
                                    ({d.atRiskPct ?? d.atRiskPercent ?? 0}%)
                                </div>
                                </td>

                                {/* Off Track - căn giữa + màu đỏ */}
                                <td className="px-6 py-3 text-center">
                                <div className="font-semibold text-red-700">
                                    {d.offTrack ?? 0}
                                </div>
                                <div className="text-xs text-slate-500">
                                    ({d.offTrackPct ?? d.offTrackPercent ?? 0}%)
                                </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>

                    {/* Cảnh báo rủi ro */}
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">Cảnh báo rủi ro</div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3">Objective</th>
                                <th className="px-6 py-3">Đơn vị</th>
                                <th className="px-6 py-3 text-center">Tiến độ</th>
                                <th className="px-6 py-3 text-center">Trạng thái</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(report.risks || [])
                                .filter(r => r.status === 'at_risk' || r.status === 'off_track')
                                .sort((a, b) => (a.status === 'off_track' ? -1 : 1))
                                .map((r, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                    <td className="px-6 py-3 font-semibold text-slate-900">
                                    {r.objective_title || `#${r.objective_id}`}
                                    </td>
                                    <td className="px-6 py-3">
                                    {(report.departments || []).find(d => d.departmentId === r.department_id)?.departmentName || '—'}
                                    </td>

                                    {/* Cột Tiến độ - căn giữa */}
                                    <td className="px-6 py-3 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-32 bg-slate-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                            r.progress >= 80
                                                ? 'bg-emerald-500'
                                                : r.progress >= 50
                                                ? 'bg-amber-500'
                                                : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min(r.progress ?? 0, 100)}%` }}
                                        />
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums">
                                        {(r.progress ?? 0).toFixed(0)}%
                                        </span>
                                    </div>
                                    </td>

                                    {/* Cột Trạng thái - căn giữa */}
                                    <td className="px-6 py-3 text-center">
                                    {r.status === 'on_track' && (
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                        On Track
                                        </span>
                                    )}
                                    {r.status === 'at_risk' && (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                        At Risk
                                        </span>
                                    )}
                                    {r.status === 'off_track' && (
                                        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                        Off Track
                                        </span>
                                    )}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </>
            ) : (
                /* ===================== TRƯỚC KHI Chốt kỳ - CHỈ HIỂN THỊ THÔNG BÁO ===================== */
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div class="w-32 h-32 flex items-center justify-center mb-8 rounded-xl border-2 border-gray-300 bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg"
                            class="w-20 h-20 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">Chưa có báo cáo Chốt kỳ</h3>
                    <p className="text-slate-600 max-w-md leading-relaxed">
                        Nhấn <strong className="text-blue-600">Chốt kỳ</strong> để tạo báo cáo chính thức.<br/>
                        Nội dung báo cáo sẽ hiển thị tại đây sau khi hoàn tất.
                    </p>
                </div>
            )}

            {/* Modal Chốt kỳ */}
            {showSnapshotModal && (
            <>
                {/* Backdrop + cố định trang + click ngoài để đóng */}
                <div 
                className="fixed inset-0 bg-black/30 bg-opacity-70 flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                    setShowSnapshotModal(false);
                    setSnapshotTitleInput('');
                    }
                }}
                >
                {/* Modal chính */}
                <div 
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-5 p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-slate-900">Chốt kỳ</h3>
                    <button 
                        onClick={() => {
                        setShowSnapshotModal(false);
                        setSnapshotTitleInput('');
                        }} 
                        className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg p-2 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 pt-0 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tên báo cáo chốt kỳ <span className="text-red-500">*</span>
                        </label>
                        <input
                        type="text"
                        onChange={(e) => setSnapshotTitleInput(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        placeholder="VD: Báo cáo Tuần 42/2025"
                        autoFocus
                        />
                    </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                    <button
                        onClick={() => {
                        setShowSnapshotModal(false);
                        setSnapshotTitleInput('');
                        }}
                        className="px-5 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition font-medium"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={confirmCreateSnapshot}
                        disabled={isCreatingSnapshot || !snapshotTitleInput.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isCreatingSnapshot ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Đang chốt...
                        </>
                        ) : (
                        'Xác nhận'
                        )}
                    </button>
                    </div>
                </div>
                </div>
            </>
            )}

            {/* Snapshots Modal */}
            {showSnapshots && (
            <>
                {/* Backdrop + cố định trang + click ngoài để đóng */}
                <div 
                className="fixed inset-0 absolute inset-0 bg-black/30 bg-opacity-70 flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                    setShowSnapshots(false);
                    setSelectedSnapshot(null);
                    }
                }}
                >
                {/* Modal chính - ngăn sự kiện click lan ra ngoài */}
                <div 
                    className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900">Lịch sử chốt kỳ</h2>
                    <button 
                        onClick={() => { 
                        setShowSnapshots(false); 
                        setSelectedSnapshot(null); 
                        }} 
                        className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg p-2 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    </div>

                    <div className="p-6">
                    {selectedSnapshot ? (
                        /* ==================== XEM CHI TIẾT SNAPSHOT ==================== */
                        <div>
                        <button 
                            onClick={() => setSelectedSnapshot(null)} 
                            className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Quay lại danh sách
                        </button>

                        <h4 className="text-lg font-bold text-slate-900 mb-2">{selectedSnapshot.title}</h4>

                        {/* Thông tin snapshot */}
                        <div className="bg-slate-50 rounded-lg p-6 mb-6 border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-600">Chu kỳ:</span>
                                    <span className="ml-2 font-semibold text-slate-900">{selectedSnapshot.cycle_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Ngày chốt:</span>
                                    <span className="ml-2 font-semibold text-slate-900">
                                        {new Date(selectedSnapshot.snapshotted_at).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Tạo bởi:</span>
                                    <span className="ml-2 font-semibold text-slate-900">
                                        {selectedSnapshot.creator?.full_name || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Thời gian:</span>
                                    <span className="ml-2 font-semibold text-slate-900">
                                        {new Date(selectedSnapshot.created_at).toLocaleTimeString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Nội dung báo cáo - giữ nguyên logic cũ nhưng đẹp hơn */}
                        {selectedSnapshot.data_snapshot && (
                        <div className="space-y-8">

                            {/* Tổng quan - ĐÃ THÊM At Risk */}
                            <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-4">Tổng quan</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[
                                { label: "Tổng OKR", value: selectedSnapshot.data_snapshot.overall?.totalObjectives || 0, color: "gray" },
                                { label: "Tiến độ TB", value: `${(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0).toFixed(1)}%`, color: "blue" },
                                { label: "On Track", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0, percent: selectedSnapshot.data_snapshot.overall?.statusDistribution?.onTrack || 0, color: "emerald" },
                                { label: "At Risk", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.atRisk || 0, percent: selectedSnapshot.data_snapshot.overall?.statusDistribution?.atRisk || 0, color: "amber" },
                                { label: "Off Track", value: selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0, percent: selectedSnapshot.data_snapshot.overall?.statusDistribution?.offTrack || 0, color: "red" },
                                ].map((item, i) => (
                                <div 
                                    key={i} 
                                    className={`
                                    rounded-xl p-5 shadow-sm bg-white border
                                    ${i <= 1 ? 'border-gray-200' : 
                                        item.color === 'emerald' ? 'border-emerald-200' :
                                        item.color === 'amber' ? 'border-amber-200' :
                                        'border-red-200'}
                                    `}
                                >
                                    <div className={`
                                    text-sm font-medium
                                    ${i <= 1 ? 'text-gray-600' : 
                                        item.color === 'emerald' ? 'text-emerald-600' :
                                        item.color === 'amber' ? 'text-amber-600' :
                                        'text-red-600'}
                                    `}>
                                    {item.label}
                                    </div>
                                    <div className={`
                                    text-xl font-bold mt-1
                                    ${i <= 1 ? 'text-gray-900' : 
                                        item.color === 'emerald' ? 'text-emerald-700' :
                                        item.color === 'amber' ? 'text-amber-700' :
                                        'text-red-700'}
                                    `}>
                                    {item.value}
                                    {item.percent !== undefined && (
                                        <span className="ml-2 text-sm font-normal text-gray-600">
                                        ({item.percent}%)
                                        </span>
                                    )}
                                    </div>
                                </div>
                                ))}
                            </div>
                            </div>

                            {/* Chi tiết theo đơn vị - giữ nguyên, đã có At Risk rồi */}
                            {selectedSnapshot.data_snapshot.departments?.length > 0 && (
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-4">Chi tiết theo đơn vị</h4>
                                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-4 font-semibold text-gray-700">Đơn vị</th>
                                        <th className="text-center p-4 font-semibold text-gray-700">OKR</th>
                                        <th className="text-center p-4 font-semibold text-gray-700">Tiến độ</th>
                                        <th className="text-center p-4 font-semibold text-green-600">On Track</th>
                                        <th className="text-center p-4 font-semibold text-yellow-600">At Risk</th>
                                        <th className="text-center p-4 font-semibold text-red-600">Off Track</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {/* Dòng tổng Công ty */}
                                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                                        <td className="p-4 text-slate-900">Công ty</td>
                                        <td className="p-4 text-center text-slate-700">
                                        {selectedSnapshot.data_snapshot.overall?.totalObjectives || 0}
                                        </td>
                                        <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-20 h-2 bg-slate-300 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                                                style={{ width: `${Math.min(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0, 100)}%` }}
                                            />
                                            </div>
                                            <span className="font-bold text-slate-900">
                                            {(selectedSnapshot.data_snapshot.overall?.averageProgress ?? 0).toFixed(1)}%
                                            </span>
                                        </div>
                                        </td>
                                        <td className="p-4 text-center text-green-600 font-medium">
                                        {selectedSnapshot.data_snapshot.overall?.statusCounts?.onTrack || 0}
                                        </td>
                                        <td className="p-4 text-center text-yellow-600 font-medium">
                                        {selectedSnapshot.data_snapshot.overall?.statusCounts?.atRisk || 0}
                                        </td>
                                        <td className="p-4 text-center text-red-600 font-medium">
                                        {selectedSnapshot.data_snapshot.overall?.statusCounts?.offTrack || 0}
                                        </td>
                                    </tr>

                                    {/* Các phòng ban và đội nhóm - giữ nguyên */}
                                    {(selectedSnapshot.data_snapshot.departments || []).map((dept) => {
                                        if (dept.departmentName?.toLowerCase() === 'công ty') return null;
                                        const hasTeams = dept.children && dept.children.length > 0;

                                        return (
                                        <React.Fragment key={dept.departmentId}>
                                            <tr className="bg-blue-50/30 border-t border-slate-200 hover:bg-blue-50/50 transition">
                                            <td className="p-4 font-semibold text-blue-900 pl-8">
                                                {dept.departmentName || 'Phòng ban không tên'}
                                            </td>
                                            <td className="p-4 text-center text-slate-700">{dept.count || 0}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.min(dept.averageProgress ?? 0, 100)}%` }} />
                                                </div>
                                                <span className="font-semibold text-blue-900">{(dept.averageProgress ?? 0).toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-green-600 font-medium">{dept.onTrack || 0}</td>
                                            <td className="p-4 text-center text-yellow-600 font-medium">{dept.atRisk || 0}</td>
                                            <td className="p-4 text-center text-red-600 font-medium">{dept.offTrack || 0}</td>
                                            </tr>

                                            {hasTeams && dept.children.map((team) => (
                                            <tr key={team.departmentId} className="border-t border-slate-100 hover:bg-slate-50 transition">
                                                <td className="p-4 text-slate-700 pl-16">↳ {team.departmentName}</td>
                                                <td className="p-4 text-center text-slate-600">{team.count || 0}</td>
                                                <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all ${
                                                        (team.averageProgress ?? 0) >= 80 ? 'bg-emerald-500' :
                                                        (team.averageProgress ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(team.averageProgress ?? 0, 100)}%` }}
                                                    />
                                                    </div>
                                                    <span className={`font-medium ${
                                                    (team.averageProgress ?? 0) >= 80 ? 'text-emerald-700' :
                                                    (team.averageProgress ?? 0) >= 50 ? 'text-amber-700' : 'text-red-700'
                                                    }`}>
                                                    {(team.averageProgress ?? 0).toFixed(1)}%
                                                    </span>
                                                </div>
                                                </td>
                                                <td className="p-4 text-center text-green-600">{team.onTrack || 0}</td>
                                                <td className="p-4 text-center text-yellow-600">{team.atRisk || 0}</td>
                                                <td className="p-4 text-center text-red-600">{team.offTrack || 0}</td>
                                            </tr>
                                            ))}
                                        </React.Fragment>
                                        );
                                    })}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                            )}

                        </div>
                        )}
                        </div>
                    ) : (
                        /* ==================== DANH SÁCH SNAPSHOT ==================== */
                        <div>
                        {snapshots.length === 0 ? (
                            <div className="text-center py-16">
                            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-600 font-semibold text-lg">Chưa có Chốt kỳ nào</p>
                            <p className="text-gray-400 text-sm mt-2">Nhấn nút "Chốt kỳ" để tạo bản sao đầu tiên</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                            {snapshots.map((snap) => (
                                <button
                                key={snap.id}
                                onClick={() => loadSnapshot(snap.id)}
                                className="w-full p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left group"
                                >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition">
                                        {snap.title}
                                    </h3>
                                    <div className="flex items-center gap-6 text-sm text-gray-500 mt-2">
                                        <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {new Date(snap.snapshotted_at).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        {snap.creator?.full_name || 'N/A'}
                                        </span>
                                    </div>
                                    </div>
                                    <svg className="h-6 w-6 text-gray-400 group-hover:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                </button>
                            ))}
                            </div>
                        )}
                        </div>
                    )}
                    </div>
                </div>
                </div>

                <style jsx>{`
                body { overflow: hidden; }
                `}</style>
            </>
            )}     
        </div>
    );
}