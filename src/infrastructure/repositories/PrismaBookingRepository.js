// const { PrismaClient } = require('@prisma/client') // ❌ không dùng, bỏ cho sạch

class PrismaBookingRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  slotTimeMap(slot) {
  const map = {
    1: { start: '07:00', end: '09:00' },
    2: { start: '09:00', end: '11:00' },
    3: { start: '11:00', end: '13:00' },
    4: { start: '13:00', end: '15:00' },
    5: { start: '15:00', end: '17:00' }
  };
  return map[slot];
}

buildTime(dateISO, hhmm) {
  return new Date(`${dateISO}T${hhmm}:00+07:00`);
}


  //Helper:
  _formatGroupSummary(group) {
    const bookings = group.bookings || [];
    if (bookings.length === 0) return null;

    bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const firstBooking = bookings[0];
    const lastBooking = bookings[bookings.length - 1];

    const deviations = bookings
      .filter((b) => {
        return (
          b.status === "CANCELLED" ||
          b.status === "REJECTED" ||
          b.facilityId !== firstBooking.facilityId
        );
      })
      .map((b) => ({
        date: b.startTime,
        status: b.status,
        facility: b.facility.name,
        note: b.status === "CANCELLED" ? "Đã hủy" : "Thay đổi phòng",
      }));

    return {
      isGroup: true,
      id: group.id,
      description: group.description || group.note,
      createdById: group.createdById,
      user: group.createdBy || group.user,

      facilityName: firstBooking.facility.name,
      facilityId: firstBooking.facilityId,
      startDate: firstBooking.startTime,
      endDate: lastBooking.endTime,
      totalSlots: group.totalSlots,
      bookingType: firstBooking.bookingType,

      attendeeCount: firstBooking.attendeeCount,

      deviations: deviations,
      status: bookings.some((b) => b.status === "PENDING")
        ? "PENDING_GROUP"
        : "PROCESSED_GROUP",

      bookings: bookings,
    };
  }
  // end helper

  async getApprovedBookingsOverlapping(facilityId, startDate, endDate) {
    return this.prisma.booking.findMany({
      where: {
        facilityId: Number(facilityId),
        status: "APPROVED",
        startTime: { lt: endDate },
        endTime: { gt: startDate },
      },
    });
  }

  async getFacilityById(id) {
    return this.prisma.facility.findUnique({ where: { id } });
  }

  async findAlternativeFacility({
    campusId,
    typeId,
    minCapacity,
    startDate,
    endDate,
  }) {
    const candidates = await this.prisma.facility.findMany({
      where: {
        campusId: Number(campusId),
        typeId,
        capacity: { gte: minCapacity },
        status: "ACTIVE",
      },
      orderBy: { capacity: "asc" },
    });

    for (const f of candidates) {
      const overlappingApproved = await this.prisma.booking.findFirst({
        where: {
          facilityId: f.id,
          status: "APPROVED",
          startTime: { lt: endDate },
          endTime: { gt: startDate },
        },
      });
      if (overlappingApproved) continue;

      const overlappingMaintenance = await this.prisma.maintenanceLog.findFirst(
        {
          where: {
            facilityId: f.id,
            startDate: { lt: endDate },
            OR: [{ endDate: { gt: startDate } }, { endDate: null }],
          },
        }
      );
      if (overlappingMaintenance) continue;

      return f;
    }
    return null;
  }
  async createRescheduleRequest({
  userId,
  facilityId,
  date,
  slots,
  bookingTypeId,
  attendeeCount,
  rescheduleFromId,
}) {
  const sortedSlots = [...slots].sort((a, b) => a - b);
  const first = this.slotTimeMap(sortedSlots[0]);
  const last = this.slotTimeMap(sortedSlots[sortedSlots.length - 1]);
  if (!first || !last) throw new Error("Slot không hợp lệ.");

  const startTime = this.buildTime(date, first.start);
  const endTime = this.buildTime(date, last.end);

  return this.prisma.booking.create({
    data: {
      userId: Number(userId),
      facilityId: Number(facilityId),
      bookingTypeId: Number(bookingTypeId),
      startTime,
      endTime,
      status: "PENDING",
      attendeeCount: attendeeCount ? Number(attendeeCount) : null,
      rescheduleFromId: Number(rescheduleFromId),
    },
    include: { user: true, facility: true, bookingType: true },
  });
}


  async findPendingConflicts(facilityId, startTime, endTime, excludeBookingId) {
    return this.prisma.booking.findMany({
      where: {
        facilityId,
        status: "PENDING",
        id: { not: excludeBookingId },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  async findApprovedConflicts(facilityId, startTime, endTime) {
    return this.prisma.booking.findFirst({
      where: {
        facilityId,
        status: "APPROVED",
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  async findById(id) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        facility: true,
        bookingType: true,
        history: {
          orderBy: { updatedAt: "desc" },
          take: 10,
          include: {
            changedBy: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });
  }

  async approveWithAutoRejection({
    bookingId,
    adminId,
    rejectedBookingIds = [],
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Approve đơn chính
      const approved = await tx.booking.update({
        where: { id: Number(bookingId) },
        data: { status: "APPROVED" },
        include: { user: true, facility: true, bookingType: true },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: approved.id,
          oldStatus: "PENDING",
          newStatus: "APPROVED",
          changeReason: "Admin approved",
          previousFacilityId: approved.facilityId,
          changedById: adminId,
        },
      });

      // 2) Nếu FE không gửi victims thì BE tự tìm victims (PENDING trùng giờ cùng phòng)
      let victims = rejectedBookingIds;
      if (!victims || victims.length === 0) {
        const pendingConflicts = await tx.booking.findMany({
          where: {
            id: { not: approved.id },
            facilityId: approved.facilityId,
            status: "PENDING",
            startTime: { lt: approved.endTime },
            endTime: { gt: approved.startTime },
          },
          select: { id: true },
        });
        victims = pendingConflicts.map((x) => x.id);
      }

      // 3) Reject victims + log
      if (victims.length > 0) {
        await tx.booking.updateMany({
          where: { id: { in: victims } },
          data: { status: "REJECTED" },
        });

        await tx.bookingHistory.createMany({
          data: victims.map((id) => ({
            bookingId: id,
            oldStatus: "PENDING",
            newStatus: "REJECTED",
            changeReason: `Auto rejected do trùng lịch với booking đã được duyệt (#${approved.id}).`,
            changedById: adminId,
          })),
        });
      }

      return { approved, rejectedIds: victims };
    });
  }
 async approveRescheduleWithAutoRejection({
  bookingId,
  adminId,
  rejectedBookingIds = [],
  rescheduleFromId,
}) {
  return this.prisma.$transaction(async (tx) => {

    // 1️⃣ Lấy booking mới (PHẢI là PENDING + có rescheduleFromId)
    const newBooking = await tx.booking.findUnique({
      where: { id: Number(bookingId) },
      select: {
        id: true,
        status: true,
        rescheduleFromId: true,
        facilityId: true,
        startTime: true,
        endTime: true,
        userId: true,
      },
    });

    if (!newBooking) throw new Error("Booking không tồn tại.");
    if (newBooking.status !== "PENDING")
      throw new Error("Chỉ có thể duyệt booking PENDING.");

    if (
      !newBooking.rescheduleFromId ||
      Number(newBooking.rescheduleFromId) !== Number(rescheduleFromId)
    ) {
      throw new Error("Reschedule không hợp lệ (rescheduleFromId mismatch).");
    }

    // 2️⃣ SAFETY CHECK: đã có APPROVED khác chắn chỗ chưa?
    const approvedConflict = await tx.booking.findFirst({
      where: {
        facilityId: newBooking.facilityId,
        status: "APPROVED",
        startTime: { lt: newBooking.endTime },
        endTime: { gt: newBooking.startTime },
        id: { not: newBooking.id },
      },
    });

    if (approvedConflict) {
      throw new Error(
        `Không thể duyệt. Đã có booking APPROVED (#${approvedConflict.id}) trong khung giờ này.`
      );
    }

    // 3️⃣ APPROVE booking mới
    const approved = await tx.booking.update({
      where: { id: newBooking.id },
      data: { status: "APPROVED" },
      include: { user: true, facility: true, bookingType: true },
    });

    await tx.bookingHistory.create({
      data: {
        bookingId: approved.id,
        oldStatus: "PENDING",
        newStatus: "APPROVED",
        changeReason: `Admin approved (Reschedule from #${rescheduleFromId})`,
        previousFacilityId: approved.facilityId,
        changedById: adminId,
      },
    });

    // 4️⃣ Reject victims (PENDING trùng giờ)
    let victims = rejectedBookingIds;
    if (!victims || victims.length === 0) {
      const pendingConflicts = await tx.booking.findMany({
        where: {
          id: { not: approved.id },
          facilityId: approved.facilityId,
          status: "PENDING",
          startTime: { lt: approved.endTime },
          endTime: { gt: approved.startTime },
        },
        select: { id: true },
      });
      victims = pendingConflicts.map((x) => x.id);
    }

    if (victims.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: victims } },
        data: { status: "REJECTED" },
      });

      await tx.bookingHistory.createMany({
        data: victims.map((id) => ({
          bookingId: id,
          oldStatus: "PENDING",
          newStatus: "REJECTED",
          changeReason: `Auto rejected do trùng lịch với booking đã được duyệt (#${approved.id}).`,
          changedById: adminId,
        })),
      });
    }

    // 5️⃣ Cancel booking cũ (CHỈ khi APPROVED / PENDING)
    const oldBooking = await tx.booking.findUnique({
      where: { id: Number(rescheduleFromId) },
      select: { id: true, status: true, facilityId: true },
    });

    if (oldBooking && ["APPROVED", "PENDING"].includes(oldBooking.status)) {
      await tx.booking.update({
        where: { id: oldBooking.id },
        data: { status: "CANCELLED" },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: oldBooking.id,
          oldStatus: oldBooking.status,
          newStatus: "CANCELLED",
          changeReason: `Bị hủy do đổi lịch sang booking mới (#${approved.id}).`,
          previousFacilityId: oldBooking.facilityId,
          changedById: adminId,
        },
      });
    }

    return {
      approved,
      rejectedIds: victims,
      rescheduleFromId,
    };
  });
}



  async reject(bookingId, adminId, reason) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "REJECTED" },
        include: { user: true, facility: true },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: "PENDING",
          newStatus: "REJECTED",
          changeReason: reason,
          changedById: adminId,
        },
      });
      return booking;
    });
  }

  async getConflictingBookings(facilityId, startTime, endTime) {
    return this.prisma.booking.findMany({
      where: {
        facilityId,
        status: { in: ["APPROVED", "PENDING"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        bookingType: true,
      },
    });
  }

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
      rescheduleFromId: data.rescheduleFromId ?? null,
    },
    include: { facility: true, bookingType: true }
  });
}


  async getUserConflictingBookings(userId, startTime, endTime) {
    return this.prisma.booking.findMany({
      where: {
        userId: Number(userId),
        status: { in: ["APPROVED", "PENDING"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        facility: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Transaction: Admin override / priority preempt
   * - Cancel ONLY APPROVED bookings in bookingsToCancelIds
   * - Write BookingHistory for each victim
   * - Create new booking
   * - If created booking is APPROVED -> write history (optional but helpful)
   * - Return { createdBooking, cancelledBookings } for sending emails
   */
  async preemptAndCreate(
    bookingsToCancelIds,
    newBookingData,
    reason,
    options = {}
  ) {
    const { isAdmin = false, changedById } = options;

    // ✅ changedById bắt buộc theo schema
    if (!changedById || Number.isNaN(Number(changedById))) {
      throw new Error(
        "preemptAndCreate: changedById is required (BookingHistory.changedById)."
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let cancelledBookings = [];

      if (bookingsToCancelIds.length > 0) {
        // 1) Lấy victims (để log + email)
        cancelledBookings = await tx.booking.findMany({
          where: { id: { in: bookingsToCancelIds } },
          include: {
            user: { select: { id: true, email: true, fullName: true } },
            facility: { select: { id: true, name: true } },
            bookingType: { select: { id: true, name: true } },
          },
        });

        // 2) Chỉ cancel những booking đang APPROVED (đúng yêu cầu)
        await tx.booking.updateMany({
          where: {
            id: { in: bookingsToCancelIds },
            status: { in: ["APPROVED", "PENDING"] },
          },
          data: { status: "CANCELLED" },
        });

        // 3) History cho victims (chỉ log cái thật sự là APPROVED)
        const victimHistory = cancelledBookings.map((b) => ({
          bookingId: b.id,
          oldStatus: b.status,
          newStatus: "CANCELLED",
          changeReason: reason || "Admin override",
          previousFacilityId: b.facilityId,
          changedById: Number(changedById),
        }));

        if (victimHistory.length > 0) {
          await tx.bookingHistory.createMany({ data: victimHistory });
        }

        // chỉ trả victims thực sự bị hủy
        cancelledBookings = cancelledBookings.filter(
          (b) => b.status === "APPROVED"
        );
      }

      // 4) Create booking mới
      const createdBooking = await tx.booking.create({
        data: {
          userId: newBookingData.userId,
          facilityId: newBookingData.facilityId,
          bookingTypeId: newBookingData.bookingTypeId,
          startTime: newBookingData.startTime,
          endTime: newBookingData.endTime,
          status: newBookingData.status,
          attendeeCount: newBookingData.attendeeCount,
        },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          facility: { select: { id: true, name: true } },
          bookingType: true,
        },
      });

      // 5) Log history cho booking mới nếu auto-approved
      if (createdBooking.status === "APPROVED") {
        await tx.bookingHistory.create({
          data: {
            bookingId: createdBooking.id,
            oldStatus: "PENDING",
            newStatus: "APPROVED",
            changeReason: "Admin created booking (auto-approved)",
            previousFacilityId: createdBooking.facilityId,
            changedById: Number(changedById),
          },
        });
      }

      return { createdBooking, cancelledBookings };
    });
  }
  // ✅ Tạo đơn mới rồi HUỶ ngay (để history hiển thị "Đã hủy")
  async createAndCancelNew(newBookingData, reason) {
    return this.prisma.$transaction(async (tx) => {
      // 1) tạo PENDING trước
      const created = await tx.booking.create({
        data: {
          userId: newBookingData.userId,
          facilityId: newBookingData.facilityId,
          bookingTypeId: newBookingData.bookingTypeId,
          startTime: newBookingData.startTime,
          endTime: newBookingData.endTime,
          status: "PENDING",
          attendeeCount: newBookingData.attendeeCount,
        },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          facility: { select: { id: true, name: true } },
          bookingType: true,
        },
      });

      // 2) update sang CANCELLED
      const cancelled = await tx.booking.update({
        where: { id: created.id },
        data: { status: "CANCELLED" },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          facility: { select: { id: true, name: true } },
          bookingType: true,
        },
      });

      // 3) log history
      await tx.bookingHistory.create({
        data: {
          bookingId: created.id,
          oldStatus: "PENDING",
          newStatus: "CANCELLED",
          changeReason: reason || "Bị hủy do trùng lịch đã được duyệt trước đó",
          previousFacilityId: newBookingData.facilityId,
          changedById: newBookingData.userId,
        },
      });

      return cancelled;
    });
  }

  async relocateBooking({
    bookingId,
    toFacilityId,
    reason,
    maintenanceLogId,
    changedBy,
  }) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { facilityId: toFacilityId },
        include: { facility: true, user: true },
      });

      // ✅ FIX: schema dùng changedById, không phải changedBy connect
      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: "APPROVED",
          newStatus: "APPROVED",
          changeReason: reason,
          previousFacilityId: booking.facilityId,
          changedById: changedBy,
        },
      });

      return updated;
    });
  }

  async cancelBooking({ bookingId, reason, maintenanceLogId, changedBy }) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, facilityId: true },
      });

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: old?.status || "APPROVED",
          newStatus: "CANCELLED",
          changeReason: reason,
          previousFacilityId: updated.facilityId,
          changedById: changedBy,
        },
      });
      return updated;
    });
  }

  async viewAllBookings(campusId) {
    return this.prisma.booking.findMany({
      where: {
        facility: {
          campusId: Number(campusId),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        facility: {
          include: {
            type: true,
            campus: true,
          },
        },
        bookingType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findPendingByCampus(campusId) {
    const groups = await this.prisma.bookingGroup.findMany({
      where: {
        bookings: {
          some: {
            status: "PENDING",
            facility: { campusId: Number(campusId) },
          },
        },
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        bookings: {
          include: { facility: true, bookingType: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const singleBookings = await this.prisma.booking.findMany({
      where: {
        bookingGroupId: null,
        status: "PENDING",
        facility: { campusId: Number(campusId) },
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        facility: { include: { type: true, campus: true } },
        bookingType: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedGroups = groups
      .map((g) => this._formatGroupSummary(g))
      .filter((g) => g !== null);
    const formattedSingles = singleBookings.map((b) => ({
      ...b,
      isGroup: false,
    }));

    return [...formattedGroups, ...formattedSingles];
  }

  async findConflictsByCampus(campusId) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ["APPROVED", "PENDING"] },
        facility: {
          campusId: Number(campusId),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        facility: {
          include: {
            type: true,
            campus: true,
          },
        },
        bookingType: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const conflicts = [];
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const booking1 = bookings[i];
        const booking2 = bookings[j];

        if (booking1.facilityId === booking2.facilityId) {
          const start1 = new Date(booking1.startTime);
          const end1 = new Date(booking1.endTime);
          const start2 = new Date(booking2.startTime);
          const end2 = new Date(booking2.endTime);

          if (start1 < end2 && end1 > start2) {
            conflicts.push({
              booking1,
              booking2,
              facility: booking1.facility,
              conflictType:
                booking1.status === "APPROVED" && booking2.status === "APPROVED"
                  ? "APPROVED_CONFLICT"
                  : "PENDING_CONFLICT",
            });
          }
        }
      }
    }

    return conflicts;
  }

  async searchForGuard(campusId, keyword) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
      user: { campusId: Number(campusId) },
      status: "APPROVED",
      startTime: { gte: startOfDay, lte: endOfDay },
    };

    if (keyword) {
      where.OR = [
        { user: { fullName: { contains: keyword, mode: "insensitive" } } },
        { user: { email: { contains: keyword, mode: "insensitive" } } },
      ];
      if (!isNaN(keyword)) where.OR.push({ id: Number(keyword) });
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        facility: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    });
  }

  async checkIn(bookingId, guardId) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { isCheckedIn: true },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: "APPROVED",
          newStatus: "APPROVED",
          changeReason: "Guard Check-in (Open Door)",
          previousFacilityId: updated.facilityId,
          changedById: guardId,
        },
      });
      return updated;
    });
  }

  async checkOut(bookingId, guardId) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: "APPROVED",
          newStatus: "COMPLETED",
          changeReason: "Guard Check-out (Close Door)",
          previousFacilityId: updated.facilityId,
          changedById: guardId,
        },
      });
      return updated;
    });
  }

  async listByUserId(userId) {
    const groups = await this.prisma.bookingGroup.findMany({
      where: { createdById: Number(userId) },
      include: {
        bookings: {
          include: { facility: { select: { name: true } }, bookingType: true },
        },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const singles = await this.prisma.booking.findMany({
      where: {
        userId: Number(userId),
        bookingGroupId: null,
      },
      include: {
        facility: { select: { name: true, imageUrls: true } },
        bookingType: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedGroups = groups
      .map((g) => this._formatGroupSummary(g))
      .filter((g) => g !== null);
    const formattedSingles = singles.map((b) => ({ ...b, isGroup: false }));

    return [...formattedGroups, ...formattedSingles].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate);
      const timeB = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate);
      return timeB - timeA;
    });
  }

  async findGroupById(groupId) {
    return this.prisma.bookingGroup.findUnique({
      where: { id: Number(groupId) },
      include: {
        bookings: {
          include: {
            facility: { select: { id: true, name: true, type: true } },
            bookingType: true,
          },
          orderBy: { startTime: "asc" },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async cancelByUser(bookingId, userId, reason) {
    return this.prisma.$transaction(async (tx) => {
      // ✅ FIX: lấy status cũ trước khi update
      const old = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, facilityId: true },
      });

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          oldStatus: old?.status || "PENDING",
          newStatus: "CANCELLED",
          changeReason: reason || "User self-cancellation",
          previousFacilityId: old?.facilityId,
          changedById: userId,
        },
      });
      return updated;
    });
  }

  // Admin hủy lịch (khi không tìm được phòng thay thế)
  async cancelByAdmin(bookingId, adminId, reason) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái Booking
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
        // [BẮT BUỘC] Include để lấy email user và tên phòng gửi mail
        include: {
            user: true,
            facility: true
        }
      });

      // 2. Ghi lịch sử thay đổi
      await tx.bookingHistory.create({
        data: {
          bookingId: bookingId,
          oldStatus: 'APPROVED', // Thường là hủy lịch đã duyệt
          newStatus: 'CANCELLED',
          changeReason: reason || 'Admin cancelled (No alternative room)',
          previousFacilityId: updated.facilityId,
          changedById: adminId // ID của Admin thực hiện
        }
      });

      return updated;
    });
  }

  async createRecurring(groupData, bookingsData) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.bookingGroup.create({
        data: {
          description: groupData.note || groupData.description,
          createdById: groupData.userId,
          totalSlots: bookingsData.length,
        },
      });

      const bookingsToCreate = bookingsData.map((b) => ({
        userId: groupData.userId,
        facilityId: b.facilityId,
        bookingTypeId: b.bookingTypeId,
        startTime: b.startTime,
        endTime: b.endTime,
        bookingGroupId: group.id,
        status: "PENDING",
        attendeeCount: b.attendeeCount,
      }));

      await tx.booking.createMany({
        data: bookingsToCreate,
      });

      return group;
    });
  }

  async isFacilityAvailable(facilityId, startTime, endTime) {
    const conflictBooking = await this.prisma.booking.findFirst({
      where: {
        facilityId: Number(facilityId),
        status: { in: ["APPROVED", "PENDING"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflictBooking) return false;

    const conflictMaintenance = await this.prisma.maintenanceLog.findFirst({
      where: {
        facilityId: Number(facilityId),
        startDate: { lt: endTime },
        OR: [{ endDate: { gt: startTime } }, { endDate: null }],
      },
    });
    if (conflictMaintenance) return false;

    return true;
  }

  async countBookingsByStatus(campusId, startDate, endDate) {
    return this.prisma.booking.groupBy({
      by: ["status"],
      where: {
        facility: { campusId: Number(campusId) },
        startTime: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });
  }

  async getTopFacilities(campusId, startDate, endDate, limit = 5) {
    const result = await this.prisma.booking.groupBy({
      by: ["facilityId"],
      where: {
        facility: { campusId: Number(campusId) },
        status: "APPROVED",
        startTime: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const enrichedResult = await Promise.all(
      result.map(async (item) => {
        const facility = await this.prisma.facility.findUnique({
          where: { id: item.facilityId },
          select: {
            name: true,
            capacity: true,
            type: { select: { name: true } },
          },
        });
        return {
          ...item,
          facilityName: facility.name,
          facilityType: facility.type.name,
          count: item._count.id,
        };
      })
    );

    return enrichedResult;
  }

  async getBookingDates(campusId, startDate, endDate) {
    return this.prisma.booking.findMany({
      where: {
        facility: { campusId: Number(campusId) },
        startTime: { gte: startDate, lte: endDate },
      },
      select: { startTime: true, status: true },
    });
  }

  async countTotalFacilities(campusId) {
    return this.prisma.facility.count({
      where: { campusId: Number(campusId), status: "ACTIVE" },
    });
  }

  async getFacilitySchedule(facilityId, startOfDay, endOfDay) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        facilityId: Number(facilityId),
        status: { in: ["APPROVED", "PENDING"] },
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        userId: true,
      },
    });

    const maintenance = await this.prisma.maintenanceLog.findMany({
      where: {
        facilityId: Number(facilityId),
        startDate: { lt: endOfDay },
        OR: [{ endDate: { gt: startOfDay } }, { endDate: null }],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
      },
    });

    return { bookings, maintenance };
  }


}

module.exports = PrismaBookingRepository;
