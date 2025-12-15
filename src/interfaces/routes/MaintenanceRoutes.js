const express = require('express')
const { authenticate, authorize } = require('../middlewares/authMiddleware')

const createMaintenanceRouter = (maintenanceController) => {
  const router = express.Router()
  router.post('/set', authenticate, authorize(['FACILITY_ADMIN']), (req, res) => maintenanceController.set(req, res))
  // [MỚI] Check va chạm trước khi set bảo trì
    router.get('/check-impact', 
        authenticate, 
        authorize(['FACILITY_ADMIN', 'CAMPUS_ADMIN']), 
        (req, res) => maintenanceController.check(req, res)
    );
  return router
}

module.exports = createMaintenanceRouter