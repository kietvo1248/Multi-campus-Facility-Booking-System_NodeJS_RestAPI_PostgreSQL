class IUserRepository {
    async findByEmail(email) {
        throw new Error('Method findByEmail() must be implemented');
    }
    async findById(id) { throw new Error('Not implemented'); }
    async create(userData) { throw new Error('Not implemented'); }
    async updateProfile(userId, { fullName, phoneNumber }) { throw new Error('Not implemented'); }
    async updatePassword(userId, passwordHash) { throw new Error('Not implemented'); }
}
module.exports = IUserRepository;