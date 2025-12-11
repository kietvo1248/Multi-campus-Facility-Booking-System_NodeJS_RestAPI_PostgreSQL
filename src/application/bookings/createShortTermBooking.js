const { calculateTimeRangeFromSlots } = require('../utils/slotUtils'); // Import hàm mới

class CreateShortTermBooking {
    constructor(bookingRepository, facilityRepository) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
    }

    // Input nhận vào 'slots' là mảng: [1, 2]
    async execute({ userId, facilityId, date, slots, bookingTypeId, purpose, attendeeCount }) {
        
        // 1. Tính toán thời gian gộp từ danh sách slots
        // Hàm này sẽ tự throw Error nếu slots không liền kề
        const { startTime, endTime } = calculateTimeRangeFromSlots(date, slots);

        // 2. Kiểm tra phòng tồn tại và thuộc đúng Campus
        const facility = await this.facilityRepository.findById(facilityId);
        if (!facility) throw new Error("Phòng không tồn tại.");
        
        // CHECK 1: Campus
        // if (facility.campusId !== userCampusId) {
        //     throw new Error("Bạn không thể đặt phòng khác cơ sở của mình.");
        // }

        if (facility.status !== 'ACTIVE') throw new Error("Phòng đang tạm ngưng hoạt động.");

        // CHECK 2: Sức chứa
        if (attendeeCount && attendeeCount > facility.capacity) {
            throw new Error(`Số lượng người (${attendeeCount}) vượt quá sức chứa phòng (${facility.capacity}).`);
        }

        // CHECK 3: Kiểm tra xung đột
        // đã gộp startTime và endTime thành 1 khoảng liền mạch,
        // nên logic check conflict cũ vẫn hoạt động đúng (tìm xem có booking nào cắt ngang khoảng này không).
        const conflicts = await this.bookingRepository.getApprovedBookingsOverlapping(facilityId, startTime, endTime);
        
        if (conflicts.length > 0) {
            throw new Error("Một trong các slot bạn chọn đã bị người khác đặt. Vui lòng kiểm tra lại.");
        }

        const newBooking = await this.bookingRepository.create({
            userId,
            facilityId,
            bookingTypeId,
            startTime,
            endTime,
            status: 'PENDING',
            purpose,
            attendeeCount
        });

        return newBooking;
    }
}

module.exports = CreateShortTermBooking;