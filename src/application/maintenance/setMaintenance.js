class SetMaintenance {
  constructor(maintenanceRepository, bookingRepository, prisma) {
    this.maintenanceRepository = maintenanceRepository
    this.bookingRepository = bookingRepository
    this.prisma = prisma
  }

  async execute({ facilityId, startDate, endDate, reason, reportedBy }) {
    const maintenance = await this.maintenanceRepository.createMaintenanceLog({ facilityId, startDate, endDate, reason, reportedBy })
    const affected = await this.bookingRepository.getApprovedBookingsOverlapping(facilityId, startDate, endDate)
    const results = []
    for (const b of affected) {
      const facility = await this.bookingRepository.getFacilityById(b.facilityId)
      const alternative = await this.bookingRepository.findAlternativeFacility({
        campusId: facility.campusId,
        typeId: facility.typeId,
        minCapacity: facility.capacity,
        startDate: b.startTime,
        endDate: b.endTime
      })
      if (alternative) {
        await this.bookingRepository.relocateBooking({ bookingId: b.id, toFacilityId: alternative.id, reason, maintenanceLogId: maintenance.id })
        results.push({ bookingId: b.id, action: 'RELOCATED', toFacilityId: alternative.id })
      } else {
        await this.bookingRepository.cancelBooking({ bookingId: b.id, reason: 'Cancelled due to maintenance', maintenanceLogId: maintenance.id, changedBy: reportedBy })
        results.push({ bookingId: b.id, action: 'CANCELLED' })
      }
    }
    return { maintenanceId: maintenance.id, totalAffected: affected.length, results }
  }
}

module.exports = SetMaintenance