class User{
    constructor({ id, email, passwordHash, googleId, fullName, role, phoneNumber, isActive, campusId, createdAt, updatedAt, campus }) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.googleId = googleId;
        this.fullName = fullName;
        this.role = role;
        this.phoneNumber = phoneNumber;
        this.isActive = isActive;
        this.campusId = campusId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.campusName = campus ? campus.name : null;
    }
}
module.exports = User;