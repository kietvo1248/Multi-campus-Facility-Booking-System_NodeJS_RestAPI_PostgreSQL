class RejectBooking {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute(bookingId, adminId, reason) {
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Đơn đặt phòng không tồn tại.");
        if (booking.status !== 'PENDING') throw new Error("Chỉ có thể từ chối các đơn đang chờ.");

        if (!reason) throw new Error("Vui lòng nhập lý do từ chối.");

        return await this.bookingRepository.reject(bookingId, adminId, reason);
    }
}
module.exports = RejectBooking;