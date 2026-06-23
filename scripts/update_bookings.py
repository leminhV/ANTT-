import sys

file_path = "backend/src/bookings/bookings.service.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update findAll
content = content.replace(
    "async findAll(startDate?: string, endDate?: string) {",
    "async findAll(startDate?: string, endDate?: string, page: number = 1, limit: number = 100) {"
)
content = content.replace(
    """    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });""",
    """    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });"""
)

# 2. Update findMyBookings
content = content.replace(
    "async findMyBookings(userId: number) {",
    "async findMyBookings(userId: number, page: number = 1, limit: number = 50) {"
)
content = content.replace(
    """    const bookings = await this.prisma.booking.findMany({
      where: { user_id: userId },
      include: {
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });""",
    """    const bookings = await this.prisma.booking.findMany({
      where: { user_id: userId },
      include: {
        room: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });"""
)

# 3. Add checkOverlap method
check_overlap_method = """
  private async checkOverlap(
    tx: any,
    room_id: number,
    equipment_id: number | null,
    startTime: Date,
    endTime: Date,
    bufferMinutes: number,
    intendedStatus: string,
    excludeBookingId?: number,
  ) {
    const startWithBuffer = new Date(startTime.getTime() - bufferMinutes * 60000);
    const endWithBuffer = new Date(endTime.getTime() + bufferMinutes * 60000);

    // Kiểm tra đụng độ lịch phòng
    const roomWhere: any = {
      room_id,
      status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
      start_time: { lt: endWithBuffer },
      end_time: { gt: startWithBuffer },
    };
    if (excludeBookingId) roomWhere.id = { not: excludeBookingId };

    const roomConflict = await tx.booking.findFirst({ where: roomWhere });

    if (roomConflict) {
      const isRealConflict = roomConflict.start_time < endTime && roomConflict.end_time > startTime;
      if (intendedStatus !== 'WAITLISTED') {
        if (isRealConflict) {
          throw new ConflictException(I18nContext.current()?.t('messages.errors.ROOM_CONFLICT') || 'Phòng Lab đã được đặt trong khoảng thời gian này');
        } else {
          throw new ConflictException(I18nContext.current()?.t('messages.errors.BUFFER_TIME_REQUIRED', { args: { buffer: bufferMinutes } }) || `Cần ít nhất ${bufferMinutes} phút trống giữa 2 ca để dọn dẹp`);
        }
      }
    }

    // Kiểm tra thiết bị
    let eqConflict = null;
    if (equipment_id) {
      const equipment = await tx.equipment.findUnique({ where: { id: equipment_id } });
      if (!equipment) throw new NotFoundException(I18nContext.current()?.t('messages.errors.NOT_FOUND') || 'Thiết bị không tồn tại');
      if (equipment.status === 'MAINTENANCE' || equipment.status === 'BROKEN') {
        throw new ConflictException(I18nContext.current()?.t('messages.errors.EQUIPMENT_UNAVAILABLE', { args: { status: equipment.status } }) || `Thiết bị đang ở trạng thái ${equipment.status} không thể đặt`);
      }

      const eqWhere: any = {
        equipment_id,
        status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
        start_time: { lt: endWithBuffer },
        end_time: { gt: startWithBuffer },
      };
      if (excludeBookingId) eqWhere.id = { not: excludeBookingId };

      eqConflict = await tx.booking.findFirst({ where: eqWhere });

      if (eqConflict) {
        const isRealConflict = eqConflict.start_time < endTime && eqConflict.end_time > startTime;
        if (intendedStatus !== 'WAITLISTED') {
          if (isRealConflict) {
            throw new ConflictException(I18nContext.current()?.t('messages.errors.EQUIPMENT_CONFLICT') || 'Thiết bị đã được đặt trong khoảng thời gian này');
          } else {
            throw new ConflictException(I18nContext.current()?.t('messages.errors.BUFFER_TIME_REQUIRED', { args: { buffer: bufferMinutes } }) || `Cần ít nhất ${bufferMinutes} phút trống giữa 2 ca để dọn dẹp`);
          }
        }
      }
    }

    return { roomConflict, eqConflict };
  }

  private async processWaitlist(room_id: number, equipment_id: number | null) {"""
content = content.replace("  private async processWaitlist(room_id: number, equipment_id: number | null) {", check_overlap_method)

# 4. Refactor create method to use checkOverlap and move encryption
create_block_start = """    const result = await this.prisma.$transaction(async (tx) => {"""
create_block_end = """      const newBooking = await tx.booking.create({
        data: {
          user_id: userId,
          room_id,
          equipment_id: equipment_id || null,
          course_id: course_id || null,
          start_time: startTime,
          end_time: endTime,
          purpose: encryptedPurpose,
          status: finalStatus,
        },
      });
      return newBooking;
    });"""

