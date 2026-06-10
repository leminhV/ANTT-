import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(keyword: string) {
    if (!keyword || keyword.trim() === '') {
      return [];
    }

    const q = keyword.trim();

    // Query song song để tối ưu tốc độ
    const [rooms, equipment] = await Promise.all([
      this.prisma.room.findMany({
        where: {
          OR: [{ name: { contains: q } }, { location: { contains: q } }],
        },
        take: 5,
        select: { id: true, name: true, location: true },
      }),
      this.prisma.equipment.findMany({
        where: {
          OR: [{ name: { contains: q } }, { serial_number: { contains: q } }],
        },
        take: 5,
        select: { id: true, name: true, serial_number: true, status: true },
      }),
    ]);

    // Format lại data để Frontend dễ xử lý
    const formattedRooms = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.location,
      type: 'ROOM',
    }));

    const formattedEquipment = equipment.map((e) => ({
      id: e.id,
      name: e.name,
      description: `SN: ${e.serial_number} - ${e.status}`,
      type: 'EQUIPMENT',
    }));

    return [...formattedRooms, ...formattedEquipment];
  }
}
