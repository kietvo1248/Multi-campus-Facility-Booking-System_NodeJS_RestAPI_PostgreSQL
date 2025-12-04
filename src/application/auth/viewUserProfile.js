class ViewUserProfile {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error('Người dùng không tồn tại.');
        }

        // Trả về thông tin (User Entity đã clean dữ liệu nhạy cảm)
        // có thể format thêm dữ liệu ở đây nếu cần
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            campus: user.campusName, // Lấy tên campus từ entity
            campusId: user.campusId,
            isActive: user.isActive
        };
    }
}

module.exports = ViewUserProfile;