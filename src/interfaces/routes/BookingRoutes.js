const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const createBookingRouter = (bookingController) => {
    const router = express.Router();

    // Tìm phòng (Chỉ Student & Lecturer được tìm để đặt)
    router.get('/search', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.search(req, res));

    // Đặt phòng
    router.post('/', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.create(req, res));
    // Gợi ý phòng cho Club Leader
    router.get('/club-suggestions', authenticate, authorize(['STUDENT']), (req, res) => bookingController.suggestForClub(req, res));
    // Duyệt đơn
    router.patch('/:id/approve', 
        authenticate, 
        authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN']), 
        (req, res) => bookingController.approve(req, res)
    );

    router.patch('/:id/reject', 
        authenticate, 
        authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN']), 
        (req, res) => bookingController.reject(req, res)
    );

    router.get('/guard/search', authenticate, authorize(['SECURITY_GUARD']), (req, res) => bookingController.searchForGuard(req, res));
    router.patch('/:id/check-in', authenticate, authorize(['SECURITY_GUARD']), (req, res) => bookingController.checkIn(req, res));
    router.patch('/:id/check-out', authenticate, authorize(['SECURITY_GUARD']), (req, res) => bookingController.checkOut(req, res));

    // List pending approvals (Admin)
    router.get('/pending-approvals', authenticate, authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN']), (req, res) => bookingController.listPendingApprovals(req, res));
    
    // List conflicts (Admin)
    router.get('/conflicts', authenticate, authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN']), (req, res) => bookingController.listConflicts(req, res));

    return router;
};

module.exports = createBookingRouter;