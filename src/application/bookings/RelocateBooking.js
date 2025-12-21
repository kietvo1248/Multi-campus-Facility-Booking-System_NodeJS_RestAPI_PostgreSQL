class RelocateBooking {
    // 1. Inject emailService
    constructor(bookingRepository, facilityRepository, emailService) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.emailService = emailService;
    }

    async execute({ bookingId, newFacilityId, adminId, reason }) {
        // Kiểm tra Booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new Error("Booking không tồn tại.");
        if (booking.status !== 'APPROVED') throw new Error("Chỉ được dời các đơn đã Duyệt (APPROVED).");

        // Kiểm tra Phòng mới
        const newFacility = await this.facilityRepository.findById(newFacilityId);
        if (!newFacility) throw new Error("Phòng mới không tồn tại.");
        if (newFacility.status !== 'ACTIVE') throw new Error("Phòng mới đang không hoạt động (INACTIVE/MAINTENANCE).");
        if (newFacility.campusId !== booking.facility.campusId) throw new Error("Không thể dời sang cơ sở khác.");

        // Kiểm tra Trống lịch
        const isAvailable = await this.bookingRepository.isFacilityAvailable(
            newFacilityId, 
            booking.startTime, 
            booking.endTime
        );

        if (!isAvailable) {
            throw new Error(`Phòng ${newFacility.name} đã có lịch hoặc đang bảo trì trong khung giờ này.`);
        }

        // Thực hiện Dời phòng
        const result = await this.bookingRepository.relocateBooking({
            bookingId,
            toFacilityId: newFacilityId,
            reason: reason || "Admin dời lịch thủ công",
            maintenanceLogId: null,
            changedBy: adminId
        });

        //GỬI EMAIL THÔNG BÁO (RELOCATED)
        if (this.emailService && booking.user && booking.user.email) {
            await this.emailService.sendBookingNotification(
                booking.user.email,
                {
                    roomName: newFacility.name, // Tên phòng MỚI
                    date: booking.startTime,
                    startTime: booking.startTime,
                    endTime: booking.endTime
                },
                'RELOCATED',
                reason
            );
        }

        return result;
    }
}

module.exports = RelocateBooking;