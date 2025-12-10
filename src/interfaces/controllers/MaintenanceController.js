class MaintenanceController {
  constructor(setMaintenanceUseCase) {
    this.setMaintenanceUseCase = setMaintenanceUseCase
  }

  async set(req, res) {
    try {
      const { facilityId, startDate, endDate, reason } = req.body
      if (!facilityId || !startDate || !reason) {
        return res.status(400).json({ message: 'Missing required fields' })
      }
      const reportedBy = req.user.id
      const s = new Date(startDate)
      const e = endDate ? new Date(endDate) : null
      const result = await this.setMaintenanceUseCase.execute({ facilityId: Number(facilityId), startDate: s, endDate: e, reason, reportedBy })
      return res.status(200).json(result)
    } catch (err) {
      return res.status(500).json({ message: err.message })
    }
  }
}

module.exports = MaintenanceController