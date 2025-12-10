const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');

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
                campusId: userData.campusId,
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

    
}

module.exports = PrismaUserRepository;