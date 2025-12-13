class SearchBookingForCheckIn {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }
    async execute({ campusId, keyword }) {
        return await this.bookingRepository.searchForGuard(campusId, keyword);
    }
}
module.exports = SearchBookingForCheckIn;