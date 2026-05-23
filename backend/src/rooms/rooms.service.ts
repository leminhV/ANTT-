import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async findAll() {
    return this.prisma.room.findMany({
      include: {
        _count: {
          select: { equipment: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        equipment: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Phòng Lab với ID ${id} không tồn tại`);
    }

    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  async remove(id: number) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.room.delete({
      where: { id },
    });
  }
}
