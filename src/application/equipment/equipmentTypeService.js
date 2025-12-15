class EquipmentTypeService {
  constructor(repo) { this.repo = repo }
  list() { return this.repo.list() }
  create(data) { return this.repo.create(data) }
  update(id, data) { return this.repo.update(id, data) }
  delete(id) { return this.repo.delete(id) }
}
module.exports = EquipmentTypeService