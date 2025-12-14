class UserController {
    constructor(updateUserProfileUseCase, changePasswordUseCase, listUsersUseCase, toggleUserStatusUseCase) {
        this.updateUserProfileUseCase = updateUserProfileUseCase;
        this.changePasswordUseCase = changePasswordUseCase;
        this.listUsersUseCase = listUsersUseCase;
        this.toggleUserStatusUseCase = toggleUserStatusUseCase;
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { fullName, phoneNumber } = req.body;

            const result = await this.updateUserProfileUseCase.execute(userId, { fullName, phoneNumber });
            return res.status(200).json(result);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { newPassword, confirmPassword } = req.body;

            const result = await this.changePasswordUseCase.execute(userId, { newPassword, confirmPassword });
            return res.status(200).json(result);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
    async listUsers(req, res) {
        try {
            const { role, keyword, page, limit } = req.query;
            const currentAdminCampusId = req.user.campusId;

            const result = await this.listUsersUseCase.execute({
                currentAdminCampusId,
                role,
                keyword,
                page,
                limit
            });
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // [MỚI] API Khóa/Mở khóa user
    async toggleStatus(req, res) {
        try {
            const userId = Number(req.params.id);
            const { isActive } = req.body; // true hoặc false

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ message: "Trạng thái isActive phải là boolean." });
            }

            const result = await this.toggleUserStatusUseCase.execute(userId, isActive);
            return res.status(200).json({ message: "Cập nhật trạng thái thành công.", data: result });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = UserController;