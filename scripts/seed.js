const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- CONFIGURATION ---
const CONSTANTS = {
  PASS: '123456',
  CAMPUS: {
    HL: { id: 1, name: 'FPTU Hoa Lac', address: 'Khu CNC Hoa Lac, Ha Noi' },
    HCM: { id: 2, name: 'FPTU Ho Chi Minh', address: 'Khu CNC, Thu Duc, TP.HCM' }
  }
};

// Helper: Tính ngày giờ
const getDate = (days, slot) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  const slotHours = {
    1: { start: 7, end: 9 },
    2: { start: 9, end: 11 },
    3: { start: 13, end: 15 },
    4: { start: 15, end: 17 },
    5: { start: 17, end: 19 },
    6: { start: 19, end: 21 }
  };

  const time = slotHours[slot] || { start: 7, end: 9 };
  const startTime = new Date(date); startTime.setHours(time.start, 0, 0, 0);
  const endTime = new Date(date); endTime.setHours(time.end, 0, 0, 0);
  return { startTime, endTime };
};

async function main() {
  console.log('🌱 Start seeding database...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(CONSTANTS.PASS, salt);

  // =================================================================
  // 1. MASTER DATA (CAMPUS & TYPES)
  // =================================================================
  console.log('Creating Master Data...');

  // 1.1 Campus
  const campusHL = await prisma.campus.upsert({
    where: { id: CONSTANTS.CAMPUS.HL.id },
    update: {}, create: { ...CONSTANTS.CAMPUS.HL, isActive: true }
  });
  const campusHCM = await prisma.campus.upsert({
    where: { id: CONSTANTS.CAMPUS.HCM.id },
    update: {}, create: { ...CONSTANTS.CAMPUS.HCM, isActive: true }
  });

  // 1.2 Facility Types (Full Enums)
  const facilityTypesData = [
    { name: 'Phòng học', desc: 'Phòng học lý thuyết tiêu chuẩn' },
    { name: 'Phòng Lab', desc: 'Phòng thực hành máy tính cấu hình cao' },
    { name: 'Hội trường', desc: 'Sức chứa lớn cho sự kiện' },
    { name: 'Sân thể thao', desc: 'Sân bóng đá, bóng rổ, cầu lông' },
    { name: 'Phòng Tự Học', desc: 'Library Pods, không gian yên tĩnh' },
    { name: 'Phòng Studio', desc: 'Phòng quay phim, chụp ảnh, thu âm' },
    { name: 'Phòng Nhạc cụ', desc: 'Phòng tập nhạc cách âm' }
  ];

  // Map để lưu ID sau khi tạo
  const facilityTypeMap = {}; 
  for (const type of facilityTypesData) {
    const res = await prisma.facilityType.upsert({
      where: { name: type.name },
      update: {}, create: { name: type.name, description: type.desc }
    });
    facilityTypeMap[type.name] = res.id;
  }

  // 1.3 Booking Types
  const bookingTypesData = [
    { name: 'Sự kiện lớn', weight: 100 },
    { name: 'Lớp học', weight: 80 },
    { name: 'Sinh hoạt CLB', weight: 50 },
    { name: 'Hội thảo/Workshop', weight: 40 },
    { name: 'Tự học/Học nhóm', weight: 10 }
  ];
  const bookingTypeMap = {};
  for (const type of bookingTypesData) {
    const res = await prisma.bookingType.upsert({
      where: { name: type.name },
      update: {}, create: { name: type.name, priorityWeight: type.weight }
    });
    bookingTypeMap[type.name] = res.id;
  }

  // 1.4 Equipment Types
  const equipmentTypesData = [
    { name: 'Máy chiếu HDMI', cat: 'Visual' },
    { name: 'Màn hình LED', cat: 'Visual' },
    { name: 'Loa thùng JBL', cat: 'Audio' },
    { name: 'Micro không dây', cat: 'Audio' },
    { name: 'Piano cơ', cat: 'Musical' },
    { name: 'Trống Jazz', cat: 'Musical' },
    { name: 'Router Wifi 6', cat: 'Network' },
    { name: 'Điều hòa', cat: 'General' }
  ];
  const eqTypeMap = {};
  for (const eq of equipmentTypesData) {
    const res = await prisma.equipmentType.upsert({
      where: { name: eq.name },
      update: {}, create: { name: eq.name, category: eq.cat }
    });
    eqTypeMap[eq.name] = res.id;
  }

  // =================================================================
  // 2. USERS GENERATION (BOTH CAMPUSES)
  // =================================================================
  console.log('Creating Users...');

  const createUser = async (email, name, role, campusId) => {
    return await prisma.user.upsert({
      where: { email },
      update: { fullName: name, campusId, role }, // Update lại info nếu chạy lại seed
      create: {
        email, fullName: name, passwordHash: hashedPassword,
        role, campusId, isActive: true
      }
    });
  };

  // Tạo Admin & Guard cho mỗi Campus
  const adminHL = await createUser('admin.hl@fpt.edu.vn', 'Admin Hoa Lac', 'FACILITY_ADMIN', campusHL.id);
  const adminHCM = await createUser('admin.hcm@fpt.edu.vn', 'Admin HCM', 'FACILITY_ADMIN', campusHCM.id);
  
  const guardHL = await createUser('guard.hl@fpt.edu.vn', 'Bảo vệ Hoa Lac', 'SECURITY_GUARD', campusHL.id);
  const guardHCM = await createUser('guard.hcm@fpt.edu.vn', 'Bảo vệ HCM', 'SECURITY_GUARD', campusHCM.id);

  // Tạo Giảng viên
  await createUser('gv.hl@fpt.edu.vn', 'Giảng viên HL', 'LECTURER', campusHL.id);
  await createUser('gv.hcm@fpt.edu.vn', 'Giảng viên HCM', 'LECTURER', campusHCM.id);

  // Tạo Demo Student (để login test)
  const studentHL = await createUser('student.hl@demo.com', 'Sinh viên Demo HL', 'STUDENT', campusHL.id);
  const studentHCM = await createUser('student.hcm@demo.com', 'Sinh viên Demo HCM', 'STUDENT', campusHCM.id);

  // Tạo danh sách sinh viên thường cho mỗi cơ sở (để gán CLB sau này)
  const studentsPoolHL = [];
  const studentsPoolHCM = [];
  for(let i=1; i<=5; i++) {
    studentsPoolHL.push(await createUser(`stu.hl.${i}@fpt.edu.vn`, `Student HL ${i}`, 'STUDENT', campusHL.id));
    studentsPoolHCM.push(await createUser(`stu.hcm.${i}@fpt.edu.vn`, `Student HCM ${i}`, 'STUDENT', campusHCM.id));
  }

  // =================================================================
  // 3. CLUBS & LEADERS (Đánh dấu Leader vào tên User)
  // =================================================================
  console.log('Creating Clubs & Assigning Leaders...');

  const clubsData = [
    // Hoa Lac Clubs
    { code: 'JS-CLUB', name: 'JS Software Club', campus: campusHL.id, leader: studentsPoolHL[0] },
    { code: 'DANCE-HL', name: 'Hanoi Dance', campus: campusHL.id, leader: studentsPoolHL[1] },
    // HCM Clubs
    { code: 'F-CODE', name: 'F-Code Academic', campus: campusHCM.id, leader: studentsPoolHCM[0] },
    { code: 'MELODY', name: 'Melody Music', campus: campusHCM.id, leader: studentsPoolHCM[1] },
    { code: 'CHESS', name: 'Chess Club', campus: campusHCM.id, leader: studentsPoolHCM[2] }
  ];

  const createdClubs = {};

  for (const c of clubsData) {
    // 1. Tạo Club
    const club = await prisma.club.upsert({
      where: { code: c.code },
      update: { leaderId: c.leader.id },
      create: {
        code: c.code, name: c.name, description: `CLB ${c.name} tại ${c.campus === 1 ? 'HL' : 'HCM'}`,
        campusId: c.campus, leaderId: c.leader.id
      }
    });
    createdClubs[c.code] = club;

    // 2. [QUAN TRỌNG] Cập nhật tên User để đánh dấu là Leader
    // Format: "Tên Gốc [Leader MÃ-CLB]"
    const baseName = c.leader.fullName.split(' [')[0]; // Lấy tên gốc tránh duplicate tag nếu chạy seed nhiều lần
    await prisma.user.update({
      where: { id: c.leader.id },
      data: { fullName: `${baseName} [Leader ${c.code}]` }
    });
  }

  // =================================================================
  // 4. FACILITIES (PHÂN BỐ ĐỀU 2 CƠ SỞ)
  // =================================================================
  console.log('Generating Facilities...');

  // Helper tạo phòng
  const generateFacilities = async (campusId, prefix) => {
    const facilities = [];
    
    // 10 Phòng học thường (R101 -> R110)
    for (let i=1; i<=10; i++) {
      facilities.push(await prisma.facility.create({
        data: {
          name: `${prefix}-R10${i}`, campusId, typeId: facilityTypeMap['Phòng học'], capacity: 30, status: 'ACTIVE',
          description: 'Phòng học tiêu chuẩn có điều hòa',
          imageUrls: ["https://via.placeholder.com/400x300?text=Classroom"]
        }
      }));
    }
    // 5 Phòng Lab (Lab-01 -> Lab-05)
    for (let i=1; i<=5; i++) {
      const lab = await prisma.facility.create({
        data: {
          name: `${prefix}-Lab0${i}`, campusId, typeId: facilityTypeMap['Phòng Lab'], capacity: 40, status: 'ACTIVE',
          description: 'Phòng Lab máy tính cấu hình cao (i9, RTX 4060)',
          imageUrls: ["https://via.placeholder.com/400x300?text=Lab"]
        }
      });
      facilities.push(lab);
      // Thêm thiết bị cho Lab
      await prisma.facilityEquipment.create({ data: { facilityId: lab.id, equipmentTypeId: eqTypeMap['Điều hòa'], quantity: 2, condition: 'GOOD' }});
    }
    // 2 Hội trường
    facilities.push(await prisma.facility.create({ data: { name: `${prefix}-Hall A`, campusId, typeId: facilityTypeMap['Hội trường'], capacity: 200, status: 'ACTIVE' } }));
    facilities.push(await prisma.facility.create({ data: { name: `${prefix}-Hall B`, campusId, typeId: facilityTypeMap['Hội trường'], capacity: 500, status: 'ACTIVE' } }));
    
    // 5 Phòng Tự học (Pod)
    for (let i=1; i<=5; i++) {
      facilities.push(await prisma.facility.create({ data: { name: `${prefix}-Pod ${i}`, campusId, typeId: facilityTypeMap['Phòng Tự Học'], capacity: 6, status: 'ACTIVE' } }));
    }

    // 1 Sân bóng, 1 Phòng nhạc
    const field = await prisma.facility.create({ data: { name: `${prefix}-Sân bóng`, campusId, typeId: facilityTypeMap['Sân thể thao'], capacity: 20, status: 'ACTIVE' } });
    const musicRoom = await prisma.facility.create({ data: { name: `${prefix}-Music Room`, campusId, typeId: facilityTypeMap['Phòng Nhạc cụ'], capacity: 15, status: 'ACTIVE' } });
    
    facilities.push(field, musicRoom);
    return { facilities, musicRoom, field }; // Trả về để dùng cho booking
  };

  // Xóa data cũ của bảng Facility (nếu cần sạch sẽ) để tránh spam data khi tạo bằng create()
  // Lưu ý: Nếu DB có Booking constraint thì phải xóa Booking trước. 
  // Ở đây giả định bạn chạy npx prisma migrate reset trước khi seed.
  
  const facilHL = await generateFacilities(campusHL.id, 'HL');
  const facilHCM = await generateFacilities(campusHCM.id, 'HCM');

  // =================================================================
  // 5. PRIORITIES & BOOKINGS (SAMPLE SCENARIOS)
  // =================================================================
  console.log('Creating Priorities & Bookings...');

  // 5.1 Gán Priority
  // CLB Nhạc HCM được ưu tiên phòng Music Room
  await prisma.clubPriority.create({
    data: { 
      clubId: createdClubs['MELODY'].id, 
      facilityId: facilHCM.musicRoom.id, 
      priorityScore: 50, 
      note: 'Ưu tiên CLB Melody tập luyện' 
    }
  });
  
  // CLB JS HL được ưu tiên Lab
  await prisma.clubPriority.create({
    data: { 
      clubId: createdClubs['JS-CLUB'].id, 
      facilityId: facilHL.facilities[10].id, // Lab đầu tiên của HL
      priorityScore: 40, 
      note: 'Ưu tiên training code' 
    }
  });

  // 5.2 Tạo Booking Mẫu
  // Scenario 1: SV HCM đặt phòng Tự học (Đã hoàn tất)
  const datePast = getDate(-1, 1);
  const booking1 = await prisma.booking.create({
    data: {
      userId: studentHCM.id,
      facilityId: facilHCM.facilities[17].id, // Pod 1 HCM
      bookingTypeId: bookingTypeMap['Tự học/Học nhóm'],
      startTime: datePast.startTime,
      endTime: datePast.endTime,
      status: 'COMPLETED',
      isCheckedIn: true,
      attendeeCount: 4
    }
  });
  await prisma.bookingHistory.create({
    data: { bookingId: booking1.id, oldStatus: 'APPROVED', newStatus: 'COMPLETED', changeReason: 'Guard Check-out', changedById: guardHCM.id }
  });

  // Scenario 2: Leader Melody đặt phòng Nhạc (Approved - Sắp tới)
  const dateFuture = getDate(1, 5); // Ngày mai, slot 5
  await prisma.booking.create({
    data: {
      userId: studentsPoolHCM[1].id, // Leader Melody
      facilityId: facilHCM.musicRoom.id,
      bookingTypeId: bookingTypeMap['Sinh hoạt CLB'],
      startTime: dateFuture.startTime,
      endTime: dateFuture.endTime,
      status: 'APPROVED',
      attendeeCount: 10
    }
  });

  // Scenario 3: SV HL đặt Sân bóng (Pending)
  const datePending = getDate(2, 4); // Kia, slot 4
  await prisma.booking.create({
    data: {
      userId: studentHL.id,
      facilityId: facilHL.field.id,
      bookingTypeId: bookingTypeMap['Sự kiện lớn'], // Cố tình chọn sai loại để test
      startTime: datePending.startTime,
      endTime: datePending.endTime,
      status: 'PENDING',
      attendeeCount: 22
    }
  });

  // =================================================================
  // 6. MAINTENANCE LOGS
  // =================================================================
  console.log('Creating Maintenance Logs...');
  
  // Bảo trì 1 phòng học ở HL
  const maintDate = getDate(5, 1);
  await prisma.maintenanceLog.create({
    data: {
      facility: { connect: { id: facilHL.facilities[0].id } }, // Phòng R101 HL
      startDate: maintDate.startTime,
      endDate: new Date(maintDate.startTime.getTime() + 24 * 60 * 60 * 1000), // 1 ngày
      reason: 'Sửa điều hòa rò nước',
      status: 'SCHEDULED',
      reportedBy: { connect: { id: adminHL.id } }
    }
  });

  console.log('✅ Seeding completed successfully!');
  console.log('------------------------------------------------');
  console.log('🔑 TEST ACCOUNTS (Pass: 123456):');
  console.log(`   - Student HCM: student.hcm@demo.com`);
  console.log(`   - Admin HCM:   admin.hcm@fpt.edu.vn`);
  console.log(`   - Club Leader: ${studentsPoolHCM[1].email} (Melody)`);
  console.log(`   - Student HL:  student.hl@demo.com`);
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });