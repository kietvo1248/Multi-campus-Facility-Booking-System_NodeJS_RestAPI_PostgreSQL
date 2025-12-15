class PrismaFacilityEquipmentRepository {
  constructor(prisma) { this.prisma = prisma }
  listByFacility(facilityId) {
    return this.prisma.facilityEquipment.findMany({
      where: { facilityId: Number(facilityId) },
      include: { equipmentType: true }
    })
  }
  async add({ facilityId, equipmentTypeId, quantity, condition }) {
    const existing = await this.prisma.facilityEquipment.findUnique({
      where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } }
    })
    if (existing) {
      return this.prisma.facilityEquipment.update({
        where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
        data: { quantity: existing.quantity + quantity }
      })
    }
    return this.prisma.facilityEquipment.create({
      data: { facilityId, equipmentTypeId, quantity, condition }
    })
  }
  update({ facilityId, equipmentTypeId, condition, quantity, newCondition }) {
    if (newCondition && newCondition !== condition) {
      return this.prisma.$transaction(async tx => {
        const record = await tx.facilityEquipment.findUnique({ where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } } })
        if (!record) throw new Error('Thiết bị phòng không tồn tại')
        await tx.facilityEquipment.delete({ where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } } })
        return tx.facilityEquipment.create({ data: { facilityId, equipmentTypeId, condition: newCondition, quantity: quantity ?? record.quantity } })
      })
    }
    return this.prisma.facilityEquipment.update({
      where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
      data: { quantity }
    })
  }
  remove({ facilityId, equipmentTypeId, condition }) {
    return this.prisma.facilityEquipment.delete({ where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } } })
  }
}
module.exports = PrismaFacilityEquipmentRepository