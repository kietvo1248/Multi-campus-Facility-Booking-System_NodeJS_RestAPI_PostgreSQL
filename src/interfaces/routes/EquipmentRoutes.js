const express = require("express");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

const createEquipmentRouter = (controller) => {
  const router = express.Router();

  /* ===================== Equipment Types ===================== */
  router.get(
    "/types",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.listEquipmentTypes(req, res)
  );

  router.post(
    "/types",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.createEquipmentType(req, res)
  );

  router.put(
    "/types/:id",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.updateEquipmentType(req, res)
  );

  router.delete(
    "/types/:id",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.deleteEquipmentType(req, res)
  );

  router.get(
    "/types/:id/facilities",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.listFacilitiesByEquipmentType(req, res)
  );

  /* ===================== Facility Equipment ===================== */

  // ✅ NEW: history must be BEFORE "/facilities/:facilityId"
  // GET /equipment/facilities/:facilityId/history?equipmentTypeId=&limit=&offset=
  router.get(
    "/facilities/:facilityId/history",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.listFacilityEquipmentHistory(req, res)
  );

  router.get('/facilities/:facilityId', (req, res) =>
  controller.listFacilityEquipment(req, res)
);


  router.post(
    "/facilities/:facilityId",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.addFacilityEquipment(req, res)
  );

  router.put(
    "/facilities/:facilityId/:equipmentTypeId/:condition",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.updateFacilityEquipment(req, res)
  );

  router.delete(
    "/facilities/:facilityId/:equipmentTypeId/:condition",
    authenticate,
    authorize(["ADMIN", "FACILITY_ADMIN"]),
    (req, res) => controller.removeFacilityEquipment(req, res)
  );

  return router;
};

module.exports = createEquipmentRouter;
