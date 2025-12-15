const User = require('../../domain/entities/User');

class UpdateUserProfile {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(userId, { fullName, phoneNumber }) {
        // 1. Gọi Domain Logic để validate dữ liệu đầu vào
        User.validateProfileUpdate(fullName, phoneNumber);
        // 2. Hú Repository để cập nhật
        const updatedUser = await this.userRepository.updateProfile(userId, { fullName, phoneNumber });
        
        return {
            id: updatedUser.id,
            fullName: updatedUser.fullName,
            phoneNumber: updatedUser.phoneNumber,
            email: updatedUser.email,
            role: updatedUser.role,
            campusName: updatedUser.campusName
        };
    }
}

module.exports = UpdateUserProfile;