class RejectBooking {
    // 1. Inject emailService
    constructor(bookingRepository, emailService) {
        this.bookingRepository = bookingRepository;
        this.emailService = emailService;
    }

    async execute(bookingId, adminId, reason) {
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Đơn đặt phòng không tồn tại.");
        if (booking.status !== 'PENDING') throw new Error("Chỉ có thể từ chối các đơn đang chờ.");

        if (!reason) throw new Error("Vui lòng nhập lý do từ chối.");

        // Xử lý từ chối trong DB
        const result = await this.bookingRepository.reject(bookingId, adminId, reason);

        //GỬI EMAIL THÔNG BÁO (REJECTED)
        if (this.emailService && booking.user && booking.user.email) {
            await this.emailService.sendBookingNotification(
                booking.user.email,
                {
                    roomName: booking.facility ? booking.facility.name : "Phòng học",
                    date: booking.startTime,
                    startTime: booking.startTime,
                    endTime: booking.endTime
                },
                'REJECTED',
                reason // Gửi kèm lý do
            );
        }

        return result;
    }
}
module.exports = RejectBooking;