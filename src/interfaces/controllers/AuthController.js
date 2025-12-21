class AuthController {
  constructor(
    loginUserUseCase,
    viewUserProfileUseCase,
    updateProfileUseCase,
    changePasswordUseCase,
    listUsersUseCase,
    toggleUserStatusUseCase
  ) {
    this.loginUserUseCase = loginUserUseCase;
    this.viewUserProfileUseCase = viewUserProfileUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
  }

  async login(req, res) {
    try {
      const { email, password, campusId } = req.body;

      // Validate đơn giản
      if (!email || !password) {
        return res.status(400).json({ message: "Vui lòng nhập Email và Mật khẩu." });
      }

      if (campusId === undefined || campusId === null || campusId === "") {
        return res.status(400).json({ message: "Vui lòng chọn cơ sở (campusId)." });
      }

      // Gọi Use Case (✅ truyền campusId)
      const result = await this.loginUserUseCase.execute({ email, password, campusId });

      return res.status(200).json(result);
    } catch (error) {
      console.error(error);

      const msg = error?.message || "Lỗi hệ thống";

      // Map status code theo message (đủ dùng cho demo)
      if (
        msg.includes("Vui lòng nhập Email") ||
        msg.includes("Vui lòng chọn cơ sở") ||
        msg.includes("campusId không hợp lệ")
      ) {
        return res.status(400).json({ message: msg });
      }

      // Sai email / sai mật khẩu
      if (msg.includes("Email không tồn tại") || msg.includes("Mật khẩu không chính xác")) {
        return res.status(401).json({ message: msg });
      }

      // Không thuộc campus hoặc bị khóa hoặc bắt login Google
      if (
        msg.includes("Bạn không thuộc cơ sở") ||
        msg.includes("Tài khoản đã bị vô hiệu hóa") ||
        msg.includes("đăng ký bằng Google")
      ) {
        return res.status(403).json({ message: msg });
      }

      return res.status(500).json({ message: msg });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const profile = await this.viewUserProfileUseCase.execute(userId);
      res.status(200).json(profile);
    } catch (error) {
      console.error(error);
      const statusCode = error.message === "Người dùng không tồn tại." ? 404 : 500;
      res.status(statusCode).json({ message: error.message });
    }
  }

  googleLogin(req, res, next, passport) {
    const { campusId } = req.query;

    // Encode state để truyền campusId đi
    const state = Buffer.from(JSON.stringify({ campusId })).toString("base64");

    passport.authenticate("google", {
      scope: ["profile", "email"],
      state,
      session: false,
    })(req, res, next);
  }

googleCallback(req, res, next, passport) {
  passport.authenticate("google", { session: false }, (err, data) => {
    if (err || !data) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }

    const { token } = data;

    // ✅ Redirect kèm token
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}`
    );
  })(req, res, next);
}


}

module.exports = AuthController;
