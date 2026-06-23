import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
    await this.seedDefaults();
  }

  async refreshCache() {
    const settings = await this.prisma.systemSetting.findMany();
    for (const curr of settings) {
      await this.cacheManager.set(curr.key, curr.value, 0); // TTL = 0 (no expiration)
    }
  }

  async seedDefaults() {
    const defaults = [
      {
        key: 'BOOKING_START_HOUR',
        value: '7',
        description: 'Giờ bắt đầu cho phép đặt phòng (0-23)',
        category: 'BOOKING',
      },
      {
        key: 'BOOKING_END_HOUR',
        value: '17',
        description: 'Giờ kết thúc cho phép đặt phòng (0-23)',
        category: 'BOOKING',
      },
      {
        key: 'MIN_BOOKING_MINUTES',
        value: '30',
        description: 'Thời gian tối thiểu mỗi ca đặt (phút)',
        category: 'BOOKING',
      },
      {
        key: 'MAX_BOOKING_MINUTES',
        value: '240',
        description: 'Thời gian tối đa mỗi ca đặt (phút)',
        category: 'BOOKING',
      },
      {
        key: 'BOOKING_BUFFER_MINUTES',
        value: '15',
        description: 'Thời gian đệm dọn dẹp giữa 2 ca (phút)',
        category: 'BOOKING',
      },
      {
        key: 'MAX_BOOKINGS_PER_DAY',
        value: '3',
        category: 'BOOKING_RULES',
        description: 'Số đơn đặt tối đa của một sinh viên trong ngày',
      },
      {
        key: 'CANCEL_PENDING_HOURS',
        value: '24',
        category: 'AUTOMATION',
        description: 'Số giờ tối đa trước khi đơn PENDING bị hủy tự động',
      },
      {
        key: 'NO_SHOW_MINUTES',
        value: '30',
        category: 'AUTOMATION',
        description: 'Số phút tối đa vắng mặt trước khi đơn bị hủy No-show',
      },
      {
        key: 'DEFAULT_LANGUAGE',
        value: 'vi',
        category: 'UI',
        description: 'Ngôn ngữ mặc định của hệ thống',
      },
      {
        key: 'REQUIRE_QR_CHECKIN',
        value: 'true',
        category: 'AUTOMATION',
        description:
          'Bắt buộc quét mã QR để Check-in. Nếu tắt, hệ thống sẽ tự động Check-in khi tới giờ.',
      },
      {
        key: 'MAINTENANCE_MODE',
        value: 'false',
        category: 'SYSTEM',
        description:
          'Khi bật chế độ bảo trì, toàn bộ hệ thống đặt phòng sẽ bị vô hiệu hóa. Sinh viên không thể tạo Booking mới.',
      },
    ];

    for (const item of defaults) {
      const existing = await this.prisma.systemSetting.findUnique({
        where: { key: item.key },
      });
      if (!existing) {
        await this.prisma.systemSetting.create({ data: item });
      }
    }
    await this.refreshCache();
  }

  async findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async get(key: string, defaultValue?: string): Promise<string> {
    const cachedValue = await this.cacheManager.get<string>(key);
    return cachedValue !== undefined && cachedValue !== null
      ? cachedValue
      : defaultValue || '';
  }

  async getRawCache(): Promise<Record<string, string>> {
    // Note: cacheManager.store.keys() is not standard in all stores, so we fetch from DB or keep simple
    const settings = await this.prisma.systemSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async bulkUpdate(settings: { key: string; value: string }[]) {
    await this.prisma.$transaction(
      settings.map((setting) =>
        this.prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: {
            key: setting.key,
            value: setting.value,
            category: 'GENERAL',
            description: '',
          },
        }),
      ),
    );
    await this.refreshCache();
    return { message: 'Cập nhật cấu hình thành công' };
  }
}
