import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillBadgeDto, AssignBadgeDto } from './dto/skill-badge.dto';

@Injectable()
export class SkillBadgesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSkillBadgeDto) {
    return this.prisma.skillBadge.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.skillBadge.findMany();
  }

  async findMyBadges(userId: number) {
    return this.prisma.userSkillBadge.findMany({
      where: { user_id: userId },
      include: { badge: true },
      orderBy: { issued_at: 'desc' },
    });
  }

  async assign(dto: AssignBadgeDto) {
    const existing = await this.prisma.userSkillBadge.findUnique({
      where: {
        user_id_badge_id: {
          user_id: dto.user_id,
          badge_id: dto.badge_id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Sinh viên này đã có chứng chỉ này rồi.');
    }

    return this.prisma.userSkillBadge.create({
      data: {
        user_id: dto.user_id,
        badge_id: dto.badge_id,
      },
      include: { badge: true },
    });
  }
}
