class ApproveBooking {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async execute(bookingId, adminId) {
    // 1) Lấy thông tin đơn
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new Error("Đơn đặt phòng không tồn tại.");
    if (booking.status !== "PENDING")
      throw new Error("Chỉ có thể duyệt các đơn đang chờ (PENDING).");

    // 2) Safety Check: Có đơn nào đã Approved chắn chỗ không?
    const approvedConflict = await this.bookingRepository.findApprovedConflicts(
      booking.facilityId,
      booking.startTime,
      booking.endTime
    );
    if (approvedConflict) {
      throw new Error(
        `Không thể duyệt. Đã có đơn APPROVED (ID: ${approvedConflict.id}) trong khung giờ này.`
      );
    }

    // 3) Tìm các đơn PENDING khác bị trùng (Victims)
    const pendingConflicts = await this.bookingRepository.findPendingConflicts(
      booking.facilityId,
      booking.startTime,
      booking.endTime,
      bookingId
    );
    const rejectedIds = pendingConflicts.map((b) => b.id);

    // 4) ✅ Nếu đây là đơn "đổi lịch" (reschedule)
    // booking.rescheduleFromId phải tồn tại trong DB/Prisma
    if (booking.rescheduleFromId) {
      return await this.bookingRepository.approveRescheduleWithAutoRejection({
        bookingId,
        adminId,
        rejectedBookingIds: rejectedIds,
        rescheduleFromId: booking.rescheduleFromId,
      });
    }

    // 5) Bình thường
    return await this.bookingRepository.approveWithAutoRejection({
      bookingId,
      adminId,
      rejectedBookingIds: rejectedIds,
    });
  }
}

module.exports = ApproveBooking;
