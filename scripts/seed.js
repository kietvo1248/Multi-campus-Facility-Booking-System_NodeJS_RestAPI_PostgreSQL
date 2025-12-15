const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- CONFIGURATION ---
const CONFIG = {
  PASS: '123456',
  COUNTS: {
    STUDENTS_PER_CAMPUS: 10,
    LECTURERS_PER_CAMPUS: 5,
    ROOMS_NORMAL: 20,       
    ROOMS_LAB: 5,           
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
  console.log('🚀 Start seeding SPECIFIC data...');
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
  // 2. USERS GENERATION
  // =================================================================
  console.log('👥 Creating Users...');

  const users = { HL: { stu: [], lec: [], admin: null }, HCM: { stu: [], lec: [], admin: null } };

  const ensureUser = async (email, name, role, campusId) => {
    return await prisma.user.upsert({
      where: { email },
      update: { fullName: name, campusId, role },
      create: { email, fullName: name, passwordHash: hashedPassword, role, campusId, isActive: true }
    });
  };

  // Staffs
  users.HL.admin = await ensureUser('admin.hl@fpt.edu.vn', 'Admin Hoa Lac', 'FACILITY_ADMIN', campusHL.id);
  await ensureUser('guard.hl@fpt.edu.vn', 'Mr. Bao Ve HL', 'SECURITY_GUARD', campusHL.id);
  
  users.HCM.admin = await ensureUser('admin.hcm@fpt.edu.vn', 'Admin HCM', 'FACILITY_ADMIN', campusHCM.id);
  await ensureUser('guard.hcm@fpt.edu.vn', 'Mr. Bao Ve HCM', 'SECURITY_GUARD', campusHCM.id);

  // Lecturers & Students
  for (let i = 1; i <= CONFIG.COUNTS.LECTURERS_PER_CAMPUS; i++) {
    users.HL.lec.push(await ensureUser(`lec.hl.${i}@fpt.edu.vn`, `Giảng viên HL ${i}`, 'LECTURER', campusHL.id));
    users.HCM.lec.push(await ensureUser(`lec.hcm.${i}@fpt.edu.vn`, `Giảng viên HCM ${i}`, 'LECTURER', campusHCM.id));
  }
  
  // Demo accounts & Students
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
    return await prisma.club.upsert({
      where: { code },
      update: { leaderId: leader.id },
      create: { code, name, campusId, leaderId: leader.id, description: `CLB ${name}` }
    });
  };

  const fCode = await createClub('F-CODE', 'F-Code Academic', campusHCM.id, users.HCM.stu[0]);
  const jsClub = await createClub('JS-CLUB', 'JS Software', campusHL.id, users.HL.stu[0]);

  // Priority
  const createPriority = async (clubId, facilityId) => {
    const exists = await prisma.clubPriority.findUnique({ where: { clubId_facilityId: { clubId, facilityId } } });
    if (!exists) await prisma.clubPriority.create({ data: { clubId, facilityId, priorityScore: 50, note: 'Priority Room' } });
  };
  await createPriority(fCode.id, facilities.HCM.find(f => f.name.includes('Lab1')).id);
  await createPriority(jsClub.id, facilities.HL.find(f => f.name.includes('Lab1')).id);

  // =================================================================
  // 5. BOOKING GENERATION (LOGIC MỚI)
  // =================================================================
  console.log('📅 Generating Specific Bookings (Pending, Statuses, Empty Rooms)...');

  const generateBookings = async (campusName, campusUsers, campusFacilities, btMap, adminId) => {
    console.log(`   > Processing ${campusName}...`);
    
    // Tách danh sách phòng: Dùng 20 phòng đầu, CHỪA 5 PHÒNG CUỐI LÀM PHÒNG TRỐNG
    const usableFacilities = campusFacilities.slice(0, campusFacilities.length - 5);
    const emptyFacilities = campusFacilities.slice(campusFacilities.length - 5);
    console.log(`     [INFO] Leaving ${emptyFacilities.length} rooms EMPTY: ${emptyFacilities.map(f => f.name).join(', ')}`);

    // Helper random array item
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // 1. [PENDING] 3 Booking phòng thường
    for (let i = 0; i < 3; i++) {
        const { startTime, endTime } = getDateTime(2 + i, 8, 2); // Ngày kia trở đi
        await prisma.booking.create({
            data: {
                userId: campusUsers.stu[i % campusUsers.stu.length].id,
                facilityId: usableFacilities[i].id, // Phòng R101, R102...
                bookingTypeId: btMap['Tự học/Học nhóm'],
                startTime, endTime, status: 'PENDING', attendeeCount: 5
            }
        });
    }

    // 2. [PENDING] 2 Booking cho CLB
    for (let i = 0; i < 2; i++) {
        const { startTime, endTime } = getDateTime(3, 14 + (i * 2), 2); 
        await prisma.booking.create({
            data: {
                userId: campusUsers.stu[0].id, // Giả sử stu[0] là leader
                facilityId: usableFacilities[10 + i].id, // Phòng Lab hoặc Hall
                bookingTypeId: btMap['Sinh hoạt CLB'],
                startTime, endTime, status: 'PENDING', attendeeCount: 20
            }
        });
    }

    // 3. [PENDING - RECURRING] 3 Booking Giảng viên (Chuỗi 4 tuần)
    for (let i = 0; i < 3; i++) {
        const lec = campusUsers.lec[i % campusUsers.lec.length];
        const room = usableFacilities[5 + i]; // Phòng R105, R106...
        
        // Tạo Group [FIX: Bỏ createdById, giữ description và totalSlots]
        const group = await prisma.bookingGroup.create({
            data: { 
                description: `Lớp học phần ${i+1}`, 
                // createdById: lec.id, // [ĐÃ XÓA] Trường này không có trong Schema
                totalSlots: 4 
            }
        });

        // Tạo 4 slots
        for (let w = 0; w < 4; w++) {
            const { startTime, endTime } = getDateTime(1 + (w * 7), 7, 3); // Cách nhau 1 tuần
            await prisma.booking.create({
                data: {
                    userId: lec.id,
                    facilityId: room.id,
                    bookingTypeId: btMap['Lớp học'],
                    startTime, endTime, status: 'PENDING',
                    attendeeCount: 30,
                    bookingGroupId: group.id
                }
            });
        }
    }

    // 4. [STATUS VARIATIONS] 2 Booking cho mỗi trạng thái
    const statuses = ['APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
    
    for (const status of statuses) {
        for (let i = 0; i < 2; i++) {
            let offset = 5; 
            if (status === 'COMPLETED') offset = -5; // Quá khứ
            
            const { startTime, endTime } = getDateTime(offset, 8 + (i*2), 2);
            const room = rand(usableFacilities); // Random trong danh sách được dùng
            const user = rand(campusUsers.stu);

            const booking = await prisma.booking.create({
                data: {
                    userId: user.id,
                    facilityId: room.id,
                    bookingTypeId: btMap['Tự học/Học nhóm'],
                    startTime, endTime, status: status,
                    isCheckedIn: status === 'COMPLETED',
                    attendeeCount: 4
                }
            });

            // Ghi History (Trừ PENDING)
            await prisma.bookingHistory.create({
                data: {
                    booking: { connect: { id: booking.id } },
                    oldStatus: 'PENDING',
                    newStatus: status,
                    changeReason: 'Seed Data Init',
                    changedBy: { connect: { id: adminId } } 
                }
            });
        }
    }
  };

  await generateBookings('HOA LAC', users.HL, facilities.HL, btMap, users.HL.admin.id);
  await generateBookings('HO CHI MINH', users.HCM, facilities.HCM, btMap, users.HCM.admin.id);

  // =================================================================
  // 6. MAINTENANCE (Không đụng vào phòng trống)
  // =================================================================
  console.log('🔧 Scheduling Maintenance...');
  
  const studioHCM = facilities.HCM.find(f => f.name.includes('Studio'));
  const maintTime = getDateTime(7, 0, 24); 
  
  const existMaint = await prisma.maintenanceLog.findFirst({ where: { facilityId: studioHCM.id, startDate: maintTime.startTime } });
  
  if (!existMaint) {
      await prisma.maintenanceLog.create({
        data: {
          facility: { connect: { id: studioHCM.id } },
          startDate: maintTime.startTime,
          endDate: maintTime.endTime,
          reason: 'Nâng cấp thiết bị',
          status: 'SCHEDULED',
          reportedBy: { connect: { id: users.HCM.admin.id } }
        }
      });
  }

  console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('-------------------------------------------------------');
  console.log('🔑 CREDENTIALS (Pass: 123456):');
  console.log(`   [HCM] Admin:    admin.hcm@fpt.edu.vn`);
  console.log(`   [HCM] Lecturer: lec.hcm.1@fpt.edu.vn`);
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