import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, CreateCommentDto } from './dto/community.dto';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: number, dto: CreatePostDto) {
    return this.prisma.communityPost.create({
      data: {
        title: dto.title,
        content: dto.content,
        author_id: userId,
        equipment_id: dto.equipment_id,
      },
    });
  }

  async findAllPosts() {
    return this.prisma.communityPost.findMany({
      include: {
        author: { select: { id: true, name: true, avatar_url: true } },
        equipment: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findPostById(id: number) {
    await this.prisma.communityPost.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar_url: true } },
        equipment: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatar_url: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  async createComment(userId: number, postId: number, dto: CreateCommentDto) {
    return this.prisma.communityComment.create({
      data: {
        content: dto.content,
        author_id: userId,
        post_id: postId,
      },
    });
  }
}
