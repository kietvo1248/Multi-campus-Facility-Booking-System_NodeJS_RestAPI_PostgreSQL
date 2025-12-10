const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createCampusRouter = (controller) => {
  const router = express.Router()
  router.get('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listCampuses(req, res))
  router.post('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createCampus(req, res))
  router.put('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateCampus(req, res))
  router.delete('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteCampus(req, res))
  return router
}

module.exports = createCampusRouter