import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ExcelService } from '../../common/excel/excel.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async create(data: CreateUserDto) {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { is_deleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        student_class: true,
        phone: true,
        is_mfa_enabled: true,
        is_active: true,
        blacklist_reason: true,
        created_at: true,
        trust_score: true,
      },
    });
  }

  async update(id: number, data: UpdateUserDto) {
    const updateData = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async updateProfile(id: number, data: UpdateProfileDto) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar_url: true,
        phone: true,
        department: true,
        is_mfa_enabled: true,
      },
    });
  }

  async updateRefreshToken(id: number, refresh_token: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refresh_token },
    });
  }

  async remove(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { is_deleted: true },
    });
  }

  async updateTrustScore(id: number, scoreDiff: number) {
    const user = await this.findById(id);
    if (!user) throw new BadRequestException('Người dùng không tồn tại');

    const newScore = Math.max(0, user.trust_score + scoreDiff);

    return this.prisma.user.update({
      where: { id },
      data: { trust_score: newScore },
      select: { id: true, name: true, trust_score: true },
    });
  }

  async incrementFailedLogin(id: number) {
    const user = await this.findById(id);
    if (!user) return;
    const newAttempts = user.failed_login_attempts + 1;
    let lockedUntil = null;
    if (newAttempts >= 5) {
      // Khóa 15 phút
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        failed_login_attempts: newAttempts,
        locked_until: lockedUntil,
      },
    });
  }

  async resetFailedLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
      },
    });
  }

  async updateMfaSecret(id: number, secret: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        mfa_secret: secret,
      },
    });
  }

  async enableMfa(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        is_mfa_enabled: true,
      },
    });
  }

  async disableMfa(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        is_mfa_enabled: false,
        mfa_secret: null,
      },
    });
  }

  async importFromExcel(buffer: Buffer) {
    const data = this.excelService.parseExcel(buffer);
    if (!data || data.length === 0) {
      throw new BadRequestException('File Excel trống');
    }

    const defaultPassword = await bcrypt.hash('password123', 10);
    const usersToCreate = data.map((row: any) => ({
      name: row.name || row.Name || row['Họ và tên'],
      email: row.email || row.Email,
      password: defaultPassword,
      role: (row.role || row.Role || 'STUDENT') as Role,
      department:
        row.department || row.Department || row['Khoa/Viện'] || row['Khoa'],
      student_class: row.student_class || row['Lớp'] || row.Class,
    }));

    // Filter out invalid ones
    const validUsers = usersToCreate.filter((u) => u.name && u.email);

    if (validUsers.length === 0) {
      throw new BadRequestException('Không tìm thấy dữ liệu hợp lệ trong file');
    }

    const result = await this.prisma.user.createMany({
      data: validUsers,
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async exportToExcel() {
    const users = await this.prisma.user.findMany({
      where: { is_deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        student_class: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const data = users.map((u) => ({
      'ID Hệ thống': u.id,
      'Họ tên': u.name,
      'Email': u.email,
      'Vai trò': u.role === 'ADMIN' ? 'Quản trị viên' : u.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Sinh viên',
      'Khoa/Phòng ban': u.department || 'Chưa cập nhật',
      'Lớp': u.student_class || 'Chưa cập nhật',
      'Số điện thoại': u.phone || 'Chưa cập nhật',
      'Trạng thái': u.is_active ? 'Đang hoạt động' : 'Đã khóa',
      'Ngày tạo': new Date(u.created_at).toLocaleDateString('vi-VN'),
    }));

    return this.excelService.exportToExcel(data, 'Users');
  }

  async getLoginHistory(userId: number) {
    return (this.prisma as any).loginHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20, // Giới hạn 20 lần gần nhất
    });
  }

  async getUserActivity(userId: number) {
    const loginHistory = await this.getLoginHistory(userId);

    const bookings = await this.prisma.booking.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        room: { select: { name: true } },
      },
    });

    const noShowCount = await this.prisma.booking.count({
      where: { user_id: userId, status: 'CANCELED' },
    });

    const totalBookings = await this.prisma.booking.count({
      where: { user_id: userId },
    });

    return {
      loginHistory,
      bookings,
      stats: {
        noShowCount,
        totalBookings,
      },
    };
  }
}
