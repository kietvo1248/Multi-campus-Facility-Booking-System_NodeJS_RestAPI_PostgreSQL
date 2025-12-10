class User{
    constructor({ id, email, passwordHash, googleId, fullName, role, phoneNumber, isActive, campusId, createdAt, updatedAt, campus }) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.googleId = googleId;
        this.fullName = fullName;
        this.role = role;
        this.phoneNumber = phoneNumber;
        this.isActive = isActive;
        this.campusId = campusId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.campusName = campus ? campus.name : null;
    }

    // --- DOMAIN LOGIC ---

    // 1. Logic kiểm tra cập nhật profile
    static validateProfileUpdate(fullName, phoneNumber) {
        if (fullName && fullName.length < 2) {
            throw new Error("Tên hiển thị phải có ít nhất 2 ký tự.");
        }
        // Validate SĐT (Regex đơn giản 10-11 số)
        const phoneRegex = /^[0-9]{10,11}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            throw new Error("Số điện thoại không đúng định dạng.");
        }
    }

    // 2. Logic kiểm tra đổi mật khẩu
    static validatePasswordChange(newPassword, confirmPassword) {
        if (!newPassword || !confirmPassword) {
            throw new Error("Vui lòng nhập đầy đủ mật khẩu mới và xác nhận.");
        }
        if (newPassword !== confirmPassword) {
            throw new Error("Mật khẩu xác nhận không khớp.");
        }
        if (newPassword.length < 6) {
            throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }
    }
}
module.exports = User;