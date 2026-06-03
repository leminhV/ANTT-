import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.course.findMany({
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

  async create(data: { code: string; name: string; instructor_id: number }) {
    return this.prisma.course.create({ data });
  }

  async update(
    id: number,
    data: { code?: string; name?: string; instructor_id?: number },
  ) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.course.delete({
      where: { id },
    });
  }
}
