class GetDashboardStats {
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async execute({ campusId, startDate, endDate }) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 1. Lấy thống kê Status (Pending, Approved, Cancelled...)
        const statusStats = await this.bookingRepository.countBookingsByStatus(campusId, start, end);
        
        // Format lại dữ liệu cho gọn
        let totalBookings = 0;
        let cancelledBookings = 0;
        let approvedBookings = 0;
        
        const overview = {
            PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0, COMPLETED: 0
        };

        statusStats.forEach(item => {
            overview[item.status] = item._count.id;
            totalBookings += item._count.id;
            if (['CANCELLED', 'REJECTED'].includes(item.status)) cancelledBookings += item._count.id;
            if (['APPROVED', 'COMPLETED'].includes(item.status)) approvedBookings += item._count.id;
        });

        // 2. Tính Tỷ lệ Hủy (Cancellation Rate)
        const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(2) : 0;

        // 3. Tính Tỷ lệ Lấp đầy (Occupancy Rate)
        // Công thức giả định: Mỗi phòng hoạt động 12 tiếng/ngày (7h-19h)
        // Total Capacity Hours = Số phòng * Số ngày * 12
        const totalFacilities = await this.bookingRepository.countTotalFacilities(campusId);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
        const totalCapacityHours = totalFacilities * daysDiff * 12; // Giả sử 1 slot = 2h, ngày 6 slot
        
        // Giả sử mỗi booking trung bình là 2 tiếng (hoặc query sum duration chính xác nếu cần)
        const bookedHours = approvedBookings * 2; 
        
        const occupancyRate = totalCapacityHours > 0 ? ((bookedHours / totalCapacityHours) * 100).toFixed(2) : 0;

        // 4. Top Phòng Hot
        const topFacilities = await this.bookingRepository.getTopFacilities(campusId, start, end, 5);

        // 5. Biểu đồ Trend (Group by Date)
        const rawBookings = await this.bookingRepository.getBookingDates(campusId, start, end);
        const trendMap = {};

        rawBookings.forEach(b => {
            const dateKey = b.startTime.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!trendMap[dateKey]) trendMap[dateKey] = 0;
            trendMap[dateKey]++;
        });

        // Convert Map to Array và sort theo ngày
        const bookingTrend = Object.keys(trendMap).sort().map(date => ({
            date,
            count: trendMap[date]
        }));

        return {
            overview: {
                total: totalBookings,
                breakdown: overview
            },
            rates: {
                cancellationRate: Number(cancellationRate),
                occupancyRate: Number(occupancyRate)
            },
            topFacilities,
            bookingTrend
        };
    }

    //
}

module.exports = GetDashboardStats;