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
    const rawId =
      req.params?.bookingId ??
      req.params?.id ??
      req.query?.bookingId; // bonus: nếu sau này FE gửi query

    const bookingId = Number(rawId);

    if (!bookingId || Number.isNaN(bookingId)) {
      return res.status(400).json({ message: "bookingId không hợp lệ" });
    }

    const adminId = req.user.id;

    const body = req.body || {};
    const rejectedBookingIds = Array.isArray(body.rejectedBookingIds)
      ? body.rejectedBookingIds
      : [];

    const result = await this.bookingRepository.approveWithAutoRejection({
      bookingId,
      adminId,
      rejectedBookingIds,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Approve error:", error);
    return res.status(500).json({ error: error.message });
  }
}





  async reject(req, res) {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const result = await this.bookingRepository.reject(parseInt(bookingId), adminId, reason);

      if (result.user && result.user.email) {
        const bookingDetails = {
          roomName: result.facility.name,
          date: result.startTime,
          slot: `${result.startTime} - ${result.endTime}`
        };

        sendBookingNotification(result.user.email, bookingDetails, 'REJECTED', reason)
          .catch(err => console.error('Email error:', err));
      }

      return res.json({ success: true, message: 'Đã từ chối booking.', data: result });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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
        if (result.userId !== userId && !['ADMIN', 'FACILITY_ADMIN'].includes(role)) {
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

  async scanRecurring(req, res) {
    try {
      const { originalFacilityId, startDate, weeks, slot, capacity, typeId } = req.body;
      const campusId = req.user.campusId;

      if (!originalFacilityId || !startDate || !weeks || !slot) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (facilityId, startDate, weeks, slot).' });
      }

      const result = await this.scanRecurringAvailability.execute({
        originalFacilityId: Number(originalFacilityId),
        startDate,
        weeks: Number(weeks),
        slot: Number(slot),
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
