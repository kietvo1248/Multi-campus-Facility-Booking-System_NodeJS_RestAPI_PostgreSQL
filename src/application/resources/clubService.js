class ClubService {
  constructor(repo, priorityRepo, userRepo) { this.repo = repo; this.priorityRepo = priorityRepo; this.userRepo = userRepo }
  listByCampus(campusId) { return this.repo.listByCampus(campusId) }
  async create(data) { 
    // Logic: Nếu FE gửi leaderEmail, ta tìm ID và gán vào leaderId
    if (data.leaderEmail) {
        const user = await this.userRepo.findByEmail(data.leaderEmail);
        
        if (!user) {
            throw new Error(`Không tìm thấy người dùng với email: ${data.leaderEmail}`);
        }

        // Validate: Leader phải là STUDENT
        if (user.role !== 'STUDENT') {
            throw new Error(`User ${data.leaderEmail} không phải là Sinh viên (STUDENT), không thể làm Leader.`);
        }

        // Gán ID và xóa field email thừa để tránh lỗi Prisma
        data.leaderId = user.id;
        delete data.leaderEmail;
    }
    
    return this.repo.create(data);
  }
  async update(id, data) { 
    // Logic: Nếu FE gửi leaderEmail, ta tìm ID và gán vào leaderId
    if (data.leaderEmail) {
        const user = await this.userRepo.findByEmail(data.leaderEmail);
        
        if (!user) {
            throw new Error(`Không tìm thấy người dùng với email: ${data.leaderEmail}`);
        }

        // Validate: Leader phải là STUDENT
        if (user.role !== 'STUDENT') {
            throw new Error(`User ${data.leaderEmail} không phải là Sinh viên (STUDENT), không thể làm Leader.`);
        }

        // Gán ID và xóa field email thừa để tránh lỗi Prisma
        data.leaderId = user.id;
        delete data.leaderEmail;
    }

    return this.repo.update(id, data);
  }
  softDelete(id) { return this.repo.softDelete(id) }
  listPriorities(clubId) { return this.priorityRepo.listByClub(clubId) }
  assignPriority(clubId, facilityId, priorityScore, note) { 
    return this.priorityRepo.assign({ 
      clubId, 
      facilityId, 
      priorityScore, 
      priorityLevel: priorityScore, // Hỗ trợ backward compatibility
      note 
    }) 
  }
  removePriority(clubId, facilityId) { return this.priorityRepo.remove({ clubId, facilityId }) }
}
module.exports = ClubService