class ApproveBooking {
  // 1. Inject emailService
  constructor(bookingRepository, emailService) {
    this.bookingRepository = bookingRepository;
    this.emailService = emailService;
  }

  async execute(bookingId, adminId) {
    // Lấy thông tin booking (Cần đảm bảo Repo trả về cả User và Facility)
    const booking = await this.bookingRepository.findById(bookingId);
    
    if (!booking) throw new Error("Đơn đặt phòng không tồn tại.");
    if (booking.status !== "PENDING")
      throw new Error("Chỉ có thể duyệt các đơn đang chờ (PENDING).");

    // Safety Check: Xung đột đơn APPROVED
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

    // Tìm đơn PENDING khác bị trùng
    const pendingConflicts = await this.bookingRepository.findPendingConflicts(
      booking.facilityId,
      booking.startTime,
      booking.endTime,
      bookingId
    );
    const rejectedIds = pendingConflicts.map((b) => b.id);

    let result;
    // Xử lý duyệt trong DB
    if (booking.rescheduleFromId) {
      result = await this.bookingRepository.approveRescheduleWithAutoRejection({
        bookingId,
        adminId,
        rejectedBookingIds: rejectedIds,
        rescheduleFromId: booking.rescheduleFromId,
      });
    } else {
      result = await this.bookingRepository.approveWithAutoRejection({
        bookingId,
        adminId,
        rejectedBookingIds: rejectedIds,
      });
    }

    //GỬI EMAIL THÔNG BÁO (APPROVED)
    if (this.emailService && booking.user && booking.user.email) {
      await this.emailService.sendBookingNotification(
        booking.user.email,
        {
          roomName: booking.facility ? booking.facility.name : "Phòng học",
          date: booking.startTime,
          startTime: booking.startTime,
          endTime: booking.endTime
        },
        'APPROVED'
      );
    }

    return result;
  }
}

module.exports = ApproveBooking;