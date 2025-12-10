class FacilityTypeService {
  constructor(repo) { this.repo = repo }
  list() { return this.repo.list() }
  create(data) { return this.repo.create(data) }
  update(id, data) { return this.repo.update(id, data) }
  softDelete(id) { return this.repo.softDelete(id) }
}
module.exports = FacilityTypeService