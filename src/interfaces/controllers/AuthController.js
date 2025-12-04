class AuthController {
    constructor(loginUserUseCase, viewUserProfileUseCase) {
        this.loginUserUseCase = loginUserUseCase;
        this.viewUserProfileUseCase = viewUserProfileUseCase;
        
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validate đơn giản
            if (!email || !password) {
                return res.status(400).json({ message: 'Vui lòng nhập Email và Mật khẩu.' });
            }

            // Gọi Use Case
            const result = await this.loginUserUseCase.execute({ email, password });
            
            // Trả về kết quả
            return res.status(200).json(result);

        } catch (error) {
            // Xử lý lỗi (401 cho lỗi xác thực)
            console.error(error);
            const statusCode = error.message.includes('không chính xác') || error.message.includes('tồn tại') ? 401 : 500;
            return res.status(statusCode).json({ message: error.message });
        }
    }
    async getProfile(req, res) {
        try {
            // Lấy userId từ middleware (đã gán vào req.user)
            const userId = req.user.id;

            const profile = await this.viewUserProfileUseCase.execute(userId);
            res.status(200).json(profile);
        } catch (error) {
            console.error(error);
            const statusCode = error.message === 'Người dùng không tồn tại.' ? 404 : 500;
            res.status(statusCode).json({ message: error.message });
        }
    }
}

module.exports = AuthController;