class ListPendingBookings {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }
    async execute(campusId) {
        // Gọi hàm findPendingByCampus trong Repository
        return await this.bookingRepository.findPendingByCampus(campusId);
    }
}
module.exports = ListPendingBookings;