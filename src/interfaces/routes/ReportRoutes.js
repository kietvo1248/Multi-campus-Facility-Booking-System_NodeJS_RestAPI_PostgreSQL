const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createReportRouter = (controller) => {
  const router = express.Router()
  router.post('/booking', authenticate, authorize(['SECURITY_GUARD','ADMIN','FACILITY_ADMIN']), (req,res)=>controller.reportBooking(req,res))
  router.post('/facility/:facilityId', authenticate, authorize(['SECURITY_GUARD','ADMIN','FACILITY_ADMIN']), (req,res)=>controller.reportFacility(req,res))

  router.get('/', 
    authenticate, 
    authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN', 'ADMIN']), 
    (req, res) => controller.list(req, res)
  );

  // 2. Xem chi tiết
  router.get('/:id', 
    authenticate, 
    authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN', 'ADMIN']), 
    (req, res) => controller.getDetail(req, res)
  );
  return router
}

module.exports = createReportRouter