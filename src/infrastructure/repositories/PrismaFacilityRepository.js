class PrismaFacilityRepository {
  constructor(prisma) { this.prisma = prisma }
  list(filters = {}) {
    const where = {};
    
    // Filter theo status
    // Nếu includeInactive=true hoặc status='all', ta KHÔNG thêm điều kiện status vào where -> Prisma sẽ lấy tất cả.
    const shouldIncludeAll = 
        filters.includeInactive === true || 
        filters.includeInactive === 'true' || 
        filters.status === 'all' || 
        filters.status === 'ALL';

    if (!shouldIncludeAll) {
        if (filters.status) {
            // Nếu có status cụ thể (VD: MAINTENANCE), dùng nó
            where.status = String(filters.status).toUpperCase();
        } else {
            // Mặc định chỉ lấy ACTIVE
            where.status = 'ACTIVE';
        }
    }
    
    // 2. [FIX] Xử lý CampusId (Chắc chắn là số)
    if (filters.campusId) {
      const cId = Number(filters.campusId);
      if (!isNaN(cId)) {
          where.campusId = cId;
      }
    }
    
    // 3. [FIX] Xử lý TypeId
    if (filters.typeId) {
      const tId = Number(filters.typeId);
      if (!isNaN(tId)) {
          where.typeId = tId;
      }
    }

    // 4. [FIX] Xử lý Capacity
    if (filters.capacity) {
      const cap = Number(filters.capacity);
      if (!isNaN(cap)) {
          where.capacity = { gte: cap };
      }
    }

    if (filters.equipmentTypeId) {
      const eqId = Number(filters.equipmentTypeId);
      if (!isNaN(eqId)) {
        where.equipment = { some: { equipmentTypeId: eqId } };
      }
    }
    
    // Log để kiểm tra (Xóa khi deploy)
    // console.log('Prisma Where Clause:', JSON.stringify(where, null, 2));

    return this.prisma.facility.findMany({ 
      where,
      include: {
        type: true,
        campus: true,
        equipment: {
          include: { equipmentType: true }
        }
      },
      orderBy: [
        { status: 'asc' },
        { id: 'asc' }
      ]
    })
  }
  async findByEquipmentType({ campusId, equipmentTypeId, condition }) {
    const where = {
      equipment: {
        some: {
          equipmentTypeId: Number(equipmentTypeId),
          ...(condition ? { condition: String(condition) } : {})
        }
      }
    };
    if (campusId) where.campusId = Number(campusId);
    return this.prisma.facility.findMany({
      where,
      include: {
        type: true,
        campus: true,
        equipment: { include: { equipmentType: true } }
      },
      orderBy: [{ id: 'asc' }]
    })
  }
  async findAvailable({ campusId, typeId, minCapacity, startTime, endTime }) {
    const whereClause = {
      campusId: Number(campusId), 
      status: 'ACTIVE',
    };
    if (typeId) whereClause.typeId = Number(typeId);
    if (minCapacity) whereClause.capacity = { gte: Number(minCapacity) };

    return this.prisma.facility.findMany({
      where: {
        ...whereClause,
        // Loại trừ các phòng đang có Booking APPROVED hoặc PENDING trong khung giờ này
        bookings: {
          none: {
            status: { in: ['APPROVED', 'PENDING'] }, // Coi như bận nếu đang chờ duyệt hoặc đã duyệt
            OR: [
              {
                startTime: { lt: endTime },
                endTime: { gt: startTime } 
              }
            ]
          }
        },
            maintenance: {
            none: {
                startDate: { lt: endTime },
                OR: [{ endDate: { gt: startTime } }, { endDate: null }]
            }
        }
      },
      include: { type: true }
    });
  }

  async findById(id) {
    return this.prisma.facility.findUnique({
      where: { id },
      include: {
        type: true,      // Kèm thông tin loại phòng
        campus: true,    // Kèm thông tin campus
        equipment: {     // Kèm danh sách thiết bị
            include: { equipmentType: true }
        }
      }
    });
  }

  create(data) { 
    // Đảm bảo status mặc định là ACTIVE nếu không được truyền, và normalize status
    const facilityData = { ...data };
    if (!facilityData.status) {
      facilityData.status = 'ACTIVE';
    } else {
      // Map status tiếng Việt sang tiếng Anh
      const statusMap = {
        'hoạt động': 'ACTIVE',
        'hoat dong': 'ACTIVE',
        'active': 'ACTIVE',
        'bảo trì': 'MAINTENANCE',
        'bao tri': 'MAINTENANCE',
        'maintenance': 'MAINTENANCE',
        'không hoạt động': 'INACTIVE',
        'khong hoat dong': 'INACTIVE',
        'inactive': 'INACTIVE'
      };
      
      const statusLower = String(facilityData.status).toLowerCase().trim();
      facilityData.status = statusMap[statusLower] || facilityData.status.toUpperCase();
      
      // Validate status
      const validStatuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
      if (!validStatuses.includes(facilityData.status)) {
        facilityData.status = 'ACTIVE';
      }
    }
    
    return this.prisma.facility.create({ 
      data: facilityData,
      include: {
        type: true,      // Kèm thông tin loại phòng
        campus: true,    // Kèm thông tin campus
        equipment: {     // Kèm danh sách thiết bị
          include: { equipmentType: true }
        }
      }
    }) 
  }
  update(id, data) { 
    // Normalize status nếu có trong data và không phải null/empty
    const updateData = { ...data };
    
    // Loại bỏ các field undefined/null/empty string để không bị ghi đè
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
        delete updateData[key];
      }
    });
    
    // QUAN TRỌNG: Chỉ normalize status nếu nó thực sự có trong data
    // Nếu không có status trong data, Prisma sẽ giữ nguyên giá trị cũ
    if (updateData.hasOwnProperty('status') && updateData.status) {
      let statusValue = String(updateData.status).trim();
      
      // Map status tiếng Việt sang tiếng Anh
      const statusMap = {
        'hoạt động': 'ACTIVE',
        'hoat dong': 'ACTIVE',
        'active': 'ACTIVE',
        'bảo trì': 'MAINTENANCE',
        'bao tri': 'MAINTENANCE',
        'maintenance': 'MAINTENANCE',
        'không hoạt động': 'INACTIVE',
        'khong hoat dong': 'INACTIVE',
        'inactive': 'INACTIVE'
      };
      
      // Chuyển về lowercase để so sánh
      const statusLower = statusValue.toLowerCase();
      
      // Nếu có trong map, dùng giá trị đã map
      if (statusMap[statusLower]) {
        updateData.status = statusMap[statusLower];
      } else {
        // Nếu không có trong map, thử uppercase
        updateData.status = statusValue.toUpperCase();
      }
      
      // Đảm bảo status hợp lệ - chỉ chấp nhận ACTIVE, INACTIVE, MAINTENANCE
      const validStatuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
      if (!validStatuses.includes(updateData.status)) {
        // Nếu status không hợp lệ, mặc định là ACTIVE
        console.warn(`Invalid status "${statusValue}" (mapped to "${updateData.status}") for facility ${id}, defaulting to ACTIVE`);
        updateData.status = 'ACTIVE';
      }
    }
    
    // Log để debug
    console.log('Repository update - ID:', id, 'UpdateData:', JSON.stringify(updateData));
    
    return this.prisma.facility.update({ 
      where: { id }, 
      data: updateData,
      include: {
        type: true,      // Kèm thông tin loại phòng
        campus: true,    // Kèm thông tin campus
        equipment: {     // Kèm danh sách thiết bị
          include: { equipmentType: true }
        }
      }
    }) 
  }
  softDelete(id) { return this.prisma.facility.update({ where: { id }, data: { status: 'INACTIVE' } }) }

  //-_-
  async findAvailableWithPriority({ campusId, clubId, startTime, endTime }) {
    // 1. Tìm tất cả phòng trống (Logic lọc giống hệt findAvailable của MW1)
    const facilities = await this.prisma.facility.findMany({
      where: {
        campusId: Number(campusId),
        status: 'ACTIVE',
        bookings: {
          none: {
            status: { in: ['APPROVED', 'PENDING'] },
            OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }]
          }
        },
        maintenance: {
            none: {
                startDate: { lt: endTime },
                OR: [{ endDate: { gt: startTime } }, { endDate: null }]
            }
        }
      },
      // 2. KÈM THEO THÔNG TIN ƯU TIÊN (JOIN bảng ClubPriority)
      include: {
        type: true, // Lấy thông tin loại phòng
        priorities: {
          where: { clubId: clubId }, // Chỉ lấy priority của đúng CLB này
          select: { priorityScore: true, note: true }
        }
      }
    });

    // 3. Xử lý hậu kỳ (Sắp xếp Priority cao lên đầu)
    const result = facilities.map(f => {
      const priority = f.priorities[0]; // Mảng này chỉ có tối đa 1 phần tử
      return {
        ...f,
        // Flat thông tin ưu tiên ra ngoài để FE dễ dùng
        priorityScore: priority ? priority.priorityScore : 0,
        priorityNote: priority ? priority.note : null,
        isSuggested: !!priority // Flag đánh dấu đây là phòng gợi ý
      };
    });

    // Sort: Điểm cao xếp trước -> Điểm thấp -> Không có điểm
    return result.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

module.exports = PrismaFacilityRepository