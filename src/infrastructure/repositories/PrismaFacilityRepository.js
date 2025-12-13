class PrismaFacilityRepository {
  constructor(prisma) { this.prisma = prisma }
  list(filters = {}) {
    const where = { status: 'ACTIVE', ...filters }
    return this.prisma.facility.findMany({ where })
  }
  async findAvailable({ campusId, typeId, minCapacity, startTime, endTime }) {
    const whereClause = {
      campusId: campusId, 
      status: 'ACTIVE',
    };
    if (typeId) whereClause.typeId = Number(typeId);
    if (minCapacity) whereClause.capacity = { gte: Number(minCapacity) };

    return this.prisma.facility.findMany({
      where: {
        ...whereClause,
        // Loại trừ các phòng đang có Booking APPROVED hoặc PENDING trong khung giờ này
        bookings: {
          none: {
            status: { in: ['APPROVED', 'PENDING'] }, // Coi như bận nếu đang chờ duyệt hoặc đã duyệt
            OR: [
              {
                startTime: { lt: endTime },
                endTime: { gt: startTime } 
              }
            ]
          }
        },
            maintenance: {
            none: {
                startDate: { lt: endTime },
                OR: [{ endDate: { gt: startTime } }, { endDate: null }]
            }
        }
      },
      include: { type: true }
    });
  }

  async findById(id) {
    return this.prisma.facility.findUnique({
      where: { id },
      include: {
        type: true,      // Kèm thông tin loại phòng
        campus: true,    // Kèm thông tin campus
        equipment: {     // Kèm danh sách thiết bị
            include: { equipmentType: true }
        }
      }
    });
  }

  create(data) { return this.prisma.facility.create({ data }) }
  update(id, data) { return this.prisma.facility.update({ where: { id }, data }) }
  softDelete(id) { return this.prisma.facility.update({ where: { id }, data: { status: 'INACTIVE' } }) }

  //-_-
  async findAvailableWithPriority({ campusId, clubId, startTime, endTime }) {
    // 1. Tìm tất cả phòng trống (Logic lọc giống hệt findAvailable của MW1)
    const facilities = await this.prisma.facility.findMany({
      where: {
        campusId: campusId,
        status: 'ACTIVE',
        bookings: {
          none: {
            status: { in: ['APPROVED', 'PENDING'] },
            OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }]
          }
        },
        maintenance: {
            none: {
                startDate: { lt: endTime },
                OR: [{ endDate: { gt: startTime } }, { endDate: null }]
            }
        }
      },
      // 2. KÈM THEO THÔNG TIN ƯU TIÊN (JOIN bảng ClubPriority)
      include: {
        type: true, // Lấy thông tin loại phòng
        priorities: {
          where: { clubId: clubId }, // Chỉ lấy priority của đúng CLB này
          select: { priorityScore: true, note: true }
        }
      }
    });

    // 3. Xử lý hậu kỳ (Sắp xếp Priority cao lên đầu)
    const result = facilities.map(f => {
      const priority = f.priorities[0]; // Mảng này chỉ có tối đa 1 phần tử
      return {
        ...f,
        // Flat thông tin ưu tiên ra ngoài để FE dễ dùng
        priorityScore: priority ? priority.priorityScore : 0,
        priorityNote: priority ? priority.note : null,
        isSuggested: !!priority // Flag đánh dấu đây là phòng gợi ý
      };
    });

    // Sort: Điểm cao xếp trước -> Điểm thấp -> Không có điểm
    return result.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

module.exports = PrismaFacilityRepository