class EquipmentController {
  constructor({ equipmentTypeService, facilityEquipmentService, facilityService }) {
    this.equipmentTypeService = equipmentTypeService
    this.facilityEquipmentService = facilityEquipmentService
    this.facilityService = facilityService
  }
  async listEquipmentTypes(req, res) { try { const data = await this.equipmentTypeService.list(); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async createEquipmentType(req, res) { try { const data = await this.equipmentTypeService.create(req.body); res.status(201).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async updateEquipmentType(req, res) { try { const data = await this.equipmentTypeService.update(Number(req.params.id), req.body); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async deleteEquipmentType(req, res) { try { const data = await this.equipmentTypeService.delete(Number(req.params.id)); res.status(200).json(data) } catch (e) { if (e.code === 'EQUIPMENT_TYPE_IN_USE') return res.status(400).json({ message: e.message }); res.status(500).json({ message: e.message }) } }

  async listFacilityEquipment(req, res) {
    try {
      const facilityId = Number(req.params.facilityId)
      const [facility, equipment] = await Promise.all([
        this.facilityService.getDetail(facilityId),
        this.facilityEquipmentService.listByFacility(facilityId)
      ])
      res.status(200).json({ facility, equipment })
    } catch (e) { res.status(500).json({ message: e.message }) }
  }
  async addFacilityEquipment(req, res) { try {
    const body = { ...req.body, facilityId: Number(req.params.facilityId) }
    if (!body.equipmentTypeId || !body.quantity) return res.status(400).json({ message: 'equipmentTypeId, quantity là bắt buộc' })
    const data = await this.facilityEquipmentService.add(body); res.status(201).json(data)
  } catch (e) { res.status(500).json({ message: e.message }) } }
  async updateFacilityEquipment(req, res) { try {
    const body = { ...req.body, facilityId: Number(req.params.facilityId), equipmentTypeId: Number(req.params.equipmentTypeId), condition: req.params.condition }
    const data = await this.facilityEquipmentService.update(body); res.status(200).json(data)
  } catch (e) { res.status(500).json({ message: e.message }) } }
  async removeFacilityEquipment(req, res) { try {
    const data = await this.facilityEquipmentService.remove({ facilityId: Number(req.params.facilityId), equipmentTypeId: Number(req.params.equipmentTypeId), condition: req.params.condition }); res.status(200).json({ message: 'Removed', data })
  } catch (e) { res.status(500).json({ message: e.message }) } }
  async listFacilitiesByEquipmentType(req, res) { try {
    const campusId = req.query.campusId ? Number(req.query.campusId) : undefined
    const condition = req.query.condition
    const data = await this.facilityService.listByEquipmentType({ campusId, equipmentTypeId: Number(req.params.id), condition })
    res.status(200).json(data)
  } catch (e) { res.status(500).json({ message: e.message }) } }
}
module.exports = EquipmentController