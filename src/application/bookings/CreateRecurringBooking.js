class CreateRecurringBooking {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute({ userId, note, bookings }) {
        // bookings: Array [{ facilityId, startTime, endTime, bookingTypeId, attendeeCount }]
        // Dữ liệu này được FE gửi lên sau khi user confirm kết quả Scan
        if (!bookings || bookings.length === 0) {
            throw new Error("Danh sách đặt phòng rỗng.");
        }
        // 1. Validate cơ bản: Check xem có tuần nào chưa chọn được phòng không
        const failItems = bookings.filter(b => !b.facilityId);
        if (failItems.length > 0) {
            throw new Error("Có tuần chưa chọn được phòng (FAILED). Vui lòng loại bỏ hoặc chọn thủ công trước khi tạo.");
        }

        // 2. VALIDATE CHI TIẾT TỪNG SLOT (User Conflict & Facility Conflict)
        for (const booking of bookings) {
            // Đảm bảo convert sang Date object
            const start = new Date(booking.startTime);
            const end = new Date(booking.endTime);
            const dateStr = start.toLocaleDateString('vi-VN'); // Format ngày để báo lỗi cho đẹp

            // A. Check User Conflict (Người dùng không được bận ở phòng khác)
            const userConflicts = await this.bookingRepository.getUserConflictingBookings(userId, start, end);
            if (userConflicts.length > 0) {
                const conflict = userConflicts[0];
                const conflictRoom = conflict.facility ? conflict.facility.name : 'phòng khác';
                throw new Error(`Xung đột lịch cá nhân ngày ${dateStr}: Bạn đã có lịch tại ${conflictRoom} (${conflict.status}).`);
            }

            // B. Check Facility Conflict (Phòng phải trống - Double check sau bước Scan)
            // Vì từ lúc Scan đến lúc bấm Tạo có thể mất vài phút, người khác có thể đã đặt vào
            const facilityConflicts = await this.bookingRepository.getConflictingBookings(booking.facilityId, start, end);
            
            // Nếu có bất kỳ booking nào (Approved/Pending) chắn chỗ -> Báo lỗi bắt Scan lại
            // (Lưu ý: Logic Recurring phức tạp nên ta không hỗ trợ "chiếm quyền/preemption" tự động ở đây,
            // trừ khi bạn muốn implement logic hủy hàng loạt. Ở đây chọn giải pháp an toàn là báo lỗi).
            if (facilityConflicts.length > 0) {
                const conflict = facilityConflicts[0];
                throw new Error(`Phòng bị chiếm ngày ${dateStr}: Đã có đơn đặt '${conflict.bookingType?.name || 'Sự kiện'}' chen ngang. Vui lòng Scan lại.`);
            }
        }

        // 3. Nếu tất cả đều ok -> Gọi Repo Transaction để tạo
        return await this.bookingRepository.createRecurring(
            { userId, note }, // Group Info
            bookings          // List Items
        );
    }
}

module.exports = CreateRecurringBooking;