class BookingController {
    constructor({ findAvailableFacilities, createShortTermBooking, getClubBookingSuggestions }) {
        this.findAvailableFacilities = findAvailableFacilities;
        this.createShortTermBooking = createShortTermBooking;
        this.getClubBookingSuggestions = getClubBookingSuggestions;
    }

    // GET /bookings/search
    async search(req, res) {
        try {
            const { date, slot, typeId, capacity } = req.query;
            const campusId = req.user.campusId;

            const result = await this.findAvailableFacilities.execute({
                campusId, date, slot: Number(slot), typeId, capacity
            });
            return res.status(200).json(result);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // POST /bookings
    async create(req, res) {
        try {
            const userId = req.user.id;
           // const userCampusId = req.user.campusId;
            
            // Lấy 'slots' (số nhiều) từ body
            const { facilityId, date, slots, bookingTypeId, purpose, attendeeCount } = req.body;

            // Validate sơ bộ
            if (!slots || !Array.isArray(slots) || slots.length === 0) {
                return res.status(400).json({ message: "Vui lòng chọn ít nhất 1 slot." });
            }

            const result = await this.createShortTermBooking.execute({
                userId, 
                //userCampusId,
                facilityId: Number(facilityId),
                date,
                slots: slots, // Truyền mảng slots
                bookingTypeId: Number(bookingTypeId),
                purpose,
                attendeeCount: Number(attendeeCount)
            });
            return res.status(201).json(result);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async suggestForClub(req, res) {
        try {
            const { date, slot } = req.query;
            const userId = req.user.id;
            const userCampusId = req.user.campusId;

            // Gọi Use Case
            const result = await this.getClubBookingSuggestions.execute({
                userId,
                userCampusId,
                date,
                slot: Number(slot)
            });
            return res.status(200).json(result);
        } catch (error) {
            // Nếu lỗi là do không phải leader -> 403, còn lại 4 xị
            const status = error.message.includes('không phải là Chủ nhiệm') ? 403 : 400;
            return res.status(status).json({ message: error.message });
        }
    }
}

module.exports = BookingController;