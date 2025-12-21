// src/application/maintenance/setMaintenance.js

class SetMaintenance {
  constructor(maintenanceRepository, bookingRepository, facilityRepository) { // Cần thêm facilityRepo để lấy info phòng
    this.maintenanceRepository = maintenanceRepository;
    this.bookingRepository = bookingRepository;
    this.facilityRepository = facilityRepository; 
  }

  async execute({ facilityId, startDate, endDate, reason, reportedBy }) {
    // 1. Tạo Maintenance Log trước để khóa phòng
    const maintenance = await this.maintenanceRepository.createMaintenanceLog({
      facilityId, startDate, endDate, reason, reportedBy
    });

    // 2. Tìm các booking bị ảnh hưởng
    const affectedBookings = await this.bookingRepository.getApprovedBookingsOverlapping(facilityId, startDate, endDate);
    
    const results = [];

    // 3. Vòng lặp xử lý từng booking
    for (const booking of affectedBookings) {
      // Lấy thông tin phòng hiện tại (để biết Type và Capacity)
      // Lưu ý: bookingRepository.getFacilityById là hàm cần thiết hoặc dùng facilityRepository
      const currentFacility = await this.facilityRepository.findById(booking.facilityId);

      // Tìm phòng thay thế
      const alternative = await this.bookingRepository.findAlternativeFacility({
        campusId: currentFacility.campusId,
        typeId: currentFacility.typeId,
        minCapacity: currentFacility.capacity, // Tìm phòng to bằng hoặc hơn
        startDate: booking.startTime,
        endTime: booking.endTime
      });

      if (alternative) {
        // CASE A: Tìm thấy -> Relocate
        await this.bookingRepository.relocateBooking({
          bookingId: booking.id,
          toFacilityId: alternative.id,
          reason: `Relocated due to maintenance (Log #${maintenance.id})`,
          maintenanceLogId: maintenance.id,
          changedBy: reportedBy
        });
        
        results.push({ 
          bookingId: booking.id, 
          action: 'RELOCATED', 
          from: facilityId, 
          to: alternative.id 
        });
      } else {
        // CASE B: Không tìm thấy -> Cancel
        await this.bookingRepository.cancelBooking({
          bookingId: booking.id,
          reason: `Cancelled: Facility Maintenance (Log #${maintenance.id}) - No alternative found`,
          maintenanceLogId: maintenance.id,
          changedBy: reportedBy
        });

        results.push({ 
          bookingId: booking.id, 
          action: 'CANCELLED' 
        });
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