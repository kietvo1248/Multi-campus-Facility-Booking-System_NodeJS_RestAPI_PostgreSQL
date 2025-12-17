const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const createBookingRouter = (bookingController) => {
    const router = express.Router();

    // Tìm phòng (Chỉ Student & Lecturer được tìm để đặt)
    router.get('/search', authenticate, authorize(['STUDENT', 'LECTURER', 'FACILITY_ADMIN']), (req, res) => bookingController.search(req, res));

    // Đặt phòng
    router.post('/', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.create(req, res));
    // Gợi ý phòng cho Club Leader
    router.get('/club-suggestions', authenticate, authorize(['STUDENT']), (req, res) => bookingController.suggestForClub(req, res));
    // Duyệt đơn
    router.patch('/:id/approve', 
        authenticate, 
        authorize(['FACILITY_ADMIN']), 
        (req, res) => bookingController.approve(req, res)
    );

    router.patch('/:id/reject', 
        authenticate, 
        authorize(['FACILITY_ADMIN']), 
        (req, res) => bookingController.reject(req, res)
    );

    router.get('/guard/search', authenticate, authorize(['SECURITY_GUARD']), (req, res) => bookingController.searchForGuard(req, res));
    router.patch('/:id/check-in', authenticate, authorize(['SECURITY_GUARD']), (req, res) => bookingController.checkIn(req, res));
    router.patch('/:id/check-out', authenticate, authorize(['SECURITY_GUARD']), (req, res) => bookingController.checkOut(req, res));

    // List pending approvals (Admin)
    router.get('/pending-approvals', authenticate, authorize(['FACILITY_ADMIN',]), (req, res) => bookingController.listPendingApprovals(req, res));
    router.get('/all-bookings', authenticate, authorize(['FACILITY_ADMIN']), (req, res) => bookingController.viewAllBookings(req, res));
    
    // List conflicts (Admin)
    router.get('/conflicts', authenticate, authorize(['FACILITY_ADMIN']), (req, res) => bookingController.listConflicts(req, res));

    // Xem đơn của mình
    router.get('/me', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.getMine(req, res));

    // Xem chi tiết 
    router.get('/:id', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.getDetail(req, res));

    // Hủy đơn (MW7)
    router.patch('/:id/cancel', authenticate, authorize(['STUDENT', 'LECTURER']), (req, res) => bookingController.cancel(req, res));

    // Quét lịch trống định kỳ (MW2)
    router.post('/recurring/scan', authenticate, authorize(['LECTURER']), (req, res) => bookingController.scanRecurring(req, res));
    router.post('/recurring', authenticate, authorize(['LECTURER']), (req, res) => bookingController.createRecurring(req, res));

    // Dời lịch thủ công (Admin)
    router.patch('/:id/move', 
        authenticate, 
        authorize(['FACILITY_ADMIN']), 
        (req, res) => bookingController.relocate(req, res)
    );

    return router;
};

module.exports = createBookingRouter;