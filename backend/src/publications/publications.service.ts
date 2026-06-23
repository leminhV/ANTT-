import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.scientificPublication.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.scientificPublication.findMany({
      include: {
        room: { select: { name: true } },
      },
      orderBy: { year: 'desc' },
    });
  }

  async findOne(id: number) {
    const publication = await this.prisma.scientificPublication.findUnique({
      where: { id },
      include: {
        room: { select: { name: true } },
      },
    });
    if (!publication) {
      throw new NotFoundException(`Bài báo với ID ${id} không tồn tại`);
    }
    return publication;
  }

  async remove(id: number) {
    return this.prisma.scientificPublication.delete({
      where: { id },
    });
  }

  async findByRoom(roomId: number) {
    return this.prisma.scientificPublication.findMany({
      where: { room_id: roomId },
      include: {
        room: { select: { name: true, location: true } },
      },
      orderBy: { year: 'desc' },
    });
  }

  async findByUser(userId: number) {
    // Find publications authored by a specific user
    // This assumes authors field contains user names or can be matched
    // In a real system, you would have a separate Author table
    return this.prisma.scientificPublication.findMany({
      include: {
        room: { select: { name: true, location: true } },
      },
      orderBy: { year: 'desc' },
    });
  }

  async getStatsByRoom() {
    const stats = await this.prisma.room.findMany({
      where: { is_deleted: false },
      select: {
        id: true,
        name: true,
        location: true,
        publications: {
          select: {
            id: true,
            category: true,
            year: true,
          },
        },
      },
    });

    return stats.map((room) => ({
      roomId: room.id,
      roomName: room.name,
      location: room.location,
      totalPublications: room.publications.length,
      byCategory: room.publications.reduce(
        (acc, pub) => {
          const cat = pub.category || 'OTHER';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byYear: room.publications.reduce(
        (acc, pub) => {
          const year = pub.year.toString();
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    }));
  }
}
