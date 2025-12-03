import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export report to PDF with both company and departments data
 * @param {Object} companyData - { report, detailedData }
 * @param {Object} departmentsData - { report, detailedData }
 * @param {Object} currentCycleMeta
 * @param {Function} onSuccess
 * @param {Function} onError
 */
export async function exportToPDF(companyData, departmentsData, currentCycleMeta, onSuccess, onError) {
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Load font Noto Sans hỗ trợ tiếng Việt từ jsDelivr CDN (TTF format)
        let usedFont = 'helvetica';
        try {
            const loadTTFFont = async (url, fontName, style) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Font not found');
                    const arrayBuffer = await response.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    let binaryString = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        binaryString += String.fromCharCode(uint8Array[i]);
                    }
                    const base64 = btoa(binaryString);
                    return base64;
                } catch (e) {
                    console.warn(`Could not load font ${fontName}:`, e);
                    return null;
                }
            };

            // Load Noto Sans từ jsDelivr CDN (TTF format)
            const [normalBase64, boldBase64] = await Promise.all([
                loadTTFFont('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Regular.ttf', 'NotoSans-Regular', 'normal'),
                loadTTFFont('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Bold.ttf', 'NotoSans-Bold', 'bold')
            ]);

            if (normalBase64 && boldBase64) {
                pdf.addFileToVFS('NotoSans-Regular.ttf', normalBase64);
                pdf.addFileToVFS('NotoSans-Bold.ttf', boldBase64);
                pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
                pdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
                usedFont = 'NotoSans';
                console.log('Noto Sans font loaded successfully');
            } else {
                console.warn('Could not load Noto Sans, using helvetica (may have issues with Vietnamese)');
            }
        } catch (e) {
            console.warn('Error loading fonts, using helvetica:', e);
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

        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // ============ TÓM TẮT ĐIỀU HÀNH =========
        pdf.setFontSize(13);
        pdf.setFont(usedFont, 'bold');
        pdf.setTextColor(37, 99, 235);
        pdf.text('Tóm tắt điều hành', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        pdf.setFont(usedFont, 'normal');
        pdf.setTextColor(51, 51, 51);

        // Helper function to render a report section (company or departments)
        const renderReportSection = (reportData, detailedData, sectionTitle, isCompany = false) => {
            // Add new page if needed (except for first section)
            if (yPosition > margin) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                } else {
                    yPosition += 15; // Add spacing between sections
                }
            }

            // ============ SECTION TITLE ============
            pdf.setFontSize(16);
            pdf.setFont(usedFont, 'bold');
            pdf.setTextColor(37, 99, 235);
            pdf.text(sectionTitle, margin, yPosition);
            yPosition += 10;

            // ============ TÓM TẮT ĐIỀU HÀNH =========
            pdf.setFontSize(13);
            pdf.setFont(usedFont, 'bold');
            pdf.setTextColor(37, 99, 235);
            pdf.text('Tóm tắt điều hành', margin, yPosition);
            yPosition += 8;

            pdf.setFontSize(10);
            pdf.setFont(usedFont, 'normal');
            pdf.setTextColor(51, 51, 51);

            const summaryText = (
                reportData.overall?.summary || reportData.overall?.executiveSummary ||
                `Chu kỳ: ${currentCycleMeta?.name || 'Chưa chọn chu kỳ'}. Tổng OKR: ${reportData.overall?.totalObjectives || 0}. Tiến độ trung bình: ${(reportData.overall?.averageProgress ?? 0).toFixed(1)}%. Đúng tiến độ: ${reportData.overall?.statusCounts?.onTrack || 0}, Có nguy cơ: ${reportData.overall?.statusCounts?.atRisk || 0}, Chậm tiến độ: ${reportData.overall?.statusCounts?.offTrack || 0}.`
            );

            const splitSummary = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin - 10);
            const boxHeight = splitSummary.length * 5 + 12;

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
                { label: 'Tổng OKR', value: reportData.overall?.totalObjectives || 0, bg: [248, 250, 255], color: [15, 23, 42] },
                { label: 'Tiến độ trung bình', value: `${(reportData.overall?.averageProgress ?? 0).toFixed(1)}%`, bg: [248, 250,255], color: [15, 23, 42] },
                { label: 'Đúng tiến độ', value: reportData.overall?.statusCounts?.onTrack || 0, perc: reportData.overall?.statusDistribution?.onTrack, bg: [236, 253, 245], color: [22, 163, 74] },
                { label: 'Có nguy cơ', value: reportData.overall?.statusCounts?.atRisk || 0, perc: reportData.overall?.statusDistribution?.atRisk, bg: [255, 251, 235], color: [180, 83, 9] },
                { label: 'Chậm tiến độ', value: reportData.overall?.statusCounts?.offTrack || 0, perc: reportData.overall?.statusDistribution?.offTrack, bg: [254, 242, 242], color: [185, 28, 28] },
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
            let deptBody;
            if (isCompany) {
                // For company level, show only company row
                deptBody = [[
                    'Công ty',
                    String(reportData.overall?.totalObjectives || 0),
                    `${(reportData.overall?.averageProgress ?? 0).toFixed(1)}%`,
                    String(reportData.overall?.statusCounts?.onTrack || 0),
                    String(reportData.overall?.statusCounts?.atRisk || 0),
                    String(reportData.overall?.statusCounts?.offTrack || 0),
                ]];
            } else {
                // For departments level, show all departments
                deptBody = (reportData.departmentsHierarchy || reportData.departments || [])
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
            }

            if (deptBody.length > 0) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                }

                autoTable(pdf, {
                    head: [['Đơn vị', 'Số OKR', 'Tiến độ TB', 'Đúng tiến độ', 'Có nguy cơ', 'Chậm tiến độ']],
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

            // ============ CHI TIẾT OBJECTIVES ============
            if (detailedData?.objectives && detailedData.objectives.length > 0) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(13);
                pdf.setFont(usedFont, 'bold');
                pdf.setTextColor(37, 99, 235);
                pdf.text('Chi tiết Objectives', margin, yPosition);
                yPosition += 8;

                const objBody = detailedData.objectives.slice(0, 50).map(obj => {
                    const krs = obj.keyResults || obj.key_results || [];
                    let progress = 0;
                    if (krs.length > 0) {
                        const totalProgress = krs.reduce((sum, kr) => {
                            const krProgress = parseFloat(kr.progress_percent) || 0;
                            return sum + krProgress;
                        }, 0);
                        progress = totalProgress / krs.length;
                    } else {
                        progress = parseFloat(obj.progress_percent) || 0;
                    }
                    const status = progress >= 70 ? 'Đúng tiến độ' : (progress >= 40 ? 'Có nguy cơ' : 'Chậm tiến độ');
                    const levelText = obj.level === 'company' ? 'Công ty' : obj.level === 'unit' ? 'Phòng ban' : obj.level === 'person' ? 'Cá nhân' : 'N/A';
                    
                    const row = [
                        (obj.obj_title || 'N/A').substring(0, 40),
                        levelText,
                        String(obj.key_results?.length || 0),
                        `${progress.toFixed(1)}%`,
                        status,
                    ];
                    
                    if (!isCompany) {
                        row.splice(2, 0, obj.department?.d_name || obj.department?.departmentName || '—');
                    }
                    
                    return row;
                });

                const objHeaders = isCompany 
                    ? [['Tên Objective', 'Cấp độ', 'Số KR', 'Tiến độ', 'Trạng thái']]
                    : [['Tên Objective', 'Cấp độ', 'Phòng ban', 'Số KR', 'Tiến độ', 'Trạng thái']];

                autoTable(pdf, {
                    head: objHeaders,
                    body: objBody,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { 
                        font: usedFont, 
                        fontSize: 8.5, 
                        cellPadding: 4,
                        fontStyle: 'normal',
                        overflow: 'linebreak',
                        cellWidth: 'wrap'
                    },
                    headStyles: { 
                        fillColor: [37, 99, 235], 
                        textColor: '#ffffff', 
                        fontStyle: 'bold', 
                        fontSize: 9.5 
                    },
                    alternateRowStyles: { fillColor: [248, 250, 255] },
                    columnStyles: {
                        0: { cellWidth: isCompany ? 70 : 60 },
                        [isCompany ? 2 : 3]: { halign: 'center' },
                        [isCompany ? 3 : 4]: { halign: 'center' },
                        [isCompany ? 4 : 5]: { halign: 'center' },
                    },
                    didDrawPage: data => {
                        yPosition = data.cursor.y + 10;
                    }
                });
            }

            // ============ CHI TIẾT KEY RESULTS ============
            if (detailedData?.keyResults && detailedData.keyResults.length > 0) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(13);
                pdf.setFont(usedFont, 'bold');
                pdf.setTextColor(37, 99, 235);
                pdf.text('Chi tiết Key Results', margin, yPosition);
                yPosition += 8;

                const krBody = detailedData.keyResults.slice(0, 50).map(kr => {
                    const progress = kr.progress_percent || 0;
                    const status = progress >= 70 ? 'Đúng tiến độ' : (progress >= 40 ? 'Có nguy cơ' : 'Chậm tiến độ');
                    const assigneeName = kr.assignedUser?.full_name || kr.objective_owner?.full_name || kr.objective_owner?.name || 'Chưa gán';
                    
                    return [
                        (kr.kr_title || 'N/A').substring(0, 40),
                        (kr.objective_title || 'N/A').substring(0, 35),
                        assigneeName.substring(0, 25),
                        `${progress.toFixed(1)}%`,
                        status,
                    ];
                });

                autoTable(pdf, {
                    head: [['Tên Key Result', 'Objective', 'Người được giao', 'Tiến độ', 'Trạng thái']],
                    body: krBody,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { font: usedFont, fontSize: 8.5, cellPadding: 4 },
                    headStyles: { fillColor: [37, 99, 235], textColor: '#ffffff', fontStyle: 'bold', fontSize: 9.5 },
                    alternateRowStyles: { fillColor: [248, 250, 255] },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { cellWidth: 50 },
                        2: { cellWidth: 40 },
                        3: { halign: 'center' },
                        4: { halign: 'center' },
                    },
                    didDrawPage: data => {
                        yPosition = data.cursor.y + 10;
                    }
                });
            }

            // ============ PHÂN TÍCH THEO NGƯỜI CHỊU TRÁCH NHIỆM ============
            if (detailedData?.owners && detailedData.owners.length > 0) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(13);
                pdf.setFont(usedFont, 'bold');
                pdf.setTextColor(37, 99, 235);
                pdf.text('Phân tích theo Người chịu trách nhiệm', margin, yPosition);
                yPosition += 8;

                const ownerBody = detailedData.owners.map(owner => [
                    (owner.owner_name || 'Chưa gán').substring(0, 30),
                    String(owner.keyResults?.length || 0),
                    `${owner.averageProgress.toFixed(1)}%`,
                    String(owner.onTrack || 0),
                    String(owner.atRisk || 0),
                    String(owner.offTrack || 0),
                ]);

                autoTable(pdf, {
                    head: [['Người chịu trách nhiệm', 'Số Key Results', 'Tiến độ TB', 'Đúng tiến độ', 'Có nguy cơ', 'Chậm tiến độ']],
                    body: ownerBody,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { font: usedFont, fontSize: 8.5, cellPadding: 4 },
                    headStyles: { fillColor: [37, 99, 235], textColor: '#ffffff', fontStyle: 'bold', fontSize: 9.5 },
                    alternateRowStyles: { fillColor: [248, 250, 255] },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { halign: 'center' },
                        2: { halign: 'center' },
                        3: { halign: 'center' },
                        4: { halign: 'center' },
                        5: { halign: 'center' },
                    },
                    didDrawPage: data => {
                        yPosition = data.cursor.y + 10;
                    }
                });
            }

            // ============ LỊCH SỬ CHECK-IN ============
            if (detailedData?.checkIns && detailedData.checkIns.length > 0) {
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFontSize(13);
                pdf.setFont(usedFont, 'bold');
                pdf.setTextColor(37, 99, 235);
                pdf.text('Lịch sử Check-in', margin, yPosition);
                yPosition += 8;

                const checkInBody = detailedData.checkIns.slice(0, 30).map(checkIn => [
                    (checkIn.key_result?.kr_title || checkIn.kr_title || 'N/A').substring(0, 35),
                    (checkIn.objective?.obj_title || checkIn.objective_title || 'N/A').substring(0, 30),
                    (checkIn.user?.full_name || checkIn.user_name || 'N/A').substring(0, 25),
                    `${checkIn.progress_percent || 0}%`,
                    checkIn.created_at ? new Date(checkIn.created_at).toLocaleDateString('vi-VN') : 'N/A',
                    (checkIn.notes || checkIn.note || '—').substring(0, 30),
                ]);

                autoTable(pdf, {
                    head: [['Key Result', 'Objective', 'Người check-in', 'Tiến độ', 'Ngày check-in', 'Ghi chú']],
                    body: checkInBody,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { font: usedFont, fontSize: 8, cellPadding: 3 },
                    headStyles: { fillColor: [37, 99, 235], textColor: '#ffffff', fontStyle: 'bold', fontSize: 9 },
                    alternateRowStyles: { fillColor: [248, 250, 255] },
                    columnStyles: {
                        0: { cellWidth: 45 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 35 },
                        3: { halign: 'center' },
                        4: { halign: 'center' },
                        5: { cellWidth: 40 },
                    },
                    didDrawPage: data => {
                        yPosition = data.cursor.y + 10;
                    }
                });
            }
        };

        // ============ PHẦN CÔNG TY ============
        renderReportSection(companyData.report, companyData.detailedData, 'PHẦN 1: BÁO CÁO CẤP CÔNG TY', true);

        // ============ PHẦN PHÒNG BAN ============
        renderReportSection(departmentsData.report, departmentsData.detailedData, 'PHẦN 2: BÁO CÁO CẤP PHÒNG BAN', false);

        // ============ FOOTER MỌI TRANG ============
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            pdf.setFillColor(248, 250, 255);
            pdf.rect(0, pageHeight - 18, pageWidth, 18, 'F');

            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont(usedFont, 'normal');

            pdf.text(`Xuất báo cáo lúc: ${new Date().toLocaleString('vi-VN')}`, margin, pageHeight - 8);
            pdf.text(`Trang ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        }

        // ============ LƯU FILE ============
        // Tạo tên file theo format: Bao_cao_(ten snapshot)_ngày tháng năm xuất file.pdf
        const cycleName = (currentCycleMeta?.name || 'Chua_chon_chu_ky')
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
            || 'Chua_chon_chu_ky';

        // Format ngày tháng năm: dd_mm_yyyy
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}_${month}_${year}`;

        const fileName = `Bao_cao_${cycleName}_${dateStr}.pdf`;
        pdf.save(fileName);

        onSuccess('Xuất PDF thành công!');
    } catch (error) {
        console.error('Lỗi xuất PDF:', error);
        onError('Xuất PDF thất bại: ' + (error.message || 'Lỗi không xác định'));
    }
}

