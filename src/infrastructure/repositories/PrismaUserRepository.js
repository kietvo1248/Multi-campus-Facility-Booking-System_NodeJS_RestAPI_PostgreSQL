const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');
const { id } = require('date-fns/locale');

class PrismaUserRepository extends IUserRepository {
    constructor(prismaClient) {
        super();
        this.prisma = prismaClient;
    }

    async findByEmail(email) {
        // Tìm user trong DB và join bảng Campus để lấy tên cơ sở
        const userPrisma = await this.prisma.user.findUnique({
            where: { email },
            include: {
                campus: true // Để lấy campus_name cho payload JWT
            }
        });

        if (!userPrisma) return null;

        // Chuyển đổi dữ liệu từ Prisma Model sang Domain Entity
        return new User(userPrisma);
    }
    async findById(id) {
        const userPrisma = await this.prisma.user.findUnique({
            where: { id: id },
            include: {
                campus: true // Lấy luôn thông tin Campus
            }
        });

        if (!userPrisma) return null;

        return new User(userPrisma);
    }
    async create(userData) {
        const newUser = await this.prisma.user.create({
            data: {
                email: userData.email,
                fullName: userData.fullName,
                googleId: userData.googleId,
                role: userData.role,
                campusId: Number(userData.campusId),
                passwordHash: null, // không có register nên Không có mật khẩu
                isActive: true
            },
            include: { campus: true }
        });
        return new User(newUser);
    }

    async updateProfile(userId, { fullName, phoneNumber }) {
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { campus: true }
        });

        return new User(updatedUser);
    }

    async updatePassword(userId, passwordHash) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });
        return true;
     }

     // Hàm tìm kiếm danh sách User cho Admin
    async findAll({ campusId, role, keyword, page = 1, limit = 10 }) {
        const skip = (page - 1) * limit;
        const where = {
            // Admin chỉ xem được user thuộc campus mình (trừ khi là Super Admin - logic mở rộng sau)
            campusId: campusId ? Number(campusId) : undefined,
        };

        // Lọc theo Role (STUDENT, LECTURER, FACILITY_ADMIN...)
        if (role && role !== 'ALL' && role !== '') {
            where.role = role;
        }

        // Tìm kiếm theo tên hoặc email
        if (keyword && keyword.trim() !== '') {
            const searchTerm = keyword.trim();
            where.OR = [
                { fullName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } }
            ];
        }

        // Lấy tổng số để phân trang (pagination)
        const total = await this.prisma.user.count({ where });

        const users = await this.prisma.user.findMany({
            where,
            select: { // Thay include bằng select hoặc dùng exclude
                id: true, fullName: true, email: true, 
                role: true, campus: true, isActive: true 
            },
            skip,
            take: Number(limit),
            orderBy: { id: 'desc' }
        });

        return {
            data: users.map(u => new User(u)),
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // [MỚI] Hàm cập nhật trạng thái (Khóa/Mở khóa)
    async updateStatus(userId, isActive) {
        const updatedUser = await this.prisma.user.update({
            where: { id: Number(userId) },
            data: { isActive: Boolean(isActive) },
            include: { campus: true }
        });
        return new User(updatedUser);
    }

    
}

module.exports = PrismaUserRepository;