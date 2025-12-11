class PrismaFacilityRepository {
  constructor(prisma) { this.prisma = prisma }

  // ... (Giữ nguyên các hàm CRUD cũ) ...
  async findById(id) { return this.prisma.facility.findUnique({ where: { id } }) }

  // [MỚI] Hàm tìm phòng khả dụng
  async findAvailable({ campusId, typeId, minCapacity, startTime, endTime }) {
    // 1. Điều kiện lọc cơ bản
    const whereClause = {
      campusId: campusId, // Chỉ lấy phòng thuộc campus của user
      status: 'ACTIVE',   // Phòng phải đang hoạt động
    };

    if (typeId) whereClause.typeId = Number(typeId);
    if (minCapacity) whereClause.capacity = { gte: Number(minCapacity) };

    // 2. Query DB: Loại trừ các phòng đang bận
    return this.prisma.facility.findMany({
      where: {
        ...whereClause,
        // Loại trừ nếu có Booking bị trùng (Approved hoặc Pending)
        bookings: {
          none: {
            status: { in: ['APPROVED', 'PENDING'] }, 
            OR: [
              // Logic trùng lịch: (StartA < EndB) AND (EndA > StartB)
              {
                startTime: { lt: endTime },
                endTime: { gt: startTime } 
              }
            ]
          }
        },
        // Loại trừ nếu đang Bảo trì
        maintenance: {
            none: {
                startDate: { lt: endTime },
                OR: [{ endDate: { gt: startTime } }, { endDate: null }]
            }
        }
      },
      include: { type: true } // Kèm thông tin loại phòng để hiển thị FE
    });
  }
}
module.exports = PrismaFacilityRepository