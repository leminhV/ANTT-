import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createCommentDto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        user_id: userId,
        report_id: createCommentDto.reportId,
        booking_id: createCommentDto.bookingId,
        equipment_id: createCommentDto.equipmentId,
        parent_id: createCommentDto.parentId,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar_url: true, role: true },
        },
      },
    });
  }

  async findAllByEntity(
    reportId?: number,
    bookingId?: number,
    equipmentId?: number,
  ) {
    // Only return top-level comments (parent_id: null)
    // The replies will be loaded via Prisma relations
    return this.prisma.comment.findMany({
      where: {
        report_id: reportId || undefined,
        booking_id: bookingId || undefined,
        equipment_id: equipmentId || undefined,
        parent_id: null,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar_url: true, role: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, avatar_url: true, role: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async remove(id: number) {
    // IsAuthorGuard already verified that the comment exists and the user has permission to delete it.
    return this.prisma.comment.delete({ where: { id } });
  }
}
