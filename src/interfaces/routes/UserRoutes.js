const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

const createUserRouter = (userController) => {
    const router = express.Router();

    // API Cập nhật thông tin
    router.patch('/update-profile', authenticate, (req, res) => userController.updateProfile(req, res));

    // API Đổi mật khẩu
    router.patch('/change-password', authenticate, (req, res) => userController.changePassword(req, res));

    router.get('/', 
        authenticate, 
        authorize(['FACILITY_ADMIN']), 
        (req, res) => userController.listUsers(req, res)
    );

    // Khóa/Mở khóa tài khoản
    router.patch('/:id/status', 
        authenticate, 
        authorize(['FACILITY_ADMIN']), 
        (req, res) => userController.toggleStatus(req, res)
    );

    return router;
};

module.exports = createUserRouter;