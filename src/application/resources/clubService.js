class ClubService {
  constructor(repo, priorityRepo) { this.repo = repo; this.priorityRepo = priorityRepo }
  listByCampus(campusId) { return this.repo.listByCampus(campusId) }
  create(data) { return this.repo.create(data) }
  update(id, data) { return this.repo.update(id, data) }
  softDelete(id) { return this.repo.softDelete(id) }
  listPriorities(clubId) { return this.priorityRepo.listByClub(clubId) }
  assignPriority(clubId, facilityId, priorityLevel) { return this.priorityRepo.assign({ clubId, facilityId, priorityLevel }) }
  removePriority(clubId, facilityId) { return this.priorityRepo.remove({ clubId, facilityId }) }
}
module.exports = ClubService