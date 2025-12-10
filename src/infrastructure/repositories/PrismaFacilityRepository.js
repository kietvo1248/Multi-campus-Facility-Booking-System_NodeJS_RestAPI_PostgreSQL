class PrismaFacilityRepository {
  constructor(prisma) { this.prisma = prisma }
  list(filters = {}) {
    const where = { status: 'ACTIVE', ...filters }
    return this.prisma.facility.findMany({ where })
  }
  create(data) { return this.prisma.facility.create({ data }) }
  update(id, data) { return this.prisma.facility.update({ where: { id }, data }) }
  softDelete(id) { return this.prisma.facility.update({ where: { id }, data: { status: 'INACTIVE' } }) }
}
module.exports = PrismaFacilityRepository