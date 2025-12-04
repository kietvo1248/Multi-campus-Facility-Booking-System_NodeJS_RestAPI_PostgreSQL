const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Tạo Campus
  const campus = await prisma.campus.create({
    data: {
      name: 'FPTU HCM - Quan 9',
      address: 'Khu CNC, Thu Duc, TP.HCM'
    }
  });

  console.log('Created Campus:', campus.name);

  // 2. Tạo Admin User
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('123456', salt); // Pass: 123456

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fpt.edu.vn' },
    update: {},
    create: {
      email: 'admin@fpt.edu.vn',
      fullName: 'System Admin',
      passwordHash: hashedPassword,
      role: 'FACILITY_ADMIN',
      campusId: campus.id, // Liên kết với campus vừa tạo
      isActive: true
    }
  });

  console.log('Created Admin User:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });