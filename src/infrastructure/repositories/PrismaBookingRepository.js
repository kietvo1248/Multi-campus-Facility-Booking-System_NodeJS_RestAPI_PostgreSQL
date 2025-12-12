const { PrismaClient } = require('@prisma/client')

class PrismaBookingRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  async getApprovedBookingsOverlapping(facilityId, startDate, endDate) {
    return this.prisma.booking.findMany({
      where: {
        facilityId,
        status: 'APPROVED',
        startTime: { lt: endDate },
        endTime: { gt: startDate }
      }
    })
  }

  async getFacilityById(id) {
    return this.prisma.facility.findUnique({ where: { id } })
  }

  async findAlternativeFacility({ campusId, typeId, minCapacity, startDate, endDate }) {
    const candidates = await this.prisma.facility.findMany({
      where: {
        campusId,
        typeId,
        capacity: { gte: minCapacity },
        status: 'ACTIVE'
      },
      orderBy: { capacity: 'asc' }
    })

    for (const f of candidates) {
      const overlappingApproved = await this.prisma.booking.findFirst({
        where: {
          facilityId: f.id,
          status: 'APPROVED',
          startTime: { lt: endDate },
          endTime: { gt: startDate }
        }
      })
      if (overlappingApproved) continue

      const overlappingMaintenance = await this.prisma.maintenanceLog.findFirst({
        where: {
          facilityId: f.id,
          startDate: { lt: endDate },
          OR: [{ endDate: { gt: startDate } }, { endDate: null }]
        }
      })
      if (overlappingMaintenance) continue

      return f
    }
    return null
  }
//-_-
  async getConflictingBookings(facilityId, startTime, endTime) {
    return this.prisma.booking.findMany({
      where: {
        facilityId,
        status: { in: ['APPROVED', 'PENDING'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      },
      include: {
        bookingType: true // Kèm thông tin loại đặt phòng để lấy priorityWeight
      }
    })
  }

  // Tạo booking
  async create(data) {
    return this.prisma.booking.create({
      data: {
        userId: data.userId,
        facilityId: data.facilityId,
        bookingTypeId: data.bookingTypeId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        attendeeCount: data.attendeeCount,
        // Prisma Schema chưa có cột purpose, bạn có thể thêm vào hoặc dùng description của BookingGroup nếu cần
        // Tạm thời ta bỏ qua field purpose nếu DB chưa có
      }
    })
  }

  // [MỚI] Hàm xử lý chiếm chỗ (Transaction: Hủy cũ + Tạo mới)
  async preemptAndCreate(bookingsToPreemptIds, newBookingData, reason) {
    return this.prisma.$transaction(async (tx) => {
        // 1. Hủy các booking cũ (Update status -> PREEMPTED)
        if (bookingsToPreemptIds.length > 0) {
            await tx.booking.updateMany({
                where: { id: { in: bookingsToPreemptIds } },
                data: { 
                    status: 'PREEMPTED',
                    // Lưu ý: Cần đảm bảo schema có field ghi lý do hủy nếu muốn (VD: rejectionReason)
                }
            });
            
            // (Optional) Tạo log lịch sử cho các booking bị hủy
            // await tx.bookingHistory.createMany(...)
        }

        // 2. Tạo booking mới
        return tx.booking.create({
            data: {
                userId: newBookingData.userId,
                facilityId: newBookingData.facilityId,
                bookingTypeId: newBookingData.bookingTypeId,
                startTime: newBookingData.startTime,
                endTime: newBookingData.endTime,
                status: newBookingData.status,
                attendeeCount: newBookingData.attendeeCount
            }
        });
    });
  }
//-_-
  async relocateBooking({ bookingId, toFacilityId, reason, maintenanceLogId }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.booking.findUnique({ where: { id: bookingId } })
      const updated = await tx.booking.update({ where: { id: bookingId }, data: { facilityId: toFacilityId } })
      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: 'APPROVED',
          newStatus: 'APPROVED',
          changeReason: reason,
          previousFacilityId: before.facilityId,
          changedById: updated.processedBy ?? updated.userId
        }
      })
      return updated
    })
  }

  async cancelBooking({ bookingId, reason, maintenanceLogId, changedBy }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.booking.findUnique({ where: { id: bookingId } })
      const updated = await tx.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED', rejectionReason: reason, rejectedAt: new Date() } })
      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: 'APPROVED',
          newStatus: 'CANCELLED',
          changeReason: reason,
          previousFacilityId: before.facilityId,
          changedById: changedBy
        }
      })
      return updated
    })
  }
}

module.exports = PrismaBookingRepository