class ClubService {
  constructor(clubRepository, clubPriorityRepository, userRepository) { 
    this.clubRepository = clubRepository; 
    this.clubPriorityRepository = clubPriorityRepository; 
    this.userRepository = userRepository; 
  }

  listByCampus(campusId) { 
    return this.clubRepository.listByCampus(campusId); 
  }

  async create(data) { 
    // Logic: Nếu FE gửi leaderEmail, ta tìm ID và gán vào leaderId
    const createData = { ...data }; // Copy object để an toàn

    if (createData.leaderEmail) {
        const user = await this.userRepository.findByEmail(createData.leaderEmail);
        
        if (!user) {
            throw new Error(`Không tìm thấy người dùng với email: ${createData.leaderEmail}`);
        }

        // Validate: Leader phải là STUDENT
        if (user.role !== 'STUDENT') {
            throw new Error(`User ${createData.leaderEmail} không phải là Sinh viên (STUDENT), không thể làm Leader.`);
        }

        createData.leaderId = user.id;
        delete createData.leaderEmail;
    }
    
    return this.clubRepository.create(createData);
  }

  async update(id, data) { 
    // Logic: Nếu FE gửi leaderEmail, xử lý tìm user
    const updateData = { ...data }; // Copy object để an toàn

    if (updateData.leaderEmail !== undefined) {
        // Trường hợp xóa Leader
        if (updateData.leaderEmail === null || updateData.leaderEmail === "") {
             updateData.leaderId = null;
        } 
        // Trường hợp đổi Leader
        else {
            const user = await this.userRepository.findByEmail(updateData.leaderEmail);
            
            if (!user) {
                throw new Error(`Không tìm thấy người dùng với email: ${updateData.leaderEmail}`);
            }

            if (user.role !== 'STUDENT') {
                throw new Error(`User ${updateData.leaderEmail} không phải là Sinh viên, không thể làm Leader.`);
            }

            updateData.leaderId = user.id;
        }
        // Luôn xóa field email thừa trước khi gửi xuống Repo
        delete updateData.leaderEmail;
    }

    return this.clubRepository.update(id, updateData);
  }

  softDelete(id) { 
    return this.clubRepository.softDelete(id); 
  }

  listPriorities(clubId) { 
    return this.clubPriorityRepository.listByClub(clubId); 
  }

  assignPriority(clubId, facilityId, priorityScore, note) { 
    return this.clubPriorityRepository.assign({ 
      clubId, 
      facilityId, 
      priorityScore, 
      priorityLevel: priorityScore, 
      note 
    });
  }

  removePriority(clubId, facilityId) { 
    return this.clubPriorityRepository.remove({ clubId, facilityId }); 
  }
}

module.exports = ClubService;