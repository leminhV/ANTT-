import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChemicalLimitDto,
  UpdateChemicalLimitDto,
} from './dto/create-chemical-limit.dto';

@Injectable()
export class ChemicalLimitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChemicalLimitDto) {
    // Check if limit already exists
    const existing = await this.prisma.chemicalLimit.findUnique({
      where: {
        course_id_chemical_id: {
          course_id: dto.course_id,
          chemical_id: dto.chemical_id,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Định mức cho hóa chất này trong học phần đã tồn tại',
      );
    }

    // Verify course and chemical exist
    const [course, chemical] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.course_id } }),
      this.prisma.chemical.findUnique({ where: { id: dto.chemical_id } }),
    ]);

    if (!course) {
      throw new NotFoundException('Học phần không tồn tại');
    }
    if (!chemical) {
      throw new NotFoundException('Hóa chất không tồn tại');
    }

    return this.prisma.chemicalLimit.create({
      data: dto,
      include: {
        course: { select: { id: true, name: true, code: true } },
        chemical: {
          select: { id: true, name: true, formula: true, unit: true },
        },
      },
    });
  }

  async findAll(filters?: { course_id?: number; chemical_id?: number }) {
    const where: any = {};
    if (filters?.course_id) where.course_id = filters.course_id;
    if (filters?.chemical_id) where.chemical_id = filters.chemical_id;

    return this.prisma.chemicalLimit.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, code: true } },
        chemical: {
          select: { id: true, name: true, formula: true, unit: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const limit = await this.prisma.chemicalLimit.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        chemical: {
          select: { id: true, name: true, formula: true, unit: true },
        },
      },
    });

    if (!limit) {
      throw new NotFoundException('Định mức không tồn tại');
    }

    return limit;
  }

  async update(id: number, dto: UpdateChemicalLimitDto) {
    const limit = await this.prisma.chemicalLimit.findUnique({ where: { id } });
    if (!limit) {
      throw new NotFoundException('Định mức không tồn tại');
    }

    return this.prisma.chemicalLimit.update({
      where: { id },
      data: dto,
      include: {
        course: { select: { id: true, name: true, code: true } },
        chemical: {
          select: { id: true, name: true, formula: true, unit: true },
        },
      },
    });
  }

  async remove(id: number) {
    const limit = await this.prisma.chemicalLimit.findUnique({ where: { id } });
    if (!limit) {
      throw new NotFoundException('Định mức không tồn tại');
    }

    return this.prisma.chemicalLimit.delete({ where: { id } });
  }

  async checkLimit(
    courseId: number,
    chemicalId: number,
    quantity: number,
  ): Promise<{
    allowed: boolean;
    limit?: number;
    used?: number;
    remaining?: number;
  }> {
    const limit = await this.prisma.chemicalLimit.findUnique({
      where: {
        course_id_chemical_id: {
          course_id: courseId,
          chemical_id: chemicalId,
        },
      },
    });

    if (!limit) {
      // No limit set, allow by default
      return { allowed: true };
    }

    // Calculate used quantity for this course+chemical
    const usedResult = await this.prisma.chemicalUsage.aggregate({
      where: { course_id: courseId, chemical_id: chemicalId },
      _sum: { quantity_used: true },
    });

    const used = usedResult._sum.quantity_used || 0;
    const remaining = limit.max_quantity - used;

    return {
      allowed: remaining >= quantity,
      limit: limit.max_quantity,
      used,
      remaining,
    };
  }

  async getUsageStats(courseId: number) {
    const limits = await this.prisma.chemicalLimit.findMany({
      where: { course_id: courseId },
      include: {
        chemical: {
          select: { id: true, name: true, formula: true, unit: true },
        },
      },
    });

    const stats = await Promise.all(
      limits.map(async (limit) => {
        const usedResult = await this.prisma.chemicalUsage.aggregate({
          where: { course_id: courseId, chemical_id: limit.chemical_id },
          _sum: { quantity_used: true },
        });

        const used = usedResult._sum.quantity_used || 0;
        return {
          chemical: limit.chemical,
          max_quantity: limit.max_quantity,
          unit: limit.unit,
          used,
          remaining: limit.max_quantity - used,
          percentage: (used / limit.max_quantity) * 100,
        };
      }),
    );

    return stats;
  }
}
