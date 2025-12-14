class CancelBookingByUser {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute(bookingId, userId) {
        // 1. Lấy thông tin đơn
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Đơn đặt phòng không tồn tại.");

        // 2. Check quyền sở hữu
        if (booking.userId !== userId) {
            throw new Error("Bạn không có quyền hủy đơn của người khác.");
        }

        // 3. Check trạng thái (Chỉ Pending hoặc Approved mới được hủy)
        if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(booking.status)) {
            throw new Error("Đơn này đã kết thúc hoặc đã bị hủy trước đó.");
        }

        // 4. VALIDATION THỜI GIAN (Rule 30 phút)
        const now = new Date();
        const startTime = new Date(booking.startTime);
        
        // Tính khoảng cách thời gian (miliseconds)
        const diffMs = startTime - now;
        const diffMinutes = Math.floor(diffMs / 60000);

        // Nếu thời gian hiện tại đã qua StartTime hoặc còn ít hơn 30 phút
        if (diffMinutes < 30) {
            throw new Error("Không thể hủy. Đã quá hạn hoặc sát giờ bắt đầu (Tối thiểu trước 30 phút).");
        }

        // 5. Gọi Repo hủy
        return await this.bookingRepository.cancelByUser(bookingId, userId, "User requested cancellation");
    }
}
module.exports = CancelBookingByUser;