/**
 * Export report to Excel with both company and departments data
 * @param {Object} companyData - { report, detailedData }
 * @param {Object} departmentsData - { report, detailedData }
 * @param {Object} currentCycleMeta
 * @param {String} snapshotTitle - Tên báo cáo chốt kỳ (từ snapshot)
 * @param {Function} onSuccess
 * @param {Function} onError
 */
export function exportToExcel(companyData, departmentsData, currentCycleMeta, snapshotTitle, onSuccess, onError) {
    try {
        const workbook = XLSX.utils.book_new();

        // Helper function to create a sheet for a level
        const createLevelSheet = (reportData, detailedData, levelName, isCompany = false) => {
            const sheetData = [];

            // Header
            sheetData.push(['BÁO CÁO OKR TỔNG QUAN']);
            sheetData.push(['Cấp độ', levelName]);
            sheetData.push(['Chu kỳ', currentCycleMeta?.name || 'N/A']);
            sheetData.push(['Ngày xuất', new Date().toLocaleDateString('vi-VN')]);
            sheetData.push([]);

            // Thống kê tổng quan
            sheetData.push(['THỐNG KÊ TỔNG QUAN']);
            sheetData.push(['Chỉ số', 'Giá trị']);
            sheetData.push(['Tổng số mục tiêu', reportData.overall?.totalObjectives || 0]);
            sheetData.push(['Tiến độ trung bình', (reportData.overall?.averageProgress ?? 0).toFixed(2) + '%']);
            sheetData.push(['Đúng tiến độ', `${reportData.overall?.statusCounts?.onTrack || 0} (${reportData.overall?.statusDistribution?.onTrack || 0}%)`]);
            sheetData.push(['Có nguy cơ', `${reportData.overall?.statusCounts?.atRisk || 0} (${reportData.overall?.statusDistribution?.atRisk || 0}%)`]);
            sheetData.push(['Chậm tiến độ', `${reportData.overall?.statusCounts?.offTrack || 0} (${reportData.overall?.statusDistribution?.offTrack || 0}%)`]);
            sheetData.push([]);

            // Chi tiết theo đơn vị
            sheetData.push(['CHI TIẾT THEO ĐƠN VỊ']);
            sheetData.push(['Đơn vị', 'Số OKR', 'Tiến độ (%)', 'Đúng tiến độ', 'Có nguy cơ', 'Chậm tiến độ']);
            
            if (isCompany) {
                sheetData.push([
                    'Công ty',
                    reportData.overall?.totalObjectives || 0,
                    (reportData.overall?.averageProgress ?? 0).toFixed(2),
                    reportData.overall?.statusCounts?.onTrack || 0,
                    reportData.overall?.statusCounts?.atRisk || 0,
                    reportData.overall?.statusCounts?.offTrack || 0,
                ]);
            } else {
                (reportData.departmentsHierarchy || reportData.departments || [])
                    .filter(d => d.departmentName && !['công ty', 'company'].includes(d.departmentName.toLowerCase()))
                    .forEach(d => {
                        sheetData.push([
                            d.departmentName || 'N/A',
                            d.count || 0,
                            (d.averageProgress ?? 0).toFixed(2),
                            d.onTrack || 0,
                            d.atRisk || 0,
                            d.offTrack || 0,
                        ]);
                    });
            }
            sheetData.push([]);

            // Chi tiết Objectives
            if (detailedData?.objectives && detailedData.objectives.length > 0) {
                sheetData.push(['CHI TIẾT OBJECTIVES']);
                const objHeaders = isCompany 
                    ? ['Tên Objective', 'Cấp độ', 'Số KR', 'Tiến độ (%)', 'Trạng thái']
                    : ['Tên Objective', 'Cấp độ', 'Phòng ban', 'Số KR', 'Tiến độ (%)', 'Trạng thái'];
                sheetData.push(objHeaders);

                detailedData.objectives.forEach(obj => {
                    const krs = obj.keyResults || obj.key_results || [];
                    let progress = 0;
                    if (krs.length > 0) {
                        const totalProgress = krs.reduce((sum, kr) => {
                            const krProgress = parseFloat(kr.progress_percent) || 0;
                            return sum + krProgress;
                        }, 0);
                        progress = totalProgress / krs.length;
                    } else {
                        progress = parseFloat(obj.progress_percent) || 0;
                    }
                    const status = progress >= 70 ? 'Đúng tiến độ' : (progress >= 40 ? 'Có nguy cơ' : 'Chậm tiến độ');
                    const levelText = obj.level === 'company' ? 'Công ty' : obj.level === 'unit' ? 'Phòng ban' : obj.level === 'person' ? 'Cá nhân' : 'N/A';
                    
                    const row = [
                        obj.obj_title || 'N/A',
                        levelText,
                        obj.key_results?.length || 0,
                        progress.toFixed(1) + '%',
                        status,
                    ];
                    
                    if (!isCompany) {
                        row.splice(2, 0, obj.department?.d_name || obj.department?.departmentName || '—');
                    }
                    
                    sheetData.push(row);
                });
                sheetData.push([]);
            }

            // Chi tiết Key Results
            if (detailedData?.keyResults && detailedData.keyResults.length > 0) {
                sheetData.push(['CHI TIẾT KEY RESULTS']);
                sheetData.push(['Tên Key Result', 'Objective', 'Người được giao', 'Tiến độ (%)', 'Trạng thái']);

                detailedData.keyResults.forEach(kr => {
                    const progress = kr.progress_percent || 0;
                    const status = progress >= 70 ? 'Đúng tiến độ' : (progress >= 40 ? 'Có nguy cơ' : 'Chậm tiến độ');
                    const assigneeName = kr.assignedUser?.full_name || kr.objective_owner?.full_name || kr.objective_owner?.name || 'Chưa gán';
                    
                    sheetData.push([
                        kr.kr_title || 'N/A',
                        kr.objective_title || 'N/A',
                        assigneeName,
                        progress.toFixed(1) + '%',
                        status,
                    ]);
                });
                sheetData.push([]);
            }

            // Phân tích theo Người chịu trách nhiệm
            if (detailedData?.owners && detailedData.owners.length > 0) {
                sheetData.push(['PHÂN TÍCH THEO NGƯỜI CHỊU TRÁCH NHIỆM']);
                sheetData.push(['Người chịu trách nhiệm', 'Số Key Results', 'Tiến độ TB (%)', 'Đúng tiến độ', 'Có nguy cơ', 'Chậm tiến độ']);

                detailedData.owners.forEach(owner => {
                    sheetData.push([
                        owner.owner_name || 'Chưa gán',
                        owner.keyResults?.length || 0,
                        owner.averageProgress || 0,
                        owner.onTrack || 0,
                        owner.atRisk || 0,
                        owner.offTrack || 0,
                    ]);
                });
                sheetData.push([]);
            }

            // Lịch sử Check-in
            if (detailedData?.checkIns && detailedData.checkIns.length > 0) {
                sheetData.push(['LỊCH SỬ CHECK-IN']);
                sheetData.push(['Key Result', 'Objective', 'Người check-in', 'Tiến độ (%)', 'Ngày check-in', 'Ghi chú']);

                detailedData.checkIns.forEach(checkIn => {
                    sheetData.push([
                        checkIn.key_result?.kr_title || checkIn.kr_title || 'N/A',
                        checkIn.objective?.obj_title || checkIn.objective_title || 'N/A',
                        checkIn.user?.full_name || checkIn.user_name || 'N/A',
                        checkIn.progress_percent || 0,
                        checkIn.created_at ? new Date(checkIn.created_at).toLocaleDateString('vi-VN') : 'N/A',
                        checkIn.notes || checkIn.note || '—',
                    ]);
                });
            }

            return sheetData;
        };

        // Helper function to create worksheet with better formatting
        const createWorksheet = (sheetData, sheetName, isCompany = false) => {
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            
            // Calculate optimal column widths based on content
            const maxCols = Math.max(...sheetData.map(row => row ? row.length : 0));
            const colWidths = [];
            
            // Calculate max width for each column
            for (let col = 0; col < maxCols; col++) {
                let maxWidth = 10;
                for (let row = 0; row < sheetData.length; row++) {
                    if (sheetData[row] && sheetData[row][col] !== undefined) {
                        const cellValue = String(sheetData[row][col] || '');
                        const cellWidth = cellValue.length;
                        if (cellWidth > maxWidth) {
                            maxWidth = Math.min(cellWidth + 2, 50); // Cap at 50
                        }
                    }
                }
                colWidths.push({ wch: maxWidth });
            }
            
            ws['!cols'] = colWidths;
            
            return ws;
        };

        // Sheet 1: Công ty
        const companySheetData = createLevelSheet(companyData.report, companyData.detailedData, 'Công ty', true);
        const companyWs = createWorksheet(companySheetData, 'Công ty', true);
        XLSX.utils.book_append_sheet(workbook, companyWs, 'Công ty');

        // Sheet 2: Phòng ban
        const departmentsSheetData = createLevelSheet(departmentsData.report, departmentsData.detailedData, 'Phòng ban', false);
        const deptWs = createWorksheet(departmentsSheetData, 'Phòng ban', false);
        XLSX.utils.book_append_sheet(workbook, deptWs, 'Phòng ban');

        // Save Excel
        // Format: Bao_cao_(ten_bao_cao_chot_ky)_dd_mm_yyyy.xlsx
        // Ưu tiên lấy từ snapshot title, nếu không có thì dùng tên chu kỳ
        const tenBaoCaoChotKy = (snapshotTitle || currentCycleMeta?.name || 'Chua_chon_chu_ky')
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
            || 'Chua_chon_chu_ky';

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();

        const filename = `Bao_cao_${tenBaoCaoChotKy}_${dd}_${mm}_${yyyy}.xlsx`;
        XLSX.writeFile(workbook, filename);
        onSuccess('✓ Xuất Excel thành công!');
    } catch (error) {
        console.error('Lỗi khi xuất Excel:', error);
        onError('✕ Xuất Excel thất bại. Vui lòng thử lại.');
    }
}

