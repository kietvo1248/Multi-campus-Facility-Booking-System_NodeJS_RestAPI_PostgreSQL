class PrismaEquipmentTypeRepository {
  constructor(prisma) { this.prisma = prisma }
  list() { return this.prisma.equipmentType.findMany() }
  async create(data) { return this.prisma.equipmentType.create({ data }) }
  async update(id, data) { return this.prisma.equipmentType.update({ where: { id }, data }) }
  async delete(id) {
    const count = await this.prisma.facilityEquipment.count({ where: { equipmentTypeId: id } })
    if (count > 0) {
      const err = new Error('Không thể xóa loại thiết bị vì còn thiết bị đang gán trong phòng')
      err.code = 'EQUIPMENT_TYPE_IN_USE'
      throw err
    }
    return this.prisma.equipmentType.delete({ where: { id } })
  }
}
module.exports = PrismaEquipmentTypeRepository