class GetBookingDetail {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute(bookingId, userId) {
        const booking = await this.bookingRepository.findById(bookingId);
        
        if (!booking) {
            throw new Error("Đơn đặt phòng không tồn tại.");
        }

        // Bảo mật: Chỉ chủ sở hữu (hoặc Admin - xử lý sau) mới được xem chi tiết
        if (booking.userId !== userId) {
            throw new Error("Bạn không có quyền xem đơn đặt phòng này.");
        }

        return booking;
    }
}
module.exports = GetBookingDetail;