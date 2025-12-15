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
}
module.exports = ReportController