class CancelBookingByAdmin {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async execute({ bookingId, adminId, reason }) {
    if (!bookingId) throw new Error("Booking ID là bắt buộc.");
    if (!reason) throw new Error("Vui lòng nhập lý do hủy.");

    // Gọi Repository (đã viết ở bước trước)
    // Hàm này trả về booking đã hủy kèm thông tin user/facility
    return await this.bookingRepository.cancelByAdmin(bookingId, adminId, reason);
  }
}

module.exports = CancelBookingByAdmin;