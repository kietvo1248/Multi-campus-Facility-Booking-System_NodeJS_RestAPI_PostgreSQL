const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class LoginUser {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ email, password }) {
        // 1. Tìm user
        const user = await this.userRepository.findByEmail(email);
        
        if (!user) {
            throw new Error('Email không tồn tại trong hệ thống.');
        }

        // 2. Kiểm tra trạng thái hoạt động
        if (!user.isActive) {
            throw new Error('Tài khoản đã bị vô hiệu hóa.');
        }

        // 3. Kiểm tra xem user có password không (trường hợp chỉ login Google)
        if (!user.passwordHash) {
            throw new Error('Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.');
        }

        // 4. So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new Error('Mật khẩu không chính xác.');
        }

        // 5. Tạo Payload cho Token (đúng yêu cầu: tên, role, campus)
        const payload = {
            id: user.id,
            fullName: user.fullName,
            role: user.role,
            campusId: user.campusId,
            campusName: user.campusName
        };

        // 6. Ký Token (Hết hạn sau 1 ngày)
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        return {
            message: 'Đăng nhập thành công',
            token,
            user: payload // Trả về thông tin user (đã loại bỏ password)
        };
    }
}

module.exports = LoginUser;