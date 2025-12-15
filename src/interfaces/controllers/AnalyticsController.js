class AnalyticsController {
    constructor(getDashboardStats) {
        this.getDashboardStats = getDashboardStats;
    }

    async getDashboard(req, res) {
        try {
            const campusId = req.user.campusId;
            let { startDate, endDate } = req.query;

            // Default: 30 ngày gần nhất nếu không truyền
            if (!startDate || !endDate) {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                startDate = start.toISOString();
                endDate = end.toISOString();
            }

            const result = await this.getDashboardStats.execute({
                campusId,
                startDate,
                endDate
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error('Analytics Error:', error);
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = AnalyticsController;