import { UserPayload } from '../auth/interfaces/user-payload.interface';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';
import { checkOwnership } from '../common/utils/ownership.util';
import { SettingsService } from '../settings/settings.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createBookingDto: CreateBookingDto, userId: number) {
    const { start_time, end_time, room_id, equipment_id, course_id, purpose } =
      createBookingDto;

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    // 1. Validate times
    if (new Date(end_time) <= new Date(start_time)) {
      throw new ConflictException(
        I18nContext.current()?.t('messages.errors.TIME_INVALID') ||
          'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
      );
    }

    if (new Date(start_time) < new Date()) {
      throw new BadRequestException(
        I18nContext.current()?.t('messages.errors.PAST_TIME_NOT_ALLOWED') ||
          'Không thể đặt lịch trong quá khứ',
      );
    }

    const bookingStartHour = startTime.getHours();
    const bookingEndHour = endTime.getHours();

    const startHourLimit = parseInt(
      await this.settingsService.get('BOOKING_START_HOUR', '7'),
      10,
    );
    const endHourLimit = parseInt(
      await this.settingsService.get('BOOKING_END_HOUR', '22'),
      10,
    );
    const maintenanceMode = await this.settingsService.get(
      'MAINTENANCE_MODE',
      'false',
    );
    const minBookingMinutes = parseInt(
      await this.settingsService.get('MIN_BOOKING_MINUTES', '30'),
      10,
    );
    const maxBookingMinutes = parseInt(
      await this.settingsService.get('MAX_BOOKING_MINUTES', '240'),
      10,
    );
    const bufferMinutes = parseInt(
      await this.settingsService.get('BOOKING_BUFFER_MINUTES', '15'),
      10,
    );

    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (durationMinutes < minBookingMinutes) {
      throw new BadRequestException(
        I18nContext.current()?.t('messages.errors.DURATION_TOO_SHORT', {
          args: { min: minBookingMinutes },
        }) || `Thời lượng đặt phòng tối thiểu là ${minBookingMinutes} phút`,
      );
    }
    if (durationMinutes > maxBookingMinutes) {
      throw new BadRequestException(
        I18nContext.current()?.t('messages.errors.DURATION_TOO_LONG', {
          args: { max: maxBookingMinutes },
        }) || `Thời lượng đặt phòng tối đa là ${maxBookingMinutes} phút`,
      );
    }

    const startWithBuffer = new Date(
      startTime.getTime() - bufferMinutes * 60000,
    );
    const endWithBuffer = new Date(endTime.getTime() + bufferMinutes * 60000);

    if (maintenanceMode === 'true') {
      throw new BadRequestException(
        I18nContext.current()?.t('messages.errors.MAINTENANCE_MODE') ||
          'Hệ thống đang bảo trì, không thể đặt phòng lúc này',
      );
    }

    // 2. Khung giờ cấu hình
    if (bookingStartHour < startHourLimit || bookingEndHour > endHourLimit) {
      throw new BadRequestException(
        I18nContext.current()?.t('messages.errors.OUT_OF_HOURS', {
          args: { startHourLimit, endHourLimit },
        }) ||
          `Chỉ được đặt lịch trong khung giờ từ ${startHourLimit}:00 đến ${endHourLimit}:00`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // -----------------------------------------------------------------------
      // 🛡️ BẢO MẬT & ĐỒNG BỘ: PESSIMISTIC LOCKING (Khóa Bi Quan)
      // -----------------------------------------------------------------------
      // Giải thích cho Đồ án: Đây là kỹ thuật cực kỳ quan trọng (Chống Double-Booking).
      // Khi hàng chục sinh viên cùng ấn đặt 1 phòng trong 1 giây, nếu chỉ dùng lệnh
      // SELECT bình thường (Race Condition), hệ thống có thể duyệt cho cả 10 người.
      // Dùng 'FOR UPDATE', Database (MySQL) sẽ xếp hàng các lượt truy cập.
      // Yêu cầu thứ 2 phải chờ yêu cầu thứ 1 xử lý xong mới được chạy tiếp.
      await tx.$executeRaw`SELECT id FROM rooms WHERE id = ${room_id} FOR UPDATE`;

      if (equipment_id) {
        // Pessimistic Locking: Khóa Equipment để ngăn Race Condition cho thiết bị
        await tx.$executeRaw`SELECT id FROM equipment WHERE id = ${equipment_id} FOR UPDATE`;
      }

      // 4. Kiểm tra giới hạn 3 lần / ngày
      const startOfDay = new Date(startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startTime);
      endOfDay.setHours(23, 59, 59, 999);

      const userBookingsToday = await tx.booking.count({
        where: {
          user_id: userId,
          start_time: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['CANCELED', 'REJECTED'] },
        },
      });

      const maxBookings = parseInt(
        await this.settingsService.get('MAX_BOOKINGS_PER_DAY', '3'),
        10,
      );

      if (userBookingsToday >= maxBookings) {
        throw new ConflictException(
          I18nContext.current()?.t('messages.errors.MAX_BOOKINGS_EXCEEDED', {
            args: { maxBookings },
          }) ||
            `Sinh viên chỉ được tạo tối đa ${maxBookings} Booking trong cùng 1 ngày`,
        );
      }

      // 5. Kiểm tra đụng độ lịch phòng
      const roomConflict = await tx.booking.findFirst({
        where: {
          room_id,
          status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
          start_time: { lt: endWithBuffer },
          end_time: { gt: startWithBuffer },
        },
      });

      if (roomConflict) {
        const isRealConflict =
          roomConflict.start_time < endTime &&
          roomConflict.end_time > startTime;
        if (isRealConflict) {
          throw new ConflictException(
            I18nContext.current()?.t('messages.errors.ROOM_CONFLICT') ||
              'Phòng Lab đã được đặt trong khoảng thời gian này',
          );
        } else {
          throw new ConflictException(
            I18nContext.current()?.t('messages.errors.BUFFER_TIME_REQUIRED', {
              args: { buffer: bufferMinutes },
            }) ||
              `Cần ít nhất ${bufferMinutes} phút trống giữa 2 ca để dọn dẹp`,
          );
        }
      }

      // 6. Kiểm tra thiết bị
      if (equipment_id) {
        const equipment = await tx.equipment.findUnique({
          where: { id: equipment_id },
        });
        if (!equipment)
          throw new NotFoundException(
            I18nContext.current()?.t('messages.errors.NOT_FOUND') ||
              'Thiết bị không tồn tại',
          );

        if (
          equipment.status === 'MAINTENANCE' ||
          equipment.status === 'BROKEN'
        ) {
          throw new ConflictException(
            I18nContext.current()?.t('messages.errors.EQUIPMENT_UNAVAILABLE', {
              args: { status: equipment.status },
            }) ||
              `Thiết bị đang ở trạng thái ${equipment.status} không thể đặt`,
          );
        }

        const equipmentConflict = await tx.booking.findFirst({
          where: {
            equipment_id,
            status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
            start_time: { lt: endWithBuffer },
            end_time: { gt: startWithBuffer },
          },
        });

        if (equipmentConflict) {
          const isRealConflict =
            equipmentConflict.start_time < endTime &&
            equipmentConflict.end_time > startTime;
          if (isRealConflict) {
            throw new ConflictException(
              I18nContext.current()?.t('messages.errors.EQUIPMENT_CONFLICT') ||
                'Thiết bị đã được đặt trong khoảng thời gian này',
            );
          } else {
            throw new ConflictException(
              I18nContext.current()?.t('messages.errors.BUFFER_TIME_REQUIRED', {
                args: { buffer: bufferMinutes },
              }) ||
                `Cần ít nhất ${bufferMinutes} phút trống giữa 2 ca để dọn dẹp`,
            );
          }
        }
      }

      return tx.booking.create({
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

  async findMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { user_id: userId },
      include: {
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async approveAllPending() {
    const pendings = await this.prisma.booking.findMany({
      where: { status: 'PENDING' },
    });
    const result = await this.prisma.booking.updateMany({
      where: { status: 'PENDING' },
      data: {
        status: 'APPROVED',
        row_version: { increment: 1 },
      },
    });

    for (const booking of pendings) {
      this.notificationsGateway.sendNotificationToUser(
        booking.user_id,
        'Phê duyệt hàng loạt',
        `Đơn đặt phòng #${booking.id} của bạn đã được phê duyệt.`,
        'success',
      );
    }

    return result;
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
      throw new NotFoundException(
        I18nContext.current()?.t('messages.errors.BOOKING_NOT_FOUND', {
          args: { id },
        }) || `Lịch đặt với ID ${id} không tồn tại`,
      );
    }

    return booking;
  }

  async findOneSecure(id: number, currentUser: UserPayload) {
    const booking = await this.findOne(id);
    checkOwnership(booking.user_id, currentUser);
    return booking;
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    await this.findOne(id); // Check exists

    const { start_time, end_time, row_version, ...rest } = updateBookingDto;

    const result = await this.prisma.booking.update({
      where: {
        id,
        ...(row_version !== undefined && { row_version }),
      },
      data: {
        ...rest,
        ...(start_time && { start_time: new Date(start_time) }),
        ...(end_time && { end_time: new Date(end_time) }),
        row_version: { increment: 1 },
      },
    });

    // Bắn thông báo nếu có đổi status thành APPROVED hoặc REJECTED
    if (
      updateBookingDto.status &&
      ['APPROVED', 'REJECTED'].includes(updateBookingDto.status)
    ) {
      const statusVi =
        updateBookingDto.status === 'APPROVED' ? 'phê duyệt' : 'từ chối';
      const type = updateBookingDto.status === 'APPROVED' ? 'success' : 'error';
      this.notificationsGateway.sendNotificationToUser(
        result.user_id,
        `Cập nhật Đơn đặt phòng #${result.id}`,
        `Đơn đặt phòng của bạn đã bị ${statusVi} bởi Quản trị viên.`,
        type,
      );
    }

    return result;
  }

  async cancelBooking(id: number, userId: number) {
    const booking = await this.findOne(id);
    if (booking.user_id !== userId) {
      throw new ConflictException(
        I18nContext.current()?.t('messages.errors.UNAUTHORIZED_CANCEL') ||
          'Bạn không có quyền hủy đơn này',
      );
    }
    if (['COMPLETED', 'CANCELED', 'REJECTED'].includes(booking.status)) {
      throw new BadRequestException(
        I18nContext.current()?.t('messages.errors.INVALID_STATUS_CANCEL') ||
          'Không thể hủy đơn ở trạng thái này',
      );
    }
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELED',
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
