const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createReportRouter = (controller) => {
  const router = express.Router()
  router.post('/booking', authenticate, authorize(['SECURITY_GUARD','ADMIN','FACILITY_ADMIN']), (req,res)=>controller.reportBooking(req,res))
  router.post('/facility/:facilityId', authenticate, authorize(['SECURITY_GUARD','ADMIN','FACILITY_ADMIN']), (req,res)=>controller.reportFacility(req,res))
  return router
}

module.exports = createReportRouter