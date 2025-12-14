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

// [FIX] Helper an toàn: Tìm trước, nếu không có thì tạo (Thay thế upsert)
const safeCreate = async (model, name, createData) => {
  const existing = await model.findFirst({ where: { name } });
  if (existing) return existing;
  return await model.create({ data: createData });
};

async function main() {
  console.log('🌱 Start seeding database...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(CONSTANTS.PASS, salt);

  // =================================================================
  // 1. MASTER DATA (CAMPUS & TYPES)
  // =================================================================
  console.log('Creating Master Data...');

  // 1.1 Campus (Dùng upsert vì ID là unique)
  const campusHL = await prisma.campus.upsert({
    where: { id: CONSTANTS.CAMPUS.HL.id },
    update: {}, create: { ...CONSTANTS.CAMPUS.HL, isActive: true }
  });
  const campusHCM = await prisma.campus.upsert({
    where: { id: CONSTANTS.CAMPUS.HCM.id },
    update: {}, create: { ...CONSTANTS.CAMPUS.HCM, isActive: true }
  });

  // 1.2 Facility Types (Full Enums) - [FIXED using safeCreate]
  const facilityTypesData = [
    { name: 'Phòng học', desc: 'Phòng học lý thuyết tiêu chuẩn' },
    { name: 'Phòng Lab', desc: 'Phòng thực hành máy tính cấu hình cao' },
    { name: 'Hội trường', desc: 'Sức chứa lớn cho sự kiện' },
    { name: 'Sân thể thao', desc: 'Sân bóng đá, bóng rổ, cầu lông' },
    { name: 'Phòng Tự Học', desc: 'Library Pods, không gian yên tĩnh' },
    { name: 'Phòng Studio', desc: 'Phòng quay phim, chụp ảnh, thu âm' },
    { name: 'Phòng Nhạc cụ', desc: 'Phòng tập nhạc cách âm' }
  ];

  const facilityTypeMap = {}; 
  for (const type of facilityTypesData) {
    // Sửa lỗi tại đây: Dùng safeCreate thay vì upsert
    const res = await safeCreate(prisma.facilityType, type.name, {
      name: type.name,
      description: type.desc
    });
    facilityTypeMap[type.name] = res.id;
  }

  // 1.3 Booking Types - [FIXED using safeCreate]
  const bookingTypesData = [
    { name: 'Sự kiện lớn', weight: 100 },
    { name: 'Lớp học', weight: 80 },
    { name: 'Sinh hoạt CLB', weight: 50 },
    { name: 'Hội thảo/Workshop', weight: 40 },
    { name: 'Tự học/Học nhóm', weight: 10 }
  ];
  const bookingTypeMap = {};
  for (const type of bookingTypesData) {
    const res = await safeCreate(prisma.bookingType, type.name, {
      name: type.name,
      priorityWeight: type.weight
    });
    bookingTypeMap[type.name] = res.id;
  }

  // 1.4 Equipment Types - [FIXED using safeCreate]
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
    const res = await safeCreate(prisma.equipmentType, eq.name, {
      name: eq.name,
      category: eq.cat
    });
    eqTypeMap[eq.name] = res.id;
  }

  // =================================================================
  // 2. USERS GENERATION (BOTH CAMPUSES)
  // =================================================================
  console.log('Creating Users...');

  const createUser = async (email, name, role, campusId) => {
    return await prisma.user.upsert({
      where: { email }, // Email là unique nên upsert OK
      update: { fullName: name, campusId, role }, 
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

  // Tạo danh sách sinh viên thường cho mỗi cơ sở
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
    // 1. Tạo Club (Code là unique nên upsert OK)
    const club = await prisma.club.upsert({
      where: { code: c.code },
      update: { leaderId: c.leader.id },
      create: {
        code: c.code, name: c.name, description: `CLB ${c.name} tại ${c.campus === 1 ? 'HL' : 'HCM'}`,
        campusId: c.campus, leaderId: c.leader.id
      }
    });
    createdClubs[c.code] = club;

    // 2. Cập nhật tên User để đánh dấu là Leader
    const baseName = c.leader.fullName.split(' [')[0]; 
    await prisma.user.update({
      where: { id: c.leader.id },
      data: { fullName: `${baseName} [Leader ${c.code}]` }
    });
  }

  // =================================================================
  // 4. FACILITIES (PHÂN BỐ ĐỀU 2 CƠ SỞ)
  // =================================================================
  console.log('Generating Facilities...');

  // Helper tạo phòng (Dùng create vì name không unique trong schema)
  // Để tránh duplicate nếu chạy seed nhiều lần, ta check findFirst trước
  const generateFacilities = async (campusId, prefix) => {
    const facilities = [];
    
    // Helper tìm hoặc tạo phòng
    const ensureRoom = async (name, typeId, capacity, desc, img) => {
      const existing = await prisma.facility.findFirst({ where: { name, campusId } });
      if (existing) return existing;
      return await prisma.facility.create({
        data: {
          name, campusId, typeId, capacity, status: 'ACTIVE',
          description: desc,
          imageUrls: [img]
        }
      });
    };

    // 10 Phòng học thường (R101 -> R110)
    for (let i=1; i<=10; i++) {
      facilities.push(await ensureRoom(
        `${prefix}-R10${i}`, facilityTypeMap['Phòng học'], 30, 
        'Phòng học tiêu chuẩn có điều hòa', "https://via.placeholder.com/400x300?text=Classroom"
      ));
    }
    
    // 5 Phòng Lab (Lab-01 -> Lab-05)
    for (let i=1; i<=5; i++) {
      const lab = await ensureRoom(
        `${prefix}-Lab0${i}`, facilityTypeMap['Phòng Lab'], 40,
        'Phòng Lab máy tính cấu hình cao (i9, RTX 4060)', "https://via.placeholder.com/400x300?text=Lab"
      );
      facilities.push(lab);
      
      // Thêm thiết bị cho Lab (Chỉ thêm nếu chưa có)
      const count = await prisma.facilityEquipment.count({ where: { facilityId: lab.id } });
      if (count === 0) {
        await prisma.facilityEquipment.create({ data: { facilityId: lab.id, equipmentTypeId: eqTypeMap['Điều hòa'], quantity: 2, condition: 'GOOD' }});
      }
    }

    // 2 Hội trường
    facilities.push(await ensureRoom(`${prefix}-Hall A`, facilityTypeMap['Hội trường'], 200, 'Hội trường lớn', "https://via.placeholder.com/600x400?text=Hall"));
    facilities.push(await ensureRoom(`${prefix}-Hall B`, facilityTypeMap['Hội trường'], 500, 'Hội trường sự kiện', "https://via.placeholder.com/600x400?text=Hall"));
    
    // 5 Phòng Tự học (Pod)
    for (let i=1; i<=5; i++) {
      facilities.push(await ensureRoom(`${prefix}-Pod ${i}`, facilityTypeMap['Phòng Tự Học'], 6, 'Góc tự học yên tĩnh', "https://via.placeholder.com/300x300?text=Pod"));
    }

    // 1 Sân bóng, 1 Phòng nhạc
    const field = await ensureRoom(`${prefix}-Sân bóng`, facilityTypeMap['Sân thể thao'], 20, 'Sân cỏ nhân tạo', "https://via.placeholder.com/600x400?text=Field");
    const musicRoom = await ensureRoom(`${prefix}-Music Room`, facilityTypeMap['Phòng Nhạc cụ'], 15, 'Phòng cách âm', "https://via.placeholder.com/400x300?text=Music");
    
    facilities.push(field, musicRoom);
    return { facilities, musicRoom, field };
  };

  const facilHL = await generateFacilities(campusHL.id, 'HL');
  const facilHCM = await generateFacilities(campusHCM.id, 'HCM');

  // =================================================================
  // 5. PRIORITIES & BOOKINGS
  // =================================================================
  console.log('Creating Priorities & Bookings...');

  // 5.1 Gán Priority (Dùng Upsert)
  const upsertPriority = async (clubId, facilityId, score, note) => {
    await prisma.clubPriority.upsert({
      where: { clubId_facilityId: { clubId, facilityId } },
      update: {},
      create: { clubId, facilityId, priorityScore: score, note }
    });
  };

  await upsertPriority(createdClubs['MELODY'].id, facilHCM.musicRoom.id, 50, 'Ưu tiên CLB Melody');
  await upsertPriority(createdClubs['JS-CLUB'].id, facilHL.facilities[10].id, 40, 'Ưu tiên training code');

  // 5.2 Tạo Booking Mẫu
  // Scenario 1: SV HCM đặt phòng Tự học (Đã hoàn tất)
  const datePast = getDate(-1, 1);
  // Booking ID tự tăng, không upsert được dễ dàng, nên dùng create. 
  // Để tránh spam booking khi chạy lại seed, ta check trước.
  const checkBooking1 = await prisma.booking.findFirst({ where: { userId: studentHCM.id, status: 'COMPLETED' } });
  if (!checkBooking1) {
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
  }

  // Scenario 2: Leader Melody đặt phòng Nhạc (Approved)
  const dateFuture = getDate(1, 5); 
  const checkBooking2 = await prisma.booking.findFirst({ where: { userId: studentsPoolHCM[1].id, status: 'APPROVED' } });
  if (!checkBooking2) {
    await prisma.booking.create({
      data: {
        userId: studentsPoolHCM[1].id, 
        facilityId: facilHCM.musicRoom.id,
        bookingTypeId: bookingTypeMap['Sinh hoạt CLB'],
        startTime: dateFuture.startTime,
        endTime: dateFuture.endTime,
        status: 'APPROVED',
        attendeeCount: 10
      }
    });
  }

  // Scenario 3: SV HL đặt Sân bóng (Pending)
  const datePending = getDate(2, 4); 
  const checkBooking3 = await prisma.booking.findFirst({ where: { userId: studentHL.id, status: 'PENDING' } });
  if (!checkBooking3) {
    await prisma.booking.create({
      data: {
        userId: studentHL.id,
        facilityId: facilHL.field.id,
        bookingTypeId: bookingTypeMap['Sự kiện lớn'],
        startTime: datePending.startTime,
        endTime: datePending.endTime,
        status: 'PENDING',
        attendeeCount: 22
      }
    });
  }

  // =================================================================
  // 6. MAINTENANCE LOGS
  // =================================================================
  console.log('Creating Maintenance Logs...');
  
  const maintDate = getDate(5, 1);
  const checkMaint = await prisma.maintenanceLog.findFirst({ where: { facilityId: facilHL.facilities[0].id } });
  
  if (!checkMaint) {
    await prisma.maintenanceLog.create({
      data: {
        facility: { connect: { id: facilHL.facilities[0].id } }, 
        startDate: maintDate.startTime,
        endDate: new Date(maintDate.startTime.getTime() + 24 * 60 * 60 * 1000), 
        reason: 'Sửa điều hòa rò nước',
        status: 'SCHEDULED',
        reportedBy: { connect: { id: adminHL.id } }
      }
    });
  }

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