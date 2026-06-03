import { UserPayload } from '../../auth/interfaces/user-payload.interface';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IsAuthorGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<import('express').Request>();
    const commentId = parseInt(request.params.id as string, 10);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = (request as any).user as UserPayload; // Set by JwtAuthGuard

    if (!commentId || !user) {
      return false;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Bình luận không tồn tại.');
    }

    // ADMIN or TECHNICIAN can delete any comment
    if (user.role === 'ADMIN' || user.role === 'TECHNICIAN') {
      return true;
    }

    // Author can delete their own comment
    if (comment.user_id === user.userId) {
      return true;
    }

    throw new ForbiddenException(
      'Bạn không có quyền chỉnh sửa bình luận của người khác (Lỗi BOLA/IDOR bị từ chối).',
    );
  }
}
