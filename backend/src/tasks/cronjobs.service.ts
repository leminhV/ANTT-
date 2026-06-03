import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronjobsService {
  private readonly logger = new Logger(CronjobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Auto Cancel: Hủy các đơn PENDING nếu quá hạn giờ bắt đầu (Chạy mỗi 15 phút)
  @Cron('0 */15 * * * *')
  async autoCancelPendingBookings() {
    this.logger.debug('Running Job: autoCancelPendingBookings...');
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const expiredPendingBookings = await tx.booking.findMany({
          where: {
            status: 'PENDING',
            start_time: { lte: now }, // Đã quá giờ bắt đầu mà chưa được duyệt
          },
        });

        if (expiredPendingBookings.length === 0) return;

        const ids = expiredPendingBookings.map((b) => b.id);
        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'CANCELED' },
        });

        this.logger.log(`[Auto Cancel] Đã hủy tự động ${ids.length} đơn PENDING quá hạn.`);
      });
    } catch (error) {
      this.logger.error('[Auto Cancel] Transaction Failed:', error);
    }
  }

  // 2. Auto Start: Chuyển đơn APPROVED sang IN_USE khi đến giờ bắt đầu (Chạy mỗi phút)
  @Cron(CronExpression.EVERY_MINUTE)
  async autoStartApprovedBookings() {
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const readyBookings = await tx.booking.findMany({
          where: {
            status: 'APPROVED',
            start_time: { lte: now },
            end_time: { gt: now }, // Vẫn trong giờ trực
          },
        });

        if (readyBookings.length === 0) return;

        const ids = readyBookings.map((b) => b.id);
        
        // Cập nhật trạng thái Booking
        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'IN_USE' },
        });

        // Cập nhật trạng thái Thiết bị (Nếu có) thành IN_USE
        const equipmentIds = readyBookings
          .map((b) => b.equipment_id)
          .filter((id) => id !== null) as number[];
        
        if (equipmentIds.length > 0) {
          await tx.equipment.updateMany({
            where: { id: { in: equipmentIds } },
            data: { status: 'IN_USE' },
          });
        }

        this.logger.log(`[Auto Start] Đã kích hoạt ${ids.length} đơn sang trạng thái IN_USE.`);
      });
    } catch (error) {
      this.logger.error('[Auto Start] Transaction Failed:', error);
    }
  }

  // 3. Auto Complete: Chuyển đơn IN_USE sang COMPLETED khi đến giờ kết thúc (Chạy mỗi phút)
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCompleteInUseBookings() {
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const finishedBookings = await tx.booking.findMany({
          where: {
            status: 'IN_USE',
            end_time: { lte: now },
          },
        });

        if (finishedBookings.length === 0) return;

        const ids = finishedBookings.map((b) => b.id);
        
        // Cập nhật trạng thái Booking
        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'COMPLETED' },
        });

        // Cập nhật trạng thái Thiết bị (Nếu có) về AVAILABLE
        const equipmentIds = finishedBookings
          .map((b) => b.equipment_id)
          .filter((id) => id !== null) as number[];

        if (equipmentIds.length > 0) {
          // Lưu ý: Có thể cần kiểm tra xem thiết bị có đang bị báo cáo BROKEN hay không trước khi chuyển AVAILABLE
          await tx.equipment.updateMany({
            where: { 
              id: { in: equipmentIds },
              status: 'IN_USE' // Chỉ đổi những thiết bị đang IN_USE, tránh đổi thiết bị đang BROKEN
            },
            data: { status: 'AVAILABLE' },
          });
        }

        this.logger.log(`[Auto Complete] Đã kết thúc ${ids.length} đơn sang trạng thái COMPLETED.`);
      });
    } catch (error) {
      this.logger.error('[Auto Complete] Transaction Failed:', error);
    }
  }
}
