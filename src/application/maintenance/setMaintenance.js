// src/application/maintenance/setMaintenance.js

class SetMaintenance {
  // 1. Inject emailService
  constructor(maintenanceRepository, bookingRepository, facilityRepository, emailService) {
    this.maintenanceRepository = maintenanceRepository;
    this.bookingRepository = bookingRepository;
    this.facilityRepository = facilityRepository; 
    this.emailService = emailService;
  }

  async execute({ facilityId, startDate, endDate, reason, reportedBy }) {
    // 1. Tạo Maintenance Log
    const maintenance = await this.maintenanceRepository.createMaintenanceLog({
      facilityId, startDate, endDate, reason, reportedBy
    });

    // 2. Lấy booking bị ảnh hưởng (Lưu ý: Repo cần include User)
    const affectedBookings = await this.bookingRepository.getApprovedBookingsOverlapping(facilityId, startDate, endDate);
    
    const results = [];

    // 3. Vòng lặp xử lý từng booking
    for (const booking of affectedBookings) {
      const currentFacility = await this.facilityRepository.findById(booking.facilityId);
      
      // Lấy email user nếu có
      const userEmail = booking.user ? booking.user.email : null;

      // Tìm phòng thay thế
      const alternative = await this.bookingRepository.findAlternativeFacility({
        campusId: currentFacility.campusId,
        typeId: currentFacility.typeId,
        minCapacity: currentFacility.capacity, 
        startDate: booking.startTime,
        endTime: booking.endTime
      });

      if (alternative) {
        // CASE A: Dời phòng thành công (RELOCATED)
        await this.bookingRepository.relocateBooking({
          bookingId: booking.id,
          toFacilityId: alternative.id,
          reason: `Relocated due to maintenance (Log #${maintenance.id})`,
          maintenanceLogId: maintenance.id,
          changedBy: reportedBy
        });
        
        // Gửi mail thông báo đổi phòng
        if (this.emailService && userEmail) {
            await this.emailService.sendBookingNotification(
                userEmail,
                {
                    roomName: alternative.name, // Phòng mới
                    date: booking.startTime,
                    startTime: booking.startTime,
                    endTime: booking.endTime
                },
                'RELOCATED',
                `Phòng cũ bảo trì: ${reason}. Chúng tôi đã chuyển bạn sang phòng tương đương.`
            );
        }

        results.push({ bookingId: booking.id, action: 'RELOCATED', to: alternative.id });

      } else {
        // CASE B: Phải hủy lịch (CANCELLED)
        await this.bookingRepository.cancelBooking({
          bookingId: booking.id,
          reason: `Cancelled: Facility Maintenance (Log #${maintenance.id}) - No alternative found`,
          maintenanceLogId: maintenance.id,
          changedBy: reportedBy
        });

        // Gửi mail thông báo hủy
        if (this.emailService && userEmail) {
            await this.emailService.sendBookingNotification(
                userEmail,
                {
                    roomName: currentFacility.name,
                    date: booking.startTime,
                    startTime: booking.startTime,
                    endTime: booking.endTime
                },
                'MAINTENANCE', // Dùng type MAINTENANCE để báo hủy do bảo trì
                `Phòng bảo trì: ${reason}. Rất tiếc không tìm được phòng trống thay thế.`
            );
        }

        results.push({ bookingId: booking.id, action: 'CANCELLED' });
      }
    }

    return {
      maintenanceId: maintenance.id,
      totalAffected: affectedBookings.length,
      relocatedCount: results.filter(r => r.action === 'RELOCATED').length,
      cancelledCount: results.filter(r => r.action === 'CANCELLED').length,
      details: results
    };
  }
}

module.exports = SetMaintenance;