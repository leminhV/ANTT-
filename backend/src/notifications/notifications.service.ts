import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) {
    try {
      // 1. Lưu vào Database
      const notification = await this.prisma.notification.create({
        data: {
          user_id: userId,
          title,
          message,
          type,
          is_read: false,
        },
      });

      // 2. Bắn WebSocket Real-time
      this.gateway.sendNotificationToUser(userId, title, message, type);

      return notification;
    } catch (error) {
      this.logger.error(
        `Error creating notification for user ${userId}:`,
        error,
      );
      // Không ném lỗi ra để tránh ảnh hưởng luồng chính
    }
  }

  async getUnreadNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20, // Chỉ lấy 20 tin gần nhất
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        is_read: true,
      },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
  }

  broadcastCalendarUpdate() {
    this.gateway.broadcastCalendarUpdate();
  }
}
