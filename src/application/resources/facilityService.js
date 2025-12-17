class FacilityService {
  constructor(repo) { this.repo = repo }
  list(filters) { return this.repo.list(filters) }
  async getDetail(id) {
    const facility = await this.repo.findById(id);
    if (!facility) throw new Error("Phòng không tồn tại.");
    return facility;
  }
  create(data) { return this.repo.create(data) }
  update(id, data) { return this.repo.update(id, data) }
  softDelete(id) { return this.repo.softDelete(id) }
  listByEquipmentType({ campusId, equipmentTypeId, condition }) { return this.repo.findByEquipmentType({ campusId, equipmentTypeId, condition }) }
}
module.exports = FacilityService