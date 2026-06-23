import { UserPayload } from '../auth/interfaces/user-payload.interface';
import { Prisma } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';
import { checkOwnership } from '../common/utils/ownership.util';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { ExcelService } from '../common/excel/excel.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly excelService: ExcelService,
  ) {}

  async create(createBookingDto: CreateBookingDto, userId: number) {
    const {
      start_time,
      end_time,
      room_id,
      equipment_id,
      course_id,
      purpose,
      chemical_usages,
    } = createBookingDto;

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    // 1. Lấy thông tin user và kiểm tra Điểm uy tín
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    if (user.trust_score < 50) {
      throw new BadRequestException(
        'Điểm uy tín của bạn dưới 50, bạn tạm thời bị cấm mượn thiết bị/phòng Lab. Vui lòng liên hệ Admin.',
      );
    }

    // 2. Validate times
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

    // 🛡️ BẢO MẬT: ENCRYPTION AT REST (Mã hóa CSDL)
    // Di chuyển ra ngoài transaction để tối ưu hiệu năng
    const encryptedPurpose = EncryptionUtil.encrypt(purpose);

    const result = await this.prisma.$transaction(async (tx) => {
      // 🛡️ BẢO MẬT & ĐỒNG BỘ: PESSIMISTIC LOCKING
      await tx.$executeRaw`SELECT id FROM rooms WHERE id = ${room_id} FOR UPDATE`;
      if (equipment_id) {
        await tx.$executeRaw`SELECT id FROM equipment WHERE id = ${equipment_id} FOR UPDATE`;
      }

      // Kiểm tra giới hạn 3 lần / ngày
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

      const intendedStatus = createBookingDto.status || 'PENDING';

      const isResourceBooking = !!(
        equipment_id != null ||
        (chemical_usages && chemical_usages.length > 0)
      );

      // 3. Xử lý lặp lại đặt phòng (Recurring Booking)
      const bookingsToCreate: any[] = [];
      const currentStartTime = new Date(startTime);
      const currentEndTime = new Date(endTime);

      let recurrenceEnd = new Date(startTime);
      if (createBookingDto.recurrenceEndDate) {
        recurrenceEnd = new Date(createBookingDto.recurrenceEndDate);
        recurrenceEnd.setHours(23, 59, 59, 999);
      }

      // Vòng lặp để tạo mảng các đơn (cách nhau 7 ngày)
      while (currentStartTime <= recurrenceEnd) {
        // Kiểm tra overlap cho TỪNG tuần
        const { roomConflict, eqConflict } = await this.checkOverlap(
          tx,
          room_id,
          equipment_id || null,
          currentStartTime,
          currentEndTime,
          bufferMinutes,
          intendedStatus,
          isResourceBooking,
        );

        if ((roomConflict || eqConflict) && intendedStatus !== 'WAITLISTED') {
          throw new ConflictException(
            I18nContext.current()?.t('messages.errors.ROOM_UNAVAILABLE') ||
              `Trùng lịch tại ngày ${currentStartTime.toLocaleDateString()}`,
          );
        }

        // 🛡️ BẢO MẬT: CHẶN USER TỰ DUYỆT ĐƠN
        // Auto-Approval Rule: Giảng viên (INSTRUCTOR) hoặc ADMIN luôn được tự động duyệt
        let finalStatus: any = 'PENDING';
        const isAutoApprove =
          user.role === 'INSTRUCTOR' || user.role === 'ADMIN';

        if (intendedStatus === 'WAITLISTED') {
          finalStatus = 'WAITLISTED';
          if (!roomConflict && (!equipment_id || !eqConflict)) {
            finalStatus = isAutoApprove ? 'APPROVED' : 'PENDING';
          }
        } else if (isAutoApprove) {
          finalStatus = 'APPROVED';
        }

        bookingsToCreate.push({
          user_id: userId,
          room_id,
          equipment_id: equipment_id || null,
          course_id: course_id || null,
          start_time: new Date(currentStartTime),
          end_time: new Date(currentEndTime),
          purpose: encryptedPurpose,
          status: finalStatus,
        });

        // Nhảy sang tuần tiếp theo (cộng 7 ngày)
        currentStartTime.setDate(currentStartTime.getDate() + 7);
        currentEndTime.setDate(currentEndTime.getDate() + 7);
      }

      const createdBookings = [];
      for (const bData of bookingsToCreate) {
        const newBooking = await tx.booking.create({ data: bData });
        createdBookings.push(newBooking);

        // Xử lý hóa chất cho TỪNG booking
        if (chemical_usages && chemical_usages.length > 0) {
          for (const cu of chemical_usages) {
            const chemicals = await tx.$queryRaw<
              any[]
            >`SELECT * FROM chemicals WHERE id = ${cu.chemical_id} FOR UPDATE`;
            if (!chemicals || chemicals.length === 0) {
              throw new BadRequestException(
                `Hóa chất ID ${cu.chemical_id} không tồn tại`,
              );
            }
            const chemical = chemicals[0];

            if (chemical.quantity_stock < cu.quantity) {
              throw new BadRequestException(
                `Hóa chất ${chemical.name} không đủ số lượng trong kho (còn ${chemical.quantity_stock})`,
              );
            }

            if (course_id) {
              const limits = await tx.$queryRaw<
                any[]
              >`SELECT max_quantity FROM chemical_limits WHERE course_id = ${course_id} AND chemical_id = ${cu.chemical_id}`;
              if (limits && limits.length > 0) {
                const pastUsages = await tx.chemicalUsage.aggregate({
                  _sum: { quantity_used: true },
                  where: { course_id, chemical_id: cu.chemical_id },
                });
                const used = pastUsages._sum.quantity_used || 0;
                if (used + cu.quantity > limits[0].max_quantity) {
                  throw new BadRequestException(
                    `Vượt quá định mức hóa chất cho phép của học phần (đã dùng ${used}, tối đa ${limits[0].max_quantity})`,
                  );
                }
              }
            }

            await tx.chemical.update({
              where: { id: cu.chemical_id },
              data: { quantity_stock: { decrement: cu.quantity } },
            });

            await tx.chemicalUsage.create({
              data: {
                booking_id: newBooking.id,
                chemical_id: cu.chemical_id,
                quantity_used: cu.quantity,
                course_id: course_id || null,
              },
            });
          }
        }
      }

      // Trả về booking đầu tiên đại diện
      return createdBookings[0];
    });

    // -----------------------------------------------------------------------
    // BẮN THÔNG BÁO CHO ADMIN KHI CÓ ĐƠN MỚI (CHẠY NGẦM)
    // -----------------------------------------------------------------------
    this.prisma.user
      .findMany({ where: { role: 'ADMIN' } })
      .then((admins) => {
        for (const admin of admins) {
          void this.notificationsService.createNotification(
            admin.id,
            'Đơn đặt phòng mới',
            `Có một đơn đặt phòng mới (ID: #${result.id}) đang chờ phê duyệt.`,
            'info',
          );
        }
      })
      .catch((err) => this.logger.error('Lỗi gửi thông báo cho Admin:', err));

    // Phát sự kiện để cập nhật lịch Real-time cho toàn bộ user
    this.notificationsService.broadcastCalendarUpdate();

    return result;
  }

  async findAll(
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 100,
  ) {
    const whereClause: Prisma.BookingWhereInput = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        whereClause.start_time = {
          gte: start,
          lte: end,
        };
      }
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        chemical_usages: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return bookings.map((b) => ({
      ...b,
      purpose: EncryptionUtil.decrypt(b.purpose),
    }));
  }

  async exportToExcel() {
    const bookings = await this.prisma.booking.findMany({
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { name: true } },
        equipment: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = bookings.map((b) => ({
      ID: b.id,
      'Người đặt': b.user.name,
      Email: b.user.email,
      'Phòng Lab': b.room.name,
      'Thiết bị': b.equipment ? b.equipment.name : 'Không có',
      'Thời gian bắt đầu': b.start_time.toLocaleString('vi-VN'),
      'Thời gian kết thúc': b.end_time.toLocaleString('vi-VN'),
      'Trạng thái': b.status,
      'Mục đích': EncryptionUtil.decrypt(b.purpose),
      'Ngày tạo': b.created_at.toLocaleString('vi-VN'),
    }));

    return this.excelService.exportToExcel(data, 'Bookings');
  }

  async findMyBookings(userId: number, page: number = 1, limit: number = 50) {
    const bookings = await this.prisma.booking.findMany({
      where: { user_id: userId },
      include: {
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        chemical_usages: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return bookings.map((b) => ({
      ...b,
      purpose: EncryptionUtil.decrypt(b.purpose),
    }));
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
      void this.notificationsService.createNotification(
        booking.user_id,
        'Phê duyệt hàng loạt',
        `Đơn đặt phòng #${booking.id} của bạn đã được phê duyệt.`,
        'success',
      );
    }

    // Phát sự kiện cập nhật lịch
    this.notificationsService.broadcastCalendarUpdate();

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
        chemical_usages: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        I18nContext.current()?.t('messages.errors.BOOKING_NOT_FOUND', {
          args: { id },
        }) || `Lịch đặt với ID ${id} không tồn tại`,
      );
    }

    return {
      ...booking,
      purpose: EncryptionUtil.decrypt(booking.purpose),
    };
  }

  async findOneSecure(id: number, currentUser: UserPayload) {
    const booking = await this.findOne(id);
    checkOwnership(booking.user_id, currentUser);
    return booking;
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const existingBooking = await this.findOne(id); // Check exists & get current state

    const {
      start_time,
      end_time,
      row_version,
      purpose,
      status,
      chemical_usages,
      ...rest
    } = updateBookingDto;

    const encryptedPurpose = purpose
      ? EncryptionUtil.encrypt(purpose)
      : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      // 🛡️ BẢO MẬT & ĐỒNG BỘ: PESSIMISTIC LOCKING
      // Chỉ lock và check overlap nếu update thời gian, status thành PENDING/APPROVED/IN_USE, hoặc đổi phòng/thiết bị
      const finalStartTime = start_time
        ? new Date(start_time)
        : existingBooking.start_time;
      const finalEndTime = end_time
        ? new Date(end_time)
        : existingBooking.end_time;
      const finalRoomId = rest.room_id || existingBooking.room_id;
      const finalEqId =
        rest.equipment_id !== undefined
          ? rest.equipment_id
          : existingBooking.equipment_id;
      const finalStatus = status || existingBooking.status;

      const needsOverlapCheck =
        (start_time ||
          end_time ||
          rest.room_id ||
          rest.equipment_id ||
          status) &&
        ['PENDING', 'APPROVED', 'IN_USE'].includes(finalStatus);

      if (needsOverlapCheck) {
        await tx.$executeRaw`SELECT id FROM rooms WHERE id = ${finalRoomId} FOR UPDATE`;
        if (finalEqId) {
          await tx.$executeRaw`SELECT id FROM equipment WHERE id = ${finalEqId} FOR UPDATE`;
        }

        const bufferMinutes = parseInt(
          await this.settingsService.get('BOOKING_BUFFER_MINUTES', '15'),
          10,
        );
        const existingChemicals = await tx.chemicalUsage.count({
          where: { booking_id: id },
        });
        const isResourceBooking = finalEqId != null || existingChemicals > 0;

        await this.checkOverlap(
          tx,
          finalRoomId,
          finalEqId,
          finalStartTime,
          finalEndTime,
          bufferMinutes,
          finalStatus,
          isResourceBooking,
          id, // Truyền ID để bỏ qua chính Booking đang update
        );
      }

      return tx.booking.update({
        where: {
          id,
          ...(row_version !== undefined && { row_version }),
        },
        data: {
          ...rest,
          status,
          ...(start_time && { start_time: new Date(start_time) }),
          ...(end_time && { end_time: new Date(end_time) }),
          ...(encryptedPurpose && { purpose: encryptedPurpose }),
          row_version: { increment: 1 },
        },
      });
    });

    // Bắn thông báo nếu có đổi status thành APPROVED hoặc REJECTED
    if (status && ['APPROVED', 'REJECTED'].includes(status)) {
      const statusVi = status === 'APPROVED' ? 'phê duyệt' : 'từ chối';
      const type = status === 'APPROVED' ? 'success' : 'error';
      void this.notificationsService.createNotification(
        result.user_id,
        `Cập nhật Đơn đặt phòng #${result.id}`,
        `Đơn đặt phòng của bạn đã bị ${statusVi} bởi Quản trị viên.`,
        type,
      );
    }

    // Phát sự kiện cập nhật lịch
    this.notificationsService.broadcastCalendarUpdate();

    // Tự động kiểm tra danh sách chờ nếu có đơn bị Hủy/Từ chối
    if (status && ['REJECTED', 'CANCELED'].includes(status)) {
      this.processWaitlist(result.room_id, result.equipment_id).catch((err) =>
        this.logger.error('Lỗi khi đôn lịch:', err),
      );
    }

    return result;
  }

  /**
   * Dời lịch (reschedule) - cho phép kéo thả trên Calendar
   * Student chỉ được dời đơn PENDING/APPROVED chưa bắt đầu
   * Admin/Instructor được dời bất kỳ đơn nào chưa hoàn thành
   */
  async reschedule(
    id: number,
    newStartTime: string,
    newEndTime: string,
    currentUser: UserPayload,
  ) {
    const booking = await this.findOne(id);

    // Kiểm tra quyền sở hữu cho Student
    if (currentUser.role === 'STUDENT') {
      if (booking.user_id !== currentUser.userId) {
        throw new ConflictException('Bạn không có quyền dời lịch đơn này');
      }
      if (!['PENDING', 'APPROVED'].includes(booking.status)) {
        throw new BadRequestException(
          'Chỉ được dời lịch đơn ở trạng thái Chờ duyệt hoặc Đã duyệt',
        );
      }
      if (new Date(booking.start_time) <= new Date()) {
        throw new BadRequestException('Không thể dời lịch đơn đã bắt đầu');
      }
    } else {
      // Admin/Instructor không được dời đơn đã kết thúc
      if (['COMPLETED', 'CANCELED', 'REJECTED'].includes(booking.status)) {
        throw new BadRequestException(
          'Không thể dời lịch đơn ở trạng thái này',
        );
      }
    }

    const startDate = new Date(newStartTime);
    const endDate = new Date(newEndTime);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
      );
    }
    if (startDate < new Date()) {
      throw new BadRequestException('Không thể dời lịch vào thời điểm đã qua');
    }

    // Sử dụng lại method update đã có sẵn logic overlap + pessimistic lock
    const result = await this.update(id, {
      start_time: newStartTime,
      end_time: newEndTime,
      row_version: booking.row_version,
    });

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
    const result = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELED',
        row_version: { increment: 1 },
      },
    });
    this.notificationsService.broadcastCalendarUpdate();

    // Đôn lịch
    this.processWaitlist(booking.room_id, booking.equipment_id).catch((err) =>
      this.logger.error('Lỗi khi đôn lịch:', err),
    );

    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    const result = await this.prisma.booking.update({
      where: { id },
      data: { is_deleted: true },
    });
    this.notificationsService.broadcastCalendarUpdate();
    return result;
  }

  private async checkOverlap(
    tx: Prisma.TransactionClient,
    room_id: number,
    equipment_id: number | null,
    startTime: Date,
    endTime: Date,
    bufferMinutes: number,
    intendedStatus: string,
    isResourceBooking: boolean,
    excludeBookingId?: number,
  ) {
    const startWithBuffer = new Date(
      startTime.getTime() - bufferMinutes * 60000,
    );
    const endWithBuffer = new Date(endTime.getTime() + bufferMinutes * 60000);

    const room = await tx.room.findUnique({ where: { id: room_id } });
    if (!room || room.is_deleted) {
      throw new BadRequestException('Phòng Lab không tồn tại hoặc đã bị xóa');
    }

    if (equipment_id) {
      const equipment = await tx.equipment.findUnique({
        where: { id: equipment_id },
      });
      if (!equipment || equipment.is_deleted) {
        throw new BadRequestException(
          'Thiết bị không tồn tại hoặc đã bị thanh lý',
        );
      }
    }

    // KIỂM TRA LỊCH BẢO TRÌ PHÒNG
    const maintenanceRoom = await tx.maintenanceSchedule.findFirst({
      where: {
        room_id,
        start_time: { lt: endWithBuffer },
        end_time: { gt: startWithBuffer },
      },
    });
    if (maintenanceRoom) {
      throw new ConflictException(
        `Phòng Lab đang trong thời gian bảo trì từ ${maintenanceRoom.start_time.toLocaleString('vi-VN')} đến ${maintenanceRoom.end_time.toLocaleString('vi-VN')}. Lý do: ${maintenanceRoom.description}`,
      );
    }

    // Kiểm tra đụng độ lịch phòng
    const roomWhere: Prisma.BookingWhereInput = {
      room_id,
      status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
      start_time: { lt: endWithBuffer },
      end_time: { gt: startWithBuffer },
    };
    if (excludeBookingId) roomWhere.id = { not: excludeBookingId };

    if (isResourceBooking) {
      roomWhere.equipment_id = null;
      roomWhere.chemical_usages = { none: {} };
    }

    const roomConflict = await tx.booking.findFirst({ where: roomWhere });

    if (roomConflict) {
      const isRealConflict =
        roomConflict.start_time < endTime && roomConflict.end_time > startTime;
      if (intendedStatus !== 'WAITLISTED') {
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
    }

    // KIỂM TRA LỊCH BẢO TRÌ THIẾT BỊ
    if (equipment_id) {
      const maintenanceEq = await tx.maintenanceSchedule.findFirst({
        where: {
          equipment_id,
          start_time: { lt: endWithBuffer },
          end_time: { gt: startWithBuffer },
        },
      });
      if (maintenanceEq) {
        throw new ConflictException(
          `Thiết bị đang trong thời gian bảo trì từ ${maintenanceEq.start_time.toLocaleString('vi-VN')} đến ${maintenanceEq.end_time.toLocaleString('vi-VN')}. Lý do: ${maintenanceEq.description}`,
        );
      }
    }

    // Kiểm tra thiết bị
    let eqConflict = null;
    if (equipment_id) {
      const equipment = await tx.equipment.findUnique({
        where: { id: equipment_id },
      });
      if (!equipment)
        throw new NotFoundException(
          I18nContext.current()?.t('messages.errors.NOT_FOUND') ||
            'Thiết bị không tồn tại',
        );
      if (equipment.status === 'MAINTENANCE' || equipment.status === 'BROKEN') {
        throw new ConflictException(
          I18nContext.current()?.t('messages.errors.EQUIPMENT_UNAVAILABLE', {
            args: { status: equipment.status },
          }) || `Thiết bị đang ở trạng thái ${equipment.status} không thể đặt`,
        );
      }

      const eqWhere: Prisma.BookingWhereInput = {
        equipment_id,
        status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
        start_time: { lt: endWithBuffer },
        end_time: { gt: startWithBuffer },
      };
      if (excludeBookingId) eqWhere.id = { not: excludeBookingId };

      eqConflict = await tx.booking.findFirst({ where: eqWhere });

      if (eqConflict) {
        const isRealConflict =
          eqConflict.start_time < endTime && eqConflict.end_time > startTime;
        if (intendedStatus !== 'WAITLISTED') {
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
    }

    return { roomConflict, eqConflict };
  }

  async suggestSlots(
    roomId: number,
    dateStr: string,
    durationMinutes: number,
    equipmentId: number | null = null,
  ) {
    const baseDate = new Date(dateStr);
    if (isNaN(baseDate.getTime())) {
      throw new BadRequestException('Ngày không hợp lệ');
    }

    const startHourLimit = parseInt(
      await this.settingsService.get('BOOKING_START_HOUR', '7'),
      10,
    );
    const endHourLimit = parseInt(
      await this.settingsService.get('BOOKING_END_HOUR', '22'),
      10,
    );
    const bufferMinutes = parseInt(
      await this.settingsService.get('BOOKING_BUFFER_MINUTES', '15'),
      10,
    );

    const suggestions: { start_time: string; end_time: string }[] = [];

    // Quét tối đa 3 ngày tiếp theo để tìm đủ 5 gợi ý trống
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      if (suggestions.length >= 5) break;

      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + dayOffset);

      const startOfDay = new Date(currentDate);
      startOfDay.setHours(startHourLimit, 0, 0, 0);

      const endOfDay = new Date(currentDate);
      endOfDay.setHours(endHourLimit, 0, 0, 0);

      // Nếu ngày hiện tại là ngày hôm nay, không gợi ý các giờ đã qua trong quá khứ
      const now = new Date();
      if (
        currentDate.toDateString() === now.toDateString() &&
        startOfDay < now
      ) {
        const minutes = now.getMinutes();
        let roundedMinutes = 0;
        if (minutes > 0 && minutes < 30) {
          roundedMinutes = 30;
        } else if (minutes > 30) {
          roundedMinutes = 60;
        } else {
          roundedMinutes = minutes;
        }
        startOfDay.setHours(now.getHours(), 0, 0, 0);
        startOfDay.setMinutes(roundedMinutes);
      }

      // Lấy danh sách booking bận của phòng/thiết bị
      const bookings = await this.prisma.booking.findMany({
        where: {
          OR: [
            { room_id: roomId },
            ...(equipmentId ? [{ equipment_id: equipmentId }] : []),
          ],
          status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
          start_time: { lt: endOfDay },
          end_time: { gt: startOfDay },
          is_deleted: false,
        },
        orderBy: { start_time: 'asc' },
      });

      // Tạo các khoảng bận (đã cộng thời gian đệm buffer)
      const busyIntervals = bookings.map((b) => ({
        start: new Date(b.start_time.getTime() - bufferMinutes * 60000),
        end: new Date(b.end_time.getTime() + bufferMinutes * 60000),
      }));

      // Hợp nhất các khoảng bận chồng lấn (Interval Merging)
      const mergedIntervals: { start: Date; end: Date }[] = [];
      if (busyIntervals.length > 0) {
        // Sắp xếp theo thời gian bắt đầu
        busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

        let current = { ...busyIntervals[0] };
        for (let i = 1; i < busyIntervals.length; i++) {
          const next = busyIntervals[i];
          if (next.start.getTime() <= current.end.getTime()) {
            // Có giao cắt hoặc chạm nhau, thực hiện hợp nhất bằng cách kéo dài mốc kết thúc
            if (next.end.getTime() > current.end.getTime()) {
              current.end = next.end;
            }
          } else {
            mergedIntervals.push(current);
            current = { ...next };
          }
        }
        mergedIntervals.push(current);
      }

      // Quét tìm khoảng trống (Complement Scan) bị chặn biên trong ngày [startOfDay, endOfDay]
      // Giải pháp này tự động cắt đứt khoảng bù khi qua nửa đêm bằng cách chỉ lấy khoảng bù giới hạn trong ngày
      const freeIntervals: { start: Date; end: Date }[] = [];
      if (mergedIntervals.length === 0) {
        // Không có lịch bận nào, toàn bộ thời gian trong ngày đều trống
        freeIntervals.push({ start: startOfDay, end: endOfDay });
      } else {
        // Khoảng trống trước lịch bận đầu tiên
        if (mergedIntervals[0].start.getTime() > startOfDay.getTime()) {
          freeIntervals.push({
            start: startOfDay,
            end: mergedIntervals[0].start,
          });
        }

        // Khoảng trống giữa các lịch bận
        for (let i = 0; i < mergedIntervals.length - 1; i++) {
          const currEnd = mergedIntervals[i].end;
          const nextStart = mergedIntervals[i + 1].start;
          if (currEnd.getTime() < nextStart.getTime()) {
            freeIntervals.push({ start: currEnd, end: nextStart });
          }
        }

        // Khoảng trống sau lịch bận cuối cùng
        const lastEnd = mergedIntervals[mergedIntervals.length - 1].end;
        if (lastEnd.getTime() < endOfDay.getTime()) {
          freeIntervals.push({ start: lastEnd, end: endOfDay });
        }
      }

      // Sinh mốc gợi ý từ các khoảng trống tìm được
      for (const free of freeIntervals) {
        if (suggestions.length >= 5) break;

        let currentStart = new Date(free.start);
        while (
          currentStart.getTime() + durationMinutes * 60000 <=
          free.end.getTime()
        ) {
          if (suggestions.length >= 5) break;

          suggestions.push({
            start_time: currentStart.toISOString(),
            end_time: new Date(
              currentStart.getTime() + durationMinutes * 60000,
            ).toISOString(),
          });

          // Tịnh tiến bước thời gian 30 phút để sinh thêm mốc gợi ý chi tiết
          currentStart = new Date(currentStart.getTime() + 30 * 60000);
        }
      }
    }

    return suggestions.slice(0, 5);
  }

  public async processWaitlist(room_id: number, equipment_id: number | null) {
    const waitlistedBookings = await this.prisma.booking.findMany({
      where: {
        room_id,
        status: 'WAITLISTED',
        ...(equipment_id && { equipment_id }),
      },
      include: { chemical_usages: true },
      orderBy: { created_at: 'asc' },
    });

    if (waitlistedBookings.length === 0) return;

    const bufferString = await this.settingsService.get(
      'BUFFER_TIME_MINUTES',
      '15',
    );
    const bufferMinutes = parseInt(bufferString, 10) || 15;

    for (const waitlisted of waitlistedBookings) {
      try {
        const isResourceBooking =
          waitlisted.equipment_id != null ||
          (waitlisted.chemical_usages && waitlisted.chemical_usages.length > 0);

        await this.prisma.$transaction(async (tx) => {
          await this.checkOverlap(
            tx,
            waitlisted.room_id,
            waitlisted.equipment_id,
            waitlisted.start_time,
            waitlisted.end_time,
            bufferMinutes,
            'PENDING',
            isResourceBooking,
            waitlisted.id,
          );

          await tx.booking.update({
            where: { id: waitlisted.id },
            data: { status: 'PENDING' },
          });
        });

        void this.notificationsService.createNotification(
          waitlisted.user_id,
          'Đơn xếp hàng đã được đôn lên!',
          `Phòng Lab đã có chỗ trống. Đơn đặt phòng #${waitlisted.id} của bạn đã được chuyển sang trạng thái chờ duyệt.`,
          'info',
        );

        this.notificationsService.broadcastCalendarUpdate();
        // Thoát vòng lặp để tránh đôn quá nhiều đơn cùng lúc gây quá tải
        break;
      } catch (err) {
        // Nếu có lỗi (ConflictException) thì bỏ qua, duyệt tiếp đơn khác
      }
    }
  }
}
