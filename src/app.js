const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // FE Vite
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// để chắc ăn (preflight)
app.options(/.*/, cors());

app.use(express.json());

// --- 1. Khởi tạo Infrastructure ---
const prisma = new PrismaClient();
const PrismaUserRepository = require('./infrastructure/repositories/PrismaUserRepository');
const PrismaMaintenanceRepository = require('./infrastructure/repositories/PrismaMaintenanceRepository');
const PrismaBookingRepository = require('./infrastructure/repositories/PrismaBookingRepository');
const PrismaCampusRepository = require('./infrastructure/repositories/PrismaCampusRepository');
const PrismaFacilityTypeRepository = require('./infrastructure/repositories/PrismaFacilityTypeRepository');
const PrismaFacilityRepository = require('./infrastructure/repositories/PrismaFacilityRepository');
const PrismaClubRepository = require('./infrastructure/repositories/PrismaClubRepository');
const PrismaClubPriorityRepository = require('./infrastructure/repositories/PrismaClubPriorityRepository');
const PrismaEquipmentTypeRepository = require('./infrastructure/repositories/PrismaEquipmentTypeRepository');
const PrismaFacilityEquipmentRepository = require('./infrastructure/repositories/PrismaFacilityEquipmentRepository');

const userRepository = new PrismaUserRepository(prisma);
const maintenanceRepository = new PrismaMaintenanceRepository(prisma);
const bookingRepository = new PrismaBookingRepository(prisma);
const campusRepository = new PrismaCampusRepository(prisma);
const facilityTypeRepository = new PrismaFacilityTypeRepository(prisma);
const facilityRepository = new PrismaFacilityRepository(prisma);
const clubRepository = new PrismaClubRepository(prisma);
const clubPriorityRepository = new PrismaClubPriorityRepository(prisma);
const equipmentTypeRepository = new PrismaEquipmentTypeRepository(prisma);
const facilityEquipmentRepository = new PrismaFacilityEquipmentRepository(prisma);

// --- 2. Khởi tạo Application (Use Cases) ---

// 2.1 Authentication
const LoginUser = require('./application/auth/loginUser');
const ViewUserProfile = require('./application/auth/viewUserProfile');
const LoginGoogleUser = require('./application/auth/LoginGoogleUser');
const UpdateUserProfile = require('./application/auth/updateProfile');
const UpdateUserPassword = require('./application/auth/changePassword');
const ListUsers = require('./application/users/ListUsers');
const ToggleUserStatus = require('./application/users/ToggleUserStatus');

const loginUserUseCase = new LoginUser(userRepository);
const viewUserProfileUseCase = new ViewUserProfile(userRepository, clubRepository);
const loginGoogleUserUseCase = new LoginGoogleUser(userRepository);
const updateProfileUseCase = new UpdateUserProfile(userRepository);
const updatePasswordUseCase = new UpdateUserPassword(userRepository);
const listUsersUseCase = new ListUsers(userRepository);
const toggleUserStatusUseCase = new ToggleUserStatus(userRepository);

// Setup Passport
const PassportService = require('./infrastructure/services/PassportService');
const passportService = new PassportService(loginGoogleUserUseCase);
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passportService.initialize();
  app.use(passport.initialize());
}

// 2.2 Maintenance & Resources
const SetMaintenance = require('./application/maintenance/setMaintenance');
const CampusService = require('./application/resources/campusService');
const FacilityTypeService = require('./application/resources/facilityTypeService');
const FacilityService = require('./application/resources/facilityService');
const ClubService = require('./application/resources/clubService');
const EquipmentTypeService = require('./application/equipment/equipmentTypeService');
const FacilityEquipmentService = require('./application/equipment/facilityEquipmentService');

const setMaintenanceUseCase = new SetMaintenance(maintenanceRepository, bookingRepository, facilityRepository);
const campusService = new CampusService(campusRepository);
const facilityTypeService = new FacilityTypeService(facilityTypeRepository);
const facilityService = new FacilityService(facilityRepository);
const clubService = new ClubService(clubRepository, clubPriorityRepository, userRepository);
const equipmentTypeService = new EquipmentTypeService(equipmentTypeRepository);
const facilityEquipmentService = new FacilityEquipmentService(facilityEquipmentRepository);

