class PrismaFacilityTypeRepository {
  constructor(prisma) { this.prisma = prisma }
  list() { return this.prisma.facilityType.findMany() }
  create(data) { return this.prisma.facilityType.create({ data }) }
  update(id, data) { return this.prisma.facilityType.update({ where: { id }, data }) }
  softDelete(id) { return this.prisma.facilityType.delete({ where: { id } }) }
}
module.exports = PrismaFacilityTypeRepository