class BookingController {
    constructor({ findAvailableFacilities, createShortTermBooking }) {
        this.findAvailableFacilities = findAvailableFacilities;
        this.createShortTermBooking = createShortTermBooking;
    }

    // GET /bookings/search
    async search(req, res) {
        try {
            const { date, slot, typeId, capacity } = req.query;
            const campusId = req.user.campusId; // Lấy tự động từ Token đăng nhập

            const result = await this.findAvailableFacilities.execute({
                campusId, 
                date, 
                slot: Number(slot), 
                typeId, 
                capacity
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
            const userCampusId = req.user.campusId; // Lấy từ Token
            
            // bookingTypeId được FE gửi lên tự động tùy theo trang
            const { facilityId, date, slot, bookingTypeId, attendeeCount, purpose } = req.body;

            const result = await this.createShortTermBooking.execute({
                userId, 
                userCampusId,
                facilityId: Number(facilityId),
                date,
                slot: Number(slot),
                bookingTypeId: Number(bookingTypeId),
                purpose,
                attendeeCount: Number(attendeeCount)
            });
            return res.status(201).json(result);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = BookingController;