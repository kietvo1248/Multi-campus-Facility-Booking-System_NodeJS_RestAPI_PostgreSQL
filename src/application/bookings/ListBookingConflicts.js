class ListBookingConflicts {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }
    async execute(campusId) {
        // Gọi hàm findConflictsByCampus trong Repository
        return await this.bookingRepository.findConflictsByCampus(campusId);
    }
}
module.exports = ListBookingConflicts;