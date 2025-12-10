const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createFacilityRouter = (controller) => {
  const router = express.Router()
  router.get('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listFacilities(req, res))
  router.post('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createFacility(req, res))
  router.put('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateFacility(req, res))
  router.delete('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteFacility(req, res))
  return router
}

module.exports = createFacilityRouter