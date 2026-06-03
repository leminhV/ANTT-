import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateChemicalDto } from './dto/create-chemical.dto';
import { UpdateChemicalDto } from './dto/update-chemical.dto';
import { RecordUsageDto } from './dto/record-usage.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChemicalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChemicalDto: CreateChemicalDto) {
    const { expiration_date, ...rest } = createChemicalDto;
    return this.prisma.chemical.create({
      data: {
        ...rest,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.chemical.findMany();
  }

  async recordUsage(recordUsageDto: RecordUsageDto) {
    const { chemicalId, amountUsed, bookingId } = recordUsageDto;

    if (!bookingId) {
      throw new BadRequestException(
        'Vui lòng cung cấp bookingId để lưu lịch sử hóa chất',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy lịch đặt');
    }

    const chemical = await this.prisma.chemical.findUnique({
      where: { id: chemicalId },
    });
    if (!chemical) {
      throw new NotFoundException(
        `Hóa chất với ID ${chemicalId} không tồn tại`,
      );
    }

    if (chemical.quantity_stock < amountUsed) {
      throw new BadRequestException('Số lượng hóa chất trong kho không đủ');
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.chemical.update({
        where: { id: chemicalId },
        data: { quantity_stock: { decrement: amountUsed } },
      });

      return prisma.chemicalUsage.create({
        data: {
          chemical_id: chemicalId,
          quantity_used: amountUsed,
          booking_id: bookingId,
        },
      });
    });
  }

  async getUsageHistory(chemicalId?: number) {
    return this.prisma.chemicalUsage.findMany({
      where: chemicalId ? { chemical_id: chemicalId } : undefined,
      include: {
        chemical: { select: { name: true, unit: true } },
        booking: {
          select: { id: true, purpose: true, user: { select: { name: true } } },
        },
      },
      orderBy: { used_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const chemical = await this.prisma.chemical.findUnique({
      where: { id },
      include: {
        usages: true,
      },
    });

    if (!chemical) {
      throw new NotFoundException(`Hóa chất với ID ${id} không tồn tại`);
    }

    return chemical;
  }

  async update(id: number, updateChemicalDto: UpdateChemicalDto) {
    await this.findOne(id);

    const { expiration_date, ...rest } = updateChemicalDto;

    return this.prisma.chemical.update({
      where: { id },
      data: {
        ...rest,
        ...(expiration_date !== undefined && {
          expiration_date: expiration_date ? new Date(expiration_date) : null,
        }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.chemical.delete({
      where: { id },
    });
  }
}
