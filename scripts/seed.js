const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- CONFIGURATION ---
const CONFIG = {
  PASS: '123456',
  // Giới hạn số lượng phòng để dễ xảy ra xung đột khi test
  ROOMS_PER_CAMPUS: 5, 
};

// Helper: Tính ngày giờ linh hoạt
// offsetDays: lệch bao nhiêu ngày so với hôm nay (âm là quá khứ)
// hour: giờ bắt đầu (0-23)
// duration: thời lượng (giờ)
const getDateTime = (offsetDays, hour, duration = 2) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  
  const startTime = new Date(date);
  startTime.setHours(hour, 0, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(hour + duration, 0, 0, 0);
  
  return { startTime, endTime };
};

// Helper: Safe Upsert
const safeCreate = async (model, uniqueQuery, createData) => {
  const existing = await model.findFirst({ where: uniqueQuery });
  if (existing) return existing;
  return await model.create({ data: createData });
};

async function main() {
  console.log('🚀 Start seeding SPECIFIC SCENARIOS...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(CONFIG.PASS, salt);

  // =================================================================
  // 1. MASTER DATA (Campus, Types)
  // =================================================================
  console.log('🏗️  1. Creating Master Data...');

  // Campus
  const campusHL = await prisma.campus.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'FPTU Hoa Lac', address: 'Hanoi', isActive: true } });
  const campusHCM = await prisma.campus.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: 'FPTU Ho Chi Minh', address: 'HCMC', isActive: true } });

  // Facility Types
  const ftMap = {};
  const types = [
    { name: 'Phòng học', desc: 'Standard Classroom' },
    { name: 'Phòng Lab', desc: 'Computer Lab High Spec' },
    { name: 'Hội trường', desc: 'Large Event Hall' },
    { name: 'Studio', desc: 'Media Room' }
  ];
  for (const t of types) {
    const res = await safeCreate(prisma.facilityType, { name: t.name }, { name: t.name, description: t.desc });
    ftMap[t.name] = res.id;
  }

  // Booking Types
  const btMap = {};
  const bTypes = [
    { name: 'Sự kiện lớn', w: 100 }, 
    { name: 'Lớp học', w: 80 }, 
    { name: 'Sinh hoạt CLB', w: 50 }, 
    { name: 'Hội thảo', w: 40 }, 
    { name: 'Tự học/Học nhóm', w: 10 }
  ];
  for (const t of bTypes) {
    const res = await safeCreate(prisma.bookingType, { name: t.name }, { name: t.name, priorityWeight: t.w });
    btMap[t.name] = res.id;
  }

  // Equipment Types
  const eqTypes = ['Projector', 'Air Conditioner', 'Whiteboard', 'Microphone'];
  const eqMap = {};
  for (const t of eqTypes) {
    const res = await safeCreate(prisma.equipmentType, { name: t }, { name: t, category: 'General' });
    eqMap[t] = res.id;
  }

  // =================================================================
  // 2. USERS (Tạo đúng số lượng yêu cầu)
  // =================================================================
  console.log('👥 2. Creating Specific Users...');

  const users = { HL: {}, HCM: {} };

  const ensureUser = async (email, name, role, campusId) => {
    return await prisma.user.upsert({
      where: { email },
      update: { fullName: name, campusId, role, passwordHash: hashedPassword, isActive: true },
      create: { email, fullName: name, passwordHash: hashedPassword, role, campusId, isActive: true }
    });
  };

  // --- HOA LAC Users ---
  users.HL.admin = await ensureUser('admin.hl@fpt.edu.vn', 'Admin Hoa Lac', 'FACILITY_ADMIN', campusHL.id);
  users.HL.guard = await ensureUser('guard.hl@fpt.edu.vn', 'Bảo Vệ HL', 'SECURITY_GUARD', campusHL.id);
  users.HL.lec = await ensureUser('lec.hl@fpt.edu.vn', 'Giảng Viên HL', 'LECTURER', campusHL.id);
  users.HL.leader = await ensureUser('stu.leader.hl@fpt.edu.vn', 'SV Leader HL', 'STUDENT', campusHL.id); // Club Leader
  users.HL.student = await ensureUser('stu.normal.hl@fpt.edu.vn', 'SV Thường HL', 'STUDENT', campusHL.id);

  // --- HCM Users ---
  users.HCM.admin = await ensureUser('admin.hcm@fpt.edu.vn', 'Admin HCM', 'FACILITY_ADMIN', campusHCM.id);
  users.HCM.guard = await ensureUser('guard.hcm@fpt.edu.vn', 'Bảo Vệ HCM', 'SECURITY_GUARD', campusHCM.id);
  users.HCM.lec = await ensureUser('lec.hcm@fpt.edu.vn', 'Giảng Viên HCM', 'LECTURER', campusHCM.id);
  users.HCM.leader = await ensureUser('stu.leader.hcm@fpt.edu.vn', 'SV Leader HCM', 'STUDENT', campusHCM.id); // Club Leader
  users.HCM.student = await ensureUser('stu.normal.hcm@fpt.edu.vn', 'SV Thường HCM', 'STUDENT', campusHCM.id);

  // =================================================================
  // 3. FACILITIES
  // =================================================================
  console.log('🏢 3. Building Facilities...');

  const facilities = { HL: [], HCM: [] };

  const buildCampusFacilities = async (campusId, prefix, list) => {
    // 1 Hội trường
    const hall = await safeCreate(prisma.facility, { name: `${prefix}-Hall`, campusId }, {
        name: `${prefix}-Hall`, campusId, typeId: ftMap['Hội trường'], capacity: 200, status: 'ACTIVE'
    });
    list.push(hall);

    // 1 Lab
    const lab = await safeCreate(prisma.facility, { name: `${prefix}-Lab1`, campusId }, {
        name: `${prefix}-Lab1`, campusId, typeId: ftMap['Phòng Lab'], capacity: 40, status: 'ACTIVE', 
        description: 'Phòng máy cấu hình cao'
    });
    list.push(lab);

    // 3 Phòng học thường (R101, R102, R103)
    for (let i = 1; i <= 3; i++) {
        const room = await safeCreate(prisma.facility, { name: `${prefix}-R10${i}`, campusId }, {
            name: `${prefix}-R10${i}`, campusId, typeId: ftMap['Phòng học'], capacity: 30, status: 'ACTIVE'
        });
        list.push(room);
        
        // Thêm thiết bị cho phòng
        await prisma.facilityEquipment.upsert({
            where: { facilityId_equipmentTypeId_condition: { facilityId: room.id, equipmentTypeId: eqMap['Projector'], condition: 'good' } },
            update: {},
            create: { facilityId: room.id, equipmentTypeId: eqMap['Projector'], quantity: 1, condition: 'good' }
        });
    }
  };

  await buildCampusFacilities(campusHL.id, 'HL', facilities.HL);
  await buildCampusFacilities(campusHCM.id, 'HCM', facilities.HCM);

  // =================================================================
  // 4. CLUBS
  // =================================================================
  console.log('🛡️  4. Setting up Clubs...');

  // HL Club
  const clubHL = await prisma.club.upsert({
    where: { code: 'JS-CLUB' },
    update: { leaderId: users.HL.leader.id },
    create: { code: 'JS-CLUB', name: 'JS Software Club', campusId: campusHL.id, leaderId: users.HL.leader.id }
  });
  // Priority: JS Club ưu tiên Lab1
  await prisma.clubPriority.upsert({
    where: { clubId_facilityId: { clubId: clubHL.id, facilityId: facilities.HL.find(f => f.name.includes('Lab')).id } },
    update: {},
    create: { clubId: clubHL.id, facilityId: facilities.HL.find(f => f.name.includes('Lab')).id, priorityScore: 10, note: 'CLB Code cần phòng máy' }
  });

  // HCM Club
  const clubHCM = await prisma.club.upsert({
    where: { code: 'F-CODE' },
    update: { leaderId: users.HCM.leader.id },
    create: { code: 'F-CODE', name: 'F-Code Academic', campusId: campusHCM.id, leaderId: users.HCM.leader.id }
  });

  // =================================================================
  // 5. BOOKINGS (LOGIC SO SÁNH)
  // =================================================================
  console.log('📅 5. Generating Booking Scenarios...');

  // Hàm tạo booking nhanh
  const createBooking = async (user, facility, typeName, offsetDays, hour, status = 'PENDING', duration = 2) => {
    const { startTime, endTime } = getDateTime(offsetDays, hour, duration);
    const booking = await prisma.booking.create({
        data: {
            userId: user.id,
            facilityId: facility.id,
            bookingTypeId: btMap[typeName],
            startTime, endTime, status,
            attendeeCount: 10,
            isCheckedIn: status === 'COMPLETED'
        }
    });

    // Nếu status không phải pending, tạo history giả lập
    if (status !== 'PENDING') {
        let oldStatus = 'PENDING';
        if (status === 'COMPLETED') oldStatus = 'APPROVED';
        
        await prisma.bookingHistory.create({
            data: {
                bookingId: booking.id,
                oldStatus: oldStatus,
                newStatus: status,
                changeReason: 'Seed Data Init',
                changedById: user.id // Tự đổi hoặc Admin đổi tùy ngữ cảnh
            }
        });
    }
    return booking;
  };

  // Logic tạo booking cho 1 Campus
  const seedCampusBookings = async (campusUsers, campusFacilities) => {
    const { lec, leader, student, admin } = campusUsers;
    const [hall, lab, r101, r102, r103] = campusFacilities; // Mapping theo thứ tự tạo ở trên

    // --------------------------------------------------------
    // A. SCENARIO: TRANH CHẤP (CONFLICT) TẠI PHÒNG R101
    // Mục đích: Để Admin vào thấy 3 đơn trùng giờ -> Duyệt 1 cái -> 2 cái kia Auto Reject
    // --------------------------------------------------------
    console.log(`   - Creating CONFLICT scenario at ${r101.name} (Next Monday 07:00)`);
    // 1. Sinh viên thường đặt
    await createBooking(student, r101, 'Tự học/Học nhóm', 2, 7, 'PENDING'); 
    // 2. Club Leader đặt (Ưu tiên cao hơn chút)
    await createBooking(leader, r101, 'Sinh hoạt CLB', 2, 7, 'PENDING');
    // 3. Giảng viên đặt (Ưu tiên cao nhất)
    await createBooking(lec, r101, 'Lớp học', 2, 7, 'PENDING');


    // --------------------------------------------------------
    // B. SINH VIÊN THƯỜNG (Student Normal)
    // Yêu cầu: 3 Pending, 1 Completed, 1 Rejected, 1 Cancelled
    // --------------------------------------------------------
    console.log(`   - Seeding Student Normal (${student.email})`);
    // 3 Pending (Ngày mai, ngày kia)
    await createBooking(student, r102, 'Tự học/Học nhóm', 1, 9, 'PENDING');
    await createBooking(student, r102, 'Tự học/Học nhóm', 1, 13, 'PENDING');
    await createBooking(student, r103, 'Tự học/Học nhóm', 3, 7, 'PENDING');
    
    // 1 Completed (Hôm qua)
    await createBooking(student, r102, 'Tự học/Học nhóm', -1, 9, 'COMPLETED');

    // 1 Rejected (Hôm qua bị từ chối)
    await prisma.booking.create({
        data: {
            userId: student.id, facilityId: r103.id, bookingTypeId: btMap['Tự học/Học nhóm'],
            startTime: getDateTime(-2, 10).startTime, endTime: getDateTime(-2, 10).endTime,
            status: 'REJECTED'
        }
    }); // (Simplified create for rejected)

    // 1 Cancelled (Tự hủy hôm nay)
    await createBooking(student, r102, 'Tự học/Học nhóm', 0, 18, 'CANCELLED');


    // --------------------------------------------------------
    // C. CLUB LEADER (Student Leader)
    // Yêu cầu: Giống SV + 2 Booking CLB
    // --------------------------------------------------------
    console.log(`   - Seeding Club Leader (${leader.email})`);
    // 3 Pending cá nhân
    await createBooking(leader, r103, 'Tự học/Học nhóm', 4, 8, 'PENDING');
    await createBooking(leader, r103, 'Tự học/Học nhóm', 4, 10, 'PENDING');
    await createBooking(leader, r103, 'Tự học/Học nhóm', 5, 8, 'PENDING');

    // 2 Pending CLB (Tại Hall và Lab)
    await createBooking(leader, hall, 'Sự kiện lớn', 5, 13, 'PENDING');
    await createBooking(leader, lab, 'Sinh hoạt CLB', 6, 13, 'PENDING');

    // Các trạng thái khác
    await createBooking(leader, r103, 'Tự học/Học nhóm', -3, 7, 'COMPLETED');
    await createBooking(leader, r103, 'Tự học/Học nhóm', -2, 7, 'REJECTED');
    await createBooking(leader, r103, 'Tự học/Học nhóm', 0, 20, 'CANCELLED');


    // --------------------------------------------------------
    // D. GIẢNG VIÊN (Lecturer)
    // Yêu cầu: 3 Pending + Lịch định kỳ (Recurring)
    // --------------------------------------------------------
    console.log(`   - Seeding Lecturer (${lec.email})`);
    // 3 Pending rời rạc
    await createBooking(lec, r102, 'Hội thảo', 3, 15, 'PENDING');
    await createBooking(lec, r102, 'Hội thảo', 4, 15, 'PENDING');
    await createBooking(lec, r102, 'Hội thảo', 5, 15, 'PENDING');

    // Lịch định kỳ 4 tuần (Booking Group)
    // Tạo Group
    const group = await prisma.bookingGroup.create({
        data: {
            description: 'Lớp nhập môn lập trình (4 tuần)',
            totalSlots: 4,
            createdById: lec.id // Quan trọng: Liên kết với giảng viên
        }
    });

    // Tạo 4 booking con
    for (let w = 0; w < 4; w++) {
        const { startTime, endTime } = getDateTime(7 + (w * 7), 8, 3); // Bắt đầu từ tuần sau, slot 3 tiếng
        await prisma.booking.create({
            data: {
                userId: lec.id,
                facilityId: r101.id, // Book luôn phòng R101
                bookingTypeId: btMap['Lớp học'],
                startTime, endTime, 
                status: 'PENDING',
                attendeeCount: 35,
                bookingGroupId: group.id
            }
        });
    }
  };

  // Chạy seed cho 2 campus
  console.log('👉 Processing HOA LAC...');
  await seedCampusBookings(users.HL, facilities.HL);
  
  console.log('👉 Processing HCM...');
  await seedCampusBookings(users.HCM, facilities.HCM);

  console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('-------------------------------------------------------');
  console.log('🔑 CREDENTIALS (Pass: 123456):');
  console.log(`   [HL]  Admin: admin.hl@fpt.edu.vn`);
  console.log(`   [HL]  Lec:   lec.hl@fpt.edu.vn`);
  console.log(`   [HL]  Club:  stu.leader.hl@fpt.edu.vn (Leader JS-CLUB)`);
  console.log(`   [HL]  Stu:   stu.normal.hl@fpt.edu.vn`);
  console.log('   ---');
  console.log(`   [HCM] Admin: admin.hcm@fpt.edu.vn`);
  console.log(`   [HCM] Lec:   lec.hcm@fpt.edu.vn`);
  console.log(`   [HCM] Club:  stu.leader.hcm@fpt.edu.vn (Leader F-CODE)`);
  console.log(`   [HCM] Stu:   stu.normal.hcm@fpt.edu.vn`);
  console.log('-------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });