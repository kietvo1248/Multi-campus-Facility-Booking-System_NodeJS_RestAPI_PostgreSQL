const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware để xác thực token
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ 'Bearer TOKEN'

    if (!token) {
        return res.status(401).json({ message: 'Access token is missing.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        // 3. Lưu thông tin user đã giải mã vào request để dùng ở Controller
        req.user = decoded; // payload lúc login: { id, fullName, role, campusId... }
        next();
    });
};

// Middleware để kiểm tra vai trò (phân quyền)
// Đây là một hàm bậc cao (higher-order function), nhận vào một mảng các vai trò được phép
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Authentication error.' });
        }

        const { role } = req.user;
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: 'You do not have permission to access this resource.' });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize,
};