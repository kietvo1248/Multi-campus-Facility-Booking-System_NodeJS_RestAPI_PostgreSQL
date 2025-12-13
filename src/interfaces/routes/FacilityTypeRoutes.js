const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createFacilityTypeRouter = (controller) => {
  const router = express.Router()
  router.get('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listFacilityTypes(req, res))
  router.post('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createFacilityType(req, res))
  router.put('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateFacilityType(req, res))
  router.delete('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteFacilityType(req, res))
  return router
}

module.exports = createFacilityTypeRouter