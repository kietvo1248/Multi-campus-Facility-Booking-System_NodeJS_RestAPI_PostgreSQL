const bcrypt = require('bcryptjs');
const User = require('../../domain/entities/User');

class ChangeUserPassword {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId, { newPassword, confirmPassword }) {
        // 1. Gọi Domain Logic để validate (khớp pass, độ dài...)
        User.validatePasswordChange(newPassword, confirmPassword);

        // 2. Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. lưu mk
        await this.userRepository.updatePassword(userId, hashedPassword);

        return { message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." };
    }
}

module.exports = ChangeUserPassword;
