class ViewAllBookings {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }
    async execute(campusId) {
        return await this.bookingRepository.viewAllBookings(campusId);
    }
}
module.exports = ViewAllBookings;