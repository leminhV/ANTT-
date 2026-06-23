import sys
import re

# 1. Update bookings.module.ts
file_path = 'backend/src/bookings/bookings.module.ts'
with open(file_path, 'r', encoding='utf-8') as f: content = f.read()
if 'exports: [BookingsService]' not in content:
    content = content.replace('providers: [BookingsService],', 'providers: [BookingsService],\n  exports: [BookingsService],')
    with open(file_path, 'w', encoding='utf-8') as f: f.write(content)

# 2. Update tasks.module.ts
file_path = 'backend/src/tasks/tasks.module.ts'
with open(file_path, 'r', encoding='utf-8') as f: content = f.read()
if 'BookingsModule' not in content:
    content = content.replace(
        "import { SettingsModule } from '../settings/settings.module';",
        "import { SettingsModule } from '../settings/settings.module';\nimport { BookingsModule } from '../bookings/bookings.module';\nimport { NotificationsModule } from '../notifications/notifications.module';"
    )
    content = content.replace(
        'imports: [PrismaModule, SettingsModule],',
        'imports: [PrismaModule, SettingsModule, BookingsModule, NotificationsModule],'
    )
    with open(file_path, 'w', encoding='utf-8') as f: f.write(content)

# 3. Update bookings.service.ts to make processWaitlist public
file_path = 'backend/src/bookings/bookings.service.ts'
with open(file_path, 'r', encoding='utf-8') as f: content = f.read()
content = content.replace('private async processWaitlist', 'public async processWaitlist')
with open(file_path, 'w', encoding='utf-8') as f: f.write(content)

# 4. Rewrite cronjobs.service.ts
new_cronjobs = '''import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronjobsService {
  private readonly logger = new Logger(CronjobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly notificationsService: NotificationsService,
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

        await this.bookingsService.processWaitlist(booking.room_id, booking.equipment_id);
      }

      this.notificationsService.broadcastCalendarUpdate();
      this.logger.log(`[Auto Cancel] Đã hủy tự động và đôn lịch cho ${expiredPendingBookings.length} đơn PENDING quá hạn 24h.`);
    } catch (error) {
      this.logger.error('[Auto Cancel] Failed:', error);
    }
  }

  @Cron('0 */15 * * * *')
  async autoDetectNoShows() {
    this.logger.debug('Running Job: autoDetectNoShows...');
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    try {
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

        await this.bookingsService.processWaitlist(booking.room_id, booking.equipment_id);
      }

      this.notificationsService.broadcastCalendarUpdate();
      this.logger.log(`[No-show] Đã phạt No-show và đôn lịch cho ${noShowBookings.length} đơn.`);
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

      this.logger.warn(`[Chemical Warning] Phát hiện ${expiringOrEmptyChemicals.length} hóa chất cần lưu ý`);
    } catch (error) {
      this.logger.error('[Chemical Warning] Failed:', error);
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

      for (const booking of finishedBookings) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'COMPLETED', row_version: { increment: 1 } },
        });

        if (booking.equipment_id) {
          await this.prisma.equipment.update({
            where: { id: booking.equipment_id, status: 'IN_USE' },
            data: { status: 'AVAILABLE' },
          });
        }
      }
      this.notificationsService.broadcastCalendarUpdate();
      this.logger.log(`[Auto Complete] Đã kết thúc ${finishedBookings.length} đơn sang COMPLETED.`);
    } catch (error) {
      this.logger.error('[Auto Complete] Failed:', error);
    }
  }
}
'''
with open('backend/src/tasks/cronjobs.service.ts', 'w', encoding='utf-8') as f:
    f.write(new_cronjobs)

# 5. Update Layout.tsx
file_path = 'frontend/src/components/layout/Layout.tsx'
with open(file_path, 'r', encoding='utf-8') as f: content = f.read()

if "socket.off('calendar_updated');" not in content:
    content = content.replace("socket.on('notification', handleNotification);", "socket.on('notification', handleNotification);\n      socket.off('calendar_updated');\n      socket.on('calendar_updated', () => {\n        if (user) {\n          apiClient.get('/api/bookings').then(res => setBookings(res.data)).catch(() => {});\n        }\n      });")
    with open(file_path, 'w', encoding='utf-8') as f: f.write(content)

print('All fixes applied successfully!')
