class ViewUserProfile {
    constructor(userRepository, clubRepository) { // Inject thêm clubRepository
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
    }

    async execute(userId) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error('Người dùng không tồn tại.');
        }

        const response = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            campus: user.campusName,
            campusId: user.campusId,
            isActive: user.isActive
        };

        // [MỚI] Nếu là Sinh viên, kiểm tra xem có cầm CLB nào không
        if (user.role === 'STUDENT' && this.clubRepository) {
            const club = await this.clubRepository.findByLeaderId(userId);
            if (club) {
                // Gắn thêm thông tin CLB quản lý vào profile
                response.managedClub = {
                    id: club.id,
                    code: club.code,
                    name: club.name
                };
            }
        }

        return response;
    }
}

module.exports = ViewUserProfile;