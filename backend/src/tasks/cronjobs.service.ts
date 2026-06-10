import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronjobsService {
  private readonly logger = new Logger(CronjobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ======================================================================
  // KỊCH BẢN 1: Hủy đơn PENDING hết hạn (Chạy mỗi 15 phút)
  // ======================================================================
  @Cron('0 */15 * * * *')
  async autoCancelPendingBookings() {
    this.logger.debug('Running Job: autoCancelPendingBookings...');
    const now = new Date();
    // Cũ hơn 24 giờ
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      await this.prisma.$transaction(async (tx) => {
        const expiredPendingBookings = await tx.booking.findMany({
          where: {
            status: 'PENDING',
            created_at: { lt: twentyFourHoursAgo }, // Cũ hơn 24 giờ
          },
        });

        if (expiredPendingBookings.length === 0) return;

        const ids = expiredPendingBookings.map((b) => b.id);
        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'CANCELED' },
        });

        this.logger.log(
          `[Auto Cancel] Đã hủy tự động ${ids.length} đơn PENDING quá hạn 24h.`,
        );
      });
    } catch (error) {
      this.logger.error('[Auto Cancel] Transaction Failed:', error);
    }
  }

  // ======================================================================
  // KỊCH BẢN 2: Phát hiện No-show (Vắng mặt) (Chạy mỗi 15 phút)
  // ======================================================================
  @Cron('0 */15 * * * *')
  async autoDetectNoShows() {
    this.logger.debug('Running Job: autoDetectNoShows...');
    const now = new Date();
    // Đã qua 15 phút so với hiện tại
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Tìm các booking có status = APPROVED, start_time đã qua 15 phút, và chưa có CheckInRecord
        const noShowBookings = await tx.booking.findMany({
          where: {
            status: 'APPROVED',
            start_time: { lte: fifteenMinutesAgo },
            check_in_records: {
              none: {}, // Không có bản ghi nào
            },
          },
        });

        if (noShowBookings.length === 0) return;

        const ids = noShowBookings.map((b) => b.id);

        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'CANCELED' },
        });

        this.logger.log(
          `[No-show] Đã hủy tự động ${ids.length} đơn do vắng mặt quá 15 phút (Chưa Check-in).`,
        );
      });
    } catch (error) {
      this.logger.error('[No-show] Transaction Failed:', error);
    }
  }

  // ======================================================================
  // KỊCH BẢN 3: Cảnh báo hóa chất hết hạn (Chạy mỗi ngày lúc 8:00 sáng)
  // ======================================================================
  @Cron('0 8 * * *')
  async autoWarnChemicals() {
    this.logger.debug('Running Job: autoWarnChemicals...');
    const now = new Date();
    // Hết hạn trong vòng 30 ngày tới
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      const expiringOrEmptyChemicals = await this.prisma.chemical.findMany({
        where: {
          OR: [
            { quantity_stock: { lte: 0 } },
            { expiration_date: { lte: thirtyDaysLater } },
          ],
        },
      });

      if (expiringOrEmptyChemicals.length === 0) return;

      this.logger.warn(
        `[Chemical Warning] Phát hiện ${expiringOrEmptyChemicals.length} hóa chất cần lưu ý:`,
      );

      expiringOrEmptyChemicals.forEach((chemical) => {
        if (chemical.quantity_stock <= 0) {
          this.logger.warn(
            `- Hóa chất [${chemical.name}] đã hết hàng (Số lượng: 0).`,
          );
        } else if (
          chemical.expiration_date &&
          chemical.expiration_date <= thirtyDaysLater
        ) {
          const formattedDate = chemical.expiration_date
            .toISOString()
            .split('T')[0];
          this.logger.warn(
            `- Hóa chất [${chemical.name}] sắp/đã hết hạn (HSD: ${formattedDate}).`,
          );
        }
      });

      this.logger.warn(
        '[Chemical Warning] Giả lập: Đã gửi email cảnh báo tới Quản trị viên (Admin).',
      );
    } catch (error) {
      this.logger.error('[Chemical Warning] Failed:', error);
    }
  }

  // ======================================================================
  // KỊCH BẢN PHỤ: Chuyển đơn APPROVED sang IN_USE (Chạy mỗi phút)
  // ======================================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async autoStartApprovedBookings() {
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const readyBookings = await tx.booking.findMany({
          where: {
            status: 'APPROVED',
            start_time: { lte: now },
            end_time: { gt: now },
          },
        });

        if (readyBookings.length === 0) return;

        const ids = readyBookings.map((b) => b.id);

        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'IN_USE' },
        });

        const equipmentIds = readyBookings
          .map((b) => b.equipment_id)
          .filter((id) => id !== null);

        if (equipmentIds.length > 0) {
          await tx.equipment.updateMany({
            where: { id: { in: equipmentIds } },
            data: { status: 'IN_USE' },
          });
        }

        this.logger.log(
          `[Auto Start] Đã kích hoạt ${ids.length} đơn sang trạng thái IN_USE.`,
        );
      });
    } catch (error) {
      this.logger.error('[Auto Start] Transaction Failed:', error);
    }
  }

  // ======================================================================
  // KỊCH BẢN PHỤ: Chuyển đơn IN_USE sang COMPLETED (Chạy mỗi phút)
  // ======================================================================
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

        await tx.booking.updateMany({
          where: { id: { in: ids } },
          data: { status: 'COMPLETED' },
        });

        const equipmentIds = finishedBookings
          .map((b) => b.equipment_id)
          .filter((id) => id !== null);

        if (equipmentIds.length > 0) {
          await tx.equipment.updateMany({
            where: {
              id: { in: equipmentIds },
              status: 'IN_USE',
            },
            data: { status: 'AVAILABLE' },
          });
        }

        this.logger.log(
          `[Auto Complete] Đã kết thúc ${ids.length} đơn sang trạng thái COMPLETED.`,
        );
      });
    } catch (error) {
      this.logger.error('[Auto Complete] Transaction Failed:', error);
    }
  }
}
