import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEquipmentDto: CreateEquipmentDto) {
    const { last_maintenance, ...rest } = createEquipmentDto;
    return this.prisma.equipment.create({
      data: {
        ...rest,
        last_maintenance: last_maintenance ? new Date(last_maintenance) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.equipment.findMany({
      include: {
        room: true,
      },
    });
  }

  async findOne(id: number) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        room: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException(`Thiết bị với ID ${id} không tồn tại`);
    }

    return equipment;
  }

  async update(id: number, updateEquipmentDto: UpdateEquipmentDto) {
    await this.findOne(id); // Check existence

    const { last_maintenance, ...rest } = updateEquipmentDto;
    
    // Increment row_version for Optimistic Locking
    return this.prisma.equipment.update({
      where: { id },
      data: {
        ...rest,
        ...(last_maintenance !== undefined && { 
          last_maintenance: last_maintenance ? new Date(last_maintenance) : null 
        }),
        row_version: {
          increment: 1,
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.equipment.delete({
      where: { id },
    });
  }
}
