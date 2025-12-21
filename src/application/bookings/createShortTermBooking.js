class CreateShortTermBooking {
  constructor(bookingRepository, facilityRepository, prisma) {
    this.bookingRepository = bookingRepository;
    this.facilityRepository = facilityRepository;
    this.prisma = prisma;
  }

  // SLOT MAP giống FE
  slotTimeMap(slot) {
    const map = {
      1: { start: "07:00", end: "09:00" },
      2: { start: "09:00", end: "11:00" },
      3: { start: "11:00", end: "13:00" },
      4: { start: "13:00", end: "15:00" },
      5: { start: "15:00", end: "17:00" },
    };
    return map[slot];
  }

  buildTime(dateISO, hhmm) {
    // dateISO nên là '2025-12-18' (nếu FE gửi 12/18/2025 thì nên normalize ở FE)
    return new Date(`${dateISO}T${hhmm}:00+07:00`);
  }

  async execute({
    userId,
    userRole,
    facilityId,
    date,
    slots,
    bookingTypeId,
    purpose,
    attendeeCount,
  }) {
    const role = String(userRole || "").toUpperCase();
    const isAdmin = ["FACILITY_ADMIN", "CAMPUS_ADMIN", "ADMIN"].includes(role);

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      throw new Error("Vui lòng chọn ít nhất 1 slot.");
    }

    // 1) tính start/end theo slots
    const sortedSlots = [...slots].sort((a, b) => a - b);
    const first = this.slotTimeMap(sortedSlots[0]);
    const last = this.slotTimeMap(sortedSlots[sortedSlots.length - 1]);
    if (!first || !last) throw new Error("Slot không hợp lệ.");

    const startTime = this.buildTime(date, first.start);
    const endTime = this.buildTime(date, last.end);

    // 2) chặn user tự trùng lịch (giữ nguyên)
    const userConflicts =
      await this.bookingRepository.getUserConflictingBookings(
        userId,
        startTime,
        endTime
      );
    if (userConflicts.length > 0) {
      const conflict = userConflicts[0];
      const conflictRoom = conflict.facility
        ? conflict.facility.name
        : "phòng khác";
      throw new Error(
        `Bạn không thể đặt phòng vì đã có lịch tại ${conflictRoom} (Trạng thái: ${conflict.status}) trong khung giờ này.`
      );
    }

    // 3) phòng active
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility || facility.status !== "ACTIVE")
      throw new Error("Phòng không khả dụng.");

    // 4) lấy bookingType (không còn dùng priority, nhưng vẫn cần id hợp lệ)
    const bookingType = await this.prisma.bookingType.findUnique({
      where: { id: Number(bookingTypeId) },
    });
    if (!bookingType) throw new Error("Loại đặt phòng không hợp lệ.");

    // 5) tìm conflicts (APPROVED + PENDING)
    const conflicts = await this.bookingRepository.getConflictingBookings(
      facilityId,
      startTime,
      endTime
    );

    const conflictApproved = conflicts.find(
      (b) => String(b.status).toUpperCase() === "APPROVED"
    );
    const conflictIdsAll = conflicts
      .filter((b) =>
        ["APPROVED", "PENDING"].includes(String(b.status).toUpperCase())
      )
      .map((b) => b.id);

    // ✅ CASE A: ADMIN đặt đè -> huỷ tất cả (PENDING+APPROVED) rồi tạo APPROVED
    if (isAdmin) {
      if (conflictIdsAll.length > 0) {
        return await this.bookingRepository.preemptAndCreate(
          conflictIdsAll,
          {
            userId,
            facilityId,
            bookingTypeId,
            startTime,
            endTime,
            status: "APPROVED",
            attendeeCount,
          },
          `Bị hủy do ADMIN đặt đè`,
          { isAdmin: true, changedById: userId }
        );
      }

      // không có conflict -> tạo luôn APPROVED
      // không có conflict -> tạo luôn APPROVED (và có history)
      return await this.bookingRepository.preemptAndCreate(
        [], // không có victim
        {
          userId,
          facilityId,
          bookingTypeId,
          startTime,
          endTime,
          status: "APPROVED",
          attendeeCount,
        },
        "Admin created booking (auto-approved)",
        { isAdmin: true, changedById: userId }
      );
    }

    // ✅ CASE B: USER thường -> nếu đã có APPROVED trước đó => đơn mới bị HUỶ
    if (conflictApproved) {
      return await this.bookingRepository.createAndCancelNew(
        {
          userId,
          facilityId,
          bookingTypeId,
          startTime,
          endTime,
          attendeeCount,
        },
        `Bị hủy do đã có lịch được duyệt trước đó`
      );
    }

    // ✅ CASE C: USER thường -> không có APPROVED thì tạo PENDING (pending không giữ chỗ)
    return await this.bookingRepository.create({
      userId,
      facilityId,
      bookingTypeId,
      startTime,
      endTime,
      status: "PENDING",
      attendeeCount,
    });
  }
}

module.exports = CreateShortTermBooking;
