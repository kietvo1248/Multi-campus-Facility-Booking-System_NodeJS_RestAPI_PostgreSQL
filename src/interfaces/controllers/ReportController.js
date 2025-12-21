class ReportController {
  constructor(prisma) { this.prisma = prisma }
  async reportBooking(req, res) {
    try {
      const { bookingId, title, description, category, imageUrls } = req.body
      const booking = await this.prisma.booking.findUnique({ where: { id: Number(bookingId) } })
      if (!booking) return res.status(404).json({ message: 'Booking không tồn tại' })
      const data = await this.prisma.report.create({
        data: {
          title: title || 'Booking Issue',
          description: description || '',
          status: 'Pending',
          category: category || 'INCIDENT',
          imageUrls: imageUrls || [],
          facilityId: booking.facilityId,
          reporterId: req.user.id,
          bookingId: booking.id
        }
      })
      res.status(201).json(data)
    } catch (e) { res.status(500).json({ message: e.message }) }
  }
  async reportFacility(req, res) {
    try {
      const facilityId = Number(req.params.facilityId)
      const { title, description, category, imageUrls } = req.body
      const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } })
      if (!facility) return res.status(404).json({ message: 'Phòng không tồn tại' })
      const data = await this.prisma.report.create({
        data: {
          title: title || 'Facility Issue',
          description: description || '',
          status: 'Pending',
          category: category || 'DAMAGE',
          imageUrls: imageUrls || [],
          facilityId,
          reporterId: req.user.id,
          bookingId: null
        }
      })
      res.status(201).json(data)
    } catch (e) { res.status(500).json({ message: e.message }) }
  }

  //xem danh sách report (bao gồm pagination)
  async list(req, res) {
    try {
      const campusId = Number(req.user.campusId);
      const { page, limit, status, category, keyword } = req.query;

      // 1. Điều kiện lọc: Chỉ lấy báo cáo thuộc Campus của Admin
      const where = {
        facility: {
          campusId: campusId 
        }
      };

      // Filter bổ sung
      if (status) where.status = status;
      if (category) where.category = category;
      
      // Tìm kiếm theo tiêu đề hoặc tên người báo cáo
      if (keyword) {
        where.OR = [
            { title: { contains: keyword, mode: 'insensitive' } },
            { reporter: { fullName: { contains: keyword, mode: 'insensitive' } } }
        ];
      }

      // Phân trang
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const skip = (p - 1) * l;

      // 2. Query DB
      const [reports, total] = await Promise.all([
        this.prisma.report.findMany({
          where,
          include: {
            reporter: { select: { id: true, fullName: true, email: true, role: true } },
            facility: { select: { id: true, name: true } },
            booking: { 
                select: { id: true, startTime: true, endTime: true, user: { select: { fullName: true } } } 
            }
          },
          orderBy: { createdAt: 'desc' }, // ✅ Sắp xếp mới nhất lên đầu
          skip,
          take: l
        }),
        this.prisma.report.count({ where })
      ]);

      return res.status(200).json({
        data: reports,
        pagination: {
          total,
          page: p,
          limit: l,
          totalPages: Math.ceil(total / l)
        }
      });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }

  // API: Xem chi tiết báo cáo
  async getDetail(req, res) {
    try {
      const id = Number(req.params.id);
      const campusId = Number(req.user.campusId);

      // 1. Tìm báo cáo
      const report = await this.prisma.report.findUnique({
        where: { id },
        include: {
          reporter: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true } },
          facility: { 
            include: { type: true, campus: true } 
          },
          booking: {
            include: { user: { select: { id: true, fullName: true, email: true } } }
          }
        }
      });

      if (!report) {
        return res.status(404).json({ message: 'Báo cáo không tồn tại' });
      }

      // 2. Bảo mật: Chặn nếu Admin khác Campus cố tình xem
      // (Dựa trên facility của báo cáo đó)
      if (report.facility.campusId !== campusId) {
        return res.status(403).json({ message: 'Bạn không có quyền xem báo cáo thuộc cơ sở khác.' });
      }

      return res.status(200).json(report);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }
}
module.exports = ReportController