const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createClubRouter = (controller) => {
  const router = express.Router()
  router.get('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listClubs(req, res))
  router.post('/', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createClub(req, res))
  router.put('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateClub(req, res))
  router.delete('/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteClub(req, res))
  router.get('/:id/priorities', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listClubPriorities(req, res))
  router.post('/:id/priorities', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.assignClubPriority(req, res))
  router.delete('/:id/priorities/:facilityId', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.removeClubPriority(req, res))
  return router
}

module.exports = createClubRouter