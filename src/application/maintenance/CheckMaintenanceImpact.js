class CheckMaintenanceImpact {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute({ facilityId, startDate, endDate }) {
        // Tìm các booking APPROVED nằm trong khoảng thời gian này
        const conflicts = await this.bookingRepository.getApprovedBookingsOverlapping(
            facilityId, 
            new Date(startDate), 
            new Date(endDate)
        );

        return {
            totalConflicts: conflicts.length,
            conflicts: conflicts // Trả về chi tiết để FE hiển thị list
        };
    }
}
module.exports = CheckMaintenanceImpact;
