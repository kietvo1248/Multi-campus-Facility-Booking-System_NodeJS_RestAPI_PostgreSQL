class CreateRecurringBooking {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute({ userId, note, bookings }) {
        // bookings: Array [{ facilityId, date, startTime, endTime, bookingTypeId, attendeeCount }]
        // Dữ liệu này được FE gửi lên sau khi user confirm kết quả Scan
        
        if (!bookings || bookings.length === 0) {
            throw new Error("Danh sách đặt phòng rỗng.");
        }

        // Validate cơ bản
        const failItems = bookings.filter(b => !b.facilityId);
        if (failItems.length > 0) {
            throw new Error("Có tuần chưa chọn được phòng (FAILED). Vui lòng loại bỏ hoặc chọn thủ công trước khi tạo.");
        }

        // Gọi Repo Transaction
        return await this.bookingRepository.createRecurring(
            { userId, note }, // Group Info
            bookings          // List Items
        );
    }
}
module.exports = CreateRecurringBooking;