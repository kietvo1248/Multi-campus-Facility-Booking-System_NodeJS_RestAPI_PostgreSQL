class EquipmentController {
  constructor({ equipmentTypeService, facilityEquipmentService, facilityService }) {
    this.equipmentTypeService = equipmentTypeService;
    this.facilityEquipmentService = facilityEquipmentService;
    this.facilityService = facilityService;
  }

  // ===== Helpers =====
  _toInt(value) {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  _normalizeCondition(input) {
    // Only allow: good | poor (bỏ fair)
    const c = (input ?? "good").toString().trim().toLowerCase();
    if (c === "poor") return "poor";
    return "good";
  }

  _getUserId(req) {
    // tùy authMiddleware bạn set: req.user / req.user.id
    const id = req?.user?.id ?? req?.user?.userId ?? null;
    return this._toInt(id);
  }

  _requireNote(note) {
    const s = (note ?? "").toString().trim();
    if (!s) return null;
    return s;
  }

  _toLimit(value, fallback = 50) {
    const n = this._toInt(value);
    if (!n || n < 1) return fallback;
    return Math.min(n, 200); // chặn quá lớn
  }

  _toOffset(value) {
    const n = this._toInt(value);
    if (!n || n < 0) return 0;
    return n;
  }

  // ===== Equipment Types =====
  async listEquipmentTypes(req, res) {
    try {
      const data = await this.equipmentTypeService.list();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  async createEquipmentType(req, res) {
    try {
      const data = await this.equipmentTypeService.create(req.body);
      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  async updateEquipmentType(req, res) {
    try {
      const id = this._toInt(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid id" });

      const data = await this.equipmentTypeService.update(id, req.body);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  async deleteEquipmentType(req, res) {
    try {
      const id = this._toInt(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid id" });

      const data = await this.equipmentTypeService.delete(id);
      return res.status(200).json(data);
    } catch (e) {
      if (e.code === "EQUIPMENT_TYPE_IN_USE") {
        return res.status(400).json({ message: e.message });
      }
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  // ===== Facility Equipment =====

  // GET /equipment/facilities/:facilityId
  async listFacilityEquipment(req, res) {
    try {
      const facilityId = this._toInt(req.params.facilityId);
      if (!facilityId) return res.status(400).json({ message: "Invalid facilityId" });

      const [facility, equipment] = await Promise.all([
        this.facilityService.getDetail(facilityId),
        this.facilityEquipmentService.listByFacility(facilityId),
      ]);

      if (!facility) return res.status(404).json({ message: "Facility not found" });

      return res.status(200).json({ facility, equipment });
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  // ✅ NEW: GET /equipment/facilities/:facilityId/history?equipmentTypeId=&limit=&offset=
  async listFacilityEquipmentHistory(req, res) {
    try {
      const facilityId = this._toInt(req.params.facilityId);
      if (!facilityId) return res.status(400).json({ message: "Invalid facilityId" });

      const equipmentTypeId =
        req.query.equipmentTypeId !== undefined && req.query.equipmentTypeId !== null && `${req.query.equipmentTypeId}` !== ""
          ? this._toInt(req.query.equipmentTypeId)
          : undefined;

      const limit = this._toLimit(req.query.limit, 50);
      const offset = this._toOffset(req.query.offset);

      const data = await this.facilityEquipmentService.listHistory({
        facilityId,
        equipmentTypeId, // có thể undefined => lấy tất cả
        limit,
        offset,
      });

      return res.status(200).json(Array.isArray(data) ? data : []);
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  // POST /equipment/facilities/:facilityId
  async addFacilityEquipment(req, res) {
    try {
      const facilityId = this._toInt(req.params.facilityId);
      if (!facilityId) return res.status(400).json({ message: "Invalid facilityId" });

      const equipmentTypeId = this._toInt(req.body?.equipmentTypeId);
      const quantity = this._toInt(req.body?.quantity);
      if (!equipmentTypeId) return res.status(400).json({ message: "equipmentTypeId is required" });
      if (!quantity || quantity < 1) return res.status(400).json({ message: "quantity must be >= 1" });

      const condition = this._normalizeCondition(req.body?.condition);
      const createdById = this._getUserId(req);

      const data = await this.facilityEquipmentService.add({
        facilityId,
        equipmentTypeId,
        quantity,
        condition,
        createdById,
        note: this._requireNote(req.body?.note) || null,
      });

      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  // PUT /equipment/facilities/:facilityId/:equipmentTypeId/:condition
  // Body: { quantity OR newQuantity, newCondition?, note (required) }
  async updateFacilityEquipment(req, res) {
    try {
      const facilityId = this._toInt(req.params.facilityId);
      const equipmentTypeId = this._toInt(req.params.equipmentTypeId);
      if (!facilityId || !equipmentTypeId) {
        return res.status(400).json({ message: "Invalid facilityId/equipmentTypeId" });
      }

      // condition trong URL là condition "cũ" (PK)
      const oldCondition = this._normalizeCondition(req.params.condition);

      // ✅ hỗ trợ cả quantity lẫn newQuantity (FE hay gửi newQuantity)
      const rawQty = req.body?.newQuantity ?? req.body?.quantity;
      const quantity = rawQty !== undefined ? this._toInt(rawQty) : undefined;

      if (quantity !== undefined && (!quantity || quantity < 1)) {
        return res.status(400).json({ message: "quantity must be >= 1" });
      }

      // bắt buộc note khi update
      const note = this._requireNote(req.body?.note);
      if (!note) {
        return res.status(400).json({ message: "note is required for updating equipment" });
      }

      // newCondition trong body (nếu muốn đổi)
      const newConditionRaw = req.body?.newCondition ?? req.body?.condition; // support both
      const newCondition = newConditionRaw !== undefined ? this._normalizeCondition(newConditionRaw) : undefined;

      const changedById = this._getUserId(req);

      const data = await this.facilityEquipmentService.update({
        facilityId,
        equipmentTypeId,
        condition: oldCondition, // PK cũ
        quantity,
        newCondition, // PK mới (nếu đổi condition)
        note,
        changedById,
      });

      return res.status(200).json(data);
    } catch (e) {
      if ((e.message || "").toLowerCase().includes("không tồn tại") || (e.message || "").toLowerCase().includes("not found")) {
        return res.status(404).json({ message: e.message });
      }
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  // DELETE /equipment/facilities/:facilityId/:equipmentTypeId/:condition
  async removeFacilityEquipment(req, res) {
    try {
      const facilityId = this._toInt(req.params.facilityId);
      const equipmentTypeId = this._toInt(req.params.equipmentTypeId);
      if (!facilityId || !equipmentTypeId) {
        return res.status(400).json({ message: "Invalid facilityId/equipmentTypeId" });
      }

      const condition = this._normalizeCondition(req.params.condition);
      const deletedById = this._getUserId(req);

      const data = await this.facilityEquipmentService.remove({
        facilityId,
        equipmentTypeId,
        condition,
        deletedById,
        note: this._requireNote(req.query?.note) || this._requireNote(req.body?.note) || null,
      });

      return res.status(200).json({ message: "Removed", data });
    } catch (e) {
      if ((e.message || "").toLowerCase().includes("không tồn tại") || (e.message || "").toLowerCase().includes("not found")) {
        return res.status(404).json({ message: e.message });
      }
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }

  // GET /equipment/types/:id/facilities?campusId=&condition=
  async listFacilitiesByEquipmentType(req, res) {
    try {
      const equipmentTypeId = this._toInt(req.params.id);
      if (!equipmentTypeId) return res.status(400).json({ message: "Invalid equipmentTypeId" });

      const campusId = req.query.campusId ? this._toInt(req.query.campusId) : undefined;
      const condition = req.query.condition ? this._normalizeCondition(req.query.condition) : undefined;

      const data = await this.facilityService.listByEquipmentType({ campusId, equipmentTypeId, condition });
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ message: e.message || "Internal server error" });
    }
  }
}

module.exports = EquipmentController;
