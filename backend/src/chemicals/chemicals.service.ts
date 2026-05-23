import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChemicalDto } from './dto/create-chemical.dto';
import { UpdateChemicalDto } from './dto/update-chemical.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChemicalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChemicalDto: CreateChemicalDto) {
    const { expiration_date, ...rest } = createChemicalDto;
    return this.prisma.chemical.create({
      data: {
        ...rest,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.chemical.findMany();
  }

  async findOne(id: number) {
    const chemical = await this.prisma.chemical.findUnique({
      where: { id },
      include: {
        usages: true,
      },
    });

    if (!chemical) {
      throw new NotFoundException(`Hóa chất với ID ${id} không tồn tại`);
    }

    return chemical;
  }

  async update(id: number, updateChemicalDto: UpdateChemicalDto) {
    await this.findOne(id);

    const { expiration_date, ...rest } = updateChemicalDto;

    return this.prisma.chemical.update({
      where: { id },
      data: {
        ...rest,
        ...(expiration_date !== undefined && { 
          expiration_date: expiration_date ? new Date(expiration_date) : null 
        }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.chemical.delete({
      where: { id },
    });
  }
}
