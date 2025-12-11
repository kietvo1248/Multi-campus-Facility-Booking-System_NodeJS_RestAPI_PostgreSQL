const { getTimeRangeFromSlot } = require('../utils/slotUtils');

class CreateShortTermBooking {
    constructor(bookingRepository, facilityRepository) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
    }

    async execute({ userId, userCampusId, facilityId, date, slot, bookingTypeId, attendeeCount }) {
        // 1. Convert Slot -> Time
        const { startTime, endTime } = getTimeRangeFromSlot(date, slot);

        // 2. Lấy thông tin phòng để validate
        const facility = await this.facilityRepository.findById(facilityId);
        if (!facility) throw new Error("Phòng không tồn tại.");
        
        // --- LOGIC: CAMPUS CHECK ---
        // Sinh viên Campus A không được đặt phòng Campus B
        if (facility.campusId !== userCampusId) {
            throw new Error("Bạn chỉ được phép đặt phòng thuộc cơ sở của mình.");
        }

        if (facility.status !== 'ACTIVE') throw new Error("Phòng đang tạm ngưng hoạt động.");

        // Check sức chứa
        if (attendeeCount && attendeeCount > facility.capacity) {
            throw new Error(`Số lượng người (${attendeeCount}) vượt quá sức chứa phòng (${facility.capacity}).`);
        }

        // 3. Double Check Conflict (Tránh 2 người bấm cùng lúc)
        const conflicts = await this.bookingRepository.getConflictingBookings(facilityId, startTime, endTime);
        if (conflicts.length > 0) {
            throw new Error("Phòng vừa bị người khác đặt mất. Vui lòng chọn phòng khác.");
        }

        // 4. Tạo Booking
        const newBooking = await this.bookingRepository.create({
            userId,
            facilityId,
            bookingTypeId,
            startTime,
            endTime,
            status: 'PENDING', // Mặc định là PENDING chờ duyệt
            attendeeCount
        });

        return newBooking;
    }
}

module.exports = CreateShortTermBooking;