const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const passport = require('passport');

// Hàm nhận controller đã được inject dependencies
const createAuthRouter = (authController) => {
    const router = express.Router();

    router.post('/login', (req, res) => authController.login(req, res));
    router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));

// --- Routes Google ---
    // 1. Route kích hoạt đăng nhập: FE gọi link này kèm ?campusId=1
    router.get('/google/login', (req, res, next) => authController.googleLogin(req, res, next, passport));
    // 2. Route callback: Google gọi lại link này
    router.get('/google/callback', (req, res, next) => authController.googleCallback(req, res, next, passport));

    return router;
};

module.exports = createAuthRouter;