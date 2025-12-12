// src/application/utils/slotUtils.js

const SLOT_MAPPING = {
    1: { start: 7, end: 9 },
    2: { start: 9, end: 11 },
    3: { start: 11, end: 13 },
    4: { start: 13, end: 15 },
    5: { start: 15, end: 17 }
};

// Hàm cũ (giữ lại nếu cần dùng lẻ)
const getTimeRangeFromSlot = (dateString, slotId) => {
    const slot = SLOT_MAPPING[Number(slotId)];
    if (!slot) throw new Error("Slot không hợp lệ (1-5).");
    const baseDate = new Date(dateString);
    const startTime = new Date(baseDate);
    startTime.setHours(slot.start, 0, 0, 0);
    const endTime = new Date(baseDate);
    endTime.setHours(slot.end, 0, 0, 0);
    return { startTime, endTime };
};

// [MỚI] Hàm xử lý mảng Slots
const calculateTimeRangeFromSlots = (dateString, slots) => {
    if (!Array.isArray(slots) || slots.length === 0) {
        throw new Error("Danh sách slot không hợp lệ.");
    }

    // 1. Sắp xếp slot tăng dần để kiểm tra liền kề (VD: người dùng gửi [2, 1] -> [1, 2])
    const sortedSlots = slots.map(Number).sort((a, b) => a - b);

    // 2. Kiểm tra tính liền kề
    for (let i = 0; i < sortedSlots.length - 1; i++) {
        if (sortedSlots[i + 1] !== sortedSlots[i] + 1) {
            throw new Error(`Các slot đặt phải liền kề nhau (Ví dụ: 1,2 hoặc 2,3,4). Không chấp nhận slot rời rạc (${sortedSlots[i]} và ${sortedSlots[i+1]}).`);
        }
    }

    // 3. Kiểm tra slot có tồn tại trong cấu hình không
    const firstSlotId = sortedSlots[0];
    const lastSlotId = sortedSlots[sortedSlots.length - 1];

    if (!SLOT_MAPPING[firstSlotId] || !SLOT_MAPPING[lastSlotId]) {
        throw new Error("Chứa slot không hợp lệ (1-5).");
    }

    // 4. Tính thời gian: Bắt đầu của Slot đầu tiên -> Kết thúc của Slot cuối cùng
    const baseDate = new Date(dateString);
    
    const startTime = new Date(baseDate);
    startTime.setHours(SLOT_MAPPING[firstSlotId].start, 0, 0, 0);

    const endTime = new Date(baseDate);
    endTime.setHours(SLOT_MAPPING[lastSlotId].end, 0, 0, 0);

    return { startTime, endTime };
};

module.exports = { getTimeRangeFromSlot, calculateTimeRangeFromSlots };