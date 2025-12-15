class FacilityEquipmentService {
  constructor(repo) { this.repo = repo }
  listByFacility(facilityId) { return this.repo.listByFacility(facilityId) }
  add(data) { return this.repo.add({
    facilityId: Number(data.facilityId),
    equipmentTypeId: Number(data.equipmentTypeId),
    quantity: Number(data.quantity),
    condition: String(data.condition || 'Good')
  }) }
  update(data) { return this.repo.update({
    facilityId: Number(data.facilityId),
    equipmentTypeId: Number(data.equipmentTypeId),
    condition: String(data.condition),
    quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
    newCondition: data.newCondition ? String(data.newCondition) : undefined
  }) }
  remove(data) { return this.repo.remove({
    facilityId: Number(data.facilityId),
    equipmentTypeId: Number(data.equipmentTypeId),
    condition: String(data.condition)
  }) }
}
module.exports = FacilityEquipmentService