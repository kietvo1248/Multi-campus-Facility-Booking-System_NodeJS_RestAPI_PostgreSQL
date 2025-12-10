class PrismaClubRepository {
  constructor(prisma) { this.prisma = prisma }
  listByCampus(campusId) { return this.prisma.club.findMany({ where: { campusId, isActive: true } }) }
  create(data) { return this.prisma.club.create({ data }) }
  update(id, data) { return this.prisma.club.update({ where: { id }, data }) }
  softDelete(id) { return this.prisma.club.update({ where: { id }, data: { isActive: false } }) }
}
module.exports = PrismaClubRepository