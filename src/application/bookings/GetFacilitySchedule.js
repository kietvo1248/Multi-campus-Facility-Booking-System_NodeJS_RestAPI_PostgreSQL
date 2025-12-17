const { SLOT_MAPPING } = require('../utils/slotUtils');

class GetFacilitySchedule {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute({ facilityId, date, userId }) {
        // 1. Xác định khung giờ bắt đầu và kết thúc của ngày đó
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // 2. Lấy dữ liệu từ Repo
        const { bookings, maintenance } = await this.bookingRepository.getFacilitySchedule(facilityId, startOfDay, endOfDay);

        // 3. Map qua các Slot định sẵn để xác định trạng thái
        const schedule = [];
        const slotIds = [1, 2, 3, 4, 5]; // Theo SLOT_MAPPING

        for (const slotId of slotIds) {
            const slotTime = SLOT_MAPPING[slotId];
            
            // Tạo đối tượng Date cho Slot này
            const slotStart = new Date(date);
            slotStart.setHours(slotTime.start, 0, 0, 0);
            
            const slotEnd = new Date(date);
            slotEnd.setHours(slotTime.end, 0, 0, 0);

            let status = 'AVAILABLE';
            let details = null;

            // A. Check Bảo trì (Ưu tiên cao nhất)
            const maintConflict = maintenance.find(m => {
                const mEnd = m.endDate ? new Date(m.endDate) : new Date(8640000000000000); // Max date
                return (new Date(m.startDate) < slotEnd && mEnd > slotStart);
            });

            if (maintConflict) {
                status = 'MAINTENANCE';
                details = { reason: maintConflict.reason };
            } else {
                // B. Check Booking
                const bookingConflict = bookings.find(b => {
                    return (new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart);
                });

                if (bookingConflict) {
                    status = 'BOOKED';
                    // Nếu là Booking của chính mình -> Đánh dấu riêng để FE hiện màu khác (VD: Xanh dương)
                    if (bookingConflict.userId === userId) {
                        status = 'MY_BOOKING';
                    }
                    details = { 
                        status: bookingConflict.status // PENDING hoặc APPROVED
                    };
                }
            }

            // Kiểm tra quá khứ (Không cho đặt slot đã qua trong ngày hôm nay)
            if (slotEnd < new Date()) {
                status = 'PAST';
            }

            schedule.push({
                slotId,
                startTime: `${slotTime.start}:00`,
                endTime: `${slotTime.end}:00`,
                status, // AVAILABLE, BOOKED, MY_BOOKING, MAINTENANCE, PAST
                details
            });
        }

        return schedule;
    }
}

module.exports = GetFacilitySchedule;