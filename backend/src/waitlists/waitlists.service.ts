import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaitlistDto } from './dto/waitlist.dto';

@Injectable()
export class WaitlistsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateWaitlistDto) {
    if (!dto.equipment_id && !dto.room_id) {
      throw new BadRequestException(
        'Vui lòng chọn thiết bị hoặc phòng để đăng ký nhận thông báo',
      );
    }

    // Check existing
    const existing = await this.prisma.waitlist.findFirst({
      where: {
        user_id: userId,
        equipment_id: dto.equipment_id,
        room_id: dto.room_id,
        is_notified: false,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Bạn đã đăng ký nhận thông báo cho tài nguyên này rồi.',
      );
    }

    return this.prisma.waitlist.create({
      data: {
        user_id: userId,
        equipment_id: dto.equipment_id,
        room_id: dto.room_id,
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.waitlist.findMany({
      where: { user_id: userId },
      include: {
        equipment: { select: { id: true, name: true, image_url: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.waitlist.deleteMany({
      where: { id, user_id: userId },
    });
  }
}
