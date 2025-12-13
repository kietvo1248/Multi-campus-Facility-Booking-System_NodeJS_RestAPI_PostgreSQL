const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class LoginUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  // ✅ thêm campusId
  async execute({ email, password, campusId }) {
    // 0. Validate campusId
    if (campusId === undefined || campusId === null || campusId === "") {
      throw new Error("Vui lòng chọn cơ sở (campusId).");
    }

    const campusIdNum = Number(campusId);
    if (Number.isNaN(campusIdNum) || campusIdNum <= 0) {
      throw new Error("campusId không hợp lệ.");
    }

    // 1. Tìm user
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Email không tồn tại trong hệ thống.");
    }

    // 2. Kiểm tra trạng thái hoạt động
    if (!user.isActive) {
      throw new Error("Tài khoản đã bị vô hiệu hóa.");
    }

    // 3. Kiểm tra xem user có password không (trường hợp chỉ login Google)
    if (!user.passwordHash) {
      throw new Error(
        "Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google."
      );
    }

    // 4. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Mật khẩu không chính xác.");
    }

    // ✅ 5. CHECK CAMPUS: nếu user không thuộc campus đã chọn => không cho login
    const userCampusIdNum = Number(user.campusId);
    if (Number.isNaN(userCampusIdNum)) {
      throw new Error("Dữ liệu campus của tài khoản không hợp lệ.");
    }

    if (userCampusIdNum !== campusIdNum) {
      throw new Error("Bạn không thuộc cơ sở đã chọn.");
    }

    // 6. Tạo Payload cho Token
    const payload = {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      campusId: user.campusId,
      campusName: user.campusName,
    };

    // 7. Ký Token (Hết hạn sau 1 ngày)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return {
      message: "Đăng nhập thành công",
      token,
      user: payload, // Trả về thông tin user (đã loại bỏ password)
    };
  }
}

module.exports = LoginUser;
