import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReportDto: CreateReportDto, userId: number) {
    return (this.prisma as any).report.create({
      data: {
        ...createReportDto,
        user_id: userId,
      },
    });
  }

  async findAll() {
    return (this.prisma as any).report.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const report = await (this.prisma as any).report.findUnique({
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

  async update(id: number, updateReportDto: UpdateReportDto) {
    await this.findOne(id);

    return (this.prisma as any).report.update({
      where: { id },
      data: updateReportDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return (this.prisma as any).report.delete({
      where: { id },
    });
  }
}
