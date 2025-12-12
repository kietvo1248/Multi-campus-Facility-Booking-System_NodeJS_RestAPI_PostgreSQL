const { getTimeRangeFromSlot } = require('../utils/slotUtils');

class GetClubBookingSuggestions {
    constructor(facilityRepository, clubRepository) {
        this.facilityRepository = facilityRepository;
        this.clubRepository = clubRepository;
    }

    async execute({ userId, userCampusId, date, slot }) {
        if (!date || !slot) throw new Error("Vui lòng chọn Ngày và Slot.");

        // 1. Kiểm tra quyền Club Leader (Logic nghiệp vụ)
        // Thay vì check Role string, ta check thực tế trong DB xem user có sở hữu CLB nào không
        const club = await this.clubRepository.findByLeaderId(userId);
        
        if (!club) {
            throw new Error("Bạn không phải là Chủ nhiệm (Leader) của bất kỳ CLB nào.");
        }

        // 2. Tính thời gian
        const { startTime, endTime } = getTimeRangeFromSlot(date, slot);
        if (startTime < new Date()) throw new Error("Không thể tìm phòng trong quá khứ.");

        // 3. Gọi Repo tìm phòng ưu tiên cho CLB này
        const suggestions = await this.facilityRepository.findAvailableWithPriority({
            campusId: userCampusId,
            clubId: club.id,
            startTime,
            endTime
        });

        // Trả về cả thông tin CLB để FE hiển thị "Đang đặt cho CLB: F-Code"
        return {
            club: { id: club.id, name: club.name, code: club.code },
            suggestions: suggestions
        };
    }
}

module.exports = GetClubBookingSuggestions;