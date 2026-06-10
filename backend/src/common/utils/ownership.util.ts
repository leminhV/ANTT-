import { UserPayload } from '../../auth/interfaces/user-payload.interface';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

export function checkOwnership(
  resourceUserId: number,
  currentUser: UserPayload,
) {
  // -----------------------------------------------------------------------
  // 🛡️ BẢO MẬT: CHỐNG LỖ HỔNG IDOR (Insecure Direct Object Reference)
  // -----------------------------------------------------------------------
  // Giải thích cho Đồ án: Lỗ hổng IDOR xảy ra khi hacker (Sinh viên A) cố ý thay đổi
  // ID trên đường dẫn API (VD: /api/bookings/15) để can thiệp vào đơn của Sinh viên B.
  // Hàm này là một chốt chặn bảo mật (Security Checkpoint) bắt buộc gọi trước mỗi
  // thao tác UPDATE/DELETE. Nó so sánh 'userId của người tạo đơn' và 'userId trong Token'.
  // Nếu không khớp và không phải Admin, hệ thống đá văng ra ngay (Lỗi 403 Forbidden).

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
