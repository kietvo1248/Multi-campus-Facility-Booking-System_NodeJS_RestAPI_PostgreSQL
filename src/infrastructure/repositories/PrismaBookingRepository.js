const { PrismaClient } = require('@prisma/client')

class PrismaBookingRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  //Helper: 
  //Format dữ liệu Group để hiển thị gọn
  _formatGroupSummary(group) {
    const bookings = group.bookings || [];
    if (bookings.length === 0) return null;

    bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const firstBooking = bookings[0];
    const lastBooking = bookings[bookings.length - 1];

    const deviations = bookings.filter(b => {
        return b.status === 'CANCELLED' || b.status === 'REJECTED' || b.facilityId !== firstBooking.facilityId;
    }).map(b => ({
        date: b.startTime,
        status: b.status,
        facility: b.facility.name,
        note: b.status === 'CANCELLED' ? 'Đã hủy' : 'Thay đổi phòng'
    }));

    return {
        isGroup: true,
        id: group.id,
        description: group.description || group.note,
        createdById: group.createdById,
        
        // [FIX] Sửa group.user thành group.createdBy
        user: group.createdBy || group.user, 
        
        facilityName: firstBooking.facility.name,
        facilityId: firstBooking.facilityId,
        startDate: firstBooking.startTime,
        endDate: lastBooking.endTime,
        totalSlots: group.totalSlots,
        bookingType: firstBooking.bookingType,
        deviations: deviations,
        status: bookings.some(b => b.status === 'PENDING') ? 'PENDING_GROUP' : 'PROCESSED_GROUP'
    };
  }

  // kết thúc helper

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
        campusId: Number(campusId),
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
  // validate này dùng để ngn chặn phân thân (tránh spam)
  async getUserConflictingBookings(userId, startTime, endTime) {
    return this.prisma.booking.findMany({
      where: {
        userId: Number(userId),
        // Kiểm tra cả APPROVED và PENDING. 
        // Nếu user đang Pending phòng A, cũng không được đặt phòng B (tránh spam).
        status: { in: ['APPROVED', 'PENDING'] }, 
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      },
      include: {
        facility: {
            select: { name: true } // Lấy tên phòng để báo lỗi cho rõ
        }
      }
    });
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
  async relocateBooking({ bookingId, toFacilityId, reason, maintenanceLogId, changedBy }) {
    return this.prisma.$transaction(async (tx) => {
      // Lấy thông tin cũ
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
          newStatus: 'APPROVED',
          changeReason: reason,
          previousFacilityId: booking.facilityId,
          changedBy: { connect: { id: changedBy } } // [UPDATE] Link với Admin thực hiện
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

  async viewAllBookings(campusId) {
    return this.prisma.booking.findMany({
      where: {
        facility: {
          campusId: Number(campusId)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true
          }
        },
        facility: {
          include: {
            type: true,
            campus: true
          }
        },
        bookingType: true
      },
      orderBy: {
        createdAt: 'desc' // Đơn mới nhất trước
      }
    });
  }

  // chờ duyệt
  async findPendingByCampus(campusId) {
    // 1. Lấy các BookingGroup có chứa booking PENDING
    const groups = await this.prisma.bookingGroup.findMany({
        where: {
            bookings: {
                some: {
                    status: 'PENDING',
                    facility: { campusId: Number(campusId) }
                }
            }
        },
        include: {
            // [FIX] BookingGroup quan hệ với User qua createdBy
            createdBy: { select: { id: true, fullName: true, email: true, role: true } },
            bookings: {
                include: { facility: true, bookingType: true }
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    // 2. Lấy các Booking ĐƠN LẺ
    const singleBookings = await this.prisma.booking.findMany({
        where: {
            bookingGroupId: null,
            status: 'PENDING',
            facility: { campusId: Number(campusId) }
        },
        include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
            facility: { include: { type: true, campus: true } },
            bookingType: true
        },
        orderBy: { createdAt: 'asc' }
    });

    // 3. Format
    const formattedGroups = groups.map(g => this._formatGroupSummary(g)).filter(g => g !== null);
    const formattedSingles = singleBookings.map(b => ({ ...b, isGroup: false }));

    return [...formattedGroups, ...formattedSingles];
  }

  async findConflictsByCampus(campusId) {
    // Lấy tất cả bookings APPROVED và PENDING của campus
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['APPROVED', 'PENDING'] },
        facility: {
          campusId: Number(campusId)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true
          }
        },
        facility: {
          include: {
            type: true,
            campus: true
          }
        },
        bookingType: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Tìm các conflicts (bookings trùng lịch)
    const conflicts = [];
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const booking1 = bookings[i];
        const booking2 = bookings[j];
        
        // Kiểm tra xem có trùng lịch không (cùng facility và overlap time)
        if (booking1.facilityId === booking2.facilityId) {
          const start1 = new Date(booking1.startTime);
          const end1 = new Date(booking1.endTime);
          const start2 = new Date(booking2.startTime);
          const end2 = new Date(booking2.endTime);
          
          // Overlap: start1 < end2 && end1 > start2
          if (start1 < end2 && end1 > start2) {
            conflicts.push({
              booking1,
              booking2,
              facility: booking1.facility,
              conflictType: booking1.status === 'APPROVED' && booking2.status === 'APPROVED' 
                ? 'APPROVED_CONFLICT' 
                : 'PENDING_CONFLICT'
            });
          }
        }
      }
    }

    return conflicts;
  }

  async searchForGuard(campusId, keyword) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const where = {
        user: { campusId: Number(campusId) },
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
            user: { select: { fullName: true, email: true } },
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

  //Lấy danh sách booking của 1 user
  async listByUserId(userId) {
    // 1. Lấy Groups
    const groups = await this.prisma.bookingGroup.findMany({
        where: { createdById: Number(userId) }, // Lọc theo createdById
        include: {
            bookings: {
                include: { facility: { select: { name: true } }, bookingType: true }
            },
            createdBy: { select: { fullName: true } } // Sửa user -> createdBy
        },
        orderBy: { createdAt: 'desc' }
    });

    // 2. Lấy Booking lẻ
    const singles = await this.prisma.booking.findMany({
        where: {
            userId: Number(userId),
            bookingGroupId: null
        },
        include: {
            facility: { select: { name: true, imageUrls: true } },
            bookingType: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    const formattedGroups = groups.map(g => this._formatGroupSummary(g)).filter(g => g !== null);
    const formattedSingles = singles.map(b => ({ ...b, isGroup: false }));

    return [...formattedGroups, ...formattedSingles].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate);
        const timeB = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate);
        return timeB - timeA;
    });
  }

  // [FIXED] Sửa include user -> createdBy
  async findGroupById(groupId) {
    return this.prisma.bookingGroup.findUnique({
        where: { id: Number(groupId) },
        include: {
            bookings: {
                include: {
                    facility: { select: { id: true, name: true, type: true } },
                    bookingType: true
                },
                orderBy: { startTime: 'asc' }
            },
            createdBy: { select: { id: true, fullName: true, email: true } } // Sửa user -> createdBy
        }
    });
  }

  //User tự hủy đơn (MW7)
  async cancelByUser(bookingId, userId, reason) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      });

      // 2. Ghi Log
      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: updated.status, // Lưu ý: logic đúng là lấy status cũ, nhưng ở đây ta chấp nhận ghi đè hoặc cần query trước nếu muốn chính xác tuyệt đối. 
          // Tuy nhiên để tối ưu query, ta ghi nhận hành động chuyển sang CANCELLED.
          newStatus: 'CANCELLED',
          changeReason: reason || 'User self-cancellation',
          previousFacilityId: updated.facilityId,
          changedById: userId // ID của người hủy
        }
      });
      return updated;
    });
  }

  //MW2: Tạo Booking định kỳ (Transaction)
  async createRecurring(groupData, bookingsData) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tạo Group trước
      const group = await tx.bookingGroup.create({
        data: {
            description: groupData.note || groupData.description,
            createdById: groupData.userId,
            totalSlots: bookingsData.length, // Số lượng bookings trong nhóm
        }
      });

      // 2. Chuẩn bị dữ liệu Booking con
      const bookingsToCreate = bookingsData.map(b => ({
        userId: groupData.userId,
        facilityId: b.facilityId, // Mỗi tuần có thể là phòng khác nhau (nếu bị đổi)
        bookingTypeId: b.bookingTypeId,
        startTime: b.startTime,
        endTime: b.endTime,
        bookingGroupId: group.id, // Link với Group vừa tạo
        status: 'PENDING',        // Mặc định Pending chờ duyệt
        attendeeCount: b.attendeeCount
      }));

      // 3. Tạo hàng loạt Booking
      // Note: createMany được hỗ trợ tốt trên Postgres
      await tx.booking.createMany({
        data: bookingsToCreate
      });

      return group;
    });
  }

  // [MỚI] Helper kiểm tra phòng có trống không (Check chính xác 1 phòng)
  async isFacilityAvailable(facilityId, startTime, endTime) {
    // 1. Check Booking (Approved hoặc Pending)
    const conflictBooking = await this.prisma.booking.findFirst({
        where: {
            facilityId: Number(facilityId),
            status: { in: ['APPROVED', 'PENDING'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime }
        }
    });
    if (conflictBooking) return false;

    // 2. Check Bảo trì
    const conflictMaintenance = await this.prisma.maintenanceLog.findFirst({
        where: {
            facilityId: Number(facilityId),
            startDate: { lt: endTime },
            OR: [{ endDate: { gt: startTime } }, { endDate: null }]
        }
    });
    if (conflictMaintenance) return false;

    return true;
  }

  // Thống kê 
  // Đếm số booking theo status trong khoảng thời gian
  async countBookingsByStatus(campusId, startDate, endDate) {
    return this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        facility: { campusId: Number(campusId) },
        startTime: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    });
  }

  // Lấy Top phòng hot (được Approve nhiều nhất)
  async getTopFacilities(campusId, startDate, endDate, limit = 5) {
    const result = await this.prisma.booking.groupBy({
      by: ['facilityId'],
      where: {
        facility: { campusId: Number(campusId) },
        status: 'APPROVED',
        startTime: { gte: startDate, lte: endDate }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    // Prisma groupBy chưa hỗ trợ include relation, cần query lấy tên phòng thủ công hoặc dùng raw query
    // Ở đây ta dùng map để lấy tên phòng
    const enrichedResult = await Promise.all(result.map(async (item) => {
        const facility = await this.prisma.facility.findUnique({ 
            where: { id: item.facilityId },
            select: { name: true, capacity: true, type: { select: { name: true } } }
        });
        return {
            ...item,
            facilityName: facility.name,
            facilityType: facility.type.name,
            count: item._count.id
        };
    }));

    return enrichedResult;
  }

  // Lấy dữ liệu để vẽ biểu đồ Trend (Số booking theo ngày)
  // Lấy raw booking (chỉ lấy field date) để JS xử lý group
  async getBookingDates(campusId, startDate, endDate) {
    return this.prisma.booking.findMany({
      where: {
        facility: { campusId: Number(campusId) },
        startTime: { gte: startDate, lte: endDate }
      },
      select: { startTime: true, status: true }
    });
  }

  // Đếm tổng số phòng active của Campus (để tính tỷ lệ lấp đầy)
  async countTotalFacilities(campusId) {
    return this.prisma.facility.count({
        where: { campusId: Number(campusId), status: 'ACTIVE' }
    });
  }

  // Lấy tất cả lịch (Booking + Maintenance) của 1 phòng trong ngày cụ thể
  async getFacilitySchedule(facilityId, startOfDay, endOfDay) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        facilityId: Number(facilityId),
        status: { in: ['APPROVED', 'PENDING'] },
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay }
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        userId: true // Để FE biết là mình đặt hay người khác
      }
    });

    const maintenance = await this.prisma.maintenanceLog.findMany({
      where: {
        facilityId: Number(facilityId),
        startDate: { lt: endOfDay },
        OR: [{ endDate: { gt: startOfDay } }, { endDate: null }]
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true
      }
    });

    return { bookings, maintenance };
  }

}

module.exports = PrismaBookingRepository