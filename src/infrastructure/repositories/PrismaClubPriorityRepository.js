class PrismaClubPriorityRepository {
  constructor(prisma) { this.prisma = prisma }
  listByClub(clubId) { 
    return this.prisma.clubPriority.findMany({ 
      where: { clubId: Number(clubId) }, 
      include: { facility: true } 
    }) 
  }
  assign({ clubId, facilityId, priorityLevel = 1, priorityScore, note }) {
    // Hỗ trợ cả priorityLevel (tên cũ) và priorityScore (tên đúng trong schema)
    // Nếu có priorityScore, dùng priorityScore; nếu không, dùng priorityLevel
    const score = priorityScore !== undefined ? Number(priorityScore) : Number(priorityLevel);
    
    return this.prisma.clubPriority.upsert({
      where: { 
        clubId_facilityId: { 
          clubId: Number(clubId), 
          facilityId: Number(facilityId) 
        } 
      },
      update: { 
        priorityScore: score,
        ...(note !== undefined && { note })
      },
      create: { 
        clubId: Number(clubId), 
        facilityId: Number(facilityId), 
        priorityScore: score,
        ...(note !== undefined && { note })
      }
    })
  }
  remove({ clubId, facilityId }) { 
    return this.prisma.clubPriority.delete({ 
      where: { 
        clubId_facilityId: { 
          clubId: Number(clubId), 
          facilityId: Number(facilityId) 
        } 
      } 
    }) 
  }
}
module.exports = PrismaClubPriorityRepository