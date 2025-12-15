const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- CONFIGURATION ---
const CONFIG = {
  PASS: '123456',
  COUNTS: {
    STUDENTS_PER_CAMPUS: 20, // 20 SV mỗi cơ sở
    LECTURERS_PER_CAMPUS: 5, // 5 GV mỗi cơ sở
    ROOMS_NORMAL: 30,        // 30 phòng học thường
    ROOMS_LAB: 10,           // 10 phòng Lab
    BOOKINGS_PER_USER: 3     // Mỗi user có ít nhất 3 booking
  }
};

// Helper: Tính ngày giờ linh hoạt
const getDateTime = (offsetDays, hour, duration = 2) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  
  const startTime = new Date(date);
  startTime.setHours(hour, 0, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(hour + duration, 0, 0, 0);
  
  return { startTime, endTime };
};

// Helper: Safe Upsert (Tìm trước, nếu không có mới tạo)
const safeCreate = async (model, uniqueQuery, createData) => {
  const existing = await model.findFirst({ where: uniqueQuery });
  if (existing) return existing;
  return await model.create({ data: createData });
};

async function main() {
  console.log('🚀 Start seeding MASSIVE data...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(CONFIG.PASS, salt);

  // =================================================================
  // 1. MASTER DATA
  // =================================================================
  console.log('🏗️  Creating Master Data (Campus, Types)...');

  // Campus
  const campusHL = await prisma.campus.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'FPTU Hoa Lac', address: 'Hanoi', isActive: true } });
  const campusHCM = await prisma.campus.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: 'FPTU Ho Chi Minh', address: 'HCMC', isActive: true } });

  // Facility Types
  const ftMap = {};
  const types = [
    { name: 'Phòng học', desc: 'Standard Classroom' },
    { name: 'Phòng Lab', desc: 'Computer Lab High Spec' },
    { name: 'Hội trường', desc: 'Large Event Hall' },
    { name: 'Sân thể thao', desc: 'Sport Field' },
    { name: 'Phòng Tự Học', desc: 'Private Pods' },
    { name: 'Phòng Họp', desc: 'Conference Room' },
    { name: 'Studio', desc: 'Media Production' }
  ];
  for (const t of types) {
    const res = await safeCreate(prisma.facilityType, { name: t.name }, { name: t.name, description: t.desc });
    ftMap[t.name] = res.id;
  }

  // Booking Types
  const btMap = {};
  const bTypes = [
    { name: 'Sự kiện lớn', w: 100 }, { name: 'Lớp học', w: 80 }, 
    { name: 'Sinh hoạt CLB', w: 50 }, { name: 'Hội thảo', w: 40 }, 
    { name: 'Tự học/Học nhóm', w: 10 }
  ];
  for (const t of bTypes) {
    const res = await safeCreate(prisma.bookingType, { name: t.name }, { name: t.name, priorityWeight: t.w });
    btMap[t.name] = res.id;
  }

  // Equipment Types
  const eqMap = {};
  const eqTypes = [
    { name: 'Projector 4K', cat: 'Visual' }, { name: 'Speaker System', cat: 'Audio' },
    { name: 'Wifi 6 Router', cat: 'Network' }, { name: 'Air Conditioner', cat: 'General' },
    { name: 'Whiteboard', cat: 'General' }
  ];
  for (const t of eqTypes) {
    const res = await safeCreate(prisma.equipmentType, { name: t.name }, { name: t.name, category: t.cat });
    eqMap[t.name] = res.id;
  }

  // =================================================================
  // 2. USERS GENERATION (Massive)
  // =================================================================
  console.log('👥 Creating Users (Staff, Lecturers, Students)...');

  // [UPDATED] Thêm field 'admin' vào structure để dùng sau này
  const users = { HL: { stu: [], lec: [], admin: null }, HCM: { stu: [], lec: [], admin: null } };

  // Helper create User
  const ensureUser = async (email, name, role, campusId) => {
    return await prisma.user.upsert({
      where: { email },
      update: { fullName: name, campusId, role },
      create: { email, fullName: name, passwordHash: hashedPassword, role, campusId, isActive: true }
    });
  };

  // 2.1 Staffs (Admin & Guard)
  users.HL.admin = await ensureUser('admin.hl@fpt.edu.vn', 'Admin Hoa Lac', 'FACILITY_ADMIN', campusHL.id);
  const guardHL = await ensureUser('guard.hl@fpt.edu.vn', 'Mr. Bao Ve HL', 'SECURITY_GUARD', campusHL.id);
  
  users.HCM.admin = await ensureUser('admin.hcm@fpt.edu.vn', 'Admin HCM', 'FACILITY_ADMIN', campusHCM.id);
  const guardHCM = await ensureUser('guard.hcm@fpt.edu.vn', 'Mr. Bao Ve HCM', 'SECURITY_GUARD', campusHCM.id);

  // 2.2 Lecturers (At least 2 per campus)
  for (let i = 1; i <= CONFIG.COUNTS.LECTURERS_PER_CAMPUS; i++) {
    users.HL.lec.push(await ensureUser(`lec.hl.${i}@fpt.edu.vn`, `Giảng viên HL ${i}`, 'LECTURER', campusHL.id));
    users.HCM.lec.push(await ensureUser(`lec.hcm.${i}@fpt.edu.vn`, `Giảng viên HCM ${i}`, 'LECTURER', campusHCM.id));
  }

  // 2.3 Students (Massive)
  // Demo accounts
  users.HL.stu.push(await ensureUser('student.hl@demo.com', 'Demo Student HL', 'STUDENT', campusHL.id));
  users.HCM.stu.push(await ensureUser('student.hcm@demo.com', 'Demo Student HCM', 'STUDENT', campusHCM.id));

  for (let i = 1; i <= CONFIG.COUNTS.STUDENTS_PER_CAMPUS; i++) {
    users.HL.stu.push(await ensureUser(`stu.hl.${i}@fpt.edu.vn`, `Sinh viên HL ${i}`, 'STUDENT', campusHL.id));
    users.HCM.stu.push(await ensureUser(`stu.hcm.${i}@fpt.edu.vn`, `Sinh viên HCM ${i}`, 'STUDENT', campusHCM.id));
  }

  // =================================================================
  // 3. FACILITIES GENERATION
  // =================================================================
  console.log('🏢 Building Facilities...');

  const facilities = { HL: [], HCM: [] };

  const buildCampusFacilities = async (campusId, prefix, list) => {
    // Classrooms
    for (let i = 101; i < 101 + CONFIG.COUNTS.ROOMS_NORMAL; i++) {
      const room = await safeCreate(prisma.facility, { name: `${prefix}-R${i}`, campusId }, {
        name: `${prefix}-R${i}`, campusId, typeId: ftMap['Phòng học'], capacity: 30, status: 'ACTIVE',
        description: 'Phòng học tiêu chuẩn', imageUrls: ["https://via.placeholder.com/300"]
      });
      list.push(room);
    }
    // Labs
    for (let i = 1; i <= CONFIG.COUNTS.ROOMS_LAB; i++) {
      const lab = await safeCreate(prisma.facility, { name: `${prefix}-Lab${i}`, campusId }, {
        name: `${prefix}-Lab${i}`, campusId, typeId: ftMap['Phòng Lab'], capacity: 40, status: 'ACTIVE',
        description: 'Phòng Lab cấu hình cao', imageUrls: ["https://via.placeholder.com/300"]
      });
      list.push(lab);
      
      // Add Equipment (Check exists)
      const eqExist = await prisma.facilityEquipment.findFirst({ where: { facilityId: lab.id }});
      if(!eqExist){
        await prisma.facilityEquipment.createMany({ data: [{ facilityId: lab.id, equipmentTypeId: eqMap['Air Conditioner'], quantity: 2, condition: 'GOOD' }] });
      }
    }
    // Special Rooms
    const hall = await safeCreate(prisma.facility, { name: `${prefix}-Hall`, campusId }, { name: `${prefix}-Hall`, campusId, typeId: ftMap['Hội trường'], capacity: 500, status: 'ACTIVE' });
    const studio = await safeCreate(prisma.facility, { name: `${prefix}-Studio`, campusId }, { name: `${prefix}-Studio`, campusId, typeId: ftMap['Studio'], capacity: 10, status: 'ACTIVE' });
    const meeting = await safeCreate(prisma.facility, { name: `${prefix}-Meeting`, campusId }, { name: `${prefix}-Meeting`, campusId, typeId: ftMap['Phòng Họp'], capacity: 15, status: 'ACTIVE' });
    list.push(hall, studio, meeting);
  };

  await buildCampusFacilities(campusHL.id, 'HL', facilities.HL);
  await buildCampusFacilities(campusHCM.id, 'HCM', facilities.HCM);

  // =================================================================
  // 4. CLUBS & PRIORITIES
  // =================================================================
  console.log('🛡️  Setting up Clubs & Priorities...');

  const createClub = async (code, name, campusId, leader) => {
    const club = await prisma.club.upsert({
      where: { code },
      update: { leaderId: leader.id },
      create: { code, name, campusId, leaderId: leader.id, description: `CLB ${name}` }
    });
    // Update Leader Name
    const baseName = leader.fullName.split(' [')[0];
    await prisma.user.update({ where: { id: leader.id }, data: { fullName: `${baseName} [Leader ${code}]` } });
    return club;
  };

  // Helper create priority safely
  const createPriority = async (clubId, facilityId, priorityScore, note) => {
    const exists = await prisma.clubPriority.findUnique({
        where: { clubId_facilityId: { clubId, facilityId } }
    });
    if (!exists) {
        await prisma.clubPriority.create({ data: { clubId, facilityId, priorityScore, note } });
    }
  };

  // CLB HCM
  const fCode = await createClub('F-CODE', 'F-Code Academic', campusHCM.id, users.HCM.stu[0]);
  const melody = await createClub('MELODY', 'Melody Music', campusHCM.id, users.HCM.stu[1]);
  const basket = await createClub('BASKET', 'Basketball Club', campusHCM.id, users.HCM.stu[2]);

  // Priority HCM
  await createPriority(fCode.id, facilities.HCM.find(f => f.name.includes('Lab1')).id, 50, 'Training Code');
  await createPriority(fCode.id, facilities.HCM.find(f => f.name.includes('Meeting')).id, 30, 'Họp Core Team');

  // Priority HL
  const jsClub = await createClub('JS-CLUB', 'JS Software', campusHL.id, users.HL.stu[0]);
  await createPriority(jsClub.id, facilities.HL.find(f => f.name.includes('Lab1')).id, 40, 'Training JS');

  // =================================================================
  // 5. BOOKINGS GENERATION (Random & Logic)
  // =================================================================
  console.log('📅 Generating Random Bookings...');

  const generateBookingsForCampus = async (campusUsers, campusFacilities, bookingTypes) => {
    const admin = campusUsers.admin; // Lấy Admin của cơ sở để gán vào changedBy

    // 5.1 Giảng viên đặt Lớp học (Recurring giả lập)
    const lecturers = campusUsers.lec;
    for (const lec of lecturers) {
      const room = campusFacilities[Math.floor(Math.random() * 10)]; // Random phòng học
      for (let w = 0; w < 4; w++) { // 4 tuần
        const { startTime, endTime } = getDateTime(1 + (w * 7), 9, 2); // Slot 2
        
        const exist = await prisma.booking.findFirst({ where: { userId: lec.id, facilityId: room.id, startTime } });
        
        if (!exist) {
            await prisma.booking.create({
              data: {
                userId: lec.id,
                facilityId: room.id,
                bookingTypeId: btMap['Lớp học'],
                startTime, endTime, status: 'APPROVED', attendeeCount: 30
              }
            });
        }
      }
    }

    // 5.2 Sinh viên đặt phòng (Random)
    const students = campusUsers.stu;
    const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
    
    for (const stu of students) {
      const count = Math.floor(Math.random() * 3) + 3;
      for (let k = 0; k < count; k++) {
        const offset = Math.floor(Math.random() * 15) - 5; 
        const hour = 7 + Math.floor(Math.random() * 5) * 2;
        const { startTime, endTime } = getDateTime(offset, hour, 2);
        
        const room = campusFacilities[Math.floor(Math.random() * campusFacilities.length)];
        let status = statuses[Math.floor(Math.random() * statuses.length)];

        if (offset < 0) {
          status = ['COMPLETED', 'CANCELLED', 'REJECTED'][Math.floor(Math.random() * 3)];
        }

        const exist = await prisma.booking.findFirst({ where: { userId: stu.id, startTime } });

        if (!exist) {
            const booking = await prisma.booking.create({
              data: {
                userId: stu.id,
                facilityId: room.id,
                bookingTypeId: btMap['Tự học/Học nhóm'],
                startTime, endTime, status,
                isCheckedIn: status === 'COMPLETED',
                attendeeCount: 5
              }
            });

            // [FIXED] Tạo History giả với cú pháp connect và changedBy
            if (status !== 'PENDING') {
              await prisma.bookingHistory.create({
                data: { 
                    booking: { connect: { id: booking.id } },
                    oldStatus: 'PENDING', 
                    newStatus: status, 
                    changeReason: 'System Seed', 
                    // Liên kết người thay đổi là Admin của cơ sở đó
                    changedBy: { connect: { id: admin.id } } 
                }
              });
            }
        }
      }
    }
  };

  await generateBookingsForCampus(users.HL, facilities.HL, btMap);
  await generateBookingsForCampus(users.HCM, facilities.HCM, btMap);

  // =================================================================
  // 6. MAINTENANCE
  // =================================================================
  console.log('🔧 Scheduling Maintenance...');
  
  const studioHCM = facilities.HCM.find(f => f.name.includes('Studio'));
  const maintTime = getDateTime(7, 0, 24); // Cả ngày
  
  const existMaint = await prisma.maintenanceLog.findFirst({ where: { facilityId: studioHCM.id, startDate: maintTime.startTime } });
  
  if (!existMaint) {
      await prisma.maintenanceLog.create({
        data: {
          facility: { connect: { id: studioHCM.id } },
          startDate: maintTime.startTime,
          endDate: maintTime.endTime,
          reason: 'Nâng cấp thiết bị cách âm',
          status: 'SCHEDULED',
          reportedBy: { connect: { id: users.HCM.admin.id } } // [Fixed] Dùng connect ID cho chắc chắn
        }
      });
  }

  console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('-------------------------------------------------------');
  console.log('🔑 CREDENTIALS (Pass: 123456):');
  console.log(`   [HCM] Admin:    admin.hcm@fpt.edu.vn`);
  console.log(`   [HCM] Lecturer: lec.hcm.1@fpt.edu.vn`);
  console.log(`   [HCM] Leader:   ${users.HCM.stu[0].email} (F-Code)`);
  console.log(`   [HCM] Student:  student.hcm@demo.com`);
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