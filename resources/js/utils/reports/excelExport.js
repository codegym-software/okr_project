import ExcelJS from 'exceljs';

const createPerformanceSheet = (workbook, data) => {
  const sheet = workbook.addWorksheet('Hiệu suất');

  const headers = [
    { header: 'Tên Mục tiêu (O/KR)', key: 'name', width: 50 },
    { header: 'Cấp độ', key: 'level', width: 15 },
    { header: 'Phòng ban/Đơn vị', key: 'department', width: 25 },
    { header: 'Tiến độ (%)', key: 'progress', width: 15 },
    { header: 'Tình trạng (Health)', key: 'health', width: 20 },
    { header: 'Điểm Tự tin', key: 'confidence', width: 15 },
    { header: 'Liên kết với O Cấp trên', key: 'parent', width: 40 },
  ];
  sheet.columns = headers;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Indigo-600
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate data
  data?.table?.forEach(parent => {
    sheet.addRow({
      name: parent.objective_name,
      level: parent.level,
      department: parent.department_name,
      progress: parent.progress,
      health: parent.health_status,
      confidence: parent.confidence_score,
      parent: parent.parent_objective_name,
    });

    if (parent.children && parent.children.length > 0) {
      parent.children.forEach(child => {
        const childRow = sheet.addRow({
          name: `  └─ ${child.objective_name}`,
          level: child.level,
          department: child.department_name,
          progress: child.progress,
          health: child.health_status,
          confidence: child.confidence_score,
          parent: child.parent_objective_name,
        });
        childRow.getCell('name').alignment = { indent: 1 };
      });
    }
  });

  // Formatting
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell('progress').numFmt = '0.0"%"';
      row.getCell('progress').alignment = { horizontal: 'right' };
      row.getCell('confidence').alignment = { horizontal: 'right' };
    }
  });
  
  sheet.autoFilter = {
    from: 'A1',
    to: { row: 1, column: headers.length },
  };
};

const createProcessSheet = (workbook, data) => {
  const sheet = workbook.addWorksheet('Quy trình');

  const headers = [
    { header: 'Tên Mục tiêu (O/KR)', key: 'name', width: 50 },
    { header: 'Phòng ban/Đơn vị', key: 'department', width: 25 },
    { header: 'Người Sở hữu Chính', key: 'owner', width: 25 },
    { header: 'Tình trạng (Health)', key: 'health', width: 20 },
    { header: 'Check-in Gần nhất', key: 'last_checkin', width: 20 },
    { header: 'Quá hạn Check-in (Ngày)', key: 'overdue', width: 25 },
    { header: 'Tỷ lệ Check-in Định kỳ (%)', key: 'checkin_rate', width: 25 },
  ];
  sheet.columns = headers;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // Emerald-600
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate data
  data?.table?.forEach(row => {
    sheet.addRow({
      name: row.objective_name,
      department: row.department_name,
      owner: row.owner_name,
      health: row.health_status,
      last_checkin: row.last_checkin_date,
      overdue: row.days_overdue,
      checkin_rate: row.periodic_checkin_rate,
    });
  });
  
  // Formatting
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
        const overdueCell = row.getCell('overdue');
        if (overdueCell.value > 14) { // More than 2 weeks overdue
            overdueCell.font = { color: { argb: 'FF991B1B' } }; // Red-800
        } else if (overdueCell.value > 7) { // More than 1 week
            overdueCell.font = { color: { argb: 'FFB45309' } }; // Amber-700
        }

        row.getCell('checkin_rate').numFmt = '0.0"%"';
        row.getCell('checkin_rate').alignment = { horizontal: 'right' };
        row.getCell('overdue').alignment = { horizontal: 'right' };
    }
  });

  sheet.autoFilter = {
    from: 'A1',
    to: { row: 1, column: headers.length },
  };
};

const createQualitySheet = (workbook, data) => {
  const sheet = workbook.addWorksheet('Chất lượng & Cấu trúc');

  const headers = [
    { header: 'Tên Mục tiêu (O/KR)', key: 'name', width: 50 },
    { header: 'Phòng ban/Đơn vị', key: 'department', width: 25 },
    { header: 'Loại KR (Kết quả/Hoạt động)', key: 'kr_dist', width: 30 },
    { header: 'Tham vọng', key: 'aspirational', width: 15 },
    { header: 'Số lượng KR', key: 'kr_count', width: 15 },
    { header: 'Thẻ Chiến lược', key: 'tags', width: 30 },
    { header: 'Tiến độ (%)', key: 'progress', width: 15 },
    { header: 'Vấn đề Cấu trúc', key: 'issues', width: 30 },
  ];
  sheet.columns = headers;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDB2777' }, // Pink-600
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate data
  data?.table?.forEach(row => {
    const krDistText = `Kết quả: ${row.kr_type_distribution.outcome}, Hoạt động: ${row.kr_type_distribution.activity}`;
    sheet.addRow({
      name: row.objective_name,
      department: row.department_name,
      kr_dist: krDistText,
      aspirational: row.is_aspirational ? 'Yes' : 'No',
      kr_count: row.kr_count,
      tags: row.strategic_tags.join(', '),
      progress: row.progress,
      issues: row.structural_issues,
    });
  });
  
  // Formatting
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell('progress').numFmt = '0.0"%"';
      row.getCell('progress').alignment = { horizontal: 'right' };
      row.getCell('kr_count').alignment = { horizontal: 'right' };
      
      const issuesCell = row.getCell('issues');
      if (issuesCell.value) {
        issuesCell.font = { bold: true, color: { argb: 'FF991B1B' } };
      }
    }
  });

  sheet.autoFilter = {
    from: 'A1',
    to: { row: 1, column: headers.length },
  };
};

/**
 * Main function to generate and download the company report Excel file.
 * @param {object} reportData - The data object containing performance, process, and quality tabs.
 * @param {string} cycleName - The name of the current cycle for the filename.
 */
export const exportCompanyReportToExcel = async (reportData, cycleName) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OKR Platform';
  workbook.created = new Date();
  workbook.lastModifiedBy = 'OKR Platform';
  workbook.modified = new Date();

  if (reportData) {
    createPerformanceSheet(workbook, reportData.performance);
    createProcessSheet(workbook, reportData.process);
    createQualitySheet(workbook, reportData.quality);
  } else {
    // Fallback if data is missing
    const sheet = workbook.addWorksheet('Lỗi');
    sheet.getCell('A1').value = 'Không có dữ liệu báo cáo để xuất.';
  }

  // Generate and download the file
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const fileName = `Bao_cao_cong_ty_${cycleName.replace(/ /g, '_')}_${new Date().toLocaleDateString('vi-VN')}.xlsx`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);

    return { success: true };
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return { success: false, message: error.message };
  }
};