old_create = content[content.find(create_block_start) : content.find(create_block_end) + len(create_block_end)]

new_create = """    // 🛡️ BẢO MẬT: ENCRYPTION AT REST (Mã hóa CSDL)
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

      const maxBookings = parseInt(await this.settingsService.get('MAX_BOOKINGS_PER_DAY', '3'), 10);
      if (userBookingsToday >= maxBookings) {
        throw new ConflictException(I18nContext.current()?.t('messages.errors.MAX_BOOKINGS_EXCEEDED', { args: { maxBookings } }) || `Sinh viên chỉ được tạo tối đa ${maxBookings} Booking trong cùng 1 ngày`);
      }

      const intendedStatus = createBookingDto.status || 'PENDING';
      
      // Gọi hàm checkOverlap đã được refactor
      const { roomConflict, eqConflict } = await this.checkOverlap(
        tx,
        room_id,
        equipment_id || null,
        startTime,
        endTime,
        bufferMinutes,
        intendedStatus
      );

      // 🛡️ BẢO MẬT: CHẶN USER TỰ DUYỆT ĐƠN (ANTI-HACK STATUS)
      let finalStatus: 'PENDING' | 'WAITLISTED' = 'PENDING';
      if (intendedStatus === 'WAITLISTED') {
        finalStatus = 'WAITLISTED';
        if (!roomConflict && (!equipment_id || !eqConflict)) {
          finalStatus = 'PENDING';
        }
      }

      const newBooking = await tx.booking.create({
        data: {
          user_id: userId,
          room_id,
          equipment_id: equipment_id || null,
          course_id: course_id || null,
          start_time: startTime,
          end_time: endTime,
          purpose: encryptedPurpose,
          status: finalStatus,
        },
      });
      return newBooking;
    });"""

content = content.replace(old_create, new_create)

# 5. Refactor update method to include transaction and overlap check
update_method_start = """  async update(id: number, updateBookingDto: UpdateBookingDto) {"""
update_method_end = """    // Tự động kiểm tra danh sách chờ nếu có đơn bị Hủy/Từ chối
    if (
      updateBookingDto.status &&
      ['REJECTED', 'CANCELED'].includes(updateBookingDto.status)
    ) {
      this.processWaitlist(result.room_id, result.equipment_id).catch((err) =>
        console.error('Lỗi khi đôn lịch:', err),
      );
    }

    return result;
  }"""

old_update = content[content.find(update_method_start) : content.find(update_method_end) + len(update_method_end)]

new_update = """  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const existingBooking = await this.findOne(id); // Check exists & get current state

    const { start_time, end_time, row_version, purpose, status, ...rest } = updateBookingDto;

    const encryptedPurpose = purpose ? EncryptionUtil.encrypt(purpose) : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      // 🛡️ BẢO MẬT & ĐỒNG BỘ: PESSIMISTIC LOCKING
      // Chỉ lock và check overlap nếu update thời gian, status thành PENDING/APPROVED/IN_USE, hoặc đổi phòng/thiết bị
      const finalStartTime = start_time ? new Date(start_time) : existingBooking.start_time;
      const finalEndTime = end_time ? new Date(end_time) : existingBooking.end_time;
      const finalRoomId = rest.room_id || existingBooking.room_id;
      const finalEqId = rest.equipment_id !== undefined ? rest.equipment_id : existingBooking.equipment_id;
      const finalStatus = status || existingBooking.status;

      const needsOverlapCheck = 
        (start_time || end_time || rest.room_id || rest.equipment_id || status) && 
        ['PENDING', 'APPROVED', 'IN_USE'].includes(finalStatus);

      if (needsOverlapCheck) {
        await tx.$executeRaw`SELECT id FROM rooms WHERE id = ${finalRoomId} FOR UPDATE`;
        if (finalEqId) {
          await tx.$executeRaw`SELECT id FROM equipment WHERE id = ${finalEqId} FOR UPDATE`;
        }

        const bufferMinutes = parseInt(await this.settingsService.get('BOOKING_BUFFER_MINUTES', '15'), 10);
        await this.checkOverlap(
          tx,
          finalRoomId,
          finalEqId,
          finalStartTime,
          finalEndTime,
          bufferMinutes,
          finalStatus,
          id // Truyền ID để bỏ qua chính Booking đang update
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
        console.error('Lỗi khi đôn lịch:', err),
      );
    }

    return result;
  }"""

content = content.replace(old_update, new_update)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated bookings.service.ts")
