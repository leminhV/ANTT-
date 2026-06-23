import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CronjobsService {
  private readonly logger = new Logger(CronjobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Cron('0 */15 * * * *')
  async autoCancelPendingBookings() {
    this.logger.debug('Running Job: autoCancelPendingBookings...');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const expiredPendingBookings = await this.prisma.booking.findMany({
        where: {
          status: 'PENDING',
          created_at: { lt: twentyFourHoursAgo },
        },
      });

      if (expiredPendingBookings.length === 0) return;

      for (const booking of expiredPendingBookings) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELED', row_version: { increment: 1 } },
        });

        void this.notificationsService.createNotification(
          booking.user_id,
          'Hủy đơn tự động (Quá hạn 24h)',
          `Đơn đặt phòng #${booking.id} của bạn đã bị hủy tự động do không được phê duyệt trong vòng 24 giờ.`,
          'error',
        );

        await this.bookingsService.processWaitlist(
          booking.room_id,
          booking.equipment_id,
        );
      }

      this.notificationsService.broadcastCalendarUpdate();
      this.logger.log(
        `[Auto Cancel] Đã hủy tự động và đôn lịch cho ${expiredPendingBookings.length} đơn PENDING quá hạn 24h.`,
      );
    } catch (error) {
      this.logger.error('[Auto Cancel] Failed:', error);
    }
  }

  @Cron('0 */15 * * * *')
  async autoDetectNoShows() {
    this.logger.debug('Running Job: autoDetectNoShows...');

    try {
      const requireQrCheckin = await this.settingsService.get(
        'REQUIRE_QR_CHECKIN',
        'true',
      );
      if (requireQrCheckin === 'false') {
        this.logger.debug(
          '[No-show] QR Check-in is disabled, skipping punishment.',
        );
        return;
      }

      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      const noShowBookings = await this.prisma.booking.findMany({
        where: {
          status: 'APPROVED',
          start_time: { lte: fifteenMinutesAgo },
          check_in_records: { none: {} },
        },
      });

      if (noShowBookings.length === 0) return;

      for (const booking of noShowBookings) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELED', row_version: { increment: 1 } },
        });

        void this.notificationsService.createNotification(
          booking.user_id,
          'Hủy đơn (No-show)',
          `Đơn đặt phòng #${booking.id} đã bị hủy vì bạn đã vắng mặt quá 15 phút kể từ lúc bắt đầu ca.`,
          'warning',
        );

        await this.bookingsService.processWaitlist(
          booking.room_id,
          booking.equipment_id,
        );
      }

      this.notificationsService.broadcastCalendarUpdate();
      this.logger.log(
        `[No-show] Đã phạt No-show và đôn lịch cho ${noShowBookings.length} đơn.`,
      );
    } catch (error) {
      this.logger.error('[No-show] Failed:', error);
    }
  }

  @Cron('0 8 * * *')
  async autoWarnChemicals() {
    this.logger.debug('Running Job: autoWarnChemicals...');
    const now = new Date();
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
        `[Chemical Warning] Phát hiện ${expiringOrEmptyChemicals.length} hóa chất cần lưu ý`,
      );
    } catch (error) {
      this.logger.error('[Chemical Warning] Failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCheckInBookings() {
    try {
      const requireQrCheckin = await this.settingsService.get(
        'REQUIRE_QR_CHECKIN',
        'true',
      );
      if (requireQrCheckin === 'true') return;

      const now = new Date();
      const readyBookings = await this.prisma.booking.findMany({
        where: {
          status: 'APPROVED',
          start_time: { lte: now },
        },
      });

      if (readyBookings.length === 0) return;

      for (const booking of readyBookings) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'IN_USE', row_version: { increment: 1 } },
        });

        await this.prisma.checkInRecord.create({
          data: {
            booking_id: booking.id,
            user_id: booking.user_id,
            room_id: booking.room_id,
            equipment_id: booking.equipment_id,
            status: 'ACTIVE',
            check_in: now,
          },
        });

        if (booking.equipment_id) {
          await this.prisma.equipment.update({
            where: { id: booking.equipment_id },
            data: { status: 'IN_USE' },
          });
        }
      }
      this.notificationsService.broadcastCalendarUpdate();
      this.logger.log(
        `[Auto Check-in] Đã tự động Check-in cho ${readyBookings.length} đơn do tính năng Quét QR bị tắt.`,
      );
    } catch (error) {
      this.logger.error('[Auto Check-in] Failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCompleteInUseBookings() {
    const now = new Date();
    try {
      const finishedBookings = await this.prisma.booking.findMany({
        where: {
          status: 'IN_USE',
          end_time: { lte: now },
        },
      });

      if (finishedBookings.length === 0) return;

      let completedCount = 0;
      let overdueCount = 0;

      for (const booking of finishedBookings) {
        // Nếu mượn thiết bị -> chuyển sang OVERDUE (phải trả vật lý)
        if (booking.equipment_id) {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'OVERDUE', row_version: { increment: 1 } },
          });

          void this.notificationsService.createNotification(
            booking.user_id,
            '⚠️ Quá hạn trả thiết bị!',
            `Đơn mượn #${booking.id} đã quá giờ trả. Vui lòng trả thiết bị ngay để tránh bị trừ điểm tín nhiệm.`,
            'warning',
          );

          overdueCount++;
        } else {
          // Đặt phòng thuần túy -> tự động hoàn thành
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'COMPLETED', row_version: { increment: 1 } },
          });

          // Tự động check-out các record check-in còn đang ACTIVE của đơn này
          await this.prisma.checkInRecord.updateMany({
            where: {
              booking_id: booking.id,
              status: 'ACTIVE',
            },
            data: {
              status: 'COMPLETED',
              check_out: now,
            },
          });

          completedCount++;
        }
      }

      this.notificationsService.broadcastCalendarUpdate();

      if (completedCount > 0) {
        this.logger.log(
          `[Auto Complete] Đã kết thúc ${completedCount} đơn đặt phòng sang COMPLETED.`,
        );
      }
      if (overdueCount > 0) {
        this.logger.warn(
          `[Overdue] Đã chuyển ${overdueCount} đơn mượn thiết bị sang OVERDUE và gửi cảnh báo.`,
        );
      }
    } catch (error) {
      this.logger.error('[Auto Complete / Overdue] Failed:', error);
    }
  }

  /**
   * Cảnh báo lặp lại cho các đơn OVERDUE mỗi 15 phút
   */
  @Cron('0 */15 * * * *')
  async remindOverdueBookings() {
    try {
      const overdueBookings = await this.prisma.booking.findMany({
        where: { status: 'OVERDUE' },
      });

      if (overdueBookings.length === 0) return;

      for (const booking of overdueBookings) {
        const minutesOverdue = Math.round(
          (Date.now() - new Date(booking.end_time).getTime()) / 60000,
        );

        void this.notificationsService.createNotification(
          booking.user_id,
          '🔴 Nhắc nhở: Trả thiết bị ngay!',
          `Đơn mượn #${booking.id} đã quá hạn ${minutesOverdue} phút. Hãy trả thiết bị ngay lập tức!`,
          'error',
        );

        // Trừ điểm tín nhiệm nếu quá hạn trên 1 giờ
        if (minutesOverdue > 60) {
          await this.prisma.user.update({
            where: { id: booking.user_id },
            data: { trust_score: { decrement: 1 } },
          });
        }
      }

      this.logger.warn(
        `[Overdue Reminder] Đã gửi nhắc nhở cho ${overdueBookings.length} đơn OVERDUE.`,
      );
    } catch (error) {
      this.logger.error('[Overdue Reminder] Failed:', error);
    }
  }
}
