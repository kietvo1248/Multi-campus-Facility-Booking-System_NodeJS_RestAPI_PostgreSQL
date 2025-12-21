const { getTimeRangeFromSlot } = require('../utils/slotUtils');

class FindAvailableFacilities {
  constructor(facilityRepository) {
    this.facilityRepository = facilityRepository;
  }

  async execute({ campusId, date, slot, typeId, capacity }) {
    if (!date || !slot) {
      throw new Error("Vui lòng chọn Ngày và Slot.");
    }

    const { startTime, endTime } = getTimeRangeFromSlot(date, slot);

    const now = new Date();

    // Không cho tìm slot trong quá khứ
    if (endTime <= now) {
      throw new Error("Slot đã qua giờ.");
    }

    // Không cho tìm slot đang diễn ra
    if (startTime <= now && now < endTime) {
      throw new Error("Slot đang diễn ra. Vui lòng chọn slot khác.");
    }

    return await this.facilityRepository.findAvailable({
      campusId,
      typeId,
      minCapacity: capacity,
      startTime,
      endTime,
      // ✅ NEW: chỉ chặn theo APPROVED (repo dùng cái này)
      conflictStatuses: ['APPROVED'],
    });
  }
}

module.exports = FindAvailableFacilities;
