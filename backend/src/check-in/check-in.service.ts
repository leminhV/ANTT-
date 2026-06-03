import { UserPayload } from '../auth/interfaces/user-payload.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { UpdateCheckInDto } from './dto/update-check-in.dto';
import { PrismaService } from '../prisma/prisma.service';
import { checkOwnership } from '../common/utils/ownership.util';

@Injectable()
export class CheckInService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCheckInDto: CreateCheckInDto, userId: number) {
    const { check_in, ...rest } = createCheckInDto;
    return this.prisma.checkInRecord.create({
      data: {
        ...rest,
        user_id: userId,
        ...(check_in && { check_in: new Date(check_in) }),
      },
    });
  }

  async findAll() {
    return this.prisma.checkInRecord.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        booking: { select: { id: true, purpose: true } },
      },
      orderBy: { check_in: 'desc' },
    });
  }

  async getActiveRecords() {
    return this.prisma.checkInRecord.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        booking: { select: { id: true, purpose: true } },
      },
      orderBy: { check_in: 'desc' },
    });
  }

  async getUserHistory(userId: number) {
    return this.prisma.checkInRecord.findMany({
      where: { user_id: userId },
      include: {
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        booking: { select: { id: true, purpose: true } },
      },
      orderBy: { check_in: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.checkInRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        booking: { select: { id: true, purpose: true } },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Bản ghi Check-in với ID ${id} không tồn tại`,
      );
    }

    return record;
  }

  async findOneSecure(id: number, currentUser: UserPayload) {
    const record = await this.findOne(id);
    checkOwnership(record.user_id, currentUser);
    return record;
  }

  async update(
    id: number,
    updateCheckInDto: UpdateCheckInDto,
    currentUser: UserPayload,
  ) {
    await this.findOneSecure(id, currentUser);

    const { check_in, check_out, ...rest } = updateCheckInDto;

    return this.prisma.checkInRecord.update({
      where: { id },
      data: {
        ...rest,
        ...(check_in && { check_in: new Date(check_in) }),
        ...(check_out && { check_out: new Date(check_out) }),
      },
    });
  }

  async checkOut(id: number, currentUser: UserPayload) {
    await this.findOneSecure(id, currentUser);
    return this.prisma.checkInRecord.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        check_out: new Date(),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.checkInRecord.delete({
      where: { id },
    });
  }
}
