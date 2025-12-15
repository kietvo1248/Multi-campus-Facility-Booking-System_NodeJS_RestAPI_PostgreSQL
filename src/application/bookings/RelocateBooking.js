class RelocateBooking {
    constructor(bookingRepository, facilityRepository) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
    }

    async execute({ bookingId, newFacilityId, adminId, reason }) {
        // 1. Kiểm tra Booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Booking không tồn tại.");
        if (booking.status !== 'APPROVED') throw new Error("Chỉ được dời các đơn đã Duyệt (APPROVED).");

        // 2. Kiểm tra Phòng mới
        const newFacility = await this.facilityRepository.findById(newFacilityId);
        if (!newFacility) throw new Error("Phòng mới không tồn tại.");
        if (newFacility.status !== 'ACTIVE') throw new Error("Phòng mới đang không hoạt động (INACTIVE/MAINTENANCE).");
        if (newFacility.campusId !== booking.facility.campusId) throw new Error("Không thể dời sang cơ sở khác.");

        // 3. Kiểm tra Trống lịch (Availability)
        // Sử dụng hàm isFacilityAvailable có sẵn trong Repo
        const isAvailable = await this.bookingRepository.isFacilityAvailable(
            newFacilityId, 
            booking.startTime, 
            booking.endTime
        );

        if (!isAvailable) {
            throw new Error(`Phòng ${newFacility.name} đã có lịch hoặc đang bảo trì trong khung giờ này.`);
        }

        // 4. Thực hiện Dời phòng
        return await this.bookingRepository.relocateBooking({
            bookingId,
            toFacilityId: newFacilityId,
            reason: reason || "Admin dời lịch thủ công",
            maintenanceLogId: null, // Dời thủ công không nhất thiết gắn maintenance log
            changedBy: adminId
        });
    }
}

module.exports = RelocateBooking;