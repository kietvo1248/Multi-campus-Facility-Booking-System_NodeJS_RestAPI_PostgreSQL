const { getTimeRangeFromSlot } = require('../utils/slotUtils');

class FindAvailableFacilities {
    constructor(facilityRepository) {
        this.facilityRepository = facilityRepository;
    }

    async execute({ campusId, date, slot, typeId, capacity }) {
        // Validate input
        if (!date || !slot) {
            throw new Error("Vui lòng chọn Ngày và Slot.");
        }

        // Convert Slot -> Time
        const { startTime, endTime } = getTimeRangeFromSlot(date, slot);
        if (startTime < new Date()) {
            throw new Error("Không thể tìm phòng trong quá khứ.");
        }

        return await this.facilityRepository.findAvailable({
            campusId,
            typeId,
            minCapacity: capacity,
            startTime,
            endTime
        });
    }
}

module.exports = FindAvailableFacilities;