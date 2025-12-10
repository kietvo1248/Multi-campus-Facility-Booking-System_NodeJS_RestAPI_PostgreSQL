class UserController {
    constructor(updateUserProfileUseCase, changePasswordUseCase) {
        this.updateUserProfileUseCase = updateUserProfileUseCase;
        this.changePasswordUseCase = changePasswordUseCase;
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
}

module.exports = UserController;