class ClubService {
  constructor(repo, priorityRepo, userRepo) {
    this.repo = repo;
    this.priorityRepo = priorityRepo;
    this.userRepo = userRepo;
  }
  listByCampus(campusId) {
    return this.repo.listByCampus(campusId);
  }
  async create(data) {
    // Logic: Nếu FE gửi leaderEmail, ta tìm ID và gán vào leaderId
    if (data.leaderEmail) {
      const user = await this.userRepo.findByEmail(data.leaderEmail);

      if (!user) {
        throw new Error(
          `Không tìm thấy người dùng với email: ${data.leaderEmail}`
        );
      }

      // Validate: Leader phải là STUDENT
      if (user.role !== "STUDENT") {
        throw new Error(
          `User ${data.leaderEmail} không phải là Sinh viên (STUDENT), không thể làm Leader.`
        );
      }

      // Gán ID và xóa field email thừa để tránh lỗi Prisma
      data.leaderId = user.id;
      delete data.leaderEmail;
    }

    return this.repo.create(data);
  }
  async update(id, data) {
    // 1. Tạo bản sao để tránh mutate trực tiếp biến data đầu vào
    const updateData = { ...data };

    // 2. Logic xử lý Leader
    // Kiểm tra xem người dùng có gửi trường leaderEmail lên không
    if (updateData.leaderEmail !== undefined) {
      
      // Trường hợp A: Muốn xóa Leader (Gửi null hoặc chuỗi rỗng)
      if (updateData.leaderEmail === null || updateData.leaderEmail === "") {
        updateData.leaderId = null;
      } 
      // Trường hợp B: Muốn đổi Leader mới
      else {
        // Lưu ý: Đảm bảo tên biến this.userRepository khớp với constructor
        const user = await this.userRepository.findByEmail(updateData.leaderEmail);

        if (!user) {
          throw new Error(`Không tìm thấy người dùng với email: ${updateData.leaderEmail}`);
        }

        // Validate Role: Chỉ sinh viên mới được làm chủ nhiệm CLB
        if (user.role !== "STUDENT") {
          throw new Error(
            `User ${user.fullName} (${user.email}) là ${user.role}, không thể làm Chủ nhiệm CLB.`
          );
        }

        updateData.leaderId = user.id;
      }
      delete updateData.leaderEmail;
    }

    return this.clubRepository.update(id, updateData);
  }
  softDelete(id) {
    return this.repo.softDelete(id);
  }
  listPriorities(clubId) {
    return this.priorityRepo.listByClub(clubId);
  }
  assignPriority(clubId, facilityId, priorityScore, note) {
    return this.priorityRepo.assign({
      clubId,
      facilityId,
      priorityScore,
      priorityLevel: priorityScore, // Hỗ trợ backward compatibility
      note,
    });
  }
  removePriority(clubId, facilityId) {
    return this.priorityRepo.remove({ clubId, facilityId });
  }
}
module.exports = ClubService;
