const { calculateTimeRangeFromSlots } = require('../utils/slotUtils');

class CreateShortTermBooking {
  constructor(bookingRepository, facilityRepository, prisma) {
    this.bookingRepository = bookingRepository;
    this.facilityRepository = facilityRepository;
    this.prisma = prisma;
  }

  async execute({ userId, facilityId, date, slots, bookingTypeId, purpose, attendeeCount }) {
    const { startTime, endTime } = calculateTimeRangeFromSlots(date, slots);

    // 0) Chặn user tự trùng lịch (đúng)
    const userConflicts = await this.bookingRepository.getUserConflictingBookings(userId, startTime, endTime);
    if (userConflicts.length > 0) {
      const conflict = userConflicts[0];
      const conflictRoom = conflict.facility ? conflict.facility.name : 'phòng khác';
      throw new Error(
        `Bạn không thể đặt phòng này vì đã có lịch tại ${conflictRoom} (Trạng thái: ${conflict.status}) trong khung giờ này.`
      );
    }

    // 1) Check phòng active
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility || facility.status !== 'ACTIVE') throw new Error("Phòng không khả dụng.");

    // 2) Lấy priority của booking mới
    const newBookingType = await this.prisma.bookingType.findUnique({
      where: { id: Number(bookingTypeId) }
    });
    if (!newBookingType) throw new Error("Loại đặt phòng không hợp lệ.");
    const newPriority = newBookingType.priorityWeight;

    // 3) Tìm các booking trùng giờ (repo đang trả cả APPROVED + PENDING)
    const conflicts = await this.bookingRepository.getConflictingBookings(facilityId, startTime, endTime);

    // 4) Xử lý xung đột
    const bookingsToPreempt = [];

    for (const conflict of conflicts) {
      const conflictPriority = conflict.bookingType?.priorityWeight ?? 0;
      const conflictStatus = String(conflict.status || '').toUpperCase();

      // ✅ NEW: PENDING không được quyền "giữ chỗ" -> không chặn người khác tạo PENDING
      if (conflictStatus === 'PENDING') {
        continue;
      }

      // ✅ Chỉ xử lý cứng với APPROVED
      if (conflictStatus === 'APPROVED') {
        // Nếu đơn cũ có quyền LỚN HƠN hoặc BẰNG -> Không thể đè
        if (conflictPriority >= newPriority) {
          throw new Error(
            `Xung đột lịch với '${conflict.bookingType.name}' (Ưu tiên: ${conflictPriority}). ` +
            `Bạn (Ưu tiên: ${newPriority}) không đủ quyền để chiếm chỗ.`
          );
        }

        // Nếu đơn cũ quyền THẤP HƠN -> Đưa vào danh sách cần hủy (preempt)
        bookingsToPreempt.push(conflict.id);
      }
    }

    // 5) Transaction: preempt (nếu có) + tạo booking mới (luôn PENDING)
    if (bookingsToPreempt.length > 0) {
      return await this.bookingRepository.preemptAndCreate(
        bookingsToPreempt,
        {
          userId,
          facilityId,
          bookingTypeId,
          startTime,
          endTime,
          status: 'PENDING',
          attendeeCount
        },
        `Bị hủy do sự kiện ưu tiên cao hơn: ${newBookingType.name}`
      );
    }

    return await this.bookingRepository.create({
      userId,
      facilityId,
      bookingTypeId,
      startTime,
      endTime,
      status: 'PENDING',
      attendeeCount
    });
  }
}

module.exports = CreateShortTermBooking;
