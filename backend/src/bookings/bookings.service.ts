import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto, userId: number) {
    const { start_time, end_time, room_id, equipment_id, course_id, purpose } = createBookingDto;
    
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    // Validate times
    if (startTime >= endTime) {
      throw new ConflictException('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
    }

    // Check conflict
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        room_id,
        status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
        OR: [
          {
            start_time: { lt: endTime },
            end_time: { gt: startTime },
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      throw new ConflictException('Phòng Lab đã được đặt trong khoảng thời gian này');
    }

    if (equipment_id) {
      const equipmentConflict = await this.prisma.booking.findMany({
        where: {
          equipment_id,
          status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
          OR: [
            {
              start_time: { lt: endTime },
              end_time: { gt: startTime },
            },
          ],
        },
      });

      if (equipmentConflict.length > 0) {
        throw new ConflictException('Thiết bị đã được đặt trong khoảng thời gian này');
      }
    }

    return this.prisma.booking.create({
      data: {
        user_id: userId,
        room_id,
        equipment_id: equipment_id || null,
        course_id: course_id || null,
        start_time: startTime,
        end_time: endTime,
        purpose,
        status: 'PENDING',
      },
    });
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking với ID ${id} không tồn tại`);
    }

    return booking;
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    await this.findOne(id); // Check exists

    const { start_time, end_time, ...rest } = updateBookingDto;

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...rest,
        ...(start_time && { start_time: new Date(start_time) }),
        ...(end_time && { end_time: new Date(end_time) }),
        row_version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.booking.delete({
      where: { id },
    });
  }
}
