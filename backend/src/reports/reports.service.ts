import { UserPayload } from '../auth/interfaces/user-payload.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PrismaService } from '../prisma/prisma.service';
import { checkOwnership } from '../common/utils/ownership.util';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { user_id: userId, is_deleted: false },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStatistics() {
    const total = await this.prisma.report.count({ where: { is_deleted: false } });
    const open = await this.prisma.report.count({ where: { status: 'OPEN', is_deleted: false } });
    const inProgress = await this.prisma.report.count({
      where: { status: 'IN_PROGRESS', is_deleted: false },
    });
    const resolved = await this.prisma.report.count({
      where: { status: 'RESOLVED', is_deleted: false },
    });

    return {
      total,
      open,
      inProgress,
      resolved,
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

    if (!report || report.is_deleted) {
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
}
