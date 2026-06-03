import { UserPayload } from '../../auth/interfaces/user-payload.interface';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

export function checkOwnership(
  resourceUserId: number,
  currentUser: UserPayload,
) {
  // Admin, Technician, Instructor có thể xem/sửa dữ liệu của bất kỳ ai
  const privilegedRoles: Role[] = [
    Role.ADMIN,
    Role.TECHNICIAN,
    Role.INSTRUCTOR,
  ];

  if (!privilegedRoles.includes(currentUser.role)) {
    // Nếu là STUDENT, id sở hữu phải trùng khớp với userId của request
    if (resourceUserId !== currentUser.userId) {
      throw new ForbiddenException(
        '403 - Access Denied: Bạn không có quyền truy cập hoặc thao tác trên dữ liệu của người khác.',
      );
    }
  }
}