// 2.3 Booking Use Cases 
const CreateShortTermBooking = require('./application/bookings/createShortTermBooking');
const FindAvailableFacilities = require('./application/bookings/findAvailableFacilities');
const GetClubBookingSuggestions = require('./application/bookings/getClubBookingSuggestions');
const ApproveBooking = require('./application/bookings/ApproveBooking');
const RejectBooking = require('./application/bookings/RejectBooking');
const SearchBookingForCheckIn = require('./application/bookings/SearchBookingForCheckIn');
const CheckInBooking = require('./application/bookings/CheckInBooking');
const CheckOutBooking = require('./application/bookings/CheckOutBooking');
const GetMyBookings = require('./application/bookings/GetMyBookings'); // Đảm bảo file tên là GetMyBookings.js
const GetBookingDetail = require('./application/bookings/getBookingDetail');
const CancelBookingByUser = require('./application/bookings/CancelBookingByUser');
const CancelBookingByAdmin = require('./application/bookings/CancelBookingByAdmin');
// [MỚI] Thêm 2 Use Case Admin
const ListPendingBookings = require('./application/bookings/ListPendingBookings');
const ViewAllBookings = require('./application/bookings/ViewAllBooking');
const GetFacilitySchedule = require('./application/bookings/GetFacilitySchedule');
//const ListBookingConflicts = require('./application/bookings/ListBookingConflicts');
//
const ScanRecurringAvailability = require('./application/bookings/ScanRecurringAvailability');
const CreateRecurringBooking = require('./application/bookings/CreateRecurringBooking');
const RelocateBooking = require('./application/bookings/RelocateBooking');
const CheckMaintenanceImpact = require('./application/maintenance/CheckMaintenanceImpact');
// analytics
const GetDashboardStats = require('./application/admin/GetDashboardStats');

// Instantiation
const createShortTermBooking = new CreateShortTermBooking(bookingRepository, facilityRepository, prisma);
const findAvailableFacilities = new FindAvailableFacilities(facilityRepository);
const getClubBookingSuggestionsUseCase = new GetClubBookingSuggestions(facilityRepository, clubRepository);
const approveBookingUseCase = new ApproveBooking(bookingRepository);
const rejectBookingUseCase = new RejectBooking(bookingRepository);
const searchBookingForCheckIn = new SearchBookingForCheckIn(bookingRepository);
const checkInBooking = new CheckInBooking(bookingRepository);
const checkOutBooking = new CheckOutBooking(bookingRepository);
const getMyBookings = new GetMyBookings(bookingRepository);
const getBookingDetail = new GetBookingDetail(bookingRepository);
const cancelBookingByUser = new CancelBookingByUser(bookingRepository);
const cancelBookingByAdmin = new CancelBookingByAdmin(bookingRepository);
// [MỚI] Init 2 Use Case Admin
const listPendingBookings = new ListPendingBookings(bookingRepository);
const getFacilitySchedule = new GetFacilitySchedule(bookingRepository);
const viewAllBookings = new ViewAllBookings(bookingRepository);
//const listBookingConflicts = new ListBookingConflicts(bookingRepository);
//
const scanRecurringAvailability = new ScanRecurringAvailability(bookingRepository, facilityRepository);
const createRecurringBooking = new CreateRecurringBooking(bookingRepository);
const relocateBooking = new RelocateBooking(bookingRepository, facilityRepository);
const checkMaintenanceImpact = new CheckMaintenanceImpact(bookingRepository);
//
const getDashboardStats = new GetDashboardStats(bookingRepository, facilityRepository);


// --- 3. Khởi tạo Interfaces (Controllers) ---
const AuthController = require('./interfaces/controllers/AuthController');
const authController = new AuthController(loginUserUseCase, viewUserProfileUseCase, loginGoogleUserUseCase, updateProfileUseCase, updatePasswordUseCase); // Thêm dependency còn thiếu

const UserController = require('./interfaces/controllers/UserController');
const userController = new UserController(updateProfileUseCase, updatePasswordUseCase, listUsersUseCase, toggleUserStatusUseCase);

const MaintenanceController = require('./interfaces/controllers/MaintenanceController');
const maintenanceController = new MaintenanceController(
  setMaintenanceUseCase,
  checkMaintenanceImpact 
);

const ResourceController = require('./interfaces/controllers/ResourceController');
const resourceController = new ResourceController({ campusService, facilityTypeService, facilityService, clubService });

const BookingController = require('./interfaces/controllers/BookingController');
const bookingController = new BookingController({ 
  // --- Các Use Case cũ ---
  findAvailableFacilities,
  createShortTermBooking,
  getClubBookingSuggestions: getClubBookingSuggestionsUseCase,
  approveBooking: approveBookingUseCase,
  rejectBooking: rejectBookingUseCase,
  searchBookingForCheckIn,
  checkInBooking,
  checkOutBooking,
  getMyBookings,
  getBookingDetail,
  cancelBookingByUser,
  cancelBookingByAdmin,
  bookingRepository, 
  scanRecurringAvailability,
  createRecurringBooking,
  relocateBooking,
  listPendingBookings,
  viewAllBookings,
  getFacilitySchedule 
});
const AnalyticsController = require('./interfaces/controllers/AnalyticsController');
const analyticsController = new AnalyticsController(getDashboardStats);

// --- 4. Setup Routes ---
const createAuthRouter = require('./interfaces/routes/AuthRoutes');
const authRouter = createAuthRouter(authController);

const createUserRouter = require('./interfaces/routes/UserRoutes');
const userRouter = createUserRouter(userController);

const createMaintenanceRouter = require('./interfaces/routes/MaintenanceRoutes');
const maintenanceRouter = createMaintenanceRouter(maintenanceController);

const createResourceRouter = require('./interfaces/routes/ResourceRoutes');
const resourceRouter = createResourceRouter(resourceController);

const createCampusRouter = require('./interfaces/routes/CampusRoutes');
const campusRouter = createCampusRouter(resourceController);

const createFacilityTypeRouter = require('./interfaces/routes/FacilityTypeRoutes');
const facilityTypeRouter = createFacilityTypeRouter(resourceController);

const createFacilityRouter = require('./interfaces/routes/FacilityRoutes');
const facilityRouter = createFacilityRouter(resourceController);

const createClubRouter = require('./interfaces/routes/ClubRoutes');
const clubRouter = createClubRouter(resourceController);

const createBookingRouter = require('./interfaces/routes/BookingRoutes');
const bookingRouter = createBookingRouter(bookingController);
const EquipmentController = require('./interfaces/controllers/EquipmentController');
const equipmentController = new EquipmentController({ equipmentTypeService, facilityEquipmentService, facilityService });
const createEquipmentRouter = require('./interfaces/routes/EquipmentRoutes');
const equipmentRouter = createEquipmentRouter(equipmentController);
const ReportController = require('./interfaces/controllers/ReportController');
const reportController = new ReportController(prisma);
const createReportRouter = require('./interfaces/routes/ReportRoutes');
const reportRouter = createReportRouter(reportController);

const createAnalyticsRouter = require('./interfaces/routes/AnalyticsRoutes');
const analyticsRouter = createAnalyticsRouter(analyticsController);


// Swagger setup
try {
    const swaggerDocument = YAML.load('./docs/swagger.yaml');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
    console.log("Swagger file not found or invalid");
}

// Gắn routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);// user management
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/campuses', campusRouter);
app.use('/api/facility-types', facilityTypeRouter);
app.use('/api/facilities', facilityRouter);
app.use('/api/clubs', clubRouter);
app.use('/api/bookings', bookingRouter);// đặt phòng
app.use('/api/resources', resourceRouter);
app.use('/api/analytics', analyticsRouter);// thống kê
app.use('/api/equipment', equipmentRouter);// thiết bị
app.use('/api/reports', reportRouter);// báo cáo

// Health check
app.get('/health', (req, res) => res.send('Server is healthy'));

module.exports = app;