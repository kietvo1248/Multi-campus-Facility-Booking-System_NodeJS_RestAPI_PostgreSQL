class CheckOutBooking {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute(bookingId, guardId) {
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Booking không tồn tại.");

        if (!booking.isCheckedIn) {
            throw new Error("Không thể đóng cửa vì chưa từng Check-in (Mở cửa).");
        }
        if (booking.status === 'COMPLETED') {
            throw new Error("Đơn này đã hoàn tất rồi.");
        }

        // Gọi Repo đóng cửa
        return await this.bookingRepository.checkOut(bookingId, guardId);
    }
}
module.exports = CheckOutBooking;