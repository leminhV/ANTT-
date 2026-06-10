import { PrismaClient, Role, EquipmentStatus, BookingStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu làm sạch dữ liệu cũ...');
  // Xóa theo thứ tự để tránh lỗi khóa ngoại (Foreign Key Constraints)
  await prisma.checkInRecord.deleteMany();
  await prisma.chemicalUsage.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.chemical.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.room.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
  console.log('Đã xóa dữ liệu cũ thành công!');

  console.log('Bắt đầu tạo dữ liệu Seed...');

  // 1. TẠO NGƯỜI DÙNG (1 Admin, 2 Giảng viên, 7 Sinh viên)
  const defaultPassword = await bcrypt.hash('password', 10);
  
  const users = await Promise.all([
    prisma.user.create({ data: { name: 'Admin Quản trị', email: 'admin@vju.ac.vn', password: defaultPassword, role: Role.ADMIN } }),
    prisma.user.create({ data: { name: 'Nguyễn Văn A', email: 'nguyenvana@vju.ac.vn', password: defaultPassword, role: Role.INSTRUCTOR } }),
    prisma.user.create({ data: { name: 'Trần Thị B', email: 'tranthib@vju.ac.vn', password: defaultPassword, role: Role.INSTRUCTOR } }),
    prisma.user.create({ data: { name: 'Lê Hoàng C', email: 'lehoangc@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
    prisma.user.create({ data: { name: 'Phạm Minh D', email: 'phamminhd@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
    prisma.user.create({ data: { name: 'Vũ Đức E', email: 'vuduce@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
    prisma.user.create({ data: { name: 'Đặng Thanh F', email: 'dangthanhf@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
    prisma.user.create({ data: { name: 'Bùi Quang G', email: 'buiquangg@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
    prisma.user.create({ data: { name: 'Hoàng Mai H', email: 'hoangmaih@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
    prisma.user.create({ data: { name: 'Đỗ Tuấn K', email: 'dotuank@st.vju.ac.vn', password: defaultPassword, role: Role.STUDENT } }),
  ]);
  const instructors = users.filter(u => u.role === Role.INSTRUCTOR);
  const students = users.filter(u => u.role === Role.STUDENT);

  // 2. TẠO 5 PHÒNG LAB
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: 'Lab IoT & Robotics', location: 'Tầng 3 - Tòa A', capacity: 30 } }),
    prisma.room.create({ data: { name: 'Lab Hóa Phân Tích', location: 'Tầng 2 - Tòa B', capacity: 25 } }),
    prisma.room.create({ data: { name: 'Lab Cơ điện tử', location: 'Tầng 1 - Tòa A', capacity: 40 } }),
    prisma.room.create({ data: { name: 'Lab Sinh học phân tử', location: 'Tầng 4 - Tòa C', capacity: 20 } }),
    prisma.room.create({ data: { name: 'Lab Máy tính hiệu năng cao', location: 'Tầng 5 - Tòa A', capacity: 50 } }),
    prisma.room.create({ data: { name: 'Lab Trí tuệ nhân tạo (AI)', location: 'Tầng 6 - Tòa A', capacity: 40 } }),
    prisma.room.create({ data: { name: 'Lab Mạng máy tính', location: 'Tầng 3 - Tòa C', capacity: 35 } }),
    prisma.room.create({ data: { name: 'Lab Năng lượng tái tạo', location: 'Tầng 1 - Tòa B', capacity: 20 } }),
  ]);

  // 2.5. TẠO 3 KHÓA HỌC (COURSES)
  const courses = await Promise.all([
    prisma.course.create({ data: { name: 'Thực hành Vi điều khiển', code: 'VDK2026', instructor_id: instructors[0].id } }),
    prisma.course.create({ data: { name: 'Thí nghiệm Hóa vô cơ', code: 'HVC2026', instructor_id: instructors[1].id } }),
    prisma.course.create({ data: { name: 'Thực hành Robot công nghiệp', code: 'ROB2026', instructor_id: instructors[0].id } }),
    prisma.course.create({ data: { name: 'Thực hành Lập trình Mạng', code: 'LTM2026', instructor_id: instructors[1].id } }),
    prisma.course.create({ data: { name: 'Thiết kế Vi mạch', code: 'ICD2026', instructor_id: instructors[0].id } }),
  ]);

  // 3. TẠO 20 THIẾT BỊ
  const equipmentNames = [
    'Máy đo dao động Oscilloscope', 'Kính hiển vi điện tử', 'Cánh tay robot DOBOT', 'Máy ly tâm tốc độ cao', 
    'Máy in 3D Resin', 'Trạm hàn khò kĩ thuật số', 'Máy phân tích phổ', 'Tủ sấy chân không',
    'Máy PCR sinh học', 'Bể rung siêu âm', 'Nguồn DC điều chỉnh', 'Máy phát xung',
    'Máy quang phổ UV-Vis', 'Bộ điều khiển PLC', 'Cảm biến lực Force Gauge', 'Máy đo pH để bàn',
    'Máy quét 3D Laser', 'Trạm khí tượng mini', 'Bộ KIT FPGA', 'Mô hình tua-bin gió', 'Cảm biến quang học'
  ];
  const statuses = [EquipmentStatus.AVAILABLE, EquipmentStatus.AVAILABLE, EquipmentStatus.IN_USE, EquipmentStatus.MAINTENANCE, EquipmentStatus.BROKEN];
  
  const equipments = await Promise.all(equipmentNames.map((name, index) => {
    return prisma.equipment.create({
      data: {
        name: name,
        serial_number: `EQ-${1000 + index}`,
        status: statuses[index % statuses.length], // Phân bổ trạng thái
        room_id: rooms[index % rooms.length].id, // Phân bổ đều vào 5 phòng
      }
    });
  }));

  // 4. TẠO HÓA CHẤT
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const expiredDate = new Date();
  expiredDate.setMonth(expiredDate.getMonth() - 1); // 1 hóa chất hết hạn để test

  await prisma.chemical.createMany({
    data: [
      { name: 'Axit Sunfuric', formula: 'H2SO4', quantity_stock: 5.5, unit: 'Lít', expiration_date: nextYear },
      { name: 'Natri Clorua', formula: 'NaCl', quantity_stock: 10.0, unit: 'kg', expiration_date: nextYear },
      { name: 'Ethanol 90%', formula: 'C2H5OH', quantity_stock: 20.0, unit: 'Lít', expiration_date: nextYear },
      { name: 'Axit Clohidric', formula: 'HCl', quantity_stock: 5.0, unit: 'Lít', expiration_date: nextYear },
      { name: 'Đồng(II) Sunfat', formula: 'CuSO4', quantity_stock: 2.5, unit: 'kg', expiration_date: expiredDate },
      { name: 'Axit Nitric', formula: 'HNO3', quantity_stock: 8.0, unit: 'Lít', expiration_date: nextYear },
      { name: 'Thuốc tím', formula: 'KMnO4', quantity_stock: 1.5, unit: 'kg', expiration_date: expiredDate },
      { name: 'Amoniac', formula: 'NH3', quantity_stock: 15.0, unit: 'Lít', expiration_date: nextYear },
    ]
  });

  // 4. TẠO SYSTEM SETTINGS
  await prisma.systemSetting.createMany({
    data: [
      { key: 'MIN_BOOKING_MINUTES', value: '30', description: 'Thời gian tối thiểu mỗi ca (phút)' },
      { key: 'MAX_BOOKING_MINUTES', value: '240', description: 'Thời gian tối đa mỗi ca (phút)' },
      { key: 'BOOKING_BUFFER_MINUTES', value: '15', description: 'Thời gian đệm giữa 2 ca (phút)' },
      { key: 'BOOKING_START_HOUR', value: '7', description: 'Giờ bắt đầu mở cửa' },
      { key: 'BOOKING_END_HOUR', value: '22', description: 'Giờ đóng cửa' },
    ]
  });

  // 5. TẠO 20 BOOKINGS
  const bookingStatuses = [
    BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.IN_USE, 
    BookingStatus.COMPLETED, BookingStatus.CANCELED, BookingStatus.REJECTED
  ];
  
  const purposes = [
    'Nghiên cứu khoa học cấp trường', 'Làm đồ án tốt nghiệp', 'Thực hành môn Vi điều khiển',
    'Thí nghiệm hóa sinh', 'Lắp ráp mô hình robot', 'Chạy mô phỏng AI', 'Bảo trì định kỳ'
  ];

  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    // Generate random start time from -7 days to +7 days
    const dayOffset = Math.floor(Math.random() * 15) - 7;
    const hour = 8 + Math.floor(Math.random() * 8); // 8 AM to 4 PM
    
    const startTime = new Date(now);
    startTime.setDate(now.getDate() + dayOffset);
    startTime.setHours(hour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(hour + 2, 0, 0, 0); // Mỗi ca 2 tiếng

    await prisma.booking.create({
      data: {
        user_id: students[i % students.length].id,
        room_id: rooms[i % rooms.length].id,
        equipment_id: (i % 2 === 0) ? equipments[i].id : null, // 50% có đặt thiết bị
        start_time: startTime,
        end_time: endTime,
        status: bookingStatuses[i % bookingStatuses.length],
        purpose: purposes[i % purposes.length],
        course_id: (i % 3 === 0) ? courses[i % courses.length].id : null,
      }
    });
  }

  // 6. TẠO BÁO CÁO SỰ CỐ (REPORTS) ĐỂ DEMO
  const reports = await Promise.all([
    prisma.report.create({
      data: {
        title: 'Kính hiển vi bị mờ thấu kính',
        description: 'Khi quan sát mẫu vật ở độ phóng đại 100x thì hình ảnh bị nhòe, không rõ nét.',
        user_id: students[0].id,
        equipment_id: equipments[1].id, // Kính hiển vi
        room_id: rooms[3].id,
        status: 'OPEN',
      }
    }),
    prisma.report.create({
      data: {
        title: 'Máy in 3D bị kẹt nhựa',
        description: 'Đầu phun bị tắc nhựa Resin, cần vệ sinh gấp.',
        user_id: students[1].id,
        equipment_id: equipments[4].id, // Máy in 3D
        room_id: rooms[0].id,
        status: 'IN_PROGRESS',
      }
    }),
    prisma.report.create({
      data: {
        title: 'Điều hòa phòng máy tính không mát',
        description: 'Phòng nóng, điều hòa số 2 bị chảy nước và không phả hơi lạnh.',
        user_id: instructors[0].id,
        room_id: rooms[4].id,
        status: 'RESOLVED',
      }
    }),
    prisma.report.create({
      data: {
        title: 'Tủ hút khí độc phát tiếng ồn lớn',
        description: 'Khi bật quạt hút mức cao, tủ có tiếng kêu lạch cạch rất to.',
        user_id: instructors[1].id,
        equipment_id: equipments[15].id,
        room_id: rooms[1].id,
        status: 'OPEN',
      }
    }),
    prisma.report.create({
      data: {
        title: 'Máy tính số 5 không lên màn hình',
        description: 'Bật case vẫn chạy nhưng màn hình báo No Signal.',
        user_id: students[4].id,
        room_id: rooms[4].id,
        status: 'OPEN',
      }
    })
  ]);

  // 7. TẠO DỮ LIỆU ĐIỂM DANH (CHECK-IN)
  await prisma.checkInRecord.create({
    data: {
      user_id: students[2].id,
      room_id: rooms[0].id,
      status: 'ACTIVE',
      check_in: new Date(),
    }
  });
  await prisma.checkInRecord.create({
    data: {
      user_id: students[3].id,
      room_id: rooms[1].id,
      status: 'COMPLETED',
      check_in: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // 2 tiếng trước
      check_out: new Date(),
    }
  });

  console.log('Seed dữ liệu hoàn tất!');
}

main()
  .catch((e) => {
    console.error('Có lỗi xảy ra trong quá trình Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
