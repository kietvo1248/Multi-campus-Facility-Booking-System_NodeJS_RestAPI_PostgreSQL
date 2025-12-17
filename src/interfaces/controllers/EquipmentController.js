class EquipmentController {
  constructor({ equipmentTypeService, facilityEquipmentService, facilityService }) {
    this.equipmentTypeService = equipmentTypeService;
    this.facilityEquipmentService = facilityEquipmentService;
    this.facilityService = facilityService;
  }

  async listEquipmentTypes(req, res) {
    try {
      const data = await this.equipmentTypeService.list();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  async createEquipmentType(req, res) {
    try {
      const data = await this.equipmentTypeService.create(req.body);
      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  async updateEquipmentType(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "id không hợp lệ" });

      const data = await this.equipmentTypeService.update(id, req.body);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  async deleteEquipmentType(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "id không hợp lệ" });

      const data = await this.equipmentTypeService.delete(id);
      return res.status(200).json(data);
    } catch (e) {
      if (e.code === "EQUIPMENT_TYPE_IN_USE") {
        return res.status(400).json({ message: e.message });
      }
      return res.status(500).json({ message: e.message });
    }
  }

  // GET /equipment/facilities/:facilityId
  async listFacilityEquipment(req, res) {
    try {
      const facilityId = Number(req.params.facilityId);
      if (Number.isNaN(facilityId)) return res.status(400).json({ message: "facilityId không hợp lệ" });

      const [facility, equipment] = await Promise.all([
        this.facilityService.getDetail(facilityId),
        this.facilityEquipmentService.listByFacility(facilityId),
      ]);

      // nếu facilityService.getDetail trả null khi không tồn tại
      if (!facility) return res.status(404).json({ message: "Không tìm thấy phòng" });

      return res.status(200).json({ facility, equipment });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  // POST /equipment/facilities/:facilityId
  async addFacilityEquipment(req, res) {
    try {
      const facilityId = Number(req.params.facilityId);
      if (Number.isNaN(facilityId)) return res.status(400).json({ message: "facilityId không hợp lệ" });

      const equipmentTypeId = req.body?.equipmentTypeId;
      const quantity = req.body?.quantity;
      const conditionRaw = req.body?.condition;

      if (equipmentTypeId === undefined || equipmentTypeId === null) {
        return res.status(400).json({ message: "equipmentTypeId là bắt buộc" });
      }
      if (quantity === undefined || quantity === null) {
        return res.status(400).json({ message: "quantity là bắt buộc" });
      }

      const qty = Number(quantity);
      if (Number.isNaN(qty) || qty < 1) {
        return res.status(400).json({ message: "quantity phải là số >= 1" });
      }

      // normalize condition: good/fair/poor (lowercase) — khớp swagger response bạn gửi
      const condition = (conditionRaw ?? "good").toString().toLowerCase();

      const body = {
        facilityId,
        equipmentTypeId: Number(equipmentTypeId),
        quantity: qty,
        condition,
      };

      const data = await this.facilityEquipmentService.add(body);

      // FE-friendly (optional): nếu muốn trả thêm facility/type thì mở comment
      // const [facility, equipmentType] = await Promise.all([
      //   this.facilityService.getDetail(facilityId),
      //   this.equipmentTypeService.getById?.(Number(equipmentTypeId)),
      // ]);
      // return res.status(201).json({ ...data, facility, equipmentType });

      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  // Các endpoint dưới đây: chỉ ổn nếu route có đủ params equipmentTypeId/condition
  async updateFacilityEquipment(req, res) {
    try {
      const facilityId = Number(req.params.facilityId);
      const equipmentTypeId = Number(req.params.equipmentTypeId);
      if (Number.isNaN(facilityId) || Number.isNaN(equipmentTypeId)) {
        return res.status(400).json({ message: "facilityId/equipmentTypeId không hợp lệ" });
      }

      const condition = (req.params.condition ?? req.body?.condition ?? "good").toString().toLowerCase();

      const body = { ...req.body, facilityId, equipmentTypeId, condition };
      const data = await this.facilityEquipmentService.update(body);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  async removeFacilityEquipment(req, res) {
    try {
      const facilityId = Number(req.params.facilityId);
      const equipmentTypeId = Number(req.params.equipmentTypeId);
      if (Number.isNaN(facilityId) || Number.isNaN(equipmentTypeId)) {
        return res.status(400).json({ message: "facilityId/equipmentTypeId không hợp lệ" });
      }

      const condition = (req.params.condition ?? req.query?.condition ?? "good").toString().toLowerCase();

      const data = await this.facilityEquipmentService.remove({ facilityId, equipmentTypeId, condition });
      return res.status(200).json({ message: "Removed", data });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  async listFacilitiesByEquipmentType(req, res) {
    try {
      const equipmentTypeId = Number(req.params.id);
      if (Number.isNaN(equipmentTypeId)) return res.status(400).json({ message: "equipmentTypeId không hợp lệ" });

      const campusId = req.query.campusId ? Number(req.query.campusId) : undefined;
      const condition = req.query.condition ? req.query.condition.toString().toLowerCase() : undefined;

      const data = await this.facilityService.listByEquipmentType({ campusId, equipmentTypeId, condition });
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }
}

module.exports = EquipmentController;
