class FacilityEquipmentService {
  constructor(repo) {
    this.repo = repo;
  }

  listByFacility(facilityId) {
    return this.repo.listByFacility(facilityId);
  }

  // ✅ nhận object params (khớp controller mới)
  async listHistory({ facilityId, equipmentTypeId, limit = 50, offset = 0 }) {
    return this.repo.listHistory({
      facilityId: Number(facilityId),
      equipmentTypeId: equipmentTypeId !== undefined ? Number(equipmentTypeId) : undefined,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  async add(data, meta = {}) {
    const facilityId = Number(data.facilityId);
    const equipmentTypeId = Number(data.equipmentTypeId);
    const quantity = Number(data.quantity);
    const condition = String(data.condition || "good").toLowerCase();

    const createdById = meta.createdById ?? data.createdById ?? null;
    const note = meta.note ?? data.note ?? null;

    const result = await this.repo.add({ facilityId, equipmentTypeId, quantity, condition });

    await this.repo.createHistory({
      facilityId,
      equipmentTypeId,
      action: "ADD",
      note: note ? String(note) : null,
      oldQuantity: null,
      newQuantity: result.quantity,
      oldCondition: null,
      newCondition: result.condition,
      createdById: createdById ? Number(createdById) : null,
    });

    return result;
  }

  async update(data, meta = {}) {
    const facilityId = Number(data.facilityId);
    const equipmentTypeId = Number(data.equipmentTypeId);
    const condition = String(data.condition || "good").toLowerCase();
    const quantity = data.quantity !== undefined ? Number(data.quantity) : undefined;
    const newCondition = data.newCondition ? String(data.newCondition).toLowerCase() : undefined;

    // ✅ NOTE lấy từ meta.note hoặc data.note (controller bạn đang nhét note vào data)
    const note = String(meta.note ?? data.note ?? "").trim();
    if (!note) {
      const err = new Error("Vui lòng nhập nội dung chỉnh sửa");
      err.code = "NOTE_REQUIRED";
      throw err;
    }

    const changedById = meta.changedById ?? data.changedById ?? null;

    const before = await this.repo.findUnique({ facilityId, equipmentTypeId, condition });
    if (!before) throw new Error("Thiết bị phòng không tồn tại");

    const result = await this.repo.update({
      facilityId,
      equipmentTypeId,
      condition,
      quantity,
      newCondition,
    });

    await this.repo.createHistory({
      facilityId,
      equipmentTypeId,
      action: "UPDATE",
      note,
      oldQuantity: before.quantity,
      newQuantity: result.quantity,
      oldCondition: before.condition,
      newCondition: result.condition,
      createdById: changedById ? Number(changedById) : null,
    });

    return result;
  }

  async remove(data, meta = {}) {
    const facilityId = Number(data.facilityId);
    const equipmentTypeId = Number(data.equipmentTypeId);
    const condition = String(data.condition || "good").toLowerCase();

    const deletedById = meta.deletedById ?? data.deletedById ?? null;
    const note = String(meta.note ?? data.note ?? "Xóa thiết bị khỏi phòng").trim();

    const before = await this.repo.findUnique({ facilityId, equipmentTypeId, condition });
    if (!before) throw new Error("Thiết bị phòng không tồn tại");

    const result = await this.repo.remove({ facilityId, equipmentTypeId, condition });

    await this.repo.createHistory({
      facilityId,
      equipmentTypeId,
      action: "DELETE",
      note,
      oldQuantity: before.quantity,
      newQuantity: null,
      oldCondition: before.condition,
      newCondition: null,
      createdById: deletedById ? Number(deletedById) : null,
    });

    return result;
  }
}

module.exports = FacilityEquipmentService;
