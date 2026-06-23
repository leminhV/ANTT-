import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class CombosService {
  constructor(
    private prisma: PrismaService,
    private bookingsService: BookingsService,
  ) {}

  async createCombo(data: {
    name: string;
    description?: string;
    image_url?: string;
    items: { equipment_name: string; quantity: number }[];
  }) {
    return this.prisma.equipmentCombo.create({
      data: {
        name: data.name,
        description: data.description,
        image_url: data.image_url,
        items: {
          create: data.items,
        },
      },
      include: { items: true },
    });
  }

  async findAll() {
    return this.prisma.equipmentCombo.findMany({
      include: { items: true },
    });
  }

  async findOne(id: number) {
    const combo = await this.prisma.equipmentCombo.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!combo) throw new NotFoundException('Combo không tồn tại');
    return combo;
  }

  async remove(id: number) {
    return this.prisma.equipmentCombo.delete({ where: { id } });
  }

  async update(
    id: number,
    data: { name?: string; description?: string; image_url?: string },
  ) {
    const combo = await this.prisma.equipmentCombo.findUnique({
      where: { id },
    });
    if (!combo) throw new NotFoundException('Combo không tồn tại');

    return this.prisma.equipmentCombo.update({
      where: { id },
      data: {
        name: data.name ?? combo.name,
        description: data.description ?? combo.description,
        image_url: data.image_url ?? combo.image_url,
      },
      include: { items: true },
    });
  }

  async bookCombo(
    comboId: number,
    data: {
      room_id: number;
      start_time: string;
      end_time: string;
      purpose: string;
      course_id?: number;
    },
    user: any,
  ) {
    const combo = await this.findOne(comboId);
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);

    const equipmentsToBook: number[] = [];

    // Tìm thiết bị rảnh
    for (const item of combo.items) {
      // Dùng Prisma raw query để tìm các thiết bị khả dụng
      const availableEqs = await this.prisma.$queryRaw<any[]>`
        SELECT e.id FROM equipment e
        WHERE e.name = ${item.equipment_name} 
        AND e.status = 'AVAILABLE' 
        AND e.is_deleted = false
        AND e.id NOT IN (
          SELECT b.equipment_id FROM bookings b 
          WHERE b.equipment_id IS NOT NULL 
          AND b.status IN ('PENDING', 'APPROVED', 'IN_USE')
          AND b.start_time < ${endTime} AND b.end_time > ${startTime}
          AND b.is_deleted = false
        )
        LIMIT ${item.quantity}
      `;

      if (availableEqs.length < item.quantity) {
        throw new BadRequestException(
          `Không đủ số lượng thiết bị "${item.equipment_name}" trong kho cho khoảng thời gian này`,
        );
      }

      availableEqs.forEach((eq) => equipmentsToBook.push(eq.id));
    }

    const bookings = [];
    // Tạo từng đơn thông qua BookingsService để kế thừa toàn bộ logic (Auto Approve, Trust Score...)
    for (const eqId of equipmentsToBook) {
      const newBooking = await this.bookingsService.create(
        {
          room_id: data.room_id,
          equipment_id: eqId,
          start_time: data.start_time,
          end_time: data.end_time,
          purpose: data.purpose + ` (Combo: ${combo.name})`,
          course_id: data.course_id,
        },
        user,
      );
      bookings.push(newBooking);
    }

    return bookings;
  }
}
