const { addWeeks, format } = require('date-fns');
const { calculateTimeRangeFromSlots } = require('../utils/slotUtils');

class ScanRecurringAvailability {
    constructor(bookingRepository, facilityRepository) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
    }

    async execute({ originalFacilityId, startDate, weeks, slot, capacity, typeId, campusId }) {
        const results = [];
        
        // Lấy thông tin phòng gốc để biết tiêu chuẩn tìm phòng thay thế
        const originalFacility = await this.facilityRepository.findById(originalFacilityId);
        if (!originalFacility) throw new Error("Phòng gốc không tồn tại.");

        const startObj = new Date(startDate);

        // Loop qua từng tuần
        for (let i = 0; i < weeks; i++) {
            // Tính ngày cho tuần thứ i
            const currentDate = addWeeks(startObj, i);
            
            // Tính giờ dựa trên slot (Lưu ý: slot input ở đây là mảng hoặc số, ta dùng hàm util xử lý)
            // Giả sử slot input là 1 số int (VD: 1), ta cần chuyển thành mảng [1] nếu hàm util yêu cầu
            const slotsArray = Array.isArray(slot) ? slot : [slot];
            const { startTime, endTime } = calculateTimeRangeFromSlots(currentDate, slotsArray);

            // 1. Check phòng gốc (Original)
            const isOriginalFree = await this.bookingRepository.isFacilityAvailable(originalFacilityId, startTime, endTime);

            if (isOriginalFree) {
                results.push({
                    week: i + 1,
                    date: format(currentDate, 'yyyy-MM-dd'),
                    startTime,
                    endTime,
                    status: 'AVAILABLE',
                    facilityId: originalFacility.id,
                    facilityName: originalFacility.name,
                    note: 'Phòng trống'
                });
            } else {
                // 2. Phòng gốc bận -> Tìm phòng thay thế
                // Dùng hàm findAlternativeFacility đã có ở MW6
                const alternative = await this.bookingRepository.findAlternativeFacility({
                    campusId: campusId || originalFacility.campusId,
                    typeId: typeId || originalFacility.typeId,
                    minCapacity: capacity || originalFacility.capacity,
                    startDate: startTime,
                    endTime: endTime
                });

                if (alternative) {
                    results.push({
                        week: i + 1,
                        date: format(currentDate, 'yyyy-MM-dd'),
                        startTime,
                        endTime,
                        status: 'CONFLICT_RESOLVED', // Đã tìm được thay thế
                        facilityId: alternative.id,
                        facilityName: alternative.name,
                        note: `Phòng ${originalFacility.name} bận. Đề xuất: ${alternative.name}`
                    });
                } else {
                    results.push({
                        week: i + 1,
                        date: format(currentDate, 'yyyy-MM-dd'),
                        startTime,
                        endTime,
                        status: 'FAILED', // Hết cách
                        facilityId: null,
                        facilityName: null,
                        note: 'Không tìm được phòng trống nào thay thế.'
                    });
                }
            }
        }
        return results;
    }
}
module.exports = ScanRecurringAvailability;