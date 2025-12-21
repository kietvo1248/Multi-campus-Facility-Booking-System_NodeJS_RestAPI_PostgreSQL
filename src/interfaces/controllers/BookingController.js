const { sendBookingNotification } = require('../../infrastructure/services/EmailService');

class BookingController {
  constructor({
    findAvailableFacilities,
    createShortTermBooking,
    getClubBookingSuggestions,
    approveBooking,
    rejectBooking,
    searchBookingForCheckIn,
    checkInBooking,
    checkOutBooking,
    bookingRepository,
    getMyBookings,
    getBookingDetail,
    cancelBookingByUser,
    cancelBookingByAdmin,
    scanRecurringAvailability,
    createRecurringBooking,
    relocateBooking,
    viewAllBookings,
    listPendingBookings,
    getFacilitySchedule
  }) {
    this.findAvailableFacilities = findAvailableFacilities;
    this.createShortTermBooking = createShortTermBooking;
    this.getClubBookingSuggestions = getClubBookingSuggestions;
    this.approveBooking = approveBooking;
    this.rejectBooking = rejectBooking;
    this.searchBookingForCheckIn = searchBookingForCheckIn;
    this.checkInBooking = checkInBooking;
    this.checkOutBooking = checkOutBooking;
    this.bookingRepository = bookingRepository;

    this.getMyBookings = getMyBookings;
    this.getBookingDetail = getBookingDetail;
    this.cancelBookingByUser = cancelBookingByUser;
    this.cancelBookingByAdmin = cancelBookingByAdmin;
    this.scanRecurringAvailability = scanRecurringAvailability;
    this.createRecurringBooking = createRecurringBooking;
    this.relocateBooking = relocateBooking;
    this.viewAllBookingsUseCase = viewAllBookings;
    this.listPendingBookings = listPendingBookings;

    // ✅ FIX: đồng bộ tên use-case để getSchedule gọi đúng
    this.getFacilityScheduleUseCase = getFacilitySchedule;
  }

  // GET /bookings/search
  async search(req, res) {
    try {
      const { date, slot, typeId, capacity } = req.query;
      const campusId = Number(req.user.campusId);

      const result = await this.findAvailableFacilities.execute({
        campusId,
        date,
        slot: Number(slot),
        typeId,
        capacity
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  // POST /bookings
  async create(req, res) {
    try {
      const userId = req.user.id;
      const userCampusId = Number(req.user.campusId);
      const userRole = req.user.role;

      const { facilityId, date, slots, bookingTypeId, purpose, attendeeCount } = req.body;

      if (!slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 slot.' });
      }

      const result = await this.createShortTermBooking.execute({
        userId,
        userRole,
        userCampusId,
        facilityId: Number(facilityId),
        date,
        slots,
        bookingTypeId: Number(bookingTypeId),
        purpose,
        attendeeCount: Number(attendeeCount)
      });

      // ✅ NEW: Nếu admin đặt đè -> gửi mail cho các booking bị hủy
      const role = String(userRole || '').toUpperCase();
      const isAdmin = ['ADMIN', 'FACILITY_ADMIN'].includes(role);

      // result có thể là booking object hoặc {createdBooking, cancelledBookings}
      const cancelledBookings = result?.cancelledBookings || [];

      if (isAdmin && Array.isArray(cancelledBookings) && cancelledBookings.length > 0) {
        for (const b of cancelledBookings) {
          if (!b?.user?.email) continue;

          sendBookingNotification(
            b.user.email,
            {
              roomName: b.facility?.name,
              date: b.startTime,
              startTime: b.startTime,
              endTime: b.endTime
            },
            'CANCELLED',
            'Lịch của bạn bị hủy do Admin đặt đè trong cùng khung giờ.'
          ).catch(e => console.error('Mail Error:', e));
        }
      }

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
  // POST /bookings/:id/reschedule-request
async requestReschedule(req, res) {
  try {
    const oldBookingId = Number(req.params.id);
    const userId = req.user.id;
    const userRole = String(req.user.role || '').toUpperCase();

    // Chỉ lecturer (tuỳ bạn có cho student không)
    if (!['LECTURER'].includes(userRole)) {
      return res.status(403).json({ message: 'Chỉ LECTURER mới được yêu cầu đổi lịch.' });
    }

    const { facilityId, date, slots, bookingTypeId, attendeeCount } = req.body;

    if (!facilityId || !date || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: 'Thiếu facilityId/date/slots.' });
    }

    // 1) Lấy booking cũ
    const oldBooking = await this.bookingRepository.findById(oldBookingId);
    if (!oldBooking) return res.status(404).json({ message: 'Booking gốc không tồn tại.' });

    // 2) Chỉ chủ booking mới được đổi
    if (oldBooking.userId !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền đổi lịch booking này.' });
    }

    // 3) Cho phép đổi lịch nếu booking APPROVED hoặc bị CANCELLED do admin đặt đè (tuỳ rule)
const st = String(oldBooking?.status ?? "").trim().toUpperCase();

const allowed = ["APPROVED", "CANCELLED"]; // bạn có thể thêm "CONFLICT" nếu hệ thống dùng status này
if (!allowed.includes(st)) {
  return res.status(400).json({
    message: `Booking status (${st || "UNKNOWN"}) không hợp lệ để yêu cầu đổi lịch.`,
  });
}

    // 4) Tạo booking mới PENDING + rescheduleFromId
    const newBooking = await this.bookingRepository.createRescheduleRequest({
      userId,
      facilityId: Number(facilityId),
      date,
      slots,
      bookingTypeId: Number(bookingTypeId),
      attendeeCount: Number(attendeeCount),
      rescheduleFromId: oldBookingId,
    });

    return res.status(201).json({
      message: 'Tạo yêu cầu đổi lịch thành công (chờ duyệt).',
      data: newBooking,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}


  async suggestForClub(req, res) {
    try {
      const { date, slot } = req.query;
      const userId = req.user.id;
      const userCampusId = Number(req.user.campusId);

      const result = await this.getClubBookingSuggestions.execute({
        userId,
        userCampusId,
        date,
        slot: Number(slot)
      });
      return res.status(200).json(result);
    } catch (error) {
      const status = error.message.includes('không phải là Chủ nhiệm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async listPendingApprovals(req, res) {
    try {
      const campusId = req.query.campusId ? Number(req.query.campusId) : Number(req.user.campusId);

      if (!campusId || isNaN(campusId)) {
        return res.status(400).json({ message: 'Campus ID là bắt buộc' });
      }

      const bookings = await this.bookingRepository.findPendingByCampus(campusId);
      return res.status(200).json(bookings);
    } catch (error) {
      console.error('Error listing pending approvals:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  async viewAllBookings(req, res) {
    try {
      const campusId = req.query.campusId ? Number(req.query.campusId) : Number(req.user.campusId);

      if (!campusId || isNaN(campusId)) {
        return res.status(400).json({ message: 'Campus ID là bắt buộc' });
      }

      const bookings = await this.bookingRepository.viewAllBookings(campusId);
      return res.status(200).json(bookings);
    } catch (error) {
      console.error('Error listing pending approvals:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  async listConflicts(req, res) {
    try {
      const campusId = req.query.campusId ? Number(req.query.campusId) : Number(req.user.campusId);

      if (!campusId || isNaN(campusId)) {
        return res.status(400).json({ message: 'Campus ID là bắt buộc' });
      }

      const conflicts = await this.bookingRepository.findConflictsByCampus(campusId);
      return res.status(200).json(conflicts);
    } catch (error) {
      console.error('Error listing conflicts:', error);
      return res.status(500).json({ message: error.message });
    }
  }

async approve(req, res) {
  try {
    const rawId = req.params?.bookingId ?? req.params?.id ?? req.query?.bookingId;
    const bookingId = Number(rawId);

    if (!bookingId || Number.isNaN(bookingId)) {
      return res.status(400).json({ message: "bookingId không hợp lệ" });
    }

    const adminId = req.user.id;

    // ✅ dùng use-case ApproveBooking
    const result = await this.approveBooking.execute(bookingId, adminId);

    return res.json({ success: true, data: result });
  } catch (error) {
    // lỗi nghiệp vụ thì trả 400 cho FE dễ xử lý
    return res.status(400).json({ message: error.message });
  }
}



async reject(req, res) {
  try {
    const rawId = req.params?.bookingId ?? req.params?.id ?? req.query?.bookingId;
    const bId = Number(rawId);
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!bId || Number.isNaN(bId)) {
      return res.status(400).json({ message: "Booking ID không hợp lệ" });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });
    }

    const result = await this.bookingRepository.reject(bId, adminId, reason);

    if (result?.user?.email) {
      const bookingDetails = {
        roomName: result.facility?.name,
        date: result.startTime,
        slot: `${result.startTime} - ${result.endTime}`
      };

      sendBookingNotification(result.user.email, bookingDetails, "REJECTED", reason)
        .catch(err => console.error("Email error:", err));
    }

    return res.json({ success: true, message: "Đã từ chối booking.", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}


  async searchForGuard(req, res) {
    try {
      const { keyword } = req.query;
      const campusId = Number(req.user.campusId);

      const result = await this.searchBookingForCheckIn.execute({ campusId, keyword });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async checkIn(req, res) {
    try {
      const bookingId = Number(req.params.id);
      const guardId = req.user.id;
      await this.checkInBooking.execute(bookingId, guardId);
      return res.status(200).json({ message: 'Đã xác nhận mở cửa (Check-in).' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async checkOut(req, res) {
    try {
      const bookingId = Number(req.params.id);
      const guardId = req.user.id;
      await this.checkOutBooking.execute(bookingId, guardId);
      return res.status(200).json({ message: 'Đã xác nhận đóng cửa (Check-out).' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getMine(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.getMyBookings.execute(userId);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getDetail(req, res) {
    try {
      const id = Number(req.params.id);
      const { isGroup } = req.query;
      const userId = req.user.id;
      const role = req.user.role;

      let result;

      if (isGroup === 'true') {
        result = await this.bookingRepository.findGroupById(id);
        if (!result) return res.status(404).json({ message: 'Nhóm đặt phòng không tồn tại.' });

        // ✅ FIX role: schema không có CAMPUS_ADMIN
       if (result.createdById !== userId && !['ADMIN', 'FACILITY_ADMIN'].includes(role)) {
  return res.status(403).json({ message: 'Không có quyền truy cập.' });
}
      } else {
        result = await this.bookingRepository.findById(id);
        if (!result) return res.status(404).json({ message: 'Booking không tồn tại.' });

     if (result.userId !== userId && !['ADMIN', 'FACILITY_ADMIN'].includes(role)) {
  return res.status(403).json({ message: 'Không có quyền truy cập.' });
}
      }

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  async cancel(req, res) {
    try {
      const bookingId = Number(req.params.id);
      const userId = req.user.id;

      const result = await this.cancelBookingByUser.execute(bookingId, userId);
      return res.status(200).json({ message: 'Hủy đặt phòng thành công.', data: result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async cancelByAdmin(req, res) {
    try {
      const bookingId = Number(req.params.id);
      const { reason } = req.body;
      const adminId = req.user.id; // Lấy từ token

      // 1. Gọi Use Case (Thay vì gọi repo trực tiếp)
     const result = await this.cancelBookingByAdmin.execute({
        bookingId,
        adminId,
        reason
      });

      // 2. Gửi Email (Controller lo việc phản hồi user)
      if (result.user && result.user.email) {
        sendBookingNotification(
          result.user.email,
          {
            roomName: result.facility.name,
            date: result.startTime,
            startTime: result.startTime,
            endTime: result.endTime
          },
          'CANCELLED_BY_ADMIN', 
          reason
        ).catch(err => console.error("Mail cancel error:", err));
      }

      return res.status(200).json({ 
        success: true, 
        message: "Đã hủy lịch thành công.", 
        data: result 
      });

    } catch (error) {
      const status = error.message.includes("không tồn tại") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async scanRecurring(req, res) {
    try {
      const { originalFacilityId, startDate, weeks, slot, capacity, typeId } = req.body;
      const campusId = req.user.campusId;

      if (!originalFacilityId || !startDate || !weeks || !slot) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (facilityId, startDate, weeks, slot).' });
      }

      const processedSlot = Array.isArray(slot) 
          ? slot.map(s => Number(s)) 
          : Number(slot);

      const result = await this.scanRecurringAvailability.execute({
        originalFacilityId: Number(originalFacilityId),
        startDate,
        weeks: Number(weeks),
        slot: processedSlot,
        capacity: Number(capacity),
        typeId: Number(typeId),
        campusId: Number(campusId)
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async createRecurring(req, res) {
    try {
      const userId = req.user.id;
      const { note, bookings } = req.body;

      const result = await this.createRecurringBooking.execute({
        userId,
        note,
        bookings
      });

      return res.status(201).json({ message: 'Tạo lịch định kỳ thành công.', data: result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async relocate(req, res) {
    try {
      const bookingId = Number(req.params.id);
      const { newFacilityId, reason } = req.body;
      const adminId = req.user.id;

      if (!newFacilityId) return res.status(400).json({ message: 'Vui lòng chọn phòng mới.' });

      const result = await this.relocateBooking.execute({
        bookingId,
        newFacilityId: Number(newFacilityId),
        adminId,
        reason
      });

      if (result.user && result.user.email) {
        sendBookingNotification(
          result.user.email,
          {
            roomName: result.facility.name,
            date: result.startTime,
            startTime: result.startTime,
            endTime: result.endTime
          },
          'RELOCATED',
          reason
        ).catch(e => console.error('Mail Error:', e));
      }

      return res.status(200).json({ message: 'Dời phòng thành công.', data: result });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getSchedule(req, res) {
    try {
      const { facilityId, date } = req.query;
      const userId = req.user.id;

      if (!facilityId || !date) {
        return res.status(400).json({ message: 'Thiếu facilityId hoặc date.' });
      }

      const result = await this.getFacilityScheduleUseCase.execute({
        facilityId: Number(facilityId),
        date,
        userId
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
}

module.exports = BookingController;
