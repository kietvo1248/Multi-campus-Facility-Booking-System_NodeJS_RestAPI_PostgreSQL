const { PrismaClient } = require('@prisma/client')

class PrismaBookingRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  async getApprovedBookingsOverlapping(facilityId, startDate, endDate) {
    return this.prisma.booking.findMany({
      where: {
        facilityId: Number(facilityId), // Đảm bảo kiểu số
        status: 'APPROVED',
        // Logic Overlap: (StartA < EndB) && (EndA > StartB)
        startTime: { lt: endDate },
        endTime: { gt: startDate }
      }
    });
  }

  async getFacilityById(id) {
    return this.prisma.facility.findUnique({ where: { id } })
  }

  async findAlternativeFacility({ campusId, typeId, minCapacity, startDate, endDate }) {
    // Lấy danh sách các ứng viên tiềm năng (Cùng Campus, Cùng Loại, Đủ chỗ, Active)
    const candidates = await this.prisma.facility.findMany({
      where: {
        campusId,
        typeId,
        capacity: { gte: minCapacity },
        status: 'ACTIVE' // Quan trọng: Phòng thay thế phải đang hoạt động
      },
      orderBy: { capacity: 'asc' } // Ưu tiên phòng nhỏ nhất thỏa mãn (Best Fit) để tiết kiệm phòng lớn
    });

    // Duyệt từng ứng viên để check lịch trống
    for (const f of candidates) {
      // Check 1: Có vướng Booking Approved nào không?
      const overlappingApproved = await this.prisma.booking.findFirst({
        where: {
          facilityId: f.id,
          status: 'APPROVED',
          startTime: { lt: endDate },
          endTime: { gt: startDate }
        }
      });
      if (overlappingApproved) continue; // Bỏ qua phòng này

      // Check 2: Có vướng Lịch bảo trì nào không?
      const overlappingMaintenance = await this.prisma.maintenanceLog.findFirst({
        where: {
          facilityId: f.id,
          startDate: { lt: endDate },
          OR: [{ endDate: { gt: startDate } }, { endDate: null }] // endDate null = bảo trì vô thời hạn
        }
      });
      if (overlappingMaintenance) continue; // Bỏ qua

      // Nếu qua được 2 ải trên -> Đây là phòng thánh
      return f;
    }
    return null; // Không tìm thấy ai
  }

  async findPendingConflicts(facilityId, startTime, endTime, excludeBookingId) {
    return this.prisma.booking.findMany({
      where: {
        facilityId,
        status: 'PENDING',
        id: { not: excludeBookingId }, // Trừ chính đơn đang duyệt ra
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
  }

  //  Tìm đơn APPROVED bị trùng lịch (để chặn duyệt)
  async findApprovedConflicts(facilityId, startTime, endTime) {
    return this.prisma.booking.findFirst({
      where: {
        facilityId,
        status: 'APPROVED',
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
  }

  async findById(id) {
    return this.prisma.booking.findUnique({ where: { id }, include: { facility: true } });
  }

  // Transaction: Duyệt 1 đơn - Hủy nhiều đơn
  async approveWithAutoRejection({ bookingId, adminId, rejectedBookingIds }) {
    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'APPROVED' }
      });
      // Log cho đơn chính
      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: 'PENDING',
          newStatus: 'APPROVED',
          changeReason: 'Admin approved',
          previousFacilityId: approved.facilityId,
          changedById: adminId
        }
      });

      // 2. Hủy các đơn xung đột (Victims)
      if (rejectedBookingIds.length > 0) {
        await tx.booking.updateMany({
          where: { id: { in: rejectedBookingIds } },
          data: { status: 'REJECTED' } // Prisma chưa có update reason trong updateMany cho schema, nếu field reason nằm trong Booking (cần check schema)
          // Giả sử rejectionReason không nằm trong Booking mà chỉ log history
        });

        // Tạo log cho từng đơn bị hủy
        // Lưu ý: createMany không hỗ trợ SQL Server/một số DB cũ, nhưng Postgres OK.
        // Tuy nhiên BookingHistory cần changedById, sẽ dùng adminId
        const historyData = rejectedBookingIds.map(id => ({
          bookingId: id,
          oldStatus: 'PENDING',
          newStatus: 'REJECTED',
          changeReason: `System auto-rejected: Conflict with approved booking #${bookingId}`,
          changedById: adminId
        }));
        
        await tx.bookingHistory.createMany({ data: historyData });
      }

      return approved;
    });
  }

  // Từ chối đơn lẻ
  async reject(bookingId, adminId, reason) {
    return this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.update({
            where: { id: bookingId },
            data: { status: 'REJECTED' }
        });

        await tx.bookingHistory.create({
            data: {
                bookingId,
                oldStatus: 'PENDING',
                newStatus: 'REJECTED',
                changeReason: reason,
                changedById: adminId
            }
        });
        return booking;
    });
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

  // Hàm xử lý chiếm chỗ (Transaction: Hủy cũ + Tạo mới)
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
      // Lấy thông tin cũ để ghi log
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      
      // Update sang phòng mới
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { facilityId: toFacilityId }
      });

      // Ghi lịch sử
      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: 'APPROVED',
          newStatus: 'APPROVED', // Trạng thái vẫn là Approved
          changeReason: reason, // "Relocated due to maintenance..."
          previousFacilityId: booking.facilityId, // Lưu vết phòng cũ
          changedById: null // System làm thì để null hoặc ID admin
        }
      });
      return updated;
    });
  }

  async cancelBooking({ bookingId, reason, maintenanceLogId, changedBy }) {
    return this.prisma.$transaction(async (tx) => {
      // Update trạng thái
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      });

      // Ghi lịch sử
      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: 'APPROVED',
          newStatus: 'CANCELLED',
          changeReason: reason,
          previousFacilityId: updated.facilityId,
          changedById: changedBy
        }
      });
      return updated;
    });
  }

  // bảo vệ checkin
  async searchForGuard(campusId, keyword) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const where = {
        user: { campusId: campusId },
        status: 'APPROVED',
        startTime: { gte: startOfDay, lte: endOfDay }
    };

    if (keyword) {
        where.OR = [
            { user: { fullName: { contains: keyword, mode: 'insensitive' } } },
            { user: { email: { contains: keyword, mode: 'insensitive' } } }
        ];
        if (!isNaN(keyword)) where.OR.push({ id: Number(keyword) });
    }

    return this.prisma.booking.findMany({
        where,
        include: {
            user: { select: { fullName: true, code: true } },
            facility: { select: { name: true } }
        },
        orderBy: { startTime: 'asc' }
    });
  }

  //Thực hiện Check-in
  async checkIn(bookingId, guardId) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { isCheckedIn: true } // Chỉ đánh dấu là đã vào
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: 'APPROVED',
          newStatus: 'APPROVED', // Status không đổi
          changeReason: 'Guard Check-in (Open Door)',
          previousFacilityId: updated.facilityId,
          changedById: guardId
        }
      });
      return updated;
    });
  }

  // 3. Check-out (Đóng cửa)
  async checkOut(bookingId, guardId) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' } // Đánh dấu hoàn tất
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: 'APPROVED',
          newStatus: 'COMPLETED',
          changeReason: 'Guard Check-out (Close Door)',
          previousFacilityId: updated.facilityId,
          changedById: guardId
        }
      });
      return updated;
    });
  }

}

module.exports = PrismaBookingRepository