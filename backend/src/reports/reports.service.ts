import { UserPayload } from '../auth/interfaces/user-payload.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PrismaService } from '../prisma/prisma.service';
import { checkOwnership } from '../common/utils/ownership.util';
import { SettingsService } from '../settings/settings.service';
import { ExcelService } from '../common/excel/excel.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly excelService: ExcelService,
  ) {}

  async create(createReportDto: CreateReportDto, userId: number) {
    return this.prisma.report.create({
      data: {
        ...createReportDto,
        user_id: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.report.findMany({
      where: { is_deleted: false },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findMyReports(userId: number) {
    return this.prisma.report.findMany({
      where: { user_id: userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStatistics() {
    const total = await this.prisma.report.count();
    const open = await this.prisma.report.count({ where: { status: 'OPEN' } });
    const inProgress = await this.prisma.report.count({
      where: { status: 'IN_PROGRESS' },
    });
    const resolved = await this.prisma.report.count({
      where: { status: 'RESOLVED' },
    });

    return {
      total,
      open,
      inProgress,
      resolved,
    };
  }

  async exportToExcel() {
    const reports = await this.prisma.report.findMany({
      where: { is_deleted: false },
      include: {
        user: { select: { name: true, email: true } },
        equipment: { select: { name: true } },
        room: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = reports.map((r) => ({
      ID: r.id,
      'Người báo cáo': r.user.name,
      Email: r.user.email,
      'Phòng Lab': r.room ? r.room.name : 'Không có',
      'Thiết bị': r.equipment ? r.equipment.name : 'Không có',
      'Tiêu đề': r.title,
      'Mô tả': r.description,
      'Trạng thái': r.status,
      'Ngày tạo': r.created_at.toLocaleString('vi-VN'),
    }));

    return this.excelService.exportToExcel(data, 'Reports');
  }

  async exportStrategicToExcel() {
    const [investments, publications] = await Promise.all([
      this.prisma.labInvestment.findMany({
        include: { room: { select: { name: true } } },
        orderBy: { year: 'desc' },
      }),
      this.prisma.scientificPublication.findMany({
        include: { room: { select: { name: true } } },
        orderBy: { year: 'desc' },
      }),
    ]);

    const investmentData = investments.map((inv) => ({
      ID: inv.id,
      'Phòng Lab': inv.room?.name || 'N/A',
      'Số tiền (VNĐ)': inv.amount,
      Năm: inv.year,
      'Nguồn vốn': inv.source || 'N/A',
      'Mô tả': inv.description || '',
      'Ngày tạo': inv.created_at.toLocaleString('vi-VN'),
    }));

    const publicationData = publications.map((pub) => ({
      ID: pub.id,
      'Tiêu đề': pub.title,
      'Tác giả': pub.authors,
      'Tạp chí/Hội nghị': pub.journal,
      'Phân loại': pub.category || 'N/A',
      Năm: pub.year,
      DOI: pub.doi || '',
      'Phòng Lab': pub.room?.name || 'N/A',
      'Ngày tạo': pub.created_at.toLocaleString('vi-VN'),
    }));

    return this.excelService.exportMultipleSheetsToExcel([
      { data: investmentData, sheetName: 'Dau_tu' },
      { data: publicationData, sheetName: 'Cong_bo' },
    ]);
  }

  async getOperationalStats() {
    // 1. Lấy tất cả phòng lab và giờ hoạt động thực tế
    const rooms = await this.prisma.room.findMany({
      where: { is_deleted: false },
      include: {
        bookings: {
          where: {
            is_deleted: false,
            status: { in: ['APPROVED', 'IN_USE', 'COMPLETED'] },
          },
        },
      },
    });

    const roomStats = rooms.map((room) => {
      let totalHours = 0;
      room.bookings.forEach((b) => {
        const start = new Date(b.start_time).getTime();
        const end = new Date(b.end_time).getTime();
        const duration = (end - start) / (1000 * 60 * 60);
        if (duration > 0) {
          totalHours += duration;
        }
      });

      // Tỷ suất khai thác = tổng giờ / (15h/ngày * 30 ngày) * 100%
      const capacityRate = Math.round((totalHours / 450) * 1000) / 10;

      return {
        id: room.id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        totalBookings: room.bookings.length,
        totalHours: Math.round(totalHours * 10) / 10,
        utilizationRate: Math.min(100, capacityRate),
      };
    });

    // 2. Lấy thiết bị đang bảo trì hoặc hỏng
    const maintenanceDevices = await this.prisma.equipment.findMany({
      where: {
        is_deleted: false,
        status: { in: ['MAINTENANCE', 'BROKEN'] },
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const devices = maintenanceDevices.map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serial_number,
      status: d.status,
      lastMaintenance: d.last_maintenance,
      roomName: d.room?.name || 'N/A',
    }));

    // 3. Lấy dữ liệu tiêu hao hóa chất (Burn Rate)
    const chemicals = await this.prisma.chemical.findMany({
      where: { is_deleted: false },
      include: {
        usages: true,
      },
    });

    const chemicalBurnRate = chemicals
      .map((c) => {
        const totalUsed = c.usages.reduce((sum, u) => sum + u.quantity_used, 0);
        return {
          id: c.id,
          name: c.name,
          unit: c.unit,
          totalUsed: Math.round(totalUsed * 10) / 10,
          stockRemaining: c.quantity_stock,
        };
      })
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5); // Top 5 hóa chất tiêu thụ nhiều nhất

    return {
      roomStats,
      maintenanceDevices: devices,
      chemicalBurnRate,
    };
  }

  async getManagementStats() {
    // 1. Nhóm theo Giảng viên
    const instructors = await this.prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR',
        is_deleted: false,
      },
      include: {
        courses: {
          where: { is_deleted: false },
          include: {
            bookings: {
              where: {
                is_deleted: false,
                status: { in: ['APPROVED', 'IN_USE', 'COMPLETED'] },
              },
            },
          },
        },
      },
    });

    const instructorStats = instructors.map((ins) => {
      let totalBookings = 0;
      let totalHours = 0;
      ins.courses.forEach((c) => {
        totalBookings += c.bookings.length;
        c.bookings.forEach((b) => {
          const duration =
            (new Date(b.end_time).getTime() -
              new Date(b.start_time).getTime()) /
            (1000 * 60 * 60);
          if (duration > 0) {
            totalHours += duration;
          }
        });
      });

      return {
        id: ins.id,
        name: ins.name,
        email: ins.email,
        totalCourses: ins.courses.length,
        totalBookings,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    });

    // 2. Nhóm theo Học phần
    const courses = await this.prisma.course.findMany({
      where: { is_deleted: false },
      include: {
        instructor: {
          select: {
            name: true,
          },
        },
        bookings: {
          where: {
            is_deleted: false,
            status: { in: ['APPROVED', 'IN_USE', 'COMPLETED'] },
          },
        },
      },
    });

    const courseStats = courses.map((c) => {
      let totalHours = 0;
      c.bookings.forEach((b) => {
        const duration =
          (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) /
          (1000 * 60 * 60);
        if (duration > 0) {
          totalHours += duration;
        }
      });

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        instructorName: c.instructor?.name || 'N/A',
        totalBookings: c.bookings.length,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    });

    return {
      instructorStats,
      courseStats,
    };
  }

  async getStrategicStats() {
    const HOURLY_RATE = 200000; // Đơn giá quy đổi mỗi giờ dạy: 200,000 VNĐ

    // Lấy tất cả phòng lab cùng với vốn đầu tư, công bố khoa học và các booking
    const rooms = await this.prisma.room.findMany({
      where: { is_deleted: false },
      include: {
        investments: true,
        publications: true,
        bookings: {
          where: {
            is_deleted: false,
            status: { in: ['APPROVED', 'IN_USE', 'COMPLETED'] },
          },
        },
      },
    });

    const strategicStats = rooms.map((room) => {
      const totalInvestment = room.investments.reduce(
        (sum, inv) => sum + inv.amount,
        0,
      );

      let totalHours = 0;
      room.bookings.forEach((b) => {
        const duration =
          (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) /
          (1000 * 60 * 60);
        if (duration > 0) {
          totalHours += duration;
        }
      });

      const totalValue = totalHours * HOURLY_RATE;
      const roi =
        totalInvestment > 0
          ? Math.round((totalValue / totalInvestment) * 100 * 10) / 10
          : 0;

      return {
        id: room.id,
        name: room.name,
        location: room.location,
        totalInvestment,
        totalHours: Math.round(totalHours * 10) / 10,
        totalValue,
        roi,
        publicationsCount: room.publications.length,
      };
    });

    // Lấy chi tiết danh sách bài báo khoa học kèm theo tên phòng Lab
    const publications = await this.prisma.scientificPublication.findMany({
      include: {
        room: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { year: 'desc' },
    });

    // Gom nhóm số lượng bài báo khoa học theo năm (từ 2022 đến 2026) để vẽ biểu đồ đường
    const years = [2022, 2023, 2024, 2025, 2026];
    const publicationTrend = years.map((year) => {
      const count = publications.filter((p) => p.year === year).length;
      return {
        year: year.toString(),
        count,
      };
    });

    return {
      strategicStats,
      publications: publications.map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        journal: p.journal,
        year: p.year,
        doi: p.doi,
        roomName: p.room?.name || 'N/A',
      })),
      publicationTrend,
    };
  }

  async findOne(id: number) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
    });

    if (!report) {
      throw new NotFoundException(`Báo cáo với ID ${id} không tồn tại`);
    }

    return report;
  }

  async findOneSecure(id: number, currentUser: UserPayload) {
    const report = await this.findOne(id);
    checkOwnership(report.user_id, currentUser);
    return report;
  }

  async update(id: number, updateReportDto: UpdateReportDto) {
    await this.findOne(id);

    return this.prisma.report.update({
      where: { id },
      data: updateReportDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.report.update({
      where: { id },
      data: { is_deleted: true },
    });
  }

  async scheduleMaintenance(equipmentId: number, userId: number) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { room: true },
    });

    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị ID ${equipmentId}`);
    }

    return this.prisma.report.create({
      data: {
        title: `[Bảo trì định kỳ] ${equipment.name}`,
        description: `Hệ thống tự động lên lịch bảo trì phòng ngừa cho thiết bị ${equipment.name} (S/N: ${equipment.serial_number}).`,
        equipment_id: equipment.id,
        room_id: equipment.room_id,
        user_id: userId,
        status: 'OPEN',
      },
    });
  }
}
