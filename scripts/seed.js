const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper: Tính thời gian cho Booking (Ngày hôm nay + days, set giờ theo Slot)
const getDate = (days, slot) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  // Mapping Slot cơ bản (tương đối)
  const slotHours = {
    1: { start: 7, end: 9 },
    2: { start: 9, end: 11 },
    3: { start: 13, end: 15 },
    4: { start: 15, end: 17 },
    5: { start: 17, end: 19 }
  };

  const time = slotHours[slot] || { start: 7, end: 9 };
  
  const startTime = new Date(date);
  startTime.setHours(time.start, 0, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(time.end, 0, 0, 0);

  return { startTime, endTime };
};

async function main() {
  console.log('🌱 Start seeding database...');

  // --- 0. Chuẩn bị Password Hash ---
  const salt = await bcrypt.genSalt(10);
  const commonPassword = await bcrypt.hash('123456', salt); // Pass: 123456

  // --- 1. Tạo Campus ---
  console.log('Creating Campuses...');
  
  // Tạo Campus Hoa Lạc
  const campusHL = await prisma.campus.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'FPTU Hoa Lac', address: 'Khu CNC Hoa Lac, Ha Noi', isActive: true }
  });

  // Tạo Campus HCM
  const campusHCM = await prisma.campus.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'FPTU Ho Chi Minh', address: 'Khu CNC, Thu Duc, TP.HCM', isActive: true }
  });
  
  // --- 2. Tạo Master Data (Types) ---
  console.log('Creating Master Data (Types)...');
  
  const upsertType = async (model, name, data) => {
    const existing = await model.findFirst({ where: { name } });
    if (existing) return existing;
    return model.create({ data });
  };

  const ftClassroom = await upsertType(prisma.facilityType, 'Phòng học', { name: 'Phòng học', description: 'Phòng học lý thuyết tiêu chuẩn' });
  const ftLab = await upsertType(prisma.facilityType, 'Phòng Lab', { name: 'Phòng Lab', description: 'Phòng thực hành máy tính cấu hình cao' });
  const ftHall = await upsertType(prisma.facilityType, 'Hội trường', { name: 'Hội trường', description: 'Sức chứa lớn cho sự kiện' });
  const ftSport = await upsertType(prisma.facilityType, 'Sân thể thao', { name: 'Sân thể thao', description: 'Sân bóng, sân cầu lông' });
  const ftSelfStudy = await upsertType(prisma.facilityType, 'Phòng Tự Học', { name: 'Phòng Tự Học', description: 'Không gian yên tĩnh, Library Pods' });

  // Booking Types
  const btEvent = await upsertType(prisma.bookingType, 'Sự kiện lớn', { name: 'Sự kiện lớn', priorityWeight: 100 });
  const btClass = await upsertType(prisma.bookingType, 'Lớp học', { name: 'Lớp học', priorityWeight: 80 });
  const btClub = await upsertType(prisma.bookingType, 'Sinh hoạt CLB', { name: 'Sinh hoạt CLB', priorityWeight: 50 });
  const btSelfStudy = await upsertType(prisma.bookingType, 'Tự học/Học nhóm', { name: 'Tự học/Học nhóm', priorityWeight: 10 });

  // Equipment Types
  const etProjector = await upsertType(prisma.equipmentType, 'Máy chiếu HDMI', { name: 'Máy chiếu HDMI', category: 'Visual' });
  const etSpeaker = await upsertType(prisma.equipmentType, 'Loa thùng JBL', { name: 'Loa thùng JBL', category: 'Audio' });
  const etMic = await upsertType(prisma.equipmentType, 'Micro không dây', { name: 'Micro không dây', category: 'Audio' });
  const etWifi = await upsertType(prisma.equipmentType, 'Router Wifi 6', { name: 'Router Wifi 6', category: 'Network' });
  const etAC = await upsertType(prisma.equipmentType, 'Điều hòa', { name: 'Điều hòa', category: 'General' });

  // --- 3. Tạo Users ---
  console.log('Creating Users...');

  const createUsers = async (campusId, role, count, prefixEmail, startIdx = 1) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      const email = `${prefixEmail}${idx}@fpt.edu.vn`;
      
      const user = await prisma.user.upsert({
        where: { email: email },
        update: {},
        create: {
          email: email,
          fullName: `${role} ${idx} (${campusId === campusHL.id ? 'HL' : 'HCM'})`,
          passwordHash: commonPassword,
          role: role,
          campusId: campusId,
          isActive: true
        }
      });
      users.push(user);
    }
    return users;
  };

  // Tạo Users cho HL & HCM
  const adminsHL = await createUsers(campusHL.id, 'FACILITY_ADMIN', 2, 'admin_hl'); 
  const guardsHL = await createUsers(campusHL.id, 'SECURITY_GUARD', 2, 'sec_hl');   
  const lecturersHL = await createUsers(campusHL.id, 'LECTURER', 3, 'lec_hl');   
  const studentsHL = await createUsers(campusHL.id, 'STUDENT', 5, 'stu_hl'); 

  const adminsHCM = await createUsers(campusHCM.id, 'FACILITY_ADMIN', 2, 'admin_hcm');
  const guardsHCM = await createUsers(campusHCM.id, 'SECURITY_GUARD', 2, 'sec_hcm');
  const lecturersHCM = await createUsers(campusHCM.id, 'LECTURER', 3, 'lec_hcm');
  const studentsHCM = await createUsers(campusHCM.id, 'STUDENT', 5, 'stu_hcm');

  // Tạo 1 User Demo để test login
  const demoEmail = 'student@demo.com';
  const demoStudent = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      fullName: 'Demo Student (HCM)',
      passwordHash: commonPassword,
      role: 'STUDENT',
      campusId: campusHCM.id,
      isActive: true
    }
  });
  console.log('-> Created/Updated Demo User: student@demo.com / 123456');

  // --- 4. Tạo Clubs & Facilities ---
  console.log('Creating Resources...');

  // Clubs
  const clubFCode = await prisma.club.upsert({
    where: { code: 'FCODE' },
    update: {},
    create: { name: 'F-Code', code: 'FCODE', description: 'CLB Lập trình', campusId: campusHCM.id, leaderId: studentsHCM[0].id }
  });
  
  const clubMusic = await prisma.club.upsert({
    where: { code: 'MELODY' },
    update: {},
    create: { name: 'Melody Club', code: 'MELODY', description: 'CLB Âm nhạc', campusId: campusHCM.id, leaderId: studentsHCM[1].id }
  });

  // Facilities Helper
  const createFacility = async (name, campusId, typeId, capacity, status = 'ACTIVE') => {
    return await prisma.facility.create({
      data: {
        name, campusId, typeId, capacity, status,
        description: `Phòng ${name} tiêu chuẩn FPT`,
        imageUrls: ["https://via.placeholder.com/600x400?text=FPTU+Facility"]
      }
    });
  };

  // Chỉ tạo Facility nếu chưa có (Check sơ bộ để tránh spam data)
  const existingFacilities = await prisma.facility.count();
  if (existingFacilities === 0) {
      console.log('Generating Facilities...');
      
      // Tạo 20 Phòng học thường (HCM)
      for (let i = 101; i <= 120; i++) {
        const room = await createFacility(`R${i}`, campusHCM.id, ftClassroom.id, 30);
        if (i % 2 === 0) {
          await prisma.facilityEquipment.create({ data: { facilityId: room.id, equipmentTypeId: etAC.id, quantity: 2, condition: 'GOOD' } });
        }
      }

      // Tạo 10 Phòng Tự học (HCM)
      const pods = [];
      for (let i = 1; i <= 10; i++) {
        const pod = await createFacility(`Pod ${i}`, campusHCM.id, ftSelfStudy.id, 6);
        pods.push(pod);
      }

      // Tạo Phòng chức năng (HCM)
      const labAI = await createFacility('Lab AI', campusHCM.id, ftLab.id, 40);
      const hallA = await createFacility('Hall A', campusHCM.id, ftHall.id, 200);
      const soccerField = await createFacility('Sân bóng 1', campusHCM.id, ftSport.id, 20);

      // Gán Priority
      await prisma.clubPriority.upsert({
        where: { clubId_facilityId: { clubId: clubFCode.id, facilityId: labAI.id } },
        update: {},
        create: { clubId: clubFCode.id, facilityId: labAI.id, priorityScore: 50, note: "Ưu tiên F-Code train AI" }
      });

      // --- 5. Tạo Booking Data Mẫu ---
      console.log('Creating Demo Bookings...');

      const pastDate = getDate(-2, 1); 
      const completedBooking = await prisma.booking.create({
        data: {
          userId: demoStudent.id,
          facilityId: pods[0].id,
          bookingTypeId: btSelfStudy.id,
          startTime: pastDate.startTime,
          endTime: pastDate.endTime,
          status: 'COMPLETED',
          isCheckedIn: true,
          attendeeCount: 4
        }
      });
      // Tạo thêm log lịch sử nếu cần
      await prisma.bookingHistory.create({
        data: { bookingId: completedBooking.id, oldStatus: 'APPROVED', newStatus: 'COMPLETED', changeReason: 'Guard Check-out', changedById: guardsHCM[0].id }
      });

      // --- 6. Tạo Maintenance Log (Đã sửa lỗi facility & reportedBy) ---
      console.log('Creating Maintenance Logs...');
      const maintDate = getDate(10, 1);
      
      await prisma.maintenanceLog.create({
        data: {
          // [FIX 1] Dùng connect cho facility
          facility: { connect: { id: soccerField.id } }, 
          startDate: maintDate.startTime,
          endDate: new Date(maintDate.startTime.getTime() + 48 * 60 * 60 * 1000), 
          reason: 'Cắt cỏ và sơn lại vạch sân',
          status: 'SCHEDULED',
          // [FIX 2] Dùng connect cho reportedBy
          reportedBy: { connect: { id: adminsHCM[0].id } } 
        }
      });
  } else {
      console.log('⚠️ Facilities already exist. Skipping facility & booking generation to avoid duplicates.');
  }

  console.log('✅ Seeding completed!');
  console.log('👉 Use User: student@demo.com / 123456 to test.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });