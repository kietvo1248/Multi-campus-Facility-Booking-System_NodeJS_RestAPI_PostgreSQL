const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...');

  // --- 0. Chuẩn bị Password Hash (Dùng chung cho tất cả user để chạy cho nhanh) ---
  const salt = await bcrypt.genSalt(10);
  const commonPassword = await bcrypt.hash('123456', salt); // Pass mặc định: 123456

  // --- 1. Tạo Campus ---
  console.log('Creating Campuses...');
  const campusHL = await prisma.campus.create({
    data: { name: 'FPTU Hoa Lac', address: 'Khu CNC Hoa Lac, Ha Noi' }
  });
  const campusHCM = await prisma.campus.create({
    data: { name: 'FPTU Ho Chi Minh', address: 'Khu CNC, Thu Duc, TP.HCM' }
  });

  // --- 2. Tạo Master Data (Types) ---
  console.log('Creating Master Data (Types)...');
  
  // 2.1 Facility Types
  const ftClassroom = await prisma.facilityType.create({ data: { name: 'Phòng học', description: 'Phòng học lý thuyết tiêu chuẩn' } });
  const ftLab = await prisma.facilityType.create({ data: { name: 'Phòng Lab', description: 'Phòng thực hành máy tính' } });
  const ftHall = await prisma.facilityType.create({ data: { name: 'Hội trường', description: 'Sức chứa lớn cho sự kiện' } });
  const ftSport = await prisma.facilityType.create({ data: { name: 'Sân thể thao', description: 'Sân bóng, sân cầu lông' } });

  // 2.2 Booking Types (Quy định độ ưu tiên)
  const btEvent = await prisma.bookingType.create({ data: { name: 'Sự kiện lớn', priorityWeight: 100 } });
  const btClass = await prisma.bookingType.create({ data: { name: 'Lớp học chính quy', priorityWeight: 80 } });
  const btClub = await prisma.bookingType.create({ data: { name: 'Sinh hoạt CLB', priorityWeight: 50 } });
  const btSelf = await prisma.bookingType.create({ data: { name: 'Tự học', priorityWeight: 10 } });

  // 2.3 Equipment Types
  const etProjector = await prisma.equipmentType.create({ data: { name: 'Máy chiếu', category: 'Visual' } });
  const etSpeaker = await prisma.equipmentType.create({ data: { name: 'Loa thùng', category: 'Audio' } });
  const etMic = await prisma.equipmentType.create({ data: { name: 'Micro không dây', category: 'Audio' } });
  const etWifi = await prisma.equipmentType.create({ data: { name: 'Router Wifi Gaming', category: 'Network' } });

  // --- 3. Helper Function tạo User ---
  const createUsers = async (campusId, role, count, prefixEmail, startIdx = 1) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      const user = await prisma.user.create({
        data: {
          email: `${prefixEmail}${idx}@fpt.edu.vn`,
          fullName: `${role} ${idx} - ${campusId === campusHL.id ? 'HL' : 'HCM'}`,
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

  // --- 4. Tạo Users cho từng Campus ---
  console.log('Creating Users per Campus...');

  // 4.1 Users Hòa Lạc
  await createUsers(campusHL.id, 'STAFF', 2, 'staff_hl');    // 2 Quản lý
  await createUsers(campusHL.id, 'SECURITY', 2, 'sec_hl');   // 2 Bảo vệ
  await createUsers(campusHL.id, 'LECTURER', 3, 'lec_hl');   // 3 Giảng viên
  const studentsHL = await createUsers(campusHL.id, 'STUDENT', 6, 'stu_hl'); // 6 Sinh viên

  // 4.2 Users HCM
  await createUsers(campusHCM.id, 'STAFF', 2, 'staff_hcm');
  await createUsers(campusHCM.id, 'SECURITY', 2, 'sec_hcm');
  await createUsers(campusHCM.id, 'LECTURER', 3, 'lec_hcm');
  const studentsHCM = await createUsers(campusHCM.id, 'STUDENT', 6, 'stu_hcm');

  // --- 5. Tạo Clubs & Update Leader Role ---
  console.log('Creating Clubs...');

  // Helper tạo Club
  const createClub = async (name, campusId, studentLeader) => {
    // 1. Update role sinh viên thành CLUB_LEADER
    await prisma.user.update({
      where: { id: studentLeader.id },
      data: { role: 'CLUB_LEADER' }
    });
    // 2. Tạo Club
    return await prisma.club.create({
      data: {
        name: name,
        description: `Câu lạc bộ ${name} tại campus`,
        campusId: campusId,
        leaderId: studentLeader.id
      }
    });
  };

  // CLB Hòa Lạc (Lấy 2 sv đầu tiên làm leader)
  const clubCodeHL = await createClub('JS Club HL', campusHL.id, studentsHL[0]);
  const clubMusicHL = await createClub('Melody Club HL', campusHL.id, studentsHL[1]);

  // CLB HCM (Lấy 2 sv đầu tiên làm leader)
  const clubBasketHCM = await createClub('Basketball HCM', campusHCM.id, studentsHCM[0]);
  const clubEventHCM = await createClub('Event Org HCM', campusHCM.id, studentsHCM[1]);

  // --- 6. Tạo Facilities (Phòng ốc) ---
  console.log('Creating Facilities...');

  const createFacility = async (name, campusId, typeId, capacity) => {
    return await prisma.facility.create({
      data: {
        name,
        campusId,
        typeId,
        capacity,
        status: 'AVAILABLE',
        description: `Phòng ${name} đầy đủ tiện nghi`,
        imageUrls: ["https://via.placeholder.com/300"]
      }
    });
  };

  // Facilities Hòa Lạc
  const hlRoom101 = await createFacility('Alpha 101', campusHL.id, ftClassroom.id, 40);
  const hlLabA = await createFacility('Lab IoT', campusHL.id, ftLab.id, 30);
  const hlHall = await createFacility('Grand Hall HL', campusHL.id, ftHall.id, 200);
  const hlField = await createFacility('Sân bóng HL', campusHL.id, ftSport.id, 50);

  // Facilities HCM
  const hcmRoom202 = await createFacility('Beta 202', campusHCM.id, ftClassroom.id, 35);
  const hcmLabB = await createFacility('Lab AI', campusHCM.id, ftLab.id, 25);
  const hcmHall = await createFacility('Grand Hall HCM', campusHCM.id, ftHall.id, 300);
  const hcmField = await createFacility('Sân bóng rổ', campusHCM.id, ftSport.id, 20);

  // --- 7. Setup Data Phụ (Equipment & Priority) ---
  console.log('Setting up Equipments & Priorities...');

  // 7.1 Thêm thiết bị vào phòng (Ví dụ Lab AI HCM)
  await prisma.facilityEquipment.createMany({
    data: [
      { facilityId: hcmLabB.id, equipmentTypeId: etProjector.id, condition: 'GOOD', quantity: 1 },
      { facilityId: hcmLabB.id, equipmentTypeId: etWifi.id, condition: 'GOOD', quantity: 2 },
    ]
  });

  // 7.2 Thêm Club Priority (Quyền ưu tiên)
  // CLB Bóng rổ được ưu tiên ở Sân bóng rổ (Điểm cộng: 50)
  await prisma.clubPriority.create({
    data: {
      clubId: clubBasketHCM.id,
      facilityId: hcmField.id,
      priorityScore: 50
    }
  });

  // CLB Nhạc HL được ưu tiên ở Hội trường HL
  await prisma.clubPriority.create({
    data: {
      clubId: clubMusicHL.id,
      facilityId: hlHall.id,
      priorityScore: 30
    }
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });