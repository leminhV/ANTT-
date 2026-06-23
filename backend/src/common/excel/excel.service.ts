import { Injectable, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

@Injectable()
export class ExcelService {
  /**
   * Tạo buffer Excel từ một mảng dữ liệu JSON
   */
  exportToExcel(data: any[], sheetName: string = 'Data'): Buffer {
    if (!data || data.length === 0) {
      throw new BadRequestException('Không có dữ liệu để xuất Excel');
    }
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Ghi ra buffer dạng mảng byte
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  exportMultipleSheetsToExcel(
    sheets: { data: any[]; sheetName: string }[],
  ): Buffer {
    if (!sheets || sheets.length === 0) {
      throw new BadRequestException('Không có dữ liệu để xuất Excel');
    }
    const workbook = xlsx.utils.book_new();

    sheets.forEach(({ data, sheetName }) => {
      // Create empty sheet if no data to prevent crash
      const worksheet =
        data.length > 0
          ? xlsx.utils.json_to_sheet(data)
          : xlsx.utils.json_to_sheet([{}]);
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  /**
   * Đọc file Excel từ buffer upload và chuyển thành JSON array
   */
  parseExcel(buffer: Buffer): any[] {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return xlsx.utils.sheet_to_json(worksheet);
    } catch (error) {
      throw new BadRequestException(
        'Lỗi khi đọc file Excel, định dạng không đúng',
      );
    }
  }
}
