import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.course.findMany({
      where: { is_deleted: false },
      include: {
        instructor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: {
    code: string;
    name: string;
    instructor_id: number;
    semester?: string;
    academic_year?: string;
  }) {
    return this.prisma.course.create({ data });
  }

  async update(
    id: number,
    data: {
      code?: string;
      name?: string;
      instructor_id?: number;
      semester?: string;
      academic_year?: string;
    },
    user: any,
  ) {
    const course = await this.findOne(id);

    if (user.role === 'INSTRUCTOR' && course.instructor_id !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể chỉnh sửa học phần do mình phụ trách',
      );
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data,
    });

    if (user.role === 'INSTRUCTOR') {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
      });
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        title: 'Học phần đã được cập nhật',
        message: `Giảng viên ${user.name} đã cập nhật thông tin học phần "${course.name}" (${course.code}).`,
        type: 'info',
      }));
      if (notifications.length > 0) {
        await this.prisma.notification.createMany({ data: notifications });
      }
    }

    return updated;
  }

  async requestDelete(id: number, user: any, reason: string) {
    const course = await this.findOne(id);
    if (course.instructor_id !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể yêu cầu xóa học phần do mình phụ trách',
      );
    }

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: 'Yêu cầu xóa học phần',
      message: `Giảng viên ${user.name} yêu cầu xóa học phần "${course.name}" (${course.code}).\nLý do: ${reason}`,
      type: 'warning',
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }

    return { message: 'Yêu cầu xóa đã được gửi đến Admin' };
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data: { is_deleted: true },
    });
  }
}
