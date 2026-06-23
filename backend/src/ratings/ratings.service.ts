import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateRatingDto) {
    if (!dto.equipment_id && !dto.room_id) {
      throw new BadRequestException(
        'Phải đánh giá ít nhất 1 thiết bị hoặc phòng',
      );
    }

    return this.prisma.rating.create({
      data: {
        score: dto.score,
        comment: dto.comment,
        user_id: userId,
        equipment_id: dto.equipment_id,
        room_id: dto.room_id,
      },
      include: {
        user: { select: { id: true, name: true, avatar_url: true } },
      },
    });
  }

  async findAll(equipmentId?: number, roomId?: number) {
    const where: any = {};
    if (equipmentId) where.equipment_id = equipmentId;
    if (roomId) where.room_id = roomId;

    return this.prisma.rating.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar_url: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAverageScore(equipmentId?: number, roomId?: number) {
    const where: any = {};
    if (equipmentId) where.equipment_id = equipmentId;
    if (roomId) where.room_id = roomId;

    const result = await this.prisma.rating.aggregate({
      _avg: { score: true },
      _count: { id: true },
      where,
    });

    return {
      average: result._avg.score || 0,
      count: result._count.id,
    };
  }
}
