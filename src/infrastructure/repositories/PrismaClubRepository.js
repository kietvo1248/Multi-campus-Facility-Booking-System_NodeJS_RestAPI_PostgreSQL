class PrismaClubRepository {
  constructor(prisma) { this.prisma = prisma }
  listByCampus(campusId) { return this.prisma.club.findMany({ where: { campusId } }) }
  create(data) { return this.prisma.club.create({ data }) }
  update(id, data) { return this.prisma.club.update({ where: { id }, data }) }
  softDelete(id) { return this.prisma.club.delete({ where: { id } }) }
}
module.exports = PrismaClubRepository