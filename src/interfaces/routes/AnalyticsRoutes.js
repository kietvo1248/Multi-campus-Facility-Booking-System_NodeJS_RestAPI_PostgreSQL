const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const createAnalyticsRouter = (analyticsController) => {
    const router = express.Router();

    router.get('/dashboard', 
        authenticate, 
        authorize(['FACILITY_ADMIN']), 
        (req, res) => analyticsController.getDashboard(req, res)
    );

    return router;
};

module.exports = createAnalyticsRouter;