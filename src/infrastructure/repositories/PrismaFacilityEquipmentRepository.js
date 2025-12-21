class PrismaFacilityEquipmentRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  listByFacility(facilityId) {
    return this.prisma.facilityEquipment.findMany({
      where: { facilityId: Number(facilityId) },
      include: { equipmentType: true },
      orderBy: [{ equipmentTypeId: "asc" }, { condition: "asc" }],
    });
  }

  findUnique({ facilityId, equipmentTypeId, condition }) {
    return this.prisma.facilityEquipment.findUnique({
      where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
    });
  }

  async add({ facilityId, equipmentTypeId, quantity, condition }) {
    const existing = await this.prisma.facilityEquipment.findUnique({
      where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
    });

    if (existing) {
      return this.prisma.facilityEquipment.update({
        where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
        data: { quantity: existing.quantity + quantity },
      });
    }

    return this.prisma.facilityEquipment.create({
      data: { facilityId, equipmentTypeId, quantity, condition },
    });
  }

  update({ facilityId, equipmentTypeId, condition, quantity, newCondition }) {
    if (newCondition && newCondition !== condition) {
      return this.prisma.$transaction(async (tx) => {
        const record = await tx.facilityEquipment.findUnique({
          where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
        });
        if (!record) throw new Error("Thiết bị phòng không tồn tại");

        await tx.facilityEquipment.delete({
          where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
        });

        return tx.facilityEquipment.create({
          data: {
            facilityId,
            equipmentTypeId,
            condition: newCondition,
            quantity: quantity ?? record.quantity,
          },
        });
      });
    }

    return this.prisma.facilityEquipment.update({
      where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
      data: { quantity },
    });
  }

  remove({ facilityId, equipmentTypeId, condition }) {
    return this.prisma.facilityEquipment.delete({
      where: { facilityId_equipmentTypeId_condition: { facilityId, equipmentTypeId, condition } },
    });
  }

  // ================= HISTORY =================
  // ✅ equipmentTypeId có thể undefined => lấy tất cả lịch sử của facility
  // ✅ có phân trang
  listHistory({ facilityId, equipmentTypeId, limit = 50, offset = 0 }) {
    const where = { facilityId: Number(facilityId) };
    if (equipmentTypeId !== undefined && equipmentTypeId !== null) {
      where.equipmentTypeId = Number(equipmentTypeId);
    }

    return this.prisma.facilityEquipmentHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
  }

  // ✅ Prisma field đúng là createdById (không phải createdBy)
  createHistory(data) {
    const payload = { ...data };

    if ("createdBy" in payload) delete payload.createdBy; // chặn data cũ
    if (payload.createdById !== undefined) {
      payload.createdById = payload.createdById === null ? null : Number(payload.createdById);
    }

    return this.prisma.facilityEquipmentHistory.create({ data: payload });
  }
}

module.exports = PrismaFacilityEquipmentRepository;
