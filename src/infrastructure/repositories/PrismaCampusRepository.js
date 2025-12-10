class PrismaCampusRepository {
  constructor(prisma) { this.prisma = prisma }
  list() { return this.prisma.campus.findMany({ where: { isActive: true } }) }
  create(data) { return this.prisma.campus.create({ data }) }
  update(id, data) { return this.prisma.campus.update({ where: { id }, data }) }
  softDelete(id) { return this.prisma.campus.update({ where: { id }, data: { isActive: false } }) }
}
module.exports = PrismaCampusRepository