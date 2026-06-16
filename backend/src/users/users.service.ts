import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (user && user.is_deleted) return null;
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
        is_active: true,
        blacklist_reason: true,
        created_at: true,
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
}
