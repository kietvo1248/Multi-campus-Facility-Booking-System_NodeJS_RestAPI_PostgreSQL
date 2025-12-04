const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

// Hàm nhận controller đã được inject dependencies
const createAuthRouter = (authController) => {
    const router = express.Router();

    router.post('/login', (req, res) => authController.login(req, res));
    router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));

    return router;
};

module.exports = createAuthRouter;