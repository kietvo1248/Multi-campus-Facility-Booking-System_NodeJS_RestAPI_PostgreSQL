class PrismaMaintenanceRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  async createMaintenanceLog({ facilityId, startDate, endDate, reason, reportedBy }) {
    return this.prisma.maintenanceLog.create({
      data: { facilityId, startDate, endDate, reason, status: 'SCHEDULED', reportedBy }
    })
  }
}

module.exports = PrismaMaintenanceRepository