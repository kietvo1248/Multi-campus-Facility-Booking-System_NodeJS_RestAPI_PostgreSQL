const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createResourceRouter = (controller) => {
  const router = express.Router()

  router.get('/campuses', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listCampuses(req, res))
  router.post('/campuses', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createCampus(req, res))
  router.put('/campuses/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateCampus(req, res))
  router.delete('/campuses/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteCampus(req, res))

  router.get('/facility-types', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listFacilityTypes(req, res))
  router.post('/facility-types', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createFacilityType(req, res))
  router.put('/facility-types/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateFacilityType(req, res))
  router.delete('/facility-types/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteFacilityType(req, res))

  router.get('/facilities', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listFacilities(req, res))
  router.post('/facilities', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createFacility(req, res))
  router.put('/facilities/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateFacility(req, res))
  router.delete('/facilities/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteFacility(req, res))

  router.get('/clubs', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listClubs(req, res))
  router.post('/clubs', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.createClub(req, res))
  router.put('/clubs/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.updateClub(req, res))
  router.delete('/clubs/:id', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.softDeleteClub(req, res))

  router.get('/clubs/:id/priorities', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.listClubPriorities(req, res))
  router.post('/clubs/:id/priorities', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.assignClubPriority(req, res))
  router.delete('/clubs/:id/priorities/:facilityId', authenticate, authorize(['FACILITY_ADMIN','CAMPUS_ADMIN']), (req, res) => controller.removeClubPriority(req, res))

  return router
}

module.exports = createResourceRouter