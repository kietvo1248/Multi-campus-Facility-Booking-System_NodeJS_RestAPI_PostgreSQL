class PrismaClubPriorityRepository {
  constructor(prisma) { this.prisma = prisma }
  listByClub(clubId) { return this.prisma.clubPriority.findMany({ where: { clubId }, include: { facility: true } }) }
  assign({ clubId, facilityId, priorityLevel = 1 }) {
    return this.prisma.clubPriority.upsert({
      where: { clubId_facilityId: { clubId, facilityId } },
      update: { priorityLevel },
      create: { clubId, facilityId, priorityLevel }
    })
  }
  remove({ clubId, facilityId }) { return this.prisma.clubPriority.delete({ where: { clubId_facilityId: { clubId, facilityId } } }) }
}
module.exports = PrismaClubPriorityRepository