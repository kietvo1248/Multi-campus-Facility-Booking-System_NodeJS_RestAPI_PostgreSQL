const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const createBookingRouter = (bookingController) => {
    const router = express.Router();

    // Tìm phòng (Chỉ Student & Lecturer được tìm để đặt)
    router.get('/search', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.search(req, res));

    // Đặt phòng
    router.post('/', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.create(req, res));

    return router;
};

module.exports = createBookingRouter;