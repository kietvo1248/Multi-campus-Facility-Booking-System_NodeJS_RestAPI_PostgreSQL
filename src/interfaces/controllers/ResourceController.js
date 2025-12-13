class ResourceController {
  constructor({ campusService, facilityTypeService, facilityService, clubService }) {
    this.campusService = campusService
    this.facilityTypeService = facilityTypeService
    this.facilityService = facilityService
    this.clubService = clubService
  }

  async listCampuses(req, res) { try { const data = await this.campusService.list(); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async createCampus(req, res) { try { const data = await this.campusService.create(req.body); res.status(201).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async updateCampus(req, res) { try { const data = await this.campusService.update(Number(req.params.id), req.body); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async softDeleteCampus(req, res) { try { const data = await this.campusService.softDelete(Number(req.params.id)); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }

  async listFacilityTypes(req, res) { try { const data = await this.facilityTypeService.list(); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async createFacilityType(req, res) { try { const data = await this.facilityTypeService.create(req.body); res.status(201).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async updateFacilityType(req, res) { try { const data = await this.facilityTypeService.update(Number(req.params.id), req.body); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async softDeleteFacilityType(req, res) { try { const data = await this.facilityTypeService.softDelete(Number(req.params.id)); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }

  async listFacilities(req, res) { 
    try { 
        const filters = req.query;
        
        // LOGIC MỚI: Nếu là Student/Lecturer, ép buộc lọc theo Campus của họ
        if (req.user.role === 'STUDENT' || req.user.role === 'LECTURER' || req.user.role === 'CLUB_LEADER') {
            filters.campusId = req.user.campusId;
        }

        const data = await this.facilityService.list(filters); 
        res.status(200).json(data);
    } catch (e) { 
        res.status(500).json({ message: e.message });
    } 
  }

  async getFacilityDetail(req, res) {
    try {
        const id = Number(req.params.id);
        const data = await this.facilityService.getDetail(id);
        
        // Bảo mật: Nếu sinh viên cố tình xem ID phòng khác campus -> Chặn (Optional)
        // if (req.user.role === 'STUDENT' && data.campusId !== req.user.campusId) ...

        res.status(200).json(data);
    } catch (e) {
        res.status(404).json({ message: e.message });
    }
  }
  async createFacility(req, res) { try { const data = await this.facilityService.create(req.body); res.status(201).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async updateFacility(req, res) { try { const data = await this.facilityService.update(Number(req.params.id), req.body); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async softDeleteFacility(req, res) { try { const data = await this.facilityService.softDelete(Number(req.params.id)); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }

  async listClubs(req, res) { try { const campusId = Number(req.query.campusId); const data = await this.clubService.listByCampus(campusId); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async createClub(req, res) { try { const data = await this.clubService.create(req.body); res.status(201).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async updateClub(req, res) { try { const data = await this.clubService.update(Number(req.params.id), req.body); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async softDeleteClub(req, res) { try { const data = await this.clubService.softDelete(Number(req.params.id)); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }

  async listClubPriorities(req, res) { try { const clubId = Number(req.params.id); const data = await this.clubService.listPriorities(clubId); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async assignClubPriority(req, res) { try { const clubId = Number(req.params.id); const { facilityId, priorityLevel } = req.body; const data = await this.clubService.assignPriority(clubId, Number(facilityId), priorityLevel); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
  async removeClubPriority(req, res) { try { const clubId = Number(req.params.id); const facilityId = Number(req.params.facilityId); const data = await this.clubService.removePriority(clubId, facilityId); res.status(200).json(data) } catch (e) { res.status(500).json({ message: e.message }) } }
}
module.exports = ResourceController