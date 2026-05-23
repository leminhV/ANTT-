import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedAdminPassword = await bcrypt.hash('password', 10);
  const hashedHoangPassword = await bcrypt.hash('hoang281@', 10);
  const hashedStudentPassword = await bcrypt.hash('password', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vju.ac.vn' },
    update: { password: hashedAdminPassword },
    create: {
      email: 'admin@vju.ac.vn',
      password: hashedAdminPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  // Create Hoàng Admin user
  const hoangAdmin = await prisma.user.upsert({
    where: { email: 'hoang@vju.ac.vn' },
    update: { password: hashedHoangPassword },
    create: {
      email: 'hoang@vju.ac.vn',
      password: hashedHoangPassword,
      name: 'Hoàng',
      role: 'ADMIN',
    },
  });

  // Create student user
  const student = await prisma.user.upsert({
    where: { email: 'student@vju.ac.vn' },
    update: { password: hashedStudentPassword },
    create: {
      email: 'student@vju.ac.vn',
      password: hashedStudentPassword,
      name: 'Nguyen Van A',
      role: 'STUDENT',
    },
  });

  // Create instructor user
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@vju.ac.vn' },
    update: { password: hashedStudentPassword },
    create: {
      email: 'instructor@vju.ac.vn',
      password: hashedStudentPassword,
      name: 'Le Thi B',
      role: 'INSTRUCTOR',
    },
  });

  // Create a room
  const room = await prisma.room.upsert({
    where: { name: 'Lab 101' },
    update: {},
    create: {
      name: 'Lab 101',
      location: 'Tòa nhà A - Tầng 1',
      capacity: 30,
      has_air_conditioner: true,
    },
  });

  // Create equipment
  const equipment = await prisma.equipment.upsert({
    where: { serial_number: 'EQ-SN-001' },
    update: {},
    create: {
      name: 'Microscope',
      serial_number: 'EQ-SN-001',
      room_id: room.id,
      status: 'AVAILABLE',
    },
  });

  console.log('Database seeded!');
  console.log({ admin, student, instructor, room, equipment });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
