class PrismaMaintenanceRepository {
  constructor(prisma) {
    this.prisma = prisma
  }

  async createMaintenanceLog({ facilityId, startDate, endDate, reason, reportedBy }) {
    // reportedBy truyền vào là ID của user (vd: 10), 
    // tao cần gán nó vào cột 'reportedById'
    
    return this.prisma.maintenanceLog.create({
      data: {
        facilityId: Number(facilityId), // Đảm bảo ép kiểu số
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason,
        status: 'SCHEDULED',
        
        // Dùng reportedById thay vì reportedBy
        reportedById: Number(reportedBy) 
        
        // Hoặc dùng cách connect:
        // reportedBy: { connect: { id: Number(reportedBy) } }
      }
    });
  }
}

module.exports = PrismaMaintenanceRepository