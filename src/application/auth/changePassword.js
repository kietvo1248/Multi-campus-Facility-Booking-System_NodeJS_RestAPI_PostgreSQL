const bcrypt = require('bcryptjs');
const User = require('../../domain/entities/User');

class ChangeUserPassword {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId, { currentPassword, newPassword, confirmPassword }) {
        // 1. Gọi Domain Logic để validate (khớp pass, độ dài...)
        User.validatePasswordChange(newPassword, confirmPassword);

        // 2. Lấy user hiện tại để check pass cũ
        const user = await this.userRepository.findById(userId);
        if (!user || !user.passwordHash) {
             throw new Error("Người dùng không tồn tại hoặc không có mật khẩu.");
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            throw new Error("Mật khẩu hiện tại không chính xác.");
        }

        // 3. Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. lưu mk
        await this.userRepository.updatePassword(userId, hashedPassword);

        return { message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." };
    }
}

module.exports = ChangeUserPassword;
