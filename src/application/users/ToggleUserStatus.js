class ToggleUserStatus {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(targetUserId, isActive) {
        // 1. Kiểm tra user tồn tại không
        const user = await this.userRepository.findById(targetUserId);
        if (!user) throw new Error("Người dùng không tồn tại.");

        // 2. Không cho phép tự khóa chính mình (Optional logic)
        if (user.id === adminId) throw new Error("Không thể tự khóa tài khoản.");

        // 3. Update
        return await this.userRepository.updateStatus(targetUserId, isActive);
    }
}
module.exports = ToggleUserStatus;