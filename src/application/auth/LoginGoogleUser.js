const jwt = require('jsonwebtoken');

class LoginGoogleUser {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ googleProfile, campusId }) {
        const email = googleProfile.emails[0].value;
        const fullName = googleProfile.displayName;
        const googleId = googleProfile.id;

        // 1. Kiểm tra đuôi email (Domain Validation)
        if (!email.endsWith('@fpt.edu.vn')) {
            throw new Error('Chỉ chấp nhận email @fpt.edu.vn');
        }

        let user = await this.userRepository.findByEmail(email);

        if (!user) {
            if (!campusId) {
                throw new Error('Vui lòng chọn Campus trước khi đăng nhập lần đầu.');
            }

            user = await this.userRepository.create({
                email,
                fullName,
                googleId,
                role: 'STUDENT', // Mặc định là Student
                campusId: parseInt(campusId)
            });
        } 
        // Nếu user đã tồn tại nhưng chưa có googleId (trường hợp cũ), có thể update googleId tại đây nếu muốn.

        if (!user.isActive) {
            throw new Error('Tài khoản đã bị vô hiệu hóa.');
        }

        // 5. Tạo Token 
        const payload = {
            id: user.id,
            fullName: user.fullName,
            role: user.role,
            campusId: user.campusId,
            campusName: user.campusName
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        return { token, user: payload };
    }
}

module.exports = LoginGoogleUser;