class ResourceController {
  constructor({
    campusService,
    facilityTypeService,
    facilityService,
    clubService,
  }) {
    this.campusService = campusService;
    this.facilityTypeService = facilityTypeService;
    this.facilityService = facilityService;
    this.clubService = clubService;
  }

  async listCampuses(req, res) {
    try {
      const data = await this.campusService.list();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async createCampus(req, res) {
    try {
      const data = await this.campusService.create(req.body);
      res.status(201).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async updateCampus(req, res) {
    try {
      const data = await this.campusService.update(
        Number(req.params.id),
        req.body
      );
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async softDeleteCampus(req, res) {
    try {
      const data = await this.campusService.softDelete(Number(req.params.id));
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }

  async listFacilityTypes(req, res) {
    try {
      const data = await this.facilityTypeService.list();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async createFacilityType(req, res) {
    try {
      const data = await this.facilityTypeService.create(req.body);
      res.status(201).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async updateFacilityType(req, res) {
    try {
      const data = await this.facilityTypeService.update(
        Number(req.params.id),
        req.body
      );
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async softDeleteFacilityType(req, res) {
    try {
      const data = await this.facilityTypeService.softDelete(
        Number(req.params.id)
      );
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }

  async listFacilities(req, res) {
    try {
      // Clone query object để tránh tham chiếu
      const filters = { ...req.query };

      // [FIX] Ép kiểu số ngay tại đây
      if (filters.campusId) {
        const cId = Number(filters.campusId);
        if (!isNaN(cId)) filters.campusId = cId;
        else delete filters.campusId; // Xóa nếu lỗi
      }
      if (filters.campusId) filters.campusId = Number(filters.campusId);
      if (filters.typeId) filters.typeId = Number(filters.typeId);
      if (filters.capacity) filters.capacity = Number(filters.capacity);

      // Logic gán campusId mặc định của User
      if (!filters.campusId && req.user.campusId) {
        filters.campusId = Number(req.user.campusId);
      }

      // Logic Admin xem hết
      const adminRoles = ["FACILITY_ADMIN", "CAMPUS_ADMIN", "ADMIN"];
      if (adminRoles.includes(req.user.role)) {
        // Nếu user không gửi status hoặc gửi status rỗng -> Admin được xem hết
        if (!filters.status) {
          filters.includeInactive = true;
        }
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
  async createFacility(req, res) {
    try {
      const body = { ...req.body };
      if (body.campusId) body.campusId = Number(body.campusId);
      if (body.typeId) body.typeId = Number(body.typeId);
      const data = await this.facilityService.create(body);
      res.status(201).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async updateFacility(req, res) {
    try {
      const body = { ...req.body };

      // Parse các field number
      if (body.campusId !== undefined && body.campusId !== null) {
        body.campusId = Number(body.campusId);
      }
      if (body.typeId !== undefined && body.typeId !== null) {
        body.typeId = Number(body.typeId);
      }
      if (body.capacity !== undefined && body.capacity !== null) {
        body.capacity = Number(body.capacity);
      }

      // QUAN TRỌNG: Chỉ update status nếu frontend explicitly gửi status
      // Nếu không gửi status, thì không update status (giữ nguyên giá trị cũ)
      // Nếu status là empty string hoặc null, thì xóa nó khỏi body để không update
      if (
        body.status === "" ||
        body.status === null ||
        body.status === undefined
      ) {
        delete body.status;
      }

      // Log để debug
      console.log(
        "Update facility - ID:",
        req.params.id,
        "Body:",
        JSON.stringify(body)
      );

      const data = await this.facilityService.update(
        Number(req.params.id),
        body
      );
      res.status(200).json(data);
    } catch (e) {
      console.error("Error updating facility:", e);
      res.status(500).json({ message: e.message });
    }
  }
  async softDeleteFacility(req, res) {
    try {
      const data = await this.facilityService.softDelete(Number(req.params.id));
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }

  async listClubs(req, res) {
    try {
      let campusId = req.query.campusId;

      // Nếu không có campusId trong query, mặc định lọc theo Campus của user
      if (!campusId && req.user.campusId) {
        campusId = req.user.campusId;
      }

      // Parse campusId thành number
      if (campusId) {
        campusId = Number(campusId);
        if (isNaN(campusId)) {
          return res.status(400).json({ message: "Campus ID không hợp lệ" });
        }
      } else {
        // Nếu vẫn không có campusId, trả về lỗi (hoặc có thể trả về tất cả cho Admin)
        return res.status(400).json({ message: "Vui lòng cung cấp campusId" });
      }

      const data = await this.clubService.listByCampus(campusId);
      res.status(200).json(data);
    } catch (e) {
      console.error("Error listing clubs:", e);
      res.status(500).json({ message: e.message });
    }
  }
  async createClub(req, res) {
    try {
      const body = { ...req.body };

      // Parse các field number
      if (body.campusId !== undefined && body.campusId !== null) {
        body.campusId = Number(body.campusId);
      }
      if (body.leaderId !== undefined && body.leaderId !== null) {
        body.leaderId = Number(body.leaderId);
      }

      // Nếu không có code, tự động tạo từ name
      if (!body.code && body.name) {
        // Tạo code từ name, loại bỏ khoảng trắng và ký tự đặc biệt
        let baseCode = body.name
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/[^A-Z0-9]/g, "");

        // Nếu code rỗng sau khi clean, dùng tên mặc định
        if (!baseCode) {
          baseCode = "CLUB";
        }

        // Thêm timestamp để đảm bảo unique (chỉ lấy 6 số cuối)
        const timestamp = Date.now().toString().slice(-6);
        body.code = `${baseCode}${timestamp}`;
      }

      // Validate required fields
      if (!body.name) {
        return res.status(400).json({ message: "Tên CLB là bắt buộc" });
      }
      if (!body.campusId || isNaN(body.campusId)) {
        return res
          .status(400)
          .json({ message: "Campus ID là bắt buộc và phải là số hợp lệ" });
      }
      if (!body.code) {
        return res.status(400).json({ message: "Mã CLB (code) là bắt buộc" });
      }

      // Log để debug
      console.log("Creating club with data:", JSON.stringify(body));

      const data = await this.clubService.create(body);
      res.status(201).json(data);
    } catch (e) {
      console.error("Error creating club:", e);
      // Kiểm tra nếu lỗi do unique constraint
      if (e.code === "P2002") {
        return res
          .status(400)
          .json({
            message: "Mã CLB (code) đã tồn tại. Vui lòng chọn mã khác.",
          });
      }
      // Kiểm tra nếu lỗi do foreign key
      if (e.code === "P2003") {
        return res
          .status(400)
          .json({ message: "Campus ID hoặc Leader ID không tồn tại." });
      }
      res.status(500).json({ message: e.message });
    }
  }
  async updateClub(req, res) {
    try {
      const body = { ...req.body };

      // Parse các field number
      if (body.campusId !== undefined && body.campusId !== null) {
        body.campusId = Number(body.campusId);
      }
      if (body.leaderId !== undefined && body.leaderId !== null) {
        body.leaderId = Number(body.leaderId);
      }

      // Nếu có leaderEmail, service sẽ xử lý
      // Nếu có leaderId, parse nó
      if (body.leaderEmail === "" || body.leaderEmail === null) {
        delete body.leaderEmail;
      }
      if (body.leaderId === "" || body.leaderId === null) {
        delete body.leaderId;
      }

      const data = await this.clubService.update(Number(req.params.id), body);
      res.status(200).json(data);
    } catch (e) {
      console.error("Error updating club:", e);
      res.status(500).json({ message: e.message });
    }
  }
  async softDeleteClub(req, res) {
    try {
      const data = await this.clubService.softDelete(Number(req.params.id));
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }

  async listClubPriorities(req, res) {
    try {
      const clubId = Number(req.params.id);
      const data = await this.clubService.listPriorities(clubId);
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
  async assignClubPriority(req, res) {
    try {
      const clubId = Number(req.params.id);
      const { facilityId, priorityLevel, priorityScore, note } = req.body;

      // Hỗ trợ cả priorityLevel và priorityScore
      const score =
        priorityScore !== undefined
          ? Number(priorityScore)
          : priorityLevel !== undefined
          ? Number(priorityLevel)
          : 1;

      const data = await this.clubService.assignPriority(
        clubId,
        Number(facilityId),
        score,
        note
      );
      res.status(200).json(data);
    } catch (e) {
      console.error("Error assigning club priority:", e);
      res.status(500).json({ message: e.message });
    }
  }
  async removeClubPriority(req, res) {
    try {
      const clubId = Number(req.params.id);
      const facilityId = Number(req.params.facilityId);
      const data = await this.clubService.removePriority(clubId, facilityId);
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
}
module.exports = ResourceController;
