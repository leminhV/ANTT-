import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { UpdateCheckInDto } from './dto/update-check-in.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CheckInService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCheckInDto: CreateCheckInDto, userId: number) {
    const { check_in, ...rest } = createCheckInDto;
    return (this.prisma as any).checkInRecord.create({
      data: {
        ...rest,
        user_id: userId,
        ...(check_in && { check_in: new Date(check_in) }),
      },
    });
  }

  async findAll() {
    return (this.prisma as any).checkInRecord.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        booking: { select: { id: true, purpose: true } },
      },
      orderBy: { check_in: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await (this.prisma as any).checkInRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        booking: { select: { id: true, purpose: true } },
      },
    });

    if (!record) {
      throw new NotFoundException(`Bản ghi Check-in với ID ${id} không tồn tại`);
    }

    return record;
  }

  async update(id: number, updateCheckInDto: UpdateCheckInDto) {
    await this.findOne(id);

    const { check_in, check_out, ...rest } = updateCheckInDto;

    return (this.prisma as any).checkInRecord.update({
      where: { id },
      data: {
        ...rest,
        ...(check_in && { check_in: new Date(check_in) }),
        ...(check_out && { check_out: new Date(check_out) }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return (this.prisma as any).checkInRecord.delete({
      where: { id },
    });
  }
}
