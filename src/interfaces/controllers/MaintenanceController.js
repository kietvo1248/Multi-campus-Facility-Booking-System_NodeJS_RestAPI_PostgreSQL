class MaintenanceController {
  constructor(setMaintenanceUseCase, checkMaintenanceImpactUseCase) {
    this.setMaintenanceUseCase = setMaintenanceUseCase
    this.checkMaintenanceImpactUseCase = checkMaintenanceImpactUseCase
  }

  async set(req, res) {
        try {
            const { facilityId, startDate, endDate, reason } = req.body;
            if (!facilityId || !startDate || !reason) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
            const reportedBy = req.user.id;
            const s = new Date(startDate);
            const e = endDate ? new Date(endDate) : null;

            // 1. Tìm các booking 'APPROVED' sẽ bị hủy do bảo trì
            // (Phải tìm TRƯỚC khi set maintenance vì sau đó status sẽ bị đổi)
            let impactedBookings = [];
            if (this.bookingRepository && this.bookingRepository.getApprovedBookingsOverlapping) {
                // Hàm này cần trả về include: { user: true, facility: true }
                impactedBookings = await this.bookingRepository.getApprovedBookingsOverlapping(
                    facilityId, s, e || new Date('2099-12-31')
                );
                
                // Nếu hàm getApprovedBookingsOverlapping chưa include User, 
                // bạn có thể cần query bổ sung ở đây, nhưng tốt nhất là sửa Repo.
            }

            // 2. Thực hiện Set Maintenance (Logic nghiệp vụ: Tạo log + Hủy booking)
            const result = await this.setMaintenanceUseCase.execute({ 
                facilityId: Number(facilityId), 
                startDate: s, 
                endDate: e, 
                reason, 
                reportedBy 
            });

            // 3. Gửi Email thông báo HỦY (MAINTENANCE) hàng loạt
            if (impactedBookings.length > 0) {
                // Dùng forEach để không block response
                impactedBookings.forEach(booking => {
                    if (booking.user && booking.user.email) {
                        sendBookingNotification(
                            booking.user.email,
                            {
                                roomName: booking.facility ? booking.facility.name : `Phòng ${facilityId}`,
                                date: booking.startTime,
                                startTime: booking.startTime,
                                endTime: booking.endTime
                            },
                            'MAINTENANCE',
                            `Kế hoạch bảo trì: ${reason}`
                        ).catch(err => console.error(`Mail failed for booking ${booking.id}`));
                    }
                });
            }

            return res.status(200).json({
                message: 'Maintenance set successfully',
                notificationsSent: impactedBookings.length,
                data: result
            });

        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    }

  async check(req, res) {
    try {
      const { facilityId, startDate, endDate } = req.query;
      if (!facilityId || !startDate || !endDate) {
        return res.status(400).json({ message: 'Missing required fields (facilityId, startDate, endDate)' });
      }

      const result = await this.checkMaintenanceImpact.execute({
        facilityId: Number(facilityId),
        startDate,
        endDate
      });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = MaintenanceController