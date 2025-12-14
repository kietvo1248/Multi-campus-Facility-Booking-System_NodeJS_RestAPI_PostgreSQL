class GetMyBookings {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute(userId) {
        return await this.bookingRepository.listByUserId(userId);
    }
}
module.exports = GetMyBookings;