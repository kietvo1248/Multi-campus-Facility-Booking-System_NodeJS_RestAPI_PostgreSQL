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

    googleLogin(req, res, next, passport) {
        const { campusId } = req.query;
        
        // Encode state để truyền campusId đi
        const state = Buffer.from(JSON.stringify({ campusId })).toString('base64');

        passport.authenticate('google', {
            scope: ['profile', 'email'],
            state: state, // Truyền campusId qua state
            session: false //  dùng JWT, không dùng session cookie
        })(req, res, next);
    }

    //  Xử lý Callback từ Google
    googleCallback(req, res, next, passport) {
        passport.authenticate('google', { session: false }, (err, data, info) => {
            if (err) {
                // Login thất bại (sai domain, lỗi server...) -> Redirect về trang lỗi của Frontend
                const errorMessage = encodeURIComponent(err.message);
                return res.redirect(`http://localhost:5000/login?error=${errorMessage}`);   // đặt đại http://localhost:5000 là frontend, sẻ sửa sau
            }

            if (!data) {
                return res.redirect('http://localhost:5000/login?error=AuthenticationFailed');
            }

            // Login thành công -> Redirect về trang chủ kèm Token
            const { token } = data;
            //  kẹp token vào miếng bánh quy(cookies) tạm thời (chỉ sống 1-2 phút)
            // Lưu ý: httpOnly phải là FALSE để Javascript Frontend đọc được
            res.cookie('access_token', token, {
                maxAge: 2 * 60 * 1000, // 2 phút
                httpOnly: false,       // Cho phép FE đọc cookie này
                secure: false,         // Để false khi chạy localhost (http), lên prod (https) thì để true
                sameSite: 'lax',       // Quan trọng để cookie tồn tại sau khi redirect
                path: '/'
            });

            // 2. Redirect về trang chủ frontend (URL sạch đẹp)
            return res.redirect('http://localhost:5000');
        })(req, res, next);
    }
}

module.exports = AuthController;