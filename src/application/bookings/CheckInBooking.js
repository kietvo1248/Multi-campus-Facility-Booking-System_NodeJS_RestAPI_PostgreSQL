class CheckInBooking {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute(bookingId, guardId) {
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Booking không tồn tại.");
        
        if (booking.status !== 'APPROVED') {
            throw new Error("Chỉ được mở cửa cho đơn đã Duyệt (APPROVED).");
        }
        if (booking.isCheckedIn) {
            throw new Error("Đơn này đã mở cửa rồi.");
        }

        // Gọi Repo mở cửa
        return await this.bookingRepository.checkIn(bookingId, guardId);
    }
}
module.exports = CheckInBooking;