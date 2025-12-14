class ListUsers {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ currentAdminCampusId, role, keyword, page, limit }) {
        // Admin chỉ được xem danh sách user thuộc Campus của mình
        return await this.userRepository.findAll({
            campusId: currentAdminCampusId,
            role,
            keyword,
            page,
            limit
        });
    }
}
module.exports = ListUsers;