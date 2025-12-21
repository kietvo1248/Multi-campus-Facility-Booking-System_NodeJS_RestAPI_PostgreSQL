class PrismaClubRepository {
  constructor(prisma) { this.prisma = prisma }
  listByCampus(campusId) { 
    return this.prisma.club.findMany({ 
      where: { campusId: Number(campusId) },
      include: {
        leader: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        campus: true
      }
    }) 
  }
  create(data) { 
    // Đảm bảo parse các field number
    const clubData = { ...data };
    if (clubData.campusId) clubData.campusId = Number(clubData.campusId);
    if (clubData.leaderId) clubData.leaderId = Number(clubData.leaderId);
    
    return this.prisma.club.create({ 
      data: clubData,
      include: {
        leader: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        campus: true
      }
    }) 
  }
  update(id, data) { 
    // Đảm bảo parse các field number và loại bỏ undefined/null
    const updateData = { ...data };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
        delete updateData[key];
      }
    });
    
    if (updateData.campusId) updateData.campusId = Number(updateData.campusId);
    if (updateData.leaderId) updateData.leaderId = Number(updateData.leaderId);
    
    return this.prisma.club.update({ 
      where: { id: Number(id) }, 
      data: updateData,
      include: {
        leader: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        campus: true
      }
    }) 
  }
  softDelete(id) { return this.prisma.club.delete({ where: { id: Number(id) } }) }
  async findByLeaderId(userId) {
    return this.prisma.club.findUnique({
      where: { leaderId: Number(userId) },
      include: {
        leader: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        campus: true
      }
    });
  }
}
module.exports = PrismaClubRepository;