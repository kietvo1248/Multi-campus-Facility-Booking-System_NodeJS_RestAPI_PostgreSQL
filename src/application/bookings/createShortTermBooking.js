const { calculateTimeRangeFromSlots } = require('../utils/slotUtils');

class CreateShortTermBooking {
    constructor(bookingRepository, facilityRepository, prisma) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.prisma = prisma; // Cần prisma để query BookingType nếu cần thiết
    }

    async execute({ userId, facilityId, date, slots, bookingTypeId, purpose, attendeeCount }) {
        const { startTime, endTime } = calculateTimeRangeFromSlots(date, slots);
 
        const facility = await this.facilityRepository.findById(facilityId);
        if (!facility || facility.status !== 'ACTIVE') throw new Error("Phòng không khả dụng.");

        // 2. Lấy thông tin Priority của Booking Mới (User đang đặt)
        // cần query bảng BookingType để biết priorityWeight của bookingTypeId được gửi lên
        const newBookingType = await this.prisma.bookingType.findUnique({
            where: { id: Number(bookingTypeId) }
        });
        if (!newBookingType) throw new Error("Loại đặt phòng không hợp lệ.");
        const newPriority = newBookingType.priorityWeight;

        // 3. Tìm các booking đang chắn chỗ
        const conflicts = await this.bookingRepository.getConflictingBookings(facilityId, startTime, endTime);

        // 4. LOGIC XỬ LÝ XUNG ĐỘT & ĐỘ ƯU TIÊN
        const bookingsToPreempt = [];

        for (const conflict of conflicts) {
            const conflictPriority = conflict.bookingType.priorityWeight;

            // Nếu đơn cũ có quyền LỚN HƠN hoặc BẰNG -> Không thể đè -> Báo lỗi
            if (conflictPriority >= newPriority) {
                throw new Error(`Xung đột lịch với '${conflict.bookingType.name}' (Ưu tiên: ${conflictPriority}). Bạn (Ưu tiên: ${newPriority}) không đủ quyền để chiếm chỗ.`);
            }
            
            // Nếu đơn cũ quyền THẤP HƠN -> Đưa vào danh sách cần hủy
            bookingsToPreempt.push(conflict.id);
        }

        // 5. Thực hiện Transaction (Hủy cũ nếu có + Tạo mới)
        if (bookingsToPreempt.length > 0) {
            // Trường hợp chiếm quyền (Preemption)
            return await this.bookingRepository.preemptAndCreate(
                bookingsToPreempt, 
                {
                    userId, facilityId, bookingTypeId, startTime, endTime, 
                    status: 'PENDING', attendeeCount
                },
                `Bị hủy do sự kiện ưu tiên cao hơn: ${newBookingType.name}`
            );
        } else {
            // Trường hợp phòng trống bình thường (Không conflict)
            return await this.bookingRepository.create({
                userId, facilityId, bookingTypeId, startTime, endTime, 
                status: 'PENDING', attendeeCount
            });
        }
    }
}

module.exports = CreateShortTermBooking